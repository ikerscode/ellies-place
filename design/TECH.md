# Technical design (starting point)

The architect finalises this in Wave 1, as `design/spec/contracts.md` plus `src/core/types.ts`. Anything not decided here is the architect's call, as long as it keeps the constraints.

## Constraints

- **Output:** one self-contained HTML file, `dist/ellies-place.html`, under 3 MB.
- **Offline:** it plays from `file://` in Safari and Chrome. It makes no network requests, and the build contains no external URLs.
- **Dependencies:** no runtime dependencies. Development dependencies are fine.
- **Performance:** 60 fps on a MacBook Air (M1) in Safari. A simulation tick takes under 2 ms, and rendering under 8 ms.
- **Determinism:** the same seed plus the same inputs always gives the same state.

## Stack

| Concern | Choice |
| --- | --- |
| Language | TypeScript, `strict`, no `any` in exported APIs |
| Build | Vite + `vite-plugin-singlefile`; all assets inlined |
| Fonts | `@fontsource/pixelify-sans` and `@fontsource/im-fell-english`, inlined as base64 WOFF2 |
| Rendering | Canvas 2D for the world, with DOM overlays for HUD, menus and text (no UI framework) |
| Unit tests | Vitest |
| End-to-end tests | Playwright, on **Chromium and WebKit** (WebKit stands in for her Safari) |

## Display

- **Canvas:** the logical size is 480 × 270, with 16 px tiles, and the base lot is 30 × 17 tiles.
- **Scale:** use the largest integer that fits the viewport. If that is under 3 on a 1440 × 800 browser viewport, allow a fractional scale of 2.5 or more with nearest-neighbour sampling.
- **Layout:** letterbox on a dark plum background, and offer full screen with F.
- **Test sizes:** check at viewports of 1440 × 800, 1280 × 720 and 1920 × 1080.

## Architecture

- **Fixed-timestep simulation** at 20 ticks per second, separate from rendering, which runs on `requestAnimationFrame` with interpolation.
- **Simulation state** is plain, serialisable data. A seeded PRNG (mulberry32) lives in that state. Simulation code never calls `Math.random()` or `Date.now()`; the clock is injected.
- **Entities and components:** a data-oriented store with components such as `Position`, `Sprite`, `Agent`, `Needs`, `SmartObject`, `Placeable`, `Carryable`, `Light` and `Bond`. Systems run in a fixed order:
  1. time
  2. needs decay
  3. AI decide
  4. action execution
  5. movement
  6. triggers
  7. progression (wishes, aspirations)
  8. events out (audio cues, UI)
- **Smart objects:** each interaction is declared as data. It lists who can use it (Ellie, any cat or a specific cat), the need changes it advertises, its slots (where the actor stands or sits), duration, animation, requirements (carried item, time of day, bond level) and effects.
- **Utility AI:** Ellie's free will and all four cats share one scorer:
  ```
  score = Σ curve_n(value_n) × gain_n × personality_n × bond × distanceFalloff × noise
  ```
  It picks a weighted choice among the top 3.
- **Pathfinding:** A* on the tile grid, 8 directions with no corner cutting, and dynamic costs for actors and mess. Slots are reserved. Cats also get jump edges onto surfaces and perches, using layer z = 0 floor, 1 surface, 2 perch.
- **Render layers:**
  1. Floor paint
  2. Rugs
  3. Back walls and wall decor
  4. Objects and actors, sorted by y
  5. Overhead
  6. Lighting: an offscreen darkness layer multiplied over the scene, with additive light sprites and moving sunbeams
  7. Particles
  8. Weather
  9. Canvas hints

  The static floor and walls are cached offscreen and redrawn only after build changes.
- **Sprites:** string-grid sprites compiled at boot into an atlas. Port `makeSprite` (auto-outline and palette maps), `flipped` and the existing character grids from the reference game. Animations are frame lists with down, up and side directions, with side flipped for left.
- **Audio:** port game 1's engine (buses, convolution reverb, limiter, instruments, lookahead scheduler, meows and purrs), then add a music state machine that follows activity, room and time.
- **Save:**
  - Versioned JSON in `localStorage` under the key `ellies-place:save:v1`.
  - Autosave every in-game hour, on mode change, and on `visibilitychange` and `pagehide`.
  - Export and import as a `.json` file.
  - A migrations registry, and a backup slot for when a save is corrupt.
  - Every storage call sits inside `try/catch`, so the game still plays if storage is blocked.
- **Test hooks:** only when the URL has `?test=1`, the game exposes `window.__EP__` with `step(n)`, `setSpeed`, `getState`, `dispatch(action)`, `findEntity` and `seed(n)`. These are never reachable without the flag.
- **Content as data:**
  - Typed tables in `src/content/data/` for items, interactions, wishes, aspirations, outfits, mail, Hyrox stations and the catalog.
  - All player-facing text in `src/content/strings/`, keyed by id.
  - Personal details in `src/content/personal.ts`.

## Folder ownership

Every path has exactly one owner. Implementers write only inside their own paths.

| Path | Owner agent |
| --- | --- |
| `package.json`, configs, `scripts/`, `src/core/` | architect |
| `src/main.ts`, `src/app/` (wiring) | integrator |
| `src/engine/` | engine-dev |
| `src/sim/` (except `src/sim/cats/`) | sim-dev |
| `src/sim/cats/` | cat-ai-dev |
| `src/world/`, `src/build/` | build-mode-dev |
| `src/ui/`, `src/styles/` | ui-dev |
| `src/activities/<name>/` | activities-dev (one instance per activity) |
| `src/audio/` | audio-dev |
| `src/save/` | save-dev |
| `src/art/<batch>/` | pixel-artist (one instance per batch) |
| `src/content/strings/`, `src/content/personal.ts` | writer |
| `src/content/data/`, `design/spec/` (numbers and content specs) | game-designer (balance-analyst may edit `src/content/data/` in Wave 4) |
| `src/testing/`, `tests/e2e/`, `tests/soak/` | qa-engineer |
| `tests/unit/<area>/` | the owner of that area |
| `reports/`, `TICKETS.md` | reviewers (append-only) |
| `PROGRESS.md`, `design/spec/FROZEN.md` | lead (orchestrator) |

## Quality gates (npm scripts)

| Script | Passes when |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` has 0 errors |
| `npm run lint` | there are no banned patterns: `Math.random` or `Date.now` in `src/sim`; `http`, `https` or `//cdn` in `src`; em or en dashes in `src/content/strings`; `any` in exported types |
| `npm test` | all Vitest suites pass |
| `npm run build` | `dist/ellies-place.html` exists and `scripts/check-dist.mjs` passes: single file, no external URLs, fonts inlined, size under 3 MB |
| `npm run e2e` | all Playwright specs pass on Chromium and WebKit |
| `npm run soak` | the headless simulation of 30 game days passes every invariant (see below) |
| `npm run shots` | the screenshot suite writes `reports/shots/<engine>/*.png` |
| `npm run art:sheet` | every sprite renders into contact sheets at `reports/art/*.png` |

### Soak invariants

- No `NaN`, `undefined` or `Infinity` anywhere in the state.
- Every agent finishes at least one action per game hour.
- No agent stays stuck (no progress) for more than 2 game hours.
- With free will on, every need recovers above 50 within one game day.
- The Hearts curve stays inside the band set in `design/spec/play.md`.
- Queues, mail, particles and history stay within their caps.
- A save and reload round-trip gives deep-equal state.
- The same seed and the same inputs give the same final hash.
