// @vitest-environment happy-dom
/**
 * DOM tests (FROZEN 36, F39): start any test file that needs `document` (ui kit, bloom menu, engine input,
 * build panels) with `// @vitest-environment happy-dom` on its first line. Everything else runs in node.
 */
import { describe, expect, it } from 'vitest';

describe('happy-dom environment', () => {
  it('provides a document, elements and events', () => {
    const el = document.createElement('button');
    let clicks = 0;
    el.addEventListener('click', () => clicks++);
    document.body.append(el);
    el.click();
    expect(clicks).toBe(1);
    expect(document.querySelector('button')).toBe(el);
  });
});
