import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  outDir: 'dist',
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'MetaStrip — Image Metadata Cleaner',
    short_name: 'MetaStrip',
    description: 'Inspect and remove hidden image metadata (EXIF, GPS, XMP, IPTC, C2PA). 100% local, nothing is uploaded.',
    // Least privilege: no host access by default. Origins are requested per-site, on demand.
    permissions: ['sidePanel', 'contextMenus', 'downloads'],
    optional_host_permissions: ['<all_urls>'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
    },
  },
});
