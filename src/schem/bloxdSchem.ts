import { AvroWriter } from "./avro"
import { encodeRle } from "./voxelRle"

// Matches bloxd: chunk size 32^3, current .bloxdschem format version 4.
export const CS = 32
const SCHEM_VERSION = 4

// Shared all-air chunk for empty cells inside the dimension box. encodeRle only reads it,
// so one zero-filled buffer is safe to reuse for every empty chunk and across calls.
const EMPTY_CHUNK = new Uint16Array(CS * CS * CS)

// Editor grid in floor (top-down) orientation: cell (gx, gz) maps to world (gx, y, gz),
// with the block extruded up the Y axis for `height` blocks. id 0 = air (empty cell).
export interface GridCell {
	id: number
	height: number
}

export interface GridModel {
	name: string
	width: number // X
	depth: number // Z
	cells: GridCell[] // length width*depth, row-major: index = gz*width + gx
}

function chunkKey(cx: number, cy: number, cz: number): string {
	return `${cx}|${cy}|${cz}`
}

// In-chunk linear index, matching bloxd's ndarray([cs,cs,cs]) layout: x-major, then y, then z.
function localIndex(lx: number, ly: number, lz: number): number {
	return lx * CS * CS + ly * CS + lz
}

interface ChunkEntry {
	x: number
	y: number
	z: number
	rle: Uint8Array
}

export interface BuildResult {
	bytes: Uint8Array
	dimensions: { x: number; y: number; z: number }
	totalBlocks: number
}

export function buildSchematic(grid: GridModel): BuildResult {
	const { width, depth, cells } = grid
	let maxHeight = 1
	let totalBlocks = 0
	for (const c of cells) {
		if (c.id !== 0 && c.height > 0) maxHeight = Math.max(maxHeight, c.height)
	}

	const dimensions = { x: width, y: maxHeight, z: depth }

	// Populate uncompressed chunks for every cell, then RLE-encode. Empty chunks within
	// the dimension box are emitted as air (bloxd's non-disjoint serialize does the same).
	const chunks = new Map<string, Uint16Array>()
	const getChunk = (cx: number, cy: number, cz: number): Uint16Array => {
		const key = chunkKey(cx, cy, cz)
		let arr = chunks.get(key)
		if (!arr) {
			arr = new Uint16Array(CS * CS * CS)
			chunks.set(key, arr)
		}
		return arr
	}

	for (let gz = 0; gz < depth; gz++) {
		for (let gx = 0; gx < width; gx++) {
			const cell = cells[gz * width + gx]
			if (!cell || cell.id === 0 || cell.height <= 0) continue
			for (let y = 0; y < cell.height; y++) {
				const cx = gx >> 5
				const cy = y >> 5
				const cz = gz >> 5
				const arr = getChunk(cx, cy, cz)
				arr[localIndex(gx & 31, y & 31, gz & 31)] = cell.id
				totalBlocks++
			}
		}
	}

	// Emit every chunk overlapping the dimension box, in the same x/y/z order bloxd uses.
	const chunkEntries: ChunkEntry[] = []
	const cxMax = Math.ceil(width / CS)
	const cyMax = Math.ceil(maxHeight / CS)
	const czMax = Math.ceil(depth / CS)
	for (let cx = 0; cx < cxMax; cx++) {
		for (let cy = 0; cy < cyMax; cy++) {
			for (let cz = 0; cz < czMax; cz++) {
				const arr = chunks.get(chunkKey(cx, cy, cz)) ?? EMPTY_CHUNK
				chunkEntries.push({ x: cx, y: cy, z: cz, rle: encodeRle(arr) })
			}
		}
	}

	const w = new AvroWriter()
	w.writeString(grid.name || "schematic")
	// startOffset
	w.writeInt(0); w.writeInt(0); w.writeInt(0)
	// dimensions
	w.writeInt(dimensions.x); w.writeInt(dimensions.y); w.writeInt(dimensions.z)
	// chunkData
	w.writeArray(chunkEntries, (ww, c) => {
		ww.writeInt(c.x); ww.writeInt(c.y); ww.writeInt(c.z); ww.writeBytes(c.rle)
	})
	// blockData (none — no special blocks yet)
	w.writeArray([], () => {})
	// pasteOffset
	w.writeInt(0); w.writeInt(0); w.writeInt(0)
	// lobbyCode union [null, record] -> null branch (index 0)
	w.writeLong(0)
	// disjoint
	w.writeBoolean(false)

	const avroBytes = w.toUint8Array()
	const out = new Uint8Array(4 + avroBytes.length)
	new DataView(out.buffer).setUint32(0, SCHEM_VERSION, true) // 4-byte LE version header
	out.set(avroBytes, 4)
	return { bytes: out, dimensions, totalBlocks }
}
