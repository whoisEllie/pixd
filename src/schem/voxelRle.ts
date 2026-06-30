// Byte-exact reimplementation of `voxel-crunch` (v0.2.1) run-length encoding, the
// format bloxd uses for each 32^3 chunk inside a .bloxdschem file.
//
// Per run of identical values: varint(length) then varint(value), where varint is
// little-endian base-128 with the high bit marking continuation. Values are uint16
// block ids; runs never cross the chunk boundary (caller passes one chunk at a time).

function pushVarint(out: number[], n: number): void {
	// n is a non-negative integer (length or block id). Match voxel-crunch exactly:
	// emit low 7 bits with 0x80 set while >= 128, then the final < 128 byte.
	let v = n >>> 0
	while (v >= 128) {
		out.push(128 + (v & 0x7f))
		v >>>= 7
	}
	out.push(v)
}

export function encodeRle(chunk: Uint16Array): Uint8Array {
	const out: number[] = []
	const len = chunk.length
	let i = 0
	while (i < len) {
		const v = chunk[i]
		let runLen = 0
		while (i < len && chunk[i] === v) {
			i++
			runLen++
		}
		pushVarint(out, runLen)
		pushVarint(out, v)
	}
	return Uint8Array.from(out)
}

// Inverse — only used by tests / future import support.
export function decodeRle(runs: Uint8Array, out: Uint16Array): Uint16Array {
	const nruns = runs.length
	let ptr = 0
	let cptr = 0
	while (ptr < nruns) {
		let l = 0
		let s = 0
		while (ptr < nruns && runs[ptr] >= 128) {
			l += (runs[ptr++] & 0x7f) << s
			s += 7
		}
		l += runs[ptr++] << s
		let v = 0
		s = 0
		while (ptr < nruns && runs[ptr] >= 128) {
			v += (runs[ptr++] & 0x7f) << s
			s += 7
		}
		v += runs[ptr++] << s
		for (let k = 0; k < l; k++) out[cptr++] = v
	}
	return out
}
