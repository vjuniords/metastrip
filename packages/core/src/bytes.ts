import { MetaStripError } from './types';

export function u16be(b: Uint8Array, o: number): number {
  return ((b[o]! << 8) | b[o + 1]!) >>> 0;
}
export function u32be(b: Uint8Array, o: number): number {
  return ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;
}
export function u32le(b: Uint8Array, o: number): number {
  return (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;
}
export function writeU32le(b: Uint8Array, o: number, v: number): void {
  b[o] = v & 0xff;
  b[o + 1] = (v >>> 8) & 0xff;
  b[o + 2] = (v >>> 16) & 0xff;
  b[o + 3] = (v >>> 24) & 0xff;
}

/** Latin-1 decode: 1 byte -> 1 char, never throws. */
export function latin1(b: Uint8Array, start = 0, end = b.length): string {
  let s = '';
  const CHUNK = 0x8000;
  for (let i = start; i < end; i += CHUNK) {
    s += String.fromCharCode(...b.subarray(i, Math.min(end, i + CHUNK)));
  }
  return s;
}

export function startsWith(b: Uint8Array, offset: number, ascii: string): boolean {
  if (offset + ascii.length > b.length) return false;
  for (let i = 0; i < ascii.length; i++) {
    if (b[offset + i] !== ascii.charCodeAt(i)) return false;
  }
  return true;
}

export function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function ensure(cond: boolean, message: string): asserts cond {
  if (!cond) throw new MetaStripError('CORRUPT_FILE', message);
}
