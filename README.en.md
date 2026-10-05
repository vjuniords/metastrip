# MetaStrip (English)

<p align="center">
  <strong>Inspect and remove hidden image metadata — 100% in your browser.</strong><br>
  EXIF · GPS Coordinates · XMP · IPTC · C2PA Content Credentials · AI Generator Signatures
</p>

<p align="center">
  <a href="README.md">🇧🇷 <strong>Leia esta documentação em Português</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-emerald.svg" alt="License MIT">
  <img src="https://img.shields.io/badge/Platform-Chrome%20%7C%20Edge%20%7C%20Brave-blue.svg" alt="Platform">
  <img src="https://img.shields.io/badge/Manifest-V3-purple.svg" alt="Manifest V3">
  <img src="https://img.shields.io/badge/Privacy-100%25%20Local-success.svg" alt="100% Local">
</p>

---

<p align="center">
  <img src="docs/images/sidepanel.png" alt="MetaStrip Chrome Side Panel" width="380" />
</p>

---

## Why MetaStrip?

When you generate images on **ChatGPT, Midjourney, Adobe Firefly, Canva** or take photos on your smartphone, the image file carries hidden data beyond its visible pixels:
- **C2PA Manifests & IPTC tags (`trainedAlgorithmicMedia`):** Cryptographic signatures embedded by AI providers that trigger automated labels on social platforms like Facebook and Instagram (*"AI info"* / *"Made with AI"*).
- **Private Data:** Camera hardware serials, exact GPS coordinates, creation timestamps, and editing history.
- **Generation Prompts:** In tools like Stable Diffusion / ComfyUI / Automatic1111, the entire text prompt and parameters are saved in PNG chunks (`parameters`).

**MetaStrip** inspects the raw file structures, lists every chunk, and strips them cleanly without ever sending a single byte to an external server.

---

## Key Features

- 📌 **Native Chrome Side Panel:** Docks conveniently on the side of your browser (like Mimik). You can browse ChatGPT or Midjourney and drag images directly from the web page into MetaStrip!
- 🔍 **Deep Inspector:** Detects C2PA (`caBX` chunk / APP11), IPTC `DigitalSourceType`, EXIF, GPS, and XMP.
- 🧼 **Lossless Cleaning:** Surgically removes metadata containers while copying pixel scans byte-for-byte (100% original fidelity).
- 🎨 **Re-render Mode:** Generates a fresh raster image with presets optimized for social media feeds (`1080×1080` 1:1, `1080×1350` 4:5, `1080×1920` Stories).
- 📦 **Batch Download (.ZIP):** Drop 2 or 50 images at once and download all cleaned images bundled into a single `.zip` file in one click.
- 🖱️ **Context Menu:** Right-click any image on the web ➔ *"Download without metadata (MetaStrip)"*.
- 🌐 **Bilingual (PT-BR / EN):** One-click toggle between Brazilian Portuguese and English.
- 🔒 **Zero Server / Privacy First:** 100% client-side via pure TypeScript and Web APIs. Compliant with strict CSP (`script-src 'self'`).

---

## What MetaStrip Does *Not* Do

MetaStrip strips **container metadata**. It does **not** alter invisible steganographic pixel watermarks (e.g. Google DeepMind SynthID). Please adhere to local regulations and platform terms regarding disclosure of photorealistic AI media.

---

## Project Structure

```
MetaStrip/
├── packages/
│   ├── core/         # Pure TypeScript parser & sanitizer (JPEG, PNG, WebP). 0 dependencies, no DOM.
│   └── ui/           # Shared React 19 + Tailwind CSS interface & batch zip handler.
├── apps/
│   ├── extension/    # Manifest V3 extension (WXT framework) with Side Panel & context menu.
│   └── web/          # Public web application (Next.js static export).
└── docs/             # Architecture, screenshots and documentation.
```

---

## Getting Started

### Option 1: Quick Install (Extension)

1. Download the latest `metastrip-x.x.x-chrome.zip` from [Releases](https://github.com/vjuniords/metastrip/releases).
2. Unzip the file.
3. Open `chrome://extensions` in Chrome, Brave or Edge.
4. Enable **Developer mode** (top right).
5. Click **Load unpacked** and select the unzipped `chrome-mv3` folder.
6. Click the MetaStrip icon in your extensions toolbar to open the Side Panel!

### Option 2: Development

```bash
# Clone the repository
git clone https://github.com/vjuniords/metastrip.git
cd metastrip

# Install dependencies
pnpm install

# Run unit tests and fuzzing
pnpm test

# Run extension in live development mode (opens Chrome with hot-reload)
pnpm dev:ext

# Build production bundle
pnpm --filter @metastrip/extension build
```

---

## License

[MIT License](LICENSE) © 2026 MetaStrip contributors.
