export type Tool = "pencil" | "eraser" | "fill" | "line" | "rect" | "rectFill" | "eyedropper"

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
