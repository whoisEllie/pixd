import { useEffect, useRef, useState } from "react"
import type { Tool } from "../editor/types"

interface Props {
	name: string
	onName: (n: string) => void
	tool: Tool
	onTool: (t: Tool) => void
	brushHeight: number
	onBrushHeight: (h: number) => void
	width: number
	depth: number
	onResize: (w: number, d: number) => void
	onNew: (w: number, d: number) => void
	onClear: () => void
	onUndo: () => void
	onRedo: () => void
	canUndo: boolean
	canRedo: boolean
	onExport: () => void
	onSaveProject: () => void
	onLoadProject: (file: File) => void
}

const TOOLS: { tool: Tool; icon: string; label: string }[] = [
	{ tool: "pencil", icon: "✏️", label: "Pencil (B)" },
	{ tool: "eraser", icon: "🧽", label: "Eraser (E)" },
	{ tool: "fill", icon: "🪣", label: "Fill (G)" },
	{ tool: "line", icon: "╱", label: "Line (L)" },
	{ tool: "rect", icon: "▭", label: "Rectangle (R)" },
	{ tool: "rectFill", icon: "▮", label: "Filled rectangle (F)" },
	{ tool: "eyedropper", icon: "💧", label: "Eyedropper (I)" },
]

export function Toolbar(props: Props) {
	const [w, setW] = useState(props.width)
	const [d, setD] = useState(props.depth)
	const fileRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		setW(props.width)
		setD(props.depth)
	}, [props.width, props.depth])

	const clampDim = (n: number) => Math.max(1, Math.min(512, Math.floor(n) || 1))

	return (
		<header className="toolbar">
			<div className="tb-group tb-brand">
				<strong>Pixd</strong>
			</div>

			<div className="tb-group">
				<label className="tb-field">
					Name
					<input value={props.name} onChange={(e) => props.onName(e.target.value)} style={{ width: 130 }} />
				</label>
			</div>

			<div className="tb-group tb-tools">
				{TOOLS.map((t) => (
					<button
						key={t.tool}
						className={`tb-tool${props.tool === t.tool ? " active" : ""}`}
						title={t.label}
						onClick={() => props.onTool(t.tool)}
					>
						{t.icon}
					</button>
				))}
			</div>

			<div className="tb-group">
				<label className="tb-field" title="Block height (extrudes upward along Y)">
					Height
					<input
						type="number"
						min={1}
						max={255}
						value={props.brushHeight}
						onChange={(e) => props.onBrushHeight(Math.max(1, Math.min(255, Math.floor(Number(e.target.value)) || 1)))}
						style={{ width: 54 }}
					/>
				</label>
			</div>

			<div className="tb-group">
				<button onClick={props.onUndo} disabled={!props.canUndo} title="Undo (Ctrl+Z)">
					↶
				</button>
				<button onClick={props.onRedo} disabled={!props.canRedo} title="Redo (Ctrl+Y)">
					↷
				</button>
			</div>

			<div className="tb-group">
				<label className="tb-field">
					W
					<input type="number" min={1} max={512} value={w} onChange={(e) => setW(clampDim(Number(e.target.value)))} style={{ width: 56 }} />
				</label>
				<label className="tb-field">
					D
					<input type="number" min={1} max={512} value={d} onChange={(e) => setD(clampDim(Number(e.target.value)))} style={{ width: 56 }} />
				</label>
				<button onClick={() => props.onResize(clampDim(w), clampDim(d))} title="Resize, keeping artwork">
					Resize
				</button>
				<button
					onClick={() => {
						if (confirm("Start a new blank grid? Unsaved work is lost.")) props.onNew(clampDim(w), clampDim(d))
					}}
				>
					New
				</button>
				<button onClick={() => confirm("Clear all blocks?") && props.onClear()}>Clear</button>
			</div>

			<div className="tb-group tb-right">
				<button onClick={props.onSaveProject} title="Save editable project (.pixd.json)">
					Save
				</button>
				<button onClick={() => fileRef.current?.click()} title="Load a saved project">
					Load
				</button>
				<input
					ref={fileRef}
					type="file"
					accept=".json,.pixd.json"
					style={{ display: "none" }}
					onChange={(e) => {
						const f = e.target.files?.[0]
						if (f) props.onLoadProject(f)
						e.target.value = ""
					}}
				/>
				<button className="tb-export" onClick={props.onExport} title="Export .bloxdschem">
					Export .bloxdschem
				</button>
			</div>
		</header>
	)
}
