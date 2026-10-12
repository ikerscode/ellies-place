import { existsSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const OUT_DIR = 'dist';
const OUT_FILE = 'ellies-place.html';

/** Renames dist/index.html to dist/ellies-place.html once the bundle is written. */
function renameHtml(): Plugin {
  return {
    name: 'ep-rename-html',
    apply: 'build',
    closeBundle() {
      const from = resolve(OUT_DIR, 'index.html');
      if (existsSync(from)) renameSync(from, resolve(OUT_DIR, OUT_FILE));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true }), renameHtml()],
  server: { port: 5199, strictPort: true },
  preview: { port: 5198, strictPort: true },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    target: 'es2020',
    // Inline everything (fonts, images) as base64 so the build is one file.
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 4000,
  },
});
