// Minimal Avro binary writer — just enough to encode the bloxd schematic v4 record
// (see BloxdSchematicUtils.ts in the bloxd repo). Hand-rolled so the web app needs no
// `avsc` + Buffer polyfill. Avro encodes both int and long as zig-zag base-128 varints.

export class AvroWriter {
	private bytes: number[] = []

	private pushByte(b: number): void {
		this.bytes.push(b & 0xff)
	}

	// Zig-zag + base-128 varint. Uses arithmetic (not 32-bit bit-ops) so byte lengths
	// beyond 2^31 still encode correctly.
	writeLong(n: number): void {
		let zz = n >= 0 ? n * 2 : -n * 2 - 1
		while (zz >= 128) {
			this.pushByte(128 | (zz % 128))
			zz = Math.floor(zz / 128)
		}
		this.pushByte(zz)
	}

	writeInt(n: number): void {
		this.writeLong(n)
	}

	writeBoolean(b: boolean): void {
		this.pushByte(b ? 1 : 0)
	}

	writeBytes(data: Uint8Array): void {
		this.writeLong(data.length)
		for (let i = 0; i < data.length; i++) this.pushByte(data[i])
	}

	writeString(s: string): void {
		const utf8 = new TextEncoder().encode(s)
		this.writeBytes(utf8)
	}

	// Avro array: a single positive-count block followed by a 0 terminator. avsc decodes
	// this form. Items are written by the caller's callback.
	writeArray<T>(items: readonly T[], writeItem: (w: AvroWriter, item: T) => void): void {
		if (items.length > 0) {
			this.writeLong(items.length)
			for (const item of items) writeItem(this, item)
		}
		this.writeLong(0)
	}

	toUint8Array(): Uint8Array {
		return Uint8Array.from(this.bytes)
	}
}
