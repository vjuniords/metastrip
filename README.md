# MetaStrip

**Inspect and remove hidden image metadata — 100% in your browser.**
EXIF · GPS · XMP · IPTC · C2PA Content Credentials · generator prompts.

> 🇧🇷 Inspecione e remova metadados ocultos de imagens — 100% no seu navegador. Nada é enviado para servidores.

## Why

Photos and generated images carry more than pixels: camera model, GPS coordinates, editing software,
timestamps, AI provenance manifests (C2PA), and sometimes the full prompt used to generate them.
MetaStrip shows you exactly what is inside and lets you remove it.

## Features

- 🔍 **Inspector** — lists every metadata block, highlights GPS and AI-provenance signals.
- 🧼 **Lossless cleaning** — removes metadata without re-encoding; pixel data stays byte-identical.
- 🎨 **Re-render mode** — new JPG/PNG/WebP from the pixels, with social presets (1:1, 4:5, Stories).
- 🖱️ **Right-click any image** → *Download without metadata* (extension).
- 🔒 **Private by design** — no servers, no analytics, no network calls. Strict CSP. Least-privilege permissions.
- 🌗 Light/dark theme · 🇧🇷/🇺🇸 · Keyboard & paste (Cmd/Ctrl+V) support.

## What it does *not* do

MetaStrip removes **metadata**. It does **not** remove invisible watermarks embedded in pixel data
(e.g. SynthID) and does not claim to defeat any detection system. Please respect platform rules about
disclosing AI-generated content.

## Project structure

```
packages/core       Pure TypeScript parser/sanitizer (JPEG, PNG, WebP). Zero dependencies, no DOM.
packages/ui         Shared React + Tailwind interface.
apps/extension      Browser extension (Manifest V3, WXT) — Chrome, Edge, Brave, Firefox.
apps/web            Public website (Next.js static export) — coming next.
```

## Development

```bash
pnpm install
pnpm test          # core unit tests + fuzzing
pnpm dev:ext       # opens Chrome with the extension loaded (hot reload)
pnpm --filter @metastrip/extension build   # production build in apps/extension/dist
```

Load manually: `chrome://extensions` → *Developer mode* → *Load unpacked* → `apps/extension/dist/chrome-mv3`.

## Security

See [SECURITY.md](SECURITY.md). Parsers are bounds-checked and fuzz-tested; files are capped at 100 MB.

## License

[MIT](LICENSE)
