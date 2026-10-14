import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function lint(files: Record<string, string>): { status: number | null; out: string } {
  const root = mkdtempSync(join(tmpdir(), 'ep-lint-'));
  try {
    for (const [path, text] of Object.entries(files)) {
      const full = join(root, path);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, text);
    }
    const r = spawnSync('node', ['scripts/lint.mjs'], { env: { ...process.env, EP_LINT_SRC: root }, encoding: 'utf8' });
    return { status: r.status, out: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const BAD = [
  'Math.random()',
  "Math['random']()",
  'Date.now()',
  'new Date()',
  'Date()',
  'performance.now()',
  'crypto.getRandomValues(a)',
  'crypto.randomUUID()',
];

describe('lint: no nondeterminism (F2)', () => {
  for (const dir of ['sim', 'world', 'activities', 'content/data', 'core']) {
    it(`flags every banned call in src/${dir}`, () => {
      for (const call of BAD) {
        const r = lint({ [`${dir}/x.ts`]: `export const v = ${call};\n` });
        expect(r.status, `${dir}: ${call}`).toBe(1);
        expect(r.out).toContain('no-nondeterminism');
      }
    });
  }

  it('allows the clock module, other folders, comments and names that merely contain Date', () => {
    expect(lint({ 'core/clock.ts': 'export const t = new Date().getTime() + Date.now();\n' }).status).toBe(0);
    expect(lint({ 'audio/x.ts': 'export const t = performance.now();\n' }).status).toBe(0);
    expect(lint({ 'sim/x.ts': '// Math.random() is banned\nexport const localDate = (n: number): number => n;\nexport const x = localDate(1);\n' }).status).toBe(0);
  });
});
