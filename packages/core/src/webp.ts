import { concat, ensure, latin1, startsWith, u32le, writeU32le } from './bytes';
import { readExifSummary } from './exif';
import type { FormatResult } from './jpeg';
import { detectAiSignals } from './signals';
import type { EntryKind, ExifSummary, MetadataEntry, StripOptions } from './types';

const IMAGE_CHUNKS = new Set(['VP8 ', 'VP8L', 'VP8X', 'ALPH', 'ANIM', 'ANMF']);
const FLAG_ICC = 0x20;
const FLAG_EXIF = 0x08;
const FLAG_XMP = 0x04;

export function isWebp(b: Uint8Array): boolean {
  return startsWith(b, 0, 'RIFF') && startsWith(b, 8, 'WEBP');
}

export function processWebp(b: Uint8Array, opts: Required<StripOptions>): FormatResult {
  ensure(isWebp(b) && b.length >= 12, 'Missing WebP header');
  const riffEnd = Math.min(b.length, 8 + u32le(b, 4));
  const keep: Uint8Array[] = [];
  const entries: MetadataEntry[] = [];
  let exif: ExifSummary | undefined;
  let vp8x: Uint8Array | undefined;
  let p = 12;

  while (p + 8 <= riffEnd) {
    const type = latin1(b, p, p + 4);
    const size = u32le(b, p + 4);
    const padded = size + (size & 1);
    ensure(p + 8 + size <= riffEnd, 'Invalid WebP chunk size');
    const chunk = b.subarray(p, Math.min(riffEnd, p + 8 + padded));
    const data = chunk.subarray(8, 8 + size);
    p += 8 + padded;

    if (IMAGE_CHUNKS.has(type)) {
      if (type === 'VP8X') {
        vp8x = chunk.slice(); // copy: we will rewrite its flags
        keep.push(vp8x);
      } else keep.push(chunk);
      continue;
    }

    let kind: EntryKind = 'other';
    let removed = true;
    if (type === 'ICCP') {
      kind = 'icc';
      removed = !opts.keepIcc;
      if (opts.keepIcc) keep.push(chunk);
    } else if (type === 'EXIF') {
      const tiff = startsWith(data, 0, 'Exif\0\0') ? data.subarray(6) : data;
      exif = readExifSummary(tiff);
      kind = exif.hasGps ? 'gps' : 'exif';
    } else if (type === 'XMP ') {
      kind = 'xmp';
    } else if (type === 'C2PA') {
      kind = 'c2pa';
    }
    entries.push({ kind, container: type.trim(), size: chunk.length, removed, aiSignals: detectAiSignals(data) });
  }

  if (vp8x && vp8x.length > 8) {
    let flags = vp8x[8]! & ~(FLAG_EXIF | FLAG_XMP);
    if (!opts.keepIcc) flags &= ~FLAG_ICC;
    vp8x[8] = flags;
  }

  const body = concat(keep);
  const header = new Uint8Array(12);
  header.set(b.subarray(0, 12));
  writeU32le(header, 4, body.length + 4);
  return { entries, exif, output: concat([header, body]) };
}
