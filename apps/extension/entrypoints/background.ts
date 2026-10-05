import { MIME, detectFormat, strip } from '@metastrip/core';

const MENU_ID = 'metastrip-clean-download';
const MAX_BYTES = 100 * 1024 * 1024;

export default defineBackground(() => {
  // Abre o Painel Lateral ao clicar no ícone da extensão (igual ao Mimik)
  const configureSidePanel = () => {
    const sp = (browser as any).sidePanel ?? (globalThis as any).chrome?.sidePanel;
    if (sp?.setPanelBehavior) {
      sp.setPanelBehavior({ openPanelOnActionClick: true }).catch((err: unknown) => {
        console.warn('[MetaStrip] setPanelBehavior error:', err);
      });
    }
  };

  configureSidePanel();

  browser.runtime.onInstalled.addListener(() => {
    configureSidePanel();
    browser.contextMenus.create({
      id: MENU_ID,
      title: browser.i18n.getUILanguage().startsWith('pt') ? 'Baixar sem metadados (MetaStrip)' : 'Download without metadata (MetaStrip)',
      contexts: ['image'],
    });
  });

  browser.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId !== MENU_ID || !info.srcUrl) return;
    try {
      const url = new URL(info.srcUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        // Ask only for this image's origin, only when the user acts (least privilege).
        const granted = await browser.permissions.request({ origins: [`${url.origin}/*`] });
        if (!granted) return flag('Permission denied');
      } else if (url.protocol !== 'data:') {
        return flag('Unsupported image source');
      }

      const res = await fetch(info.srcUrl, { credentials: 'omit', redirect: 'follow' });
      if (!res.ok) return flag(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (blob.size > MAX_BYTES) return flag('File too large');

      const { bytes, ext, mime } = await clean(new Uint8Array(await blob.arrayBuffer()), blob);
      await browser.downloads.download({
        url: `data:${mime};base64,${toBase64(bytes)}`,
        filename: `${nameFrom(url)}-clean.${ext}`,
        saveAs: false,
      });
      ok();
    } catch (e) {
      console.error('[MetaStrip]', e);
      flag('Error');
    }
  });
});

const EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' } as const;

/** Lossless strip for JPEG/PNG/WebP; other formats (AVIF, GIF…) are re-rendered to PNG. */
async function clean(input: Uint8Array, blob: Blob) {
  const fmt = detectFormat(input);
  if (fmt) return { bytes: strip(input).data, ext: EXT[fmt], mime: MIME[fmt] };
  const bmp = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0);
  bmp.close();
  const png = new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer());
  return { bytes: strip(png, { keepIcc: false }).data, ext: 'png', mime: 'image/png' };
}

function nameFrom(url: URL): string {
  const last = decodeURIComponent(url.pathname.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
  return (last.replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(0, 80) || 'image').replace(/^\.+/, '');
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function ok() {
  browser.action.setBadgeBackgroundColor({ color: '#059669' });
  browser.action.setBadgeText({ text: '✓' });
  setTimeout(() => browser.action.setBadgeText({ text: '' }), 2500);
}

function flag(reason: string) {
  browser.action.setBadgeBackgroundColor({ color: '#dc2626' });
  browser.action.setBadgeText({ text: '!' });
  browser.action.setTitle({ title: `MetaStrip: ${reason}` });
  setTimeout(() => {
    browser.action.setBadgeText({ text: '' });
    browser.action.setTitle({ title: 'MetaStrip' });
  }, 4000);
}
