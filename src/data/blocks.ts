// Curated Pixd block palette — HAND-MAINTAINED, not auto-generated.
//
// This is the single source of truth for what blocks the editor offers. Add an entry to
// expose a block; remove one to hide it. Each entry maps a friendly editor label to a
// real bloxd block id plus a texture and a fallback colour.
//
// `id` MUST match the block's id in bloxd's blockMetadata — it is what gets written into
// the .bloxdschem file. Get ids/colours by inspecting blockMetadata (or the old full
// dump). `color` is used for the canvas at small zoom and as a fallback while/if the
// texture is unavailable. `textureUrl` is a bundled image under src/assets/textures.

import dirtTexture from "../assets/textures/dirt.png"
import stoneTexture from "../assets/textures/stone.png"
import maplePlanksTexture from "../assets/textures/planks_maple.png"

export interface CuratedBlock {
	/** bloxd block id — written to the schematic. Must match blockMetadata. */
	id: number
	/** bloxd canonical block name (for reference / lookup). */
	name: string
	/** Display label shown in the editor. */
	label: string
	/** Bundled texture image, or null to render as a flat colour. */
	textureUrl: string | null
	/** Fallback / small-zoom fill colour, sampled from the bloxd texture. */
	color: [number, number, number]
}

export const BLOCKS: CuratedBlock[] = [
	{ id: 2, name: "Dirt", label: "Dirt", textureUrl: dirtTexture, color: [134, 93, 73] },
	{ id: 28, name: "Stone", label: "Stone", textureUrl: stoneTexture, color: [150, 147, 147] },
	{ id: 15, name: "Maple Wood Planks", label: "Wood", textureUrl: maplePlanksTexture, color: [170, 137, 82] },
]
