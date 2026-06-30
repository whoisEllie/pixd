import type { HoverInfo } from "./CanvasGrid"
import { PALETTE_BY_ID } from "../schem/palette"

interface Props {
	hover: HoverInfo | null
	currentBlockId: number
	brushHeight: number
	width: number
	depth: number
	maxHeight: number
	totalBlocks: number
	lastExport: string | null
}

function nameFor(id: number): string {
	if (id === 0) return "Air"
	return PALETTE_BY_ID.get(id)?.name ?? `id ${id}`
}

export function StatusBar({ hover, currentBlockId, brushHeight, width, depth, maxHeight, totalBlocks, lastExport }: Props) {
	return (
		<footer className="statusbar">
			<span>
				Selected: <b>{nameFor(currentBlockId)}</b> · h{brushHeight}
			</span>
			<span className="sep">|</span>
			<span>
				Dimensions: <b>{width}</b>×<b>{maxHeight}</b>×<b>{depth}</b> (X·Y·Z)
			</span>
			<span className="sep">|</span>
			<span>
				Blocks: <b>{totalBlocks.toLocaleString()}</b>
			</span>
			<span className="sep">|</span>
			<span>
				{hover ? (
					<>
						Cursor: ({hover.gx}, {hover.gz}) → {hover.id === 0 ? "empty" : `${nameFor(hover.id)} ·h${hover.height}`}
					</>
				) : (
					"Cursor: —"
				)}
			</span>
			{lastExport && (
				<>
					<span className="sep">|</span>
					<span className="status-ok">{lastExport}</span>
				</>
			)}
		</footer>
	)
}
