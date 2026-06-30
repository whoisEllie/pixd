import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import { cloneGrid, type EditorGrid, gridsEqual, type Tool } from "../editor/types"
import { floodFill, paintCell, paintLine, paintRect } from "../editor/gridOps"
import { PALETTE_BY_ID, rgbCss } from "../schem/palette"
import { getBlockImage, onTexturesChanged } from "../schem/textures"

export interface HoverInfo {
	gx: number
	gz: number
	id: number
	height: number
}

interface Props {
	grid: EditorGrid
	tool: Tool
	currentBlockId: number
	brushHeight: number
	onCommit: (grid: EditorGrid) => void
	onPick: (id: number, height: number) => void
	onHover: (info: HoverInfo | null) => void
}

interface View {
	panX: number
	panY: number
	cellPx: number
}

const MIN_CELL = 2
const MAX_CELL = 48

const colorCache = new Map<number, string>()
function cssFor(id: number): string {
	let c = colorCache.get(id)
	if (!c) {
		const b = PALETTE_BY_ID.get(id)
		c = b ? rgbCss(b.color) : "#ff00ff"
		colorCache.set(id, c)
	}
	return c
}

export function CanvasGrid({ grid, tool, currentBlockId, brushHeight, onCommit, onPick, onHover }: Props) {
	const wrapRef = useRef<HTMLDivElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const sizeRef = useRef({ w: 0, h: 0 })
	const viewRef = useRef<View>({ panX: 20, panY: 20, cellPx: 16 })

	// Live interaction state kept in refs so pointer handlers don't trigger re-renders.
	const draftRef = useRef<EditorGrid | null>(null)
	// The committed grid a stroke started from. line/rect previews reset to it each move
	// (overwriting the draft's buffers in place) instead of cloning the whole grid per event.
	const baseRef = useRef<EditorGrid | null>(null)
	const interactRef = useRef<{ active: boolean; startX: number; startZ: number; lastX: number; lastZ: number } | null>(null)
	const panRef = useRef<{ active: boolean; mx: number; my: number; px: number; py: number } | null>(null)
	const spaceRef = useRef(false)
	const hoverRef = useRef<{ gx: number; gz: number } | null>(null)
	const rafRef = useRef(0)

	const applyVal = useCallback(() => (tool === "eraser" ? { id: 0, h: 0 } : { id: currentBlockId, h: brushHeight }), [tool, currentBlockId, brushHeight])

	const draw = useCallback(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext("2d")
		if (!ctx) return
		const { w, h } = sizeRef.current
		const { panX, panY, cellPx } = viewRef.current
		const g = draftRef.current ?? grid

		ctx.clearRect(0, 0, w, h)
		ctx.fillStyle = "#1b1d22"
		ctx.fillRect(0, 0, w, h)
		ctx.imageSmoothingEnabled = false // crisp, pixelated block textures

		// Visible cell range only — keeps large grids fast when zoomed in.
		const minGx = Math.max(0, Math.floor(-panX / cellPx))
		const minGz = Math.max(0, Math.floor(-panY / cellPx))
		const maxGx = Math.min(g.width - 1, Math.floor((w - panX) / cellPx))
		const maxGz = Math.min(g.depth - 1, Math.floor((h - panY) / cellPx))

		for (let gz = minGz; gz <= maxGz; gz++) {
			for (let gx = minGx; gx <= maxGx; gx++) {
				const i = gz * g.width + gx
				const id = g.ids[i]
				const px = panX + gx * cellPx
				const py = panY + gz * cellPx
				if (id === 0) {
					ctx.fillStyle = (gx + gz) & 1 ? "#2a2d34" : "#23262c"
					ctx.fillRect(px, py, cellPx, cellPx)
				} else {
					const img = cellPx >= 3 ? getBlockImage(id) : undefined
					if (img) {
						ctx.drawImage(img, px, py, cellPx, cellPx)
					} else {
						ctx.fillStyle = cssFor(id)
						ctx.fillRect(px, py, cellPx, cellPx)
					}
					const ht = g.heights[i]
					if (ht > 1 && cellPx >= 14) {
						ctx.fillStyle = "rgba(0,0,0,0.55)"
						ctx.fillRect(px, py, Math.min(cellPx, 13), 11)
						ctx.fillStyle = "#fff"
						ctx.font = "9px monospace"
						ctx.textBaseline = "top"
						ctx.fillText(String(ht), px + 1, py + 1)
					}
				}
			}
		}

		if (cellPx >= 6) {
			ctx.strokeStyle = "rgba(255,255,255,0.07)"
			ctx.lineWidth = 1
			ctx.beginPath()
			for (let gx = minGx; gx <= maxGx + 1; gx++) {
				const px = Math.floor(panX + gx * cellPx) + 0.5
				ctx.moveTo(px, panY + minGz * cellPx)
				ctx.lineTo(px, panY + (maxGz + 1) * cellPx)
			}
			for (let gz = minGz; gz <= maxGz + 1; gz++) {
				const py = Math.floor(panY + gz * cellPx) + 0.5
				ctx.moveTo(panX + minGx * cellPx, py)
				ctx.lineTo(panX + (maxGx + 1) * cellPx, py)
			}
			ctx.stroke()
		}

		// Grid bounds outline.
		ctx.strokeStyle = "rgba(255,255,255,0.35)"
		ctx.lineWidth = 1.5
		ctx.strokeRect(panX + 0.5, panY + 0.5, g.width * cellPx, g.depth * cellPx)

		// Hover highlight.
		const hov = hoverRef.current
		if (hov && hov.gx >= 0 && hov.gz >= 0 && hov.gx < g.width && hov.gz < g.depth) {
			ctx.strokeStyle = "#ffd24a"
			ctx.lineWidth = 2
			ctx.strokeRect(panX + hov.gx * cellPx + 1, panY + hov.gz * cellPx + 1, cellPx - 2, cellPx - 2)
		}
	}, [grid])

	const scheduleDraw = useCallback(() => {
		if (rafRef.current) return
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = 0
			draw()
		})
	}, [draw])

	// Size canvas to wrapper, handle DPR.
	useLayoutEffect(() => {
		const wrap = wrapRef.current
		const canvas = canvasRef.current
		if (!wrap || !canvas) return
		const resize = () => {
			const dpr = window.devicePixelRatio || 1
			const cssW = wrap.clientWidth
			const cssH = wrap.clientHeight
			sizeRef.current = { w: cssW, h: cssH }
			canvas.width = Math.round(cssW * dpr)
			canvas.height = Math.round(cssH * dpr)
			canvas.style.width = cssW + "px"
			canvas.style.height = cssH + "px"
			const ctx = canvas.getContext("2d")
			if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			draw()
		}
		resize()
		const ro = new ResizeObserver(resize)
		ro.observe(wrap)
		return () => ro.disconnect()
	}, [draw])

	useEffect(() => {
		scheduleDraw()
	}, [grid, scheduleDraw])

	// Redraw as block textures finish decoding.
	useEffect(() => onTexturesChanged(scheduleDraw), [scheduleDraw])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.code !== "Space") return
			// Always release pan on keyup, even if focus moved to an input mid-press —
			// otherwise spaceRef stays stuck true and left-clicks pan instead of paint.
			if (e.type !== "keydown") {
				spaceRef.current = false
				return
			}
			// On keydown, don't hijack Space while typing in a field (name/dimensions inputs).
			const el = document.activeElement
			if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return
			// Stop the page from scrolling / a focused button from firing while panning.
			e.preventDefault()
			spaceRef.current = true
		}
		window.addEventListener("keydown", onKey)
		window.addEventListener("keyup", onKey)
		return () => {
			window.removeEventListener("keydown", onKey)
			window.removeEventListener("keyup", onKey)
		}
	}, [])

	const cellAt = useCallback((clientX: number, clientY: number) => {
		const canvas = canvasRef.current!
		const rect = canvas.getBoundingClientRect()
		const { panX, panY, cellPx } = viewRef.current
		const gx = Math.floor((clientX - rect.left - panX) / cellPx)
		const gz = Math.floor((clientY - rect.top - panY) / cellPx)
		return { gx, gz }
	}, [])

	const onPointerDown = useCallback(
		(e: React.PointerEvent) => {
			const canvas = canvasRef.current!
			canvas.setPointerCapture(e.pointerId)
			const isPan = e.button === 1 || (e.button === 0 && spaceRef.current)
			if (isPan) {
				panRef.current = { active: true, mx: e.clientX, my: e.clientY, px: viewRef.current.panX, py: viewRef.current.panY }
				return
			}
			if (e.button !== 0) return
			const { gx, gz } = cellAt(e.clientX, e.clientY)

			if (tool === "eyedropper") {
				if (gx >= 0 && gz >= 0 && gx < grid.width && gz < grid.depth) {
					const i = gz * grid.width + gx
					onPick(grid.ids[i], grid.heights[i] || 1)
				}
				return
			}

			const draft = cloneGrid(grid)
			draftRef.current = draft
			baseRef.current = grid // committed grid is immutable; safe to read for previews
			interactRef.current = { active: true, startX: gx, startZ: gz, lastX: gx, lastZ: gz }
			const { id, h } = applyVal()
			if (tool === "pencil" || tool === "eraser") paintCell(draft, gx, gz, id, h)
			else if (tool === "fill") floodFill(draft, gx, gz, id, h)
			scheduleDraw()
		},
		[applyVal, cellAt, grid, onPick, scheduleDraw, tool],
	)

	const onPointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (panRef.current?.active) {
				const p = panRef.current
				viewRef.current.panX = p.px + (e.clientX - p.mx)
				viewRef.current.panY = p.py + (e.clientY - p.my)
				scheduleDraw()
				return
			}
			const { gx, gz } = cellAt(e.clientX, e.clientY)
			const prevHov = hoverRef.current
			if (!prevHov || prevHov.gx !== gx || prevHov.gz !== gz) {
				hoverRef.current = { gx, gz }
				const inB = gx >= 0 && gz >= 0 && gx < grid.width && gz < grid.depth
				const i = gz * grid.width + gx
				onHover(inB ? { gx, gz, id: grid.ids[i], height: grid.heights[i] || 0 } : null)
			}

			const it = interactRef.current
			const draft = draftRef.current
			if (it?.active && draft) {
				const { id, h } = applyVal()
				if (tool === "pencil" || tool === "eraser") {
					paintLine(draft, it.lastX, it.lastZ, gx, gz, id, h)
					it.lastX = gx
					it.lastZ = gz
				} else if (tool === "line" || tool === "rect" || tool === "rectFill") {
					// Each move re-previews from scratch: reset the draft to the base grid
					// in place (no per-event allocation), then redraw the shape.
					const base = baseRef.current
					if (base) {
						draft.ids.set(base.ids)
						draft.heights.set(base.heights)
						if (tool === "line") paintLine(draft, it.startX, it.startZ, gx, gz, id, h)
						else paintRect(draft, it.startX, it.startZ, gx, gz, id, h, tool === "rectFill")
					}
				}
			}
			scheduleDraw()
		},
		[applyVal, cellAt, grid, onHover, scheduleDraw, tool],
	)

	const endStroke = useCallback(() => {
		if (panRef.current?.active) {
			panRef.current = null
			return
		}
		const draft = draftRef.current
		// Only record an undo step if the stroke actually changed something — a bare click
		// with line/rect, or re-painting a cell with its current value, is a no-op.
		if (interactRef.current?.active && draft && !gridsEqual(draft, grid)) {
			onCommit(draft)
		}
		interactRef.current = null
		draftRef.current = null
		baseRef.current = null
	}, [onCommit, grid])

	const onWheel = useCallback(
		(e: React.WheelEvent) => {
			const canvas = canvasRef.current!
			const rect = canvas.getBoundingClientRect()
			const mx = e.clientX - rect.left
			const my = e.clientY - rect.top
			const v = viewRef.current
			const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
			const next = Math.max(MIN_CELL, Math.min(MAX_CELL, v.cellPx * factor))
			// Anchor zoom at cursor.
			const worldX = (mx - v.panX) / v.cellPx
			const worldY = (my - v.panY) / v.cellPx
			v.cellPx = next
			v.panX = mx - worldX * next
			v.panY = my - worldY * next
			scheduleDraw()
		},
		[scheduleDraw],
	)

	const zoomBy = useCallback(
		(factor: number) => {
			const v = viewRef.current
			const { w, h } = sizeRef.current
			const cx = w / 2
			const cy = h / 2
			const next = Math.max(MIN_CELL, Math.min(MAX_CELL, v.cellPx * factor))
			const worldX = (cx - v.panX) / v.cellPx
			const worldY = (cy - v.panY) / v.cellPx
			v.cellPx = next
			v.panX = cx - worldX * next
			v.panY = cy - worldY * next
			scheduleDraw()
		},
		[scheduleDraw],
	)

	const fit = useCallback(() => {
		const { w, h } = sizeRef.current
		const pad = 40
		const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(Math.min((w - pad) / grid.width, (h - pad) / grid.depth))))
		viewRef.current.cellPx = cell
		viewRef.current.panX = (w - grid.width * cell) / 2
		viewRef.current.panY = (h - grid.depth * cell) / 2
		scheduleDraw()
	}, [grid.width, grid.depth, scheduleDraw])

	return (
		<div className="canvas-wrap" ref={wrapRef}>
			<canvas
				ref={canvasRef}
				className={`grid-canvas tool-${tool}`}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={endStroke}
				onPointerCancel={endStroke}
				onPointerLeave={() => {
					hoverRef.current = null
					onHover(null)
					scheduleDraw()
				}}
				onWheel={onWheel}
				onContextMenu={(e) => e.preventDefault()}
			/>
			<div className="canvas-controls">
				<button title="Zoom in" onClick={() => zoomBy(1.25)}>
					＋
				</button>
				<button title="Zoom out" onClick={() => zoomBy(1 / 1.25)}>
					－
				</button>
				<button title="Fit to view" onClick={fit}>
					⊡
				</button>
			</div>
			<div className="canvas-hint">Space+drag or middle-mouse to pan · scroll to zoom</div>
		</div>
	)
}
