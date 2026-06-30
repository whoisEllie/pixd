import paletteJson from "../data/blockPalette.json"

export interface PaletteBlock {
	id: number
	name: string
	color: [number, number, number]
	harvestType?: string
}

// Block ids and colours are extracted from the bloxd repo (blockMetadata + texture
// atlas). Order is by ascending block id. Air (id 0) is the eraser, not in this list.
export const PALETTE: PaletteBlock[] = paletteJson as PaletteBlock[]

export const PALETTE_BY_ID: ReadonlyMap<number, PaletteBlock> = new Map(PALETTE.map((b) => [b.id, b]))

export const AIR_ID = 0

export function rgbCss([r, g, b]: [number, number, number]): string {
	return `rgb(${r}, ${g}, ${b})`
}

// Pick black/white text for legibility over a swatch colour.
export function contrastText([r, g, b]: [number, number, number]): string {
	return r * 0.299 + g * 0.587 + b * 0.114 > 140 ? "#111" : "#fff"
}
