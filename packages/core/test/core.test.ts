import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspect, strip, MetaStripError } from '../src';

const fx = (name: string) => new Uint8Array(readFileSync(join(__dirname, 'fixtures', name)));
const has = (b: Uint8Array, s: string) => Buffer.from(b).toString('latin1').toLowerCase().includes(s.toLowerCase());

describe('PNG from ChatGPT (C2PA)', () => {
  const input = fx('chatgpt-c2pa.png');

  it('detects the C2PA manifest and OpenAI signals', () => {
    const r = inspect(input);
    expect(r.format).toBe('png');
    expect(r.entries.some((e) => e.kind === 'c2pa')).toBe(true);
    expect(r.aiSignals).toEqual(expect.arrayContaining(['c2pa-manifest', 'openai', 'chatgpt', 'iptc-trained-algorithmic-media']));
  });

  it('removes every trace and keeps image data identical', () => {
    const { data } = strip(input);
    for (const s of ['c2pa', 'openai', 'chatgpt', 'trainedalgorithmicmedia', 'caBX']) expect(has(data, s)).toBe(false);
    expect(inspect(data).aiSignals).toEqual([]);
    expect(inspect(data).entries).toEqual([]);
    expect(idat(data)).toEqual(idat(input));
  });

  it('is idempotent', () => {
    const once = strip(input).data;
    expect(strip(once).data).toEqual(once);
  });
});

describe('PNG with Stable Diffusion parameters', () => {
  it('flags and removes generator text', () => {
    const input = fx('sd-params.png');
    expect(inspect(input).aiSignals).toContain('a1111-parameters');
    expect(has(strip(input).data, 'Sampler')).toBe(false);
  });
});

describe('Progressive JPEG with EXIF/GPS/XMP/comment', () => {
  const input = fx('photo-gps.jpg');

  it('reports camera, GPS and AI source type', () => {
    const r = inspect(input);
    expect(r.exif).toMatchObject({ make: 'Apple', model: 'iPhone 15', orientation: 6, hasGps: true });
    expect(r.entries.map((e) => e.kind)).toEqual(expect.arrayContaining(['gps', 'xmp', 'comment']));
    expect(r.aiSignals).toEqual(expect.arrayContaining(['iptc-trained-algorithmic-media', 'adobe-firefly']));
  });

  it('strips everything but keeps orientation and scan data', () => {
    const { data } = strip(input);
    for (const s of ['Apple', 'iPhone', 'secret', 'xmpmeta', 'Firefly']) expect(has(data, s)).toBe(false);
    const after = inspect(data);
    expect(after.exif).toEqual({ hasGps: false, orientation: 6 });
    expect(after.aiSignals).toEqual([]);
    expect(fromSos(data)).toEqual(fromSos(input));
  });

  it('can drop orientation too', () => {
    expect(inspect(strip(input, { keepOrientation: false }).data).exif).toBeUndefined();
  });
});

describe('WebP with EXIF/XMP', () => {
  it('removes chunks and keeps a valid RIFF header', () => {
    const input = fx('photo-exif.webp');
    expect(inspect(input).exif?.hasGps).toBe(true);
    const { data } = strip(input);
    expect(has(data, 'iPhone')).toBe(false);
    expect(has(data, 'xmpmeta')).toBe(false);
    const riff = new DataView(data.buffer, data.byteOffset).getUint32(4, true);
    expect(riff + 8).toBe(data.length);
    expect(inspect(data).entries).toEqual([]);
  });
});

describe('Robustness', () => {
  it('rejects unsupported formats', () => {
    expect(() => inspect(new TextEncoder().encode('GIF89a....'))).toThrow(MetaStripError);
  });

  it('never hangs or crashes uncontrolled on truncated/corrupted input', () => {
    for (const name of ['chatgpt-c2pa.png', 'photo-gps.jpg', 'photo-exif.webp']) {
      const src = fx(name);
      for (let i = 0; i < 200; i++) {
        const b = src.slice(0, Math.max(16, Math.floor(Math.random() * src.length)));
        for (let k = 0; k < 8; k++) b[Math.floor(Math.random() * b.length)] = Math.floor(Math.random() * 256);
        try {
          strip(b);
        } catch (e) {
          expect(e).toBeInstanceOf(MetaStripError);
        }
      }
    }
  });
});

function idat(b: Uint8Array): number[] {
  const out: number[] = [];
  const v = new DataView(b.buffer, b.byteOffset);
  for (let p = 8; p < b.length; ) {
    const len = v.getUint32(p);
    const type = Buffer.from(b.subarray(p + 4, p + 8)).toString('latin1');
    if (type === 'IDAT') out.push(...b.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  return out;
}

function fromSos(b: Uint8Array): Uint8Array {
  for (let i = 0; i < b.length - 1; i++) if (b[i] === 0xff && b[i + 1] === 0xda) return b.subarray(i);
  throw new Error('no SOS');
}
