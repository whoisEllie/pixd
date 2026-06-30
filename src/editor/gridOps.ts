import type { EditorGrid } from "./types"

// All ops mutate the grid's typed arrays in place — callers work on a per-stroke draft
// copy and commit it as one undo step.

export function inBounds(g: EditorGrid, gx: number, gz: number): boolean {
	return gx >= 0 && gz >= 0 && gx < g.width && gz < g.depth
}

export function paintCell(g: EditorGrid, gx: number, gz: number, id: number, height: number): void {
	if (!inBounds(g, gx, gz)) return
	const i = gz * g.width + gx
	g.ids[i] = id
	g.heights[i] = id === 0 ? 0 : Math.max(1, height)
}

// Bresenham — fills gaps when the pointer moves fast between events.
export function paintLine(g: EditorGrid, x0: number, z0: number, x1: number, z1: number, id: number, height: number): void {
	let dx = Math.abs(x1 - x0)
	let dz = Math.abs(z1 - z0)
	const sx = x0 < x1 ? 1 : -1
	const sz = z0 < z1 ? 1 : -1
	let err = dx - dz
	let x = x0
	let z = z0
	for (;;) {
		paintCell(g, x, z, id, height)
		if (x === x1 && z === z1) break
		const e2 = 2 * err
		if (e2 > -dz) {
			err -= dz
			x += sx
		}
		if (e2 < dx) {
			err += dx
			z += sz
		}
	}
}

export function paintRect(g: EditorGrid, x0: number, z0: number, x1: number, z1: number, id: number, height: number, fill: boolean): void {
	const minX = Math.min(x0, x1)
	const maxX = Math.max(x0, x1)
	const minZ = Math.min(z0, z1)
	const maxZ = Math.max(z0, z1)
	for (let z = minZ; z <= maxZ; z++) {
		for (let x = minX; x <= maxX; x++) {
			const edge = x === minX || x === maxX || z === minZ || z === maxZ
			if (fill || edge) paintCell(g, x, z, id, height)
		}
	}
}

// 4-connected flood fill over cells sharing the clicked cell's block id.
export function floodFill(g: EditorGrid, gx: number, gz: number, id: number, height: number): void {
	if (!inBounds(g, gx, gz)) return
	const target = g.ids[gz * g.width + gx]
	if (target === id) return
	const stack: [number, number][] = [[gx, gz]]
	while (stack.length) {
		const [x, z] = stack.pop()!
		if (!inBounds(g, x, z)) continue
		const i = z * g.width + x
		if (g.ids[i] !== target) continue
		g.ids[i] = id
		g.heights[i] = id === 0 ? 0 : Math.max(1, height)
		stack.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1])
	}
}
