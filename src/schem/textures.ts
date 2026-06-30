import { BLOCKS } from "../data/blocks"

// Loads curated block textures into HTMLImageElements once, and lets the canvas
// re-render as they finish loading (images decode asynchronously).

const images = new Map<number, HTMLImageElement>()
const listeners = new Set<() => void>()

for (const b of BLOCKS) {
	if (!b.textureUrl) continue
	const img = new Image()
	img.onload = () => listeners.forEach((l) => l())
	img.src = b.textureUrl
	images.set(b.id, img)
}

/** Returns the block's texture only once it has decoded and is drawable. */
export function getBlockImage(id: number): HTMLImageElement | undefined {
	const img = images.get(id)
	return img && img.complete && img.naturalWidth > 0 ? img : undefined
}

/** Subscribe to texture-load events (to trigger a redraw). Returns an unsubscribe fn. */
export function onTexturesChanged(cb: () => void): () => void {
	listeners.add(cb)
	return () => listeners.delete(cb)
}
