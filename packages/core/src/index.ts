import { processJpeg, type FormatResult } from './jpeg';
import { isPng, processPng } from './png';
import { mergeSignals } from './signals';
import { isWebp, processWebp } from './webp';
import {
  MetaStripError,
  type ImageFormat,
  type InspectReport,
  type StripOptions,
  type StripResult,
} from './types';

export * from './types';

/** Hard limit to keep the browser responsive and avoid memory abuse. */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

const DEFAULTS: Required<StripOptions> = { keepIcc: true, keepOrientation: true };

export function detectFormat(b: Uint8Array): ImageFormat | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (isPng(b)) return 'png';
  if (isWebp(b)) return 'webp';
  return null;
}

function run(input: ArrayBuffer | Uint8Array, options?: StripOptions): { format: ImageFormat; res: FormatResult; size: number } {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (b.length > MAX_FILE_SIZE) throw new MetaStripError('FILE_TOO_LARGE', 'File exceeds the size limit');
  const format = detectFormat(b);
  if (!format) throw new MetaStripError('UNSUPPORTED_FORMAT', 'Only JPEG, PNG and WebP are supported');
  const opts = { ...DEFAULTS, ...options };
  const res = format === 'jpeg' ? processJpeg(b, opts) : format === 'png' ? processPng(b, opts) : processWebp(b, opts);
  return { format, res, size: b.length };
}

function toReport(format: ImageFormat, size: number, res: FormatResult): InspectReport {
  return {
    format,
    fileSize: size,
    entries: res.entries,
    exif: res.exif,
    aiSignals: mergeSignals(res.entries.map((e) => e.aiSignals)),
    removableBytes: res.entries.filter((e) => e.removed).reduce((s, e) => s + e.size, 0),
  };
}

/** Lists every metadata block found, without modifying anything. */
export function inspect(input: ArrayBuffer | Uint8Array, options?: StripOptions): InspectReport {
  const { format, res, size } = run(input, options);
  return toReport(format, size, res);
}

/** Removes metadata losslessly (pixel data is copied byte-for-byte). */
export function strip(input: ArrayBuffer | Uint8Array, options?: StripOptions): StripResult {
  const { format, res, size } = run(input, options);
  return { data: res.output, report: toReport(format, size, res) };
}

export const MIME: Record<ImageFormat, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
