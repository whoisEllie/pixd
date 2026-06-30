// Builds a tiny schematic and writes it to disk so it can be round-tripped through
// bloxd's real deserializer (`npm run parse-schematic`). Run: npm run test:roundtrip [outPath]
import { writeFileSync } from "node:fs"
import { buildSchematic, type GridModel } from "../src/schem/bloxdSchem"

// 4x4 floor. Grass border, dirt centre, one stone pillar of height 3.
const GRASS = 4 // Grass Block
const DIRT = 2 // Dirt
const STONE = 11 // (whatever id 11 is — verified by parser output)
const W = 4
const D = 4
const cells = Array.from({ length: W * D }, (_, i) => {
	const gx = i % W
	const gz = (i / W) | 0
	const border = gx === 0 || gz === 0 || gx === W - 1 || gz === D - 1
	return { id: border ? GRASS : DIRT, height: 1 }
})
cells[1 * W + 1] = { id: STONE, height: 3 } // pillar

const grid: GridModel = { name: "roundtrip-test", width: W, depth: D, cells }
const { bytes, dimensions, totalBlocks } = buildSchematic(grid)

const outPath = process.argv[2] ?? "./roundtrip-test.bloxdschem"
writeFileSync(outPath, bytes)
console.log(`Wrote ${bytes.length} bytes to ${outPath}`)
console.log(`dimensions=${JSON.stringify(dimensions)} totalBlocks=${totalBlocks}`)
console.log(`Expected: 12 grass border + 3 dirt + 3 stone (pillar) = 18 blocks`)
