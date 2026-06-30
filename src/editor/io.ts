import { buildSchematic, type GridModel } from "../schem/bloxdSchem"
import { type EditorGrid, makeGrid } from "./types"

function sanitizeFilename(name: string): string {
	return (name.trim() || "schematic").replace(/[^a-z0-9_\-]+/gi, "_")
}

function triggerDownload(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(url)
}

function toGridModel(g: EditorGrid): GridModel {
	const cells = new Array(g.width * g.depth)
	for (let i = 0; i < cells.length; i++) cells[i] = { id: g.ids[i], height: g.heights[i] || 1 }
	return { name: g.name, width: g.width, depth: g.depth, cells }
}

export function exportSchematic(g: EditorGrid): { totalBlocks: number; dimensions: { x: number; y: number; z: number } } {
	const { bytes, totalBlocks, dimensions } = buildSchematic(toGridModel(g))
	const ab = new ArrayBuffer(bytes.length)
	new Uint8Array(ab).set(bytes)
	triggerDownload(new Blob([ab], { type: "application/octet-stream" }), `${sanitizeFilename(g.name)}.bloxdschem`)
	return { totalBlocks, dimensions }
}

// Project format: lossless editor save (block ids + heights), distinct from .bloxdschem.
interface ProjectJson {
	format: "bloxd-schem-editor-project"
	version: 1
	name: string
	width: number
	depth: number
	ids: number[]
	heights: number[]
}

export function saveProject(g: EditorGrid): void {
	const project: ProjectJson = {
		format: "bloxd-schem-editor-project",
		version: 1,
		name: g.name,
		width: g.width,
		depth: g.depth,
		ids: Array.from(g.ids),
		heights: Array.from(g.heights),
	}
	triggerDownload(new Blob([JSON.stringify(project)], { type: "application/json" }), `${sanitizeFilename(g.name)}.bsep.json`)
}

export function parseProject(text: string): EditorGrid {
	const p = JSON.parse(text) as ProjectJson
	if (p.format !== "bloxd-schem-editor-project") throw new Error("Not a schem-editor project file")
	const g = makeGrid(p.width, p.depth, p.name)
	g.ids.set(p.ids.slice(0, g.ids.length))
	g.heights.set(p.heights.slice(0, g.heights.length))
	return g
}
