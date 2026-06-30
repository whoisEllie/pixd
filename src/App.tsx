import { useCallback, useEffect, useMemo, useState } from "react"
import { CanvasGrid, type HoverInfo } from "./components/CanvasGrid"
import { PalettePanel } from "./components/PalettePanel"
import { StatusBar } from "./components/StatusBar"
import { Toolbar } from "./components/Toolbar"
import { useEditor } from "./editor/useEditor"
import type { Tool } from "./editor/types"
import { exportSchematic, parseProject, saveProject } from "./editor/io"

const SHORTCUTS: Record<string, Tool> = { b: "pencil", e: "eraser", g: "fill", l: "line", r: "rect", f: "rectFill", i: "eyedropper" }

export default function App() {
	const ed = useEditor(32, 32)
	const [tool, setTool] = useState<Tool>("pencil")
	const [currentBlockId, setCurrentBlockId] = useState(2) // Dirt
	const [brushHeight, setBrushHeight] = useState(1)
	const [hover, setHover] = useState<HoverInfo | null>(null)
	const [lastExport, setLastExport] = useState<string | null>(null)

	const { grid } = ed

	const { totalBlocks, maxHeight } = useMemo(() => {
		let total = 0
		let mh = 1
		for (let i = 0; i < grid.ids.length; i++) {
			if (grid.ids[i] !== 0) {
				const h = grid.heights[i] || 1
				total += h
				if (h > mh) mh = h
			}
		}
		return { totalBlocks: total, maxHeight: mh }
	}, [grid])

	const selectBlock = useCallback(
		(id: number) => {
			setCurrentBlockId(id)
			setTool((t) => (t === "eraser" || t === "eyedropper" ? "pencil" : t))
		},
		[],
	)

	const onPick = useCallback((id: number, height: number) => {
		if (id !== 0) setCurrentBlockId(id)
		setBrushHeight(height)
		setTool("pencil")
	}, [])

	const onExport = useCallback(() => {
		try {
			const { totalBlocks: tb, dimensions } = exportSchematic(grid)
			setLastExport(`Exported ${tb.toLocaleString()} blocks (${dimensions.x}×${dimensions.y}×${dimensions.z})`)
		} catch (err) {
			alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
		}
	}, [grid])

	const onLoadProject = useCallback(
		(file: File) => {
			file
				.text()
				.then((text) => ed.load(parseProject(text)))
				.catch((err) => alert(`Load failed: ${err instanceof Error ? err.message : String(err)}`))
		},
		[ed],
	)

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const el = e.target as HTMLElement
			if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return
			if (e.ctrlKey || e.metaKey) {
				if (e.key.toLowerCase() === "z") {
					e.preventDefault()
					e.shiftKey ? ed.redo() : ed.undo()
				} else if (e.key.toLowerCase() === "y") {
					e.preventDefault()
					ed.redo()
				}
				return
			}
			const t = SHORTCUTS[e.key.toLowerCase()]
			if (t) setTool(t)
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [ed])

	return (
		<div className="app">
			<Toolbar
				name={grid.name}
				onName={ed.setName}
				tool={tool}
				onTool={setTool}
				brushHeight={brushHeight}
				onBrushHeight={setBrushHeight}
				width={grid.width}
				depth={grid.depth}
				onResize={ed.resize}
				onNew={ed.newGrid}
				onClear={ed.clear}
				onUndo={ed.undo}
				onRedo={ed.redo}
				canUndo={ed.canUndo}
				canRedo={ed.canRedo}
				onExport={onExport}
				onSaveProject={() => saveProject(grid)}
				onLoadProject={onLoadProject}
			/>
			<div className="main">
				<PalettePanel currentBlockId={currentBlockId} onSelect={selectBlock} />
				<CanvasGrid
					grid={grid}
					tool={tool}
					currentBlockId={currentBlockId}
					brushHeight={brushHeight}
					onCommit={ed.commit}
					onPick={onPick}
					onHover={setHover}
				/>
			</div>
			<StatusBar
				hover={hover}
				currentBlockId={currentBlockId}
				brushHeight={brushHeight}
				width={grid.width}
				depth={grid.depth}
				maxHeight={maxHeight}
				totalBlocks={totalBlocks}
				lastExport={lastExport}
			/>
		</div>
	)
}
