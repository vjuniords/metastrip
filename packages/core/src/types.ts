export type ImageFormat = 'jpeg' | 'png' | 'webp';

export type EntryKind =
  | 'exif'
  | 'gps'
  | 'xmp'
  | 'iptc'
  | 'c2pa'
  | 'icc'
  | 'text'
  | 'comment'
  | 'thumbnail'
  | 'timestamp'
  | 'trailing'
  | 'other';

/** Stable identifiers so UIs can translate them. */
export type AiSignal =
  | 'c2pa-manifest'
  | 'iptc-trained-algorithmic-media'
  | 'iptc-composite-algorithmic-media'
  | 'openai'
  | 'chatgpt'
  | 'dall-e'
  | 'midjourney'
  | 'adobe-firefly'
  | 'stable-diffusion'
  | 'google-ai'
  | 'comfyui'
  | 'a1111-parameters';

export interface ExifSummary {
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  orientation?: number;
  hasGps: boolean;
}

export interface MetadataEntry {
  kind: EntryKind;
  /** Raw container identifier, e.g. "APP1", "tEXt", "EXIF". */
  container: string;
  /** Size in bytes of the removable block. */
  size: number;
  /** Whether strip() removes it with the given options. */
  removed: boolean;
  aiSignals: AiSignal[];
  /** Optional short readable detail (e.g. tEXt key). */
  detail?: string;
}

export interface InspectReport {
  format: ImageFormat;
  fileSize: number;
  entries: MetadataEntry[];
  aiSignals: AiSignal[];
  exif?: ExifSummary;
  /** Bytes that strip() will remove. */
  removableBytes: number;
}

export interface StripOptions {
  /** Keep the color profile (ICC). Removing it can shift colors. Default true. */
  keepIcc?: boolean;
  /** JPEG only: re-insert a minimal EXIF holding only Orientation so photos stay upright. Default true. */
  keepOrientation?: boolean;
}

export interface StripResult {
  data: Uint8Array<ArrayBuffer>;
  report: InspectReport;
}

export type MetaStripErrorCode = 'UNSUPPORTED_FORMAT' | 'CORRUPT_FILE' | 'FILE_TOO_LARGE';

export class MetaStripError extends Error {
  constructor(
    public readonly code: MetaStripErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MetaStripError';
  }
}
