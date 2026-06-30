import { useMemo, useState } from "react"
import { PALETTE, contrastText, rgbCss } from "../schem/palette"

interface Props {
	currentBlockId: number
	onSelect: (id: number) => void
}

export function PalettePanel({ currentBlockId, onSelect }: Props) {
	const [query, setQuery] = useState("")
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return PALETTE
		return PALETTE.filter(
			(b) => b.label.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || String(b.id) === q,
		)
	}, [query])

	return (
		<div className="palette">
			<div className="palette-head">
				<input
					className="palette-search"
					placeholder={`Search ${PALETTE.length} blocks…`}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
			</div>
			<div className="swatch-grid">
				{filtered.map((b) => (
					<button
						key={b.id}
						className={`swatch${b.id === currentBlockId ? " selected" : ""}`}
						style={{
							backgroundColor: rgbCss(b.color),
							backgroundImage: b.textureUrl ? `url(${b.textureUrl})` : undefined,
							color: contrastText(b.color),
						}}
						title={`${b.label} — ${b.name} (id ${b.id})`}
						onClick={() => onSelect(b.id)}
					>
						<span className="swatch-label">{b.label}</span>
					</button>
				))}
				{filtered.length === 0 && <div className="palette-empty">No blocks match “{query}”.</div>}
			</div>
		</div>
	)
}
