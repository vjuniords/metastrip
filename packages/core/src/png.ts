import { concat, ensure, latin1, startsWith, u32be } from './bytes';
import { readExifSummary } from './exif';
import type { FormatResult } from './jpeg';
import { detectAiSignals, detectPngTextKey, mergeSignals } from './signals';
import type { EntryKind, ExifSummary, MetadataEntry, StripOptions } from './types';

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Ancillary chunks that affect rendering/animation and are kept. */
const SAFE = new Set(['tRNS', 'gAMA', 'cHRM', 'sRGB', 'sBIT', 'pHYs', 'bKGD', 'acTL', 'fcTL', 'fdAT', 'cICP', 'mDCV', 'cLLI']);
const TEXT = new Set(['tEXt', 'zTXt', 'iTXt']);

export function isPng(b: Uint8Array): boolean {
  return SIGNATURE.every((v, i) => b[i] === v);
}

export function processPng(b: Uint8Array, opts: Required<StripOptions>): FormatResult {
  ensure(isPng(b), 'Missing PNG signature');
  const keep: Uint8Array[] = [b.subarray(0, 8)];
  const entries: MetadataEntry[] = [];
  let exif: ExifSummary | undefined;
  let p = 8;
  let ended = false;

  while (p < b.length) {
    ensure(p + 12 <= b.length, 'Truncated PNG chunk');
    const len = u32be(b, p);
    ensure(len <= 0x7fffffff && p + 12 + len <= b.length, 'Invalid PNG chunk length');
    const type = latin1(b, p + 4, p + 8);
    const chunk = b.subarray(p, p + 12 + len);
    const data = chunk.subarray(8, 8 + len);
    p += 12 + len;

    const critical = (type.charCodeAt(0) & 0x20) === 0;
    if (critical || SAFE.has(type)) {
      keep.push(chunk);
      if (type === 'IEND') {
        ended = true;
        break;
      }
      continue;
    }

    let kind: EntryKind = 'other';
    let detail: string | undefined;
    let signals = detectAiSignals(data);
    let removed = true;

    if (type === 'iCCP') {
      kind = 'icc';
      removed = !opts.keepIcc;
      if (opts.keepIcc) keep.push(chunk);
    } else if (TEXT.has(type)) {
      const nul = data.indexOf(0);
      detail = latin1(data, 0, nul < 0 ? Math.min(data.length, 79) : nul);
      kind = startsWith(data, 0, 'XML:com.adobe.xmp') ? 'xmp' : 'text';
      signals = mergeSignals([signals, detectPngTextKey(detail)]);
    } else if (type === 'eXIf') {
      exif = readExifSummary(data);
      kind = exif.hasGps ? 'gps' : 'exif';
    } else if (type === 'tIME') {
      kind = 'timestamp';
    } else if (type === 'caBX') {
      kind = 'c2pa';
      detail = 'JUMBF';
    }
    entries.push({ kind, container: type, size: chunk.length, removed, aiSignals: signals, detail });
  }

  ensure(ended, 'Missing PNG IEND');
  if (p < b.length) {
    const trailing = b.subarray(p);
    entries.push({ kind: 'trailing', container: 'IEND+', size: trailing.length, removed: true, aiSignals: detectAiSignals(trailing) });
  }
  return { entries, exif, output: concat(keep) };
}
