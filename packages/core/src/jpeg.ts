import { buildOrientationApp1, readExifSummary } from './exif';
import { concat, ensure, startsWith, u16be } from './bytes';
import { detectAiSignals } from './signals';
import type { EntryKind, ExifSummary, MetadataEntry, StripOptions } from './types';

export interface FormatResult {
  entries: MetadataEntry[];
  exif?: ExifSummary;
  output: Uint8Array<ArrayBuffer>;
}

const XMP_NS = 'http://ns.adobe.com/xap/1.0/';

/**
 * Walks every JPEG marker, including those between progressive scans,
 * dropping metadata segments and copying everything else byte-for-byte.
 * Pixels are never re-encoded.
 */
export function processJpeg(b: Uint8Array, opts: Required<StripOptions>): FormatResult {
  ensure(b[0] === 0xff && b[1] === 0xd8, 'Missing JPEG SOI');
  const keep: Uint8Array[] = [b.subarray(0, 2)];
  const entries: MetadataEntry[] = [];
  let exif: ExifSummary | undefined;
  let insertAt = -1; // index in `keep` where the orientation APP1 goes
  let p = 2;
  let ended = false;

  const record = (kind: EntryKind, container: string, seg: Uint8Array, removed: boolean, detail?: string) =>
    entries.push({ kind, container, size: seg.length, removed, aiSignals: detectAiSignals(seg), detail });

  while (p < b.length) {
    // Entropy-coded data: copy until the next real marker.
    if (b[p] !== 0xff) {
      const start = p;
      while (p < b.length && !(b[p] === 0xff && b[p + 1] !== 0x00 && !(b[p + 1]! >= 0xd0 && b[p + 1]! <= 0xd7))) p++;
      keep.push(b.subarray(start, p));
      continue;
    }
    // Skip fill bytes.
    while (p + 1 < b.length && b[p + 1] === 0xff) p++;
    if (p + 1 >= b.length) break;
    const marker = b[p + 1]!;

    if (marker === 0xd9) {
      keep.push(b.subarray(p, p + 2));
      p += 2;
      ended = true;
      break;
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0x00) {
      keep.push(b.subarray(p, p + 2));
      p += 2;
      continue;
    }

    ensure(p + 4 <= b.length, 'Truncated JPEG segment header');
    const len = u16be(b, p + 2);
    ensure(len >= 2 && p + 2 + len <= b.length, 'Invalid JPEG segment length');
    const seg = b.subarray(p, p + 2 + len);
    const body = 4; // offset of payload inside seg
    p += 2 + len;

    if (marker === 0xe0) {
      // APP0: keep plain JFIF, drop JFXX thumbnails and others.
      if (startsWith(seg, body, 'JFIF\0')) {
        keep.push(seg);
        if (insertAt < 0) insertAt = keep.length;
      } else record('thumbnail', 'APP0', seg, true);
    } else if (marker === 0xe1) {
      if (startsWith(seg, body, 'Exif\0')) {
        const summary = readExifSummary(seg.subarray(body + 6));
        exif = exif ?? summary;
        record(summary.hasGps ? 'gps' : 'exif', 'APP1', seg, true);
      } else if (startsWith(seg, body, XMP_NS) || startsWith(seg, body, 'http://ns.adobe.com/xmp/extension/')) {
        record('xmp', 'APP1', seg, true);
      } else record('other', 'APP1', seg, true);
    } else if (marker === 0xe2) {
      if (startsWith(seg, body, 'ICC_PROFILE\0')) {
        if (opts.keepIcc) keep.push(seg);
        record('icc', 'APP2', seg, !opts.keepIcc);
      } else record('other', 'APP2', seg, true, 'MPF/FlashPix');
    } else if (marker === 0xeb) {
      record('c2pa', 'APP11', seg, true, 'JUMBF');
    } else if (marker === 0xed) {
      record('iptc', 'APP13', seg, true, 'Photoshop/IPTC');
    } else if (marker === 0xee && startsWith(seg, body, 'Adobe')) {
      keep.push(seg); // Required for correct CMYK/YCCK color decoding.
    } else if (marker >= 0xe3 && marker <= 0xef) {
      record('other', `APP${marker - 0xe0}`, seg, true);
    } else if (marker === 0xfe) {
      record('comment', 'COM', seg, true);
    } else {
      keep.push(seg); // SOF, DHT, DQT, DRI, SOS, ...
    }
  }

  ensure(ended, 'Missing JPEG EOI');
  if (p < b.length) {
    const trailing = b.subarray(p);
    record('trailing', 'EOI+', trailing, true);
  }

  if (opts.keepOrientation && exif?.orientation && exif.orientation !== 1) {
    keep.splice(insertAt < 0 ? 1 : insertAt, 0, buildOrientationApp1(exif.orientation));
  }

  return { entries, exif, output: concat(keep) };
}
