# Run plan: build Ellie's Place end to end

You are the **lead** for this build. You run the team; you don't do the team's work. You plan, dispatch agents, decide, merge (through the integrator) and enforce the gates. Ship `dist/ellies-place.html` in about 6.5 hours of wall-clock time, without stopping to ask the user anything.

Read these first, in this order: `CLAUDE.md`, `design/ELLIE.md`, `design/BRIEF.md`, `design/TECH.md`. Skim the list of agents in `.claude/agents/`. Don't read the reference game yourself; the agents who need it will.

---

## 0. Ground rules for you

1. **Delegate.** Write no feature code yourself. You may write `PROGRESS.md`, `design/spec/FROZEN.md` and `TICKETS.md`, run gate commands, and use git.
2. **Run in parallel.** Dispatch agents with the Agent tool, with `subagent_type` set to the agent's name. To run them in parallel, put several Agent calls in **one message**. Run at most 14 at once. The same agent type may run as several instances, each with a different brief, such as `pixel-artist` for batch A and batch B.
3. **Worktrees branch from `main`.** Implementer agents run in git worktrees, which branch from the default branch, `main`. So before every wave, everything merged so far must be **committed on `main`**.
4. **Gates are walls.** A red gate blocks the next wave. Dispatch fixers until it is green, or cut scope (section 8).
5. **State lives in files, not in your memory.** After every wave, and after every important decision, update `PROGRESS.md` with:
   - start time and current time
   - current wave
   - merged branches
   - gate status
   - decisions made
   - next step

   If the session dies, the next session resumes from `PROGRESS.md`.
6. **Keep your context lean.** Agents report in 150 words or fewer, and put details in files. Don't open big files yourself unless a decision depends on them.
7. **No questions to the user.** When something is unclear, decide using the pillars in `design/BRIEF.md`, and log the decision in `PROGRESS.md` and `design/spec/FROZEN.md`.
8. **No network in the game.** `npm install` and `npx playwright install` happen only during setup.

## 1. Agent brief template

Every dispatch prompt uses this shape:

```
TASK: <one sentence outcome>
AGENT ID: <type#instance, e.g. pixel-artist#B>   WAVE: <n>
OWNED PATHS (write only here): <paths>
READ FIRST: CLAUDE.md, design/ELLIE.md, design/BRIEF.md §<sections>, design/spec/<files>, src/core/types.ts
DEPENDS ON: <merged work it can rely on, or "stubs only">
DELIVER: <concrete files, features, tests>
DONE WHEN: <exact checks: commands green, tests added, sheet or screenshot reviewed>
REPORT: ≤150 words: branch, done, not done, risks, CONTRACT_REQUEST, entry points.
```

## 2. Wave 0: setup (about 20 minutes)

You do this yourself:

1. Run `date` and record the start time in `PROGRESS.md`.
2. Run `git init -b main`, commit the kit as is ("kit"), and create `.gitignore` (`node_modules`, `dist`, `reports/shots`, `test-results`, `playwright-report`).

Then dispatch **architect** (foreground, alone) to scaffold the project as described in `design/TECH.md`:

- Vite, TypeScript strict, `vite-plugin-singlefile`, fonts from `@fontsource`.
- Vitest, and Playwright with Chromium and WebKit.
- Every npm script listed in the TECH quality gates, with real `scripts/check-dist.mjs` and lint checks, and stub suites for e2e, soak, shots and art:sheet that already pass.
- The folder skeleton from the ownership table, with index files so imports resolve.
- `src/core/rng.ts` (mulberry32) and `src/core/clock.ts`.
- A first draft of `src/core/types.ts`.
- `npm install` and `npx playwright install chromium webkit`.

**Gate 0:** typecheck, lint, test and build all pass. Commit "wave 0: scaffold" on `main`.

## 3. Wave 1: design freeze (about 45 minutes)

Dispatch these 8 agents in parallel. Each writes its spec to `design/spec/` and, where noted, starts code.

| Agent ID | Deliver |
| --- | --- |
| `architect` | `design/spec/contracts.md` plus the full `src/core/types.ts`: entities and components, the interaction and smart-object schema, item and catalog schema, `Activity` interface (for minigames), UI component API, audio cue API, save schema, test hooks API and the event bus. These contracts must compile. |
| `game-designer#systems` | `design/spec/sim.md`: need decay rates and curves, mood formula, utility AI weights, cat personalities as numbers, bond levels and rewards, time constants, free will, sunbeam timing. |
| `game-designer#home` | `design/spec/home.md`: the 30 × 17 lot as an ASCII tile map with rooms, the starting furniture, the full item catalog table (id, name key, footprint, orientations, style tags, price, unlock, art key, interactions), the Cosy formula and set bonuses. |
| `game-designer#play` | `design/spec/play.md`: every activity, including the Hyrox stations, the race-time model and the PB board; sushi; rusk dunk; the Critterbound spec; photo mode; stargazing; records. Also the wishes pool, aspiration tiers, the Hearts economy curve with its acceptable band, the onboarding script beats, secrets and stickers, and mail. |
| `writer` | `design/spec/voice.md`: a voice guide for Ellie, George, Salem, Shadow, Peaches, Bruce, Poe and Pickle, with 10 sample lines each and banned phrases. Then the first third of all strings. |
| `pixel-artist#lead` | `design/spec/art.md`: palette, size rules, a sprite list with sizes, orientations and frame counts for every item and animation, and a UI icon list. Also port `makeSprite`, `flipped` and the existing character sprites from the reference into `src/art/base/`, with a working `npm run art:sheet`. |
| `audio-dev` | `design/spec/audio.md`, then start porting the reference audio engine into `src/audio/` (it doesn't depend on anything else). |
| `ui-dev` | `design/spec/ui.md`: screen map, ASCII wireframes for the HUD, interaction bubbles, build tools, catalog, journal tabs and title screen; the keyboard map; accessibility settings. |

Then:

1. Dispatch **integrator** to merge all the Wave 1 branches.
2. Dispatch **ip-and-tone-guard** and **code-reviewer** (contracts review) in parallel. They read `design/spec/` and write to `reports/wave1-*.md`.
3. Resolve every conflict between specs yourself, and write the final decisions to `design/spec/FROZEN.md`. This includes a table of **MVP versus full** scope for every feature.

**Gate 1:** every spec exists, the contracts compile, there are no unresolved conflicts, and the IP and tone review is clean. Commit "wave 1: spec frozen".

## 4. Wave 2: foundations (about 75 minutes)

Dispatch these 13 agents in parallel:

| Agent ID | Deliver |
| --- | --- |
| `engine-dev` | Fixed-timestep loop, renderer layers, cached static layer, camera and scaling, input (mouse, trackpad, keyboard, touch), sprite atlas, lighting pass with moving sunbeams, particles, and a dev scene where the lot renders with placeholder furniture and Ellie walks where you click. |
| `sim-dev` | Entity store, time, needs, smart objects, utility AI, action queue, A* with slot reservations and cat jump edges, carry system, free will, and the headless Node runner used by `npm run soak`. Unit tests. |
| `build-mode-dev` | World model: lot, rooms, grid, footprints, wall and surface slots, paint, room detection, placement validation, and the Cosy score as logic with tests. No UI yet. |
| `save-dev` | Save and load, autosave triggers, migrations registry, backup slot, export and import JSON, storage failure fallback. Tests. |
| `ui-dev` | Overlay framework and theme, HUD skeleton (needs, clock, speed, Hearts, action queue, wish cards), interaction bubble menu, toasts and speech-bubble renderer. |
| `audio-dev` | Finish the engine port, add the new arrangements, music state machine, ambience, cat sounds and UI sounds. |
| `pixel-artist#A` | Characters and animations: Ellie (walk in 4 directions, sit, sleep, eat, drink, carry, training poses, dance, headbang, read, lie in grass), the four cats (walk, sit, loaf, sleep, groom, zoomies, knock, eat, perch), and Bruce, Poe and Pickle. |
| `pixel-artist#B` | Furniture: bedroom, living room and lighting. |
| `pixel-artist#C` | Furniture: kitchen, bathroom, and the gym with every Hyrox station. |
| `pixel-artist#D` | Garden, cat furniture, wall and floor patterns, UI icons, need and thought icons. |
| `writer` | All strings for interactions, needs, items, onboarding, plus the first 150 cat lines. |
| `game-designer#data` | Turn the frozen specs into typed tables in `src/content/data/`. |
| `qa-engineer` | The `?test=1` hooks in `src/testing/`, the Playwright config for Chromium and WebKit, a smoke e2e (boot, click to walk, complete one interaction), the soak runner with every invariant from `TECH.md`, and `npm run shots`. |

**Integration order:** core, then content data, art, engine, sim, world, save, audio, UI, testing. The integrator wires `src/main.ts` and `src/app/`.

**Gate 2:** typecheck, lint, unit tests, build, e2e smoke on both engines, and a 3-day soak all pass. Commit "wave 2: foundations".

## 5. Wave 3: features (about 100 minutes)

Dispatch these 10 agents in parallel:

| Agent ID | Deliver |
| --- | --- |
| `cat-ai-dev` | The four personalities: needs, quirks, reactions to new furniture and to Ellie's mood, bond levels and their rewards, thought and speech bubbles. Visitors: Bruce (fence, hiding spots, moving in), Poe (trinket trades), Pickle (deliveries). |
| `build-mode-dev` | Build mode UI and tools (place, move, rotate, sell, duplicate, undo/redo, paint, eyedropper), the catalog panel, the delivery flow and boxes, the Cosy meter with hints, and the cats reacting when Build mode closes. |
| `activities-dev#hyrox` | Training minigames for all 8 stations, a full race day, the PB board and medals, the gym interactions and George's commentary. |
| `activities-dev#kitchen` | The veggie sushi minigame, coffee making, the rusk dunk ritual in the grass, and eating and drinking. |
| `activities-dev#console` | Critterbound, the tiny original monster-catching RPG on the TV and handheld. |
| `activities-dev#life` | Records (stations, dance, headbang), photo mode with the album and PNG save, stargazing and shooting-star wishes, garden lanterns, mirror and wardrobe, reading, bath, sleep and naps. |
| `sim-dev` | Wishes, aspirations, the Hearts economy, mail (including personal mail by date from `personal.ts`), the housewarming event, the onboarding tour runner, secrets and stickers. |
| `ui-dev` | Every journal tab, the cat panel, the wardrobe UI, settings (volumes, text size, text speed, speed, real time, free will), the title screen (Continue, New, Load file), the mail reader and the credits roll. |
| `writer` | All remaining strings: wishes, aspirations, mail, onboarding, at least 150 more cat lines, Critterbound text, race commentary and credits. Then a humanizer pass over every string. |
| `qa-engineer` | E2e bots: a full free-will day, a build-mode script, a race, sushi, the rusk dunk, save and reload, export and import, and the onboarding tour. Run on both engines. |

Integrate in batches of 3 or 4 branches, and run gates after each batch.

**Gate 3:** all e2e pass on Chromium and WebKit, a 30-day soak passes, the build is under 3 MB, and every MVP feature in `FROZEN.md` is reachable in the running game. Commit "wave 3: features".

## 6. Wave 4: verify, tune, fix (about 60 minutes)

Dispatch these 8 agents in parallel:

| Agent ID | Deliver |
| --- | --- |
| `balance-analyst` | Soaks of 30 and 60 days with three play styles (idle free will, focused decorator, gym rat). A report of need, Hearts and unlock curves, plus tuned numbers in `src/content/data/`. |
| `visual-reviewer#live` | Live mode, cats and activities screenshots on both engines. Tickets go to `TICKETS.md`. |
| `visual-reviewer#build` | Build mode, catalog and every room at day and night. |
| `visual-reviewer#ui` | HUD, menus, journal and title screen, at 1440 × 800, 1280 × 720 and 1920 × 1080. |
| `code-reviewer#sim` | Review of sim, cats and save code: state bugs, determinism, leaks, invariants. |
| `code-reviewer#engine` | Review of engine, UI and audio: performance hot paths, allocations, listeners, focus handling. |
| `ip-and-tone-guard` | A full scan of every string, item name, art key and UI element. |
| `qa-engineer` | A 20-game-minute "monkey" bot of random clicks and keys on both engines, which must not crash, plus a performance trace of frame times. |

**Fix rounds:**

1. Group the tickets by owner path.
2. Dispatch the owning implementers in parallel, each with its batch of P0 and P1 tickets.
3. Merge and run every gate.
4. Repeat until no P0 or P1 tickets are left, or until 6 hours have passed since the start.

**Gate 4:** no open P0 tickets and every gate passes. Commit "wave 4: verified".

## 7. Wave 5: polish and ship (about 45 minutes)

Dispatch these in parallel:

- **Juice pass:** `engine-dev` and `ui-dev` add easing, transitions, particles, idle animations, and a sound for every action.
- **First ten minutes:** `writer` and `ui-dev` play through the onboarding with the qa bot's video or screenshots and tighten it.
- **Docs:** `writer` writes `docs/PLAYER_GUIDE.md` (short and plain), `docs/PERSONALISE.md` (how to edit `personal.ts` and add mail) and `CHANGELOG.md` as release notes written by the cats. `architect` writes `docs/ENGINEERING.md` (the architecture and how to add content).

Then run the final checks yourself:

1. `npm run build`
2. `node scripts/check-dist.mjs`
3. The full e2e suite on both engines.
4. Open `dist/ellies-place.html` over `file://` in WebKit through Playwright, start a new game, play 2 minutes, save, reload and continue.

Commit "v1.0", then tag it `v1.0`.

## 8. Clock and scope cuts

Check the time with `date` at every wave boundary.

| Elapsed | You should be |
| --- | --- |
| 0:20 | starting Wave 1 |
| 1:10 | starting Wave 2 |
| 2:30 | starting Wave 3 |
| 4:30 | starting Wave 4 |
| 5:45 | starting Wave 5 |
| 6:30 | shipped |

If you are more than 20 minutes behind, cut from the top of this list down:

1. Critterbound (replace it with a simple "play a game" interaction)
2. The wall-building tool and room expansion
3. Constellations (keep shooting stars)
4. Bruce coming indoors (keep the fence and hiding spots)
5. Weather
6. The handheld console
7. Half the wishes pool
8. Extra outfits beyond the 15 in MVP

**Never cut:** Live mode, needs, the four cats and their personalities, Build mode and the catalog, Hyrox training and race day, veggie sushi, coffee and a rusk in the grass, saves (including export and import), onboarding, and the MacBook Safari check.

## 9. When an agent fails

- **Unclear or failed report:** re-dispatch once, with a narrower scope and the failure quoted in the brief.
- **Second failure:** reassign the work or cut it, and log the decision.
- **A wave over its time box by 30 minutes:** stop waiting, merge what's green, and move the rest into the next wave's fix list.

## 10. Final report to the user

When it ships, reply with:

- Where the game is: `dist/ellies-place.html`.
- What's in it, in one short paragraph.
- What got cut and why.
- Known issues.
- How to personalise it (`docs/PERSONALISE.md`).
- A reminder to play it himself for 30 minutes before giving it to her.
