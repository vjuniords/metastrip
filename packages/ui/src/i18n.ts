import type { AiSignal, EntryKind } from '@metastrip/core';

const pt = {
  tagline: 'Remova metadados ocultos das suas imagens',
  privacy: '100% local — suas imagens nunca saem do seu dispositivo',
  drop: 'Arraste imagens aqui',
  dropHint: 'ou clique para escolher · Cmd/Ctrl+V para colar',
  formats: 'JPEG, PNG e WebP · até 100 MB',
  openTab: 'Abrir em tela cheia',
  mode: 'Modo',
  lossless: 'Sem perdas',
  losslessHint: 'Remove só os metadados. Pixels idênticos.',
  rerender: 'Recriar imagem',
  rerenderHint: 'Gera um arquivo novo a partir dos pixels.',
  output: 'Formato',
  size: 'Tamanho',
  original: 'Original',
  keepIcc: 'Manter perfil de cor (ICC)',
  download: 'Baixar',
  downloadZip: 'Baixar em .ZIP',
  downloadAllZip: 'Baixar todas em .ZIP',
  downloadAll: 'Baixar todas (.ZIP)',
  clear: 'Limpar lista',
  remove: 'Remover',
  aiFound: 'Sinais de IA encontrados',
  noAi: 'Nenhum sinal de IA nos metadados',
  gpsFound: 'Contém localização GPS',
  clean: 'Pronta',
  processing: 'Processando…',
  nothing: 'Nenhum metadado encontrado',
  blocks: 'blocos',
  removed: 'removidos',
  saved: 'economizados',
  camera: 'Câmera',
  software: 'Software',
  date: 'Data',
  disclaimer:
    'Remove metadados (EXIF, XMP, IPTC, C2PA). Marcas d’água invisíveis gravadas nos pixels não são removidas.',
  errors: {
    UNSUPPORTED_FORMAT: 'Formato não suportado',
    CORRUPT_FILE: 'Arquivo corrompido ou inválido',
    FILE_TOO_LARGE: 'Arquivo maior que 100 MB',
    UNKNOWN: 'Não foi possível processar',
  },
};

type Dict = typeof pt;

const en: Dict = {
  tagline: 'Remove hidden metadata from your images',
  privacy: '100% local — your images never leave your device',
  drop: 'Drop images here',
  dropHint: 'or click to browse · Cmd/Ctrl+V to paste',
  formats: 'JPEG, PNG and WebP · up to 100 MB',
  openTab: 'Open full screen',
  mode: 'Mode',
  lossless: 'Lossless',
  losslessHint: 'Strips metadata only. Identical pixels.',
  rerender: 'Re-render',
  rerenderHint: 'Builds a brand-new file from the pixels.',
  output: 'Format',
  size: 'Size',
  original: 'Original',
  keepIcc: 'Keep color profile (ICC)',
  download: 'Download',
  downloadZip: 'Download as .ZIP',
  downloadAllZip: 'Download all as .ZIP',
  downloadAll: 'Download all (.ZIP)',
  clear: 'Clear list',
  remove: 'Remove',
  aiFound: 'AI signals found',
  noAi: 'No AI signals in metadata',
  gpsFound: 'Contains GPS location',
  clean: 'Ready',
  processing: 'Processing…',
  nothing: 'No metadata found',
  blocks: 'blocks',
  removed: 'removed',
  saved: 'saved',
  camera: 'Camera',
  software: 'Software',
  date: 'Date',
  disclaimer: 'Removes metadata (EXIF, XMP, IPTC, C2PA). Invisible watermarks embedded in pixels are not removed.',
  errors: {
    UNSUPPORTED_FORMAT: 'Unsupported format',
    CORRUPT_FILE: 'Corrupted or invalid file',
    FILE_TOO_LARGE: 'File larger than 100 MB',
    UNKNOWN: 'Could not process',
  },
};

export const KIND_LABEL: Record<EntryKind, string> = {
  exif: 'EXIF',
  gps: 'EXIF + GPS',
  xmp: 'XMP',
  iptc: 'IPTC',
  c2pa: 'C2PA',
  icc: 'ICC',
  text: 'Text',
  comment: 'Comment',
  thumbnail: 'Thumbnail',
  timestamp: 'Timestamp',
  trailing: 'Trailing data',
  other: 'Other',
};

export const SIGNAL_LABEL: Record<AiSignal, string> = {
  'c2pa-manifest': 'C2PA Content Credentials',
  'iptc-trained-algorithmic-media': 'IPTC: AI-generated',
  'iptc-composite-algorithmic-media': 'IPTC: AI-edited',
  openai: 'OpenAI',
  chatgpt: 'ChatGPT',
  'dall-e': 'DALL·E',
  midjourney: 'Midjourney',
  'adobe-firefly': 'Adobe Firefly',
  'stable-diffusion': 'Stable Diffusion',
  'google-ai': 'Google AI',
  comfyui: 'ComfyUI',
  'a1111-parameters': 'A1111 prompt',
};

export type Lang = 'pt' | 'en';

export function getDict(lang: Lang = 'pt'): Dict {
  return lang === 'en' ? en : pt;
}

export type { Dict };
