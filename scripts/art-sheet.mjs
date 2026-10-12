#!/usr/bin/env node
/**
 * `npm run art:sheet`: renders sprite contact sheets to reports/art/<name>.png.
 *
 * Starts a Vite dev server, opens src/art/base/sheet.html in headless Chromium,
 * waits for window.__SHEET_READY__ and screenshots every [data-sheet] element.
 * The sheet page is owned by pixel-artist (lead); see the contract comment in it.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const OUT = 'reports/art';
const PAGE = '/src/art/base/sheet.html';

mkdirSync(OUT, { recursive: true });
const server = await createServer({ server: { port: 0, strictPort: false }, logLevel: 'error' });
await server.listen();
const address = server.httpServer?.address();
const port = typeof address === 'object' && address ? address.port : 0;

let browser;
let failed = false;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`http://localhost:${port}${PAGE}`);
  await page.waitForFunction(() => window.__SHEET_READY__ === true, null, { timeout: 30_000 });
  const sheets = page.locator('[data-sheet]');
  const count = await sheets.count();
  if (count === 0) throw new Error('no [data-sheet] elements on the sheet page');
  for (let i = 0; i < count; i++) {
    const el = sheets.nth(i);
    const name = (await el.getAttribute('data-sheet')) ?? `sheet-${i}`;
    const file = `${OUT}/${name.replace(/[^a-z0-9_-]/gi, '_')}.png`;
    await el.screenshot({ path: file });
    console.log(`art:sheet: wrote ${file}`);
  }
  if (errors.length > 0) {
    failed = true;
    console.error(`art:sheet: page errors:\n  ${errors.join('\n  ')}`);
  }
} catch (e) {
  failed = true;
  console.error(`art:sheet: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  await browser?.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
