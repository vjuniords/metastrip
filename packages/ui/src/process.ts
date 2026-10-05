import { MIME, MetaStripError, inspect, strip, type InspectReport, type MetaStripErrorCode } from '@metastrip/core';

export type OutputFormat = 'png' | 'jpeg' | 'webp';
export type SizePreset = 'original' | '1080x1080' | '1080x1350' | '1080x1920';

export interface ProcessOptions {
  mode: 'lossless' | 'rerender';
  format: OutputFormat;
  size: SizePreset;
  keepIcc: boolean;
}

export const DEFAULT_OPTIONS: ProcessOptions = { mode: 'lossless', format: 'jpeg', size: 'original', keepIcc: true };

export interface Processed {
  report: InspectReport;
  blob: Blob;
  fileName: string;
}

const EXT: Record<OutputFormat, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };

export function errorCode(e: unknown): MetaStripErrorCode | 'UNKNOWN' {
  return e instanceof MetaStripError ? e.code : 'UNKNOWN';
}

function baseName(name: string): string {
  return (name.replace(/\.[^.]+$/, '') || 'image').replace(/[^\p{L}\p{N}._ -]+/gu, '_').slice(0, 120);
}

/** Inspect only (fast, used for the report shown before download). */
export async function analyze(file: Blob): Promise<InspectReport> {
  return inspect(new Uint8Array(await file.arrayBuffer()));
}

export async function processFile(file: File, opts: ProcessOptions): Promise<Processed> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const report = inspect(bytes, { keepIcc: opts.keepIcc });
  const name = baseName(file.name);

  if (opts.mode === 'lossless') {
    const { data } = strip(bytes, { keepIcc: opts.keepIcc });
    return { report, blob: new Blob([data], { type: MIME[report.format] }), fileName: `${name}-clean.${EXT[report.format]}` };
  }

  const rendered = await rerender(file, opts);
  // Defense in depth: run the encoder output through the stripper as well.
  const { data } = strip(new Uint8Array(await rendered.arrayBuffer()), { keepIcc: false });
  return { report, blob: new Blob([data], { type: MIME[opts.format] }), fileName: `${name}-clean.${EXT[opts.format]}` };
}

async function rerender(file: Blob, opts: ProcessOptions): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const [tw, th] = opts.size === 'original' ? [bitmap.width, bitmap.height] : opts.size.split('x').map(Number) as [number, number];
    const canvas = new OffscreenCanvas(tw, th);
    const ctx = canvas.getContext('2d', { alpha: opts.format !== 'jpeg' });
    if (!ctx) throw new Error('Canvas unavailable');
    if (opts.format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tw, th);
    }
    // "cover": fill target, crop centered.
    const scale = Math.max(tw / bitmap.width, th / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, (tw - w) / 2, (th - h) / 2, w, h);
    return await canvas.convertToBlob({ type: MIME[opts.format], quality: 0.95 });
  } finally {
    bitmap.close();
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
