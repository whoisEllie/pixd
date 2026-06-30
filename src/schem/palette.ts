import { BLOCKS, type CuratedBlock } from "../data/blocks"

// The palette is the curated, hand-maintained list in data/blocks.ts. Air (id 0) is the
// eraser and is not in this list.
export type PaletteBlock = CuratedBlock

export const PALETTE: PaletteBlock[] = BLOCKS

export const PALETTE_BY_ID: ReadonlyMap<number, PaletteBlock> = new Map(PALETTE.map((b) => [b.id, b]))

export const AIR_ID = 0

export function rgbCss([r, g, b]: [number, number, number]): string {
	return `rgb(${r}, ${g}, ${b})`
}

// Pick black/white text for legibility over a swatch colour.
export function contrastText([r, g, b]: [number, number, number]): string {
	return r * 0.299 + g * 0.587 + b * 0.114 > 140 ? "#111" : "#fff"
}
