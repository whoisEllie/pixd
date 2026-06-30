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
