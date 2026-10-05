import { latin1 } from './bytes';
import type { AiSignal } from './types';

const RULES: Array<[RegExp, AiSignal]> = [
  [/compositewithtrainedalgorithmicmedia/, 'iptc-composite-algorithmic-media'],
  [/(?<!compositewith)trainedalgorithmicmedia/, 'iptc-trained-algorithmic-media'],
  [/jumdc2pa|c2pa\.claim|urn:c2pa:/, 'c2pa-manifest'],
  [/openai/, 'openai'],
  [/chatgpt|gpt-image/, 'chatgpt'],
  [/dall[\s·-]?e/, 'dall-e'],
  [/midjourney/, 'midjourney'],
  [/firefly/, 'adobe-firefly'],
  [/stable[\s_-]?diffusion|stability\.ai|sdxl/, 'stable-diffusion'],
  [/google\s?(llc)?.{0,40}(imagen|gemini|synthid)|imagen\s?\d|gemini/, 'google-ai'],
];

/** Detect AI provenance hints inside a metadata block. */
export function detectAiSignals(block: Uint8Array): AiSignal[] {
  const text = latin1(block).toLowerCase();
  const found = new Set<AiSignal>();
  for (const [re, id] of RULES) if (re.test(text)) found.add(id);
  return [...found];
}

/** PNG text keys used by popular local generators. */
export function detectPngTextKey(key: string): AiSignal[] {
  const k = key.toLowerCase();
  if (k === 'parameters') return ['a1111-parameters', 'stable-diffusion'];
  if (k === 'prompt' || k === 'workflow') return ['comfyui'];
  return [];
}

export function mergeSignals(lists: AiSignal[][]): AiSignal[] {
  return [...new Set(lists.flat())];
}
