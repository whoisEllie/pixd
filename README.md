# Bloxd Schem Editor

An MS-Paint / Aseprite-style web tool for drawing voxel maps on a pixel grid and
exporting them as **`.bloxdschem`** files for [bloxd](https://bloxd.io) map testing.

Each pixel is one block on a top-down floor plane (X·Z). Paint with the full block
palette, set per-cell **height** to extrude blocks upward (Y), then export a schematic
the bloxd engine loads natively.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Draw → set a name → **Export .bloxdschem**. Load the file in bloxd via WorldBuilder.

## Features

- **Tools**: pencil, eraser, flood fill, line, rectangle, filled rectangle, eyedropper
  (keyboard: `B E G L R F I`).
- **Palette**: 548 solid blocks with real bloxd colours, searchable by name or id.
- **Height**: paint a height value to build walls/pillars (extrudes up the Y axis).
- **Canvas**: scroll to zoom, space-drag or middle-mouse to pan, fit-to-view.
- **Undo/redo** (`Ctrl+Z` / `Ctrl+Y`), resize keeping artwork, save/load editable
  project files (`.bsep.json`).

## How the export works

A `.bloxdschem` is a 4-byte little-endian version header (`4`) followed by an Avro
record: `name`, `startOffset`, `dimensions`, `chunkData[]`, `blockData[]`,
`pasteOffset`, `lobbyCode`, `disjoint`. Each chunk in `chunkData` is a 32³ block-id
grid run-length encoded with the `voxel-crunch` scheme. Block ids and palette colours
are extracted from the bloxd repo (`blockMetadata` + texture atlas).

The Avro writer (`src/schem/avro.ts`) and RLE codec (`src/schem/voxelRle.ts`) are
hand-rolled and byte-compatible, so the app has **no native/Buffer dependencies** and
runs fully in the browser. Output is validated by round-tripping through bloxd's own
deserializer.

## Layout

```
src/
  data/blockPalette.json   block id + name + RGB, extracted from bloxd
  schem/                   encoding core (RLE, Avro, schematic builder, palette)
  editor/                  grid model, tool ops, undo/redo state, file I/O
  components/              Toolbar, PalettePanel, CanvasGrid, StatusBar
test/roundtrip.ts          emits a sample .bloxdschem for validation
```

## Roadmap

- Multi-layer / true 3D sculpting (sidebar layer stack, per-Y editing).
- Import existing `.bloxdschem` files for editing.
- Block metadata (signs, orientation) via `blockData`.
- Palette categories / favourites.
