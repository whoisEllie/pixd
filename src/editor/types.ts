export type Tool = "pencil" | "eraser" | "fill" | "line" | "rect" | "rectFill" | "eyedropper"

// Shared grid dimension bounds (UI clamps + project-file validation use these).
export const MIN_DIM = 1
export const MAX_DIM = 512

// Editor working model. Floor orientation: index = gz * width + gx, mapping to world
// (gx, y, gz). `ids` holds block ids (0 = air), `heights` the extrusion up the Y axis.
export interface EditorGrid {
	name: string
	width: number // X
	depth: number // Z
	ids: Uint16Array
	heights: Uint8Array
}

export function makeGrid(width: number, depth: number, name = "schematic"): EditorGrid {
	return {
		name,
		width,
		depth,
		ids: new Uint16Array(width * depth),
		heights: new Uint8Array(width * depth),
	}
}

export function cloneGrid(g: EditorGrid): EditorGrid {
	return { name: g.name, width: g.width, depth: g.depth, ids: g.ids.slice(), heights: g.heights.slice() }
}

// Block-content equality (ignores name). Used to drop no-op strokes before they
// become undo steps.
export function gridsEqual(a: EditorGrid, b: EditorGrid): boolean {
	if (a.width !== b.width || a.depth !== b.depth) return false
	const ai = a.ids
	const bi = b.ids
	const ah = a.heights
	const bh = b.heights
	if (ai.length !== bi.length) return false
	for (let i = 0; i < ai.length; i++) {
		if (ai[i] !== bi[i] || ah[i] !== bh[i]) return false
	}
	return true
}
