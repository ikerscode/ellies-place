/**
 * Contact sheet renderer stub. Owner: pixel-artist (lead), who replaces the placeholder
 * with one canvas per art batch drawn from the sprite registry.
 */
declare global {
  interface Window {
    __SHEET_READY__?: boolean;
  }
}

function placeholder(name: string): HTMLCanvasElement {
  const scale = 4;
  const canvas = document.createElement('canvas');
  canvas.width = 64 * scale;
  canvas.height = 32 * scale;
  canvas.dataset['sheet'] = name;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 64; x++) {
        ctx.fillStyle = (x >> 2) % 2 === (y >> 2) % 2 ? '#4a2a52' : '#6b4a7a';
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  return canvas;
}

document.body.appendChild(placeholder('base'));
window.__SHEET_READY__ = true;

export {};
