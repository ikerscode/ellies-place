/**
 * Soak runner stub (`npm run soak`, executed by tsx in Node).
 * Owner: qa-engineer (shared with sim-dev). Wave 2 replaces this with a 30-game-day
 * headless run that checks every invariant in design/TECH.md and prints a final state hash.
 */
import { createManualClock } from '../../src/core/clock';
import { createRng, nextU32 } from '../../src/core/rng';

function hashRun(seed: number, steps: number): number {
  const rng = createRng(seed);
  const clock = createManualClock();
  let h = 0x811c9dc5;
  for (let i = 0; i < steps; i++) {
    clock.advance(50);
    h = Math.imul(h ^ nextU32(rng), 0x01000193) >>> 0;
  }
  return (h ^ clock.now()) >>> 0;
}

const a = hashRun(1234, 10_000);
const b = hashRun(1234, 10_000);
if (a !== b) {
  console.error(`soak: determinism check failed (${a} !== ${b})`);
  process.exit(1);
}
console.log('soak: STUB. This run simulates nothing; it only hashes the RNG. qa-engineer replaces it in Wave 2.');
console.log(`soak: stub OK (determinism hash ${a.toString(16)})`);
