import type { ExifSummary } from './types';

/**
 * Minimal, defensive TIFF/EXIF reader (IFD0 only). Never throws: on any
 * inconsistency it returns what it could read.
 * @param tiff bytes starting at the TIFF header ("II*\0" / "MM\0*").
 */
export function readExifSummary(tiff: Uint8Array): ExifSummary {
  const summary: ExifSummary = { hasGps: false };
  if (tiff.length < 8) return summary;
  const le = tiff[0] === 0x49 && tiff[1] === 0x49;
  const be = tiff[0] === 0x4d && tiff[1] === 0x4d;
  if (!le && !be) return summary;

  const u16 = (o: number) =>
    o + 2 > tiff.length ? -1 : le ? tiff[o]! | (tiff[o + 1]! << 8) : (tiff[o]! << 8) | tiff[o + 1]!;
  const u32 = (o: number) =>
    o + 4 > tiff.length
      ? -1
      : le
        ? (tiff[o]! | (tiff[o + 1]! << 8) | (tiff[o + 2]! << 16) | (tiff[o + 3]! << 24)) >>> 0
        : ((tiff[o]! << 24) | (tiff[o + 1]! << 16) | (tiff[o + 2]! << 8) | tiff[o + 3]!) >>> 0;

  const ifd = u32(4);
  if (ifd < 8) return summary;
  const count = u16(ifd);
  if (count < 0 || count > 512) return summary;

  const ascii = (entry: number): string | undefined => {
    const n = u32(entry + 4);
    if (n <= 0 || n > 256) return undefined;
    const off = n <= 4 ? entry + 8 : u32(entry + 8);
    if (off < 0 || off + n > tiff.length) return undefined;
    let s = '';
    for (let i = 0; i < n; i++) {
      const c = tiff[off + i]!;
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s.trim() || undefined;
  };

  for (let i = 0; i < count; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > tiff.length) break;
    const tag = u16(e);
    switch (tag) {
      case 0x010f: summary.make = ascii(e); break;
      case 0x0110: summary.model = ascii(e); break;
      case 0x0131: summary.software = ascii(e); break;
      case 0x0132: summary.dateTime = ascii(e); break;
      case 0x0112: {
        const v = u16(e + 8);
        if (v >= 1 && v <= 8) summary.orientation = v;
        break;
      }
      case 0x8825: summary.hasGps = true; break;
    }
  }
  return summary;
}

/** Builds a JPEG APP1 segment (with marker) holding only the Orientation tag. */
export function buildOrientationApp1(orientation: number): Uint8Array {
  const body = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // MM, 42, IFD0 @ 8
    0x00, 0x01, // 1 entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation & 0xff, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, // next IFD = none
  ];
  const len = body.length + 2;
  return new Uint8Array([0xff, 0xe1, len >> 8, len & 0xff, ...body]);
}
