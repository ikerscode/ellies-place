# Ellie's Place: project rules

Ellie's Place is a cosy life sim in the spirit of The Sims, made as a gift for one person, Ellie. It is the sequel to the pixel game in `reference/every-version-of-me.html`. It ships as one offline HTML file.

## Sources of truth, in priority order

1. `design/ELLIE.md`: personal facts and tone rules. Never contradict it.
2. `design/BRIEF.md`: the game design and its pillars.
3. `design/spec/FROZEN.md`, then `design/spec/*.md` once Wave 1 has frozen them.
4. `src/core/types.ts`: the contracts between modules.
5. `design/TECH.md`: constraints, ownership and gates.

**Reference:** `reference/every-version-of-me.html` is game 1.

- **Port from it:** `makeSprite`, `flipped`, the palettes, Ellie's and the cats' sprite grids, the Bruce, Poe and Pickle sprites, the outfit drawing, the audio engine (buses, reverb, instruments, scheduler, meows, purrs) and the speech-bubble behaviour.
- **Never copy:** its letters, hearts or drafts text.

## Hard rules

- **Single file:** one self-contained HTML that plays from `file://` in Safari and Chrome, with no network requests, no external URLs and no runtime dependencies.
- **Types:** TypeScript `strict`, with no `any` in exported APIs.
- **Determinism:** simulation code uses the seeded RNG in `src/core/rng.ts` and the injected clock. It never calls `Math.random()` or `Date.now()`.
- **No failure states:** low needs slow Ellie down and make her mopey, and nothing else. Every minigame offers Skip after two misses.
- **IP:** this is an original game. Use no names, logos, UI, sounds, creatures, catchphrases or invented languages from The Sims, Pokémon, Nintendo or any other game or show. Ellie's sprite stays her original design.
- **Tone:** playful and cosy. Never write romantic messages, confessions or love letters, and never reuse game 1's letters or hearts. The giver is not a character.
- **Strings:** every player-facing string lives in `src/content/strings/`, keyed by id. Never hard-code text in logic or UI code.

## Writing style for in-game text

- Short lines in plain words. Warm and funny, with each cat in its own voice (see `design/spec/voice.md` once written).
- No em or en dashes.
- None of these patterns: "Honestly?", "Here's the thing", "a testament to", "not just X, but Y", "tapestry", "journey" (unless it's literal), "elevate", "seamless", "vibrant". No neat three-item lists in every line, and no motivational-poster endings.
- Specific beats general. "Salem is in the box. Salem lives in the box now." beats "Salem loves boxes!"

## How agents work here

1. Your task brief gives you a list of **owned paths**. Write only inside them.
2. If you are in a fresh worktree, run `npm ci` first.
3. **Contract changes:** don't edit `src/core/types.ts` unless you are the architect. Write the exact diff you need in `reports/contract-requests/<your-agent-id>.md`. File tickets in `reports/tickets/<your-agent-id>.md`.
4. **Shared wiring:** don't edit `src/main.ts` or `src/app/` unless you are the integrator. Expose a clear `register…()` or `create…()` entry point, and describe it in your report.
5. **Tests:** write unit tests for every piece of logic you add, in `tests/unit/<your-area>/`.
6. **Before you report:** `npm run typecheck`, `npm run lint` and `npm test` must all pass. Commit everything on your branch with a clear message.
7. **Visual work:** if you made something visible, render it (`npm run art:sheet` or `npm run shots`), open the PNG with Read, and fix what looks wrong before you report.
8. **Report** in 150 words or fewer:
   - Branch name
   - What's done
   - What's not done
   - Risks
   - Contract requests
   - Entry points for the integrator

## Commands

| Command | Use |
| --- | --- |
| `npm run dev` | Dev server (not needed by agents) |
| `npm run typecheck` / `npm run lint` / `npm test` | Fast gates, run them often |
| `npm run build` | Builds `dist/ellies-place.html` and checks it |
| `npm run e2e` | Playwright on Chromium and WebKit |
| `npm run soak` | Headless 30-day simulation with invariants |
| `npm run shots` | Screenshot suite into `reports/shots/` |
| `npm run art:sheet` | Sprite contact sheets into `reports/art/` |

## Definition of done (for any feature)

- It works in the running game, not just in tests.
- Its strings are in `src/content/strings/`.
- It has unit tests for its logic, plus an e2e path if a player can reach it.
- It has sound, animation and some response from the cats, where they make sense.
- Every gate passes.
