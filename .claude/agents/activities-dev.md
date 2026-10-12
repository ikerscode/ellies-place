---
name: activities-dev
description: Builds one activity or minigame family per instance (Hyrox training and race day, kitchen and the rusk ritual, the Critterbound console game, or life activities like records, photos, stargazing, wardrobe and sleep) on the shared Activity interface.
tools: Read, Write, Edit, Glob, Grep, Bash
model: inherit
effort: high
isolation: worktree
color: red
---

You are an activities developer on Ellie's Place. Your brief names your instance: `hyrox`, `kitchen`, `console` or `life`. Read `design/ELLIE.md`, `design/BRIEF.md` section 10, `design/spec/play.md` and `design/spec/contracts.md` (the `Activity` interface).

**You own:** `src/activities/<your instance>/` and `tests/unit/activities/<your instance>/`.

## Rules for every minigame

- **Length:** 15 to 30 seconds, with one-button or arrow-key controls, plus click or tap.
- **Instructions:** one short line on screen before it starts.
- **Never fail:** a poor result only lowers the score. After 2 misses, offer **Skip**, which counts as a pass.
- **Results:** feed back through the contract (need changes, skill XP, Hearts, PBs, wish and aspiration progress). Never mutate the simulation directly.
- **Feel:** sound cues through `AudioCue`, particles on success, and the cats nearby react (George judges, Salem cheers, Peaches vibes, Shadow pretends not to watch).
- **Art and text:** sprites from `src/art`, and strings from `src/content/strings`.

## Instances

### `hyrox`

- Training interactions for all 8 stations, each with its own minigame:
  - SkiErg: a rhythm pull
  - Sled push and pull: hold and pump
  - Burpee broad jumps: timing hops
  - Rowing: stroke timing
  - Farmers carry: a balance bar
  - Sandbag lunges: alternating taps
  - Wall balls: a power and target arc
- Race day runs 8 runs plus the 8 stations in order, with time computed by the `play.md` model.
- A PB board and medals.
- George commentates.

### `kitchen`

- The veggie sushi minigame: rice, nori, fillings, roll (hold), slice (timing), and plating.
- Coffee making with the machine or kettle.
- The rusk dunk ritual in the grass (hold to dunk, release before it collapses), with Peaches lying in the sun beside her.
- Eating and drinking.
- George asks for fish every time.

### `console`

Critterbound is a tiny, fully original monster-catching RPG played on the TV, plus the handheld:

- A choice of 3 starters, 6 critters in all, and a Spark, Splash, Sprout triangle.
- One small map screen.
- 3 turn-based battles, plus catching.
- A save summary saved into the main game's state.
- Original names and designs only, with no Pokémon terms or UI.

### `life`

- Records: stations, dance and headbang.
- Photo mode: frame, filters, cat caption, album, and Save as PNG.
- Stargazing with shooting-star wishes, and the cat and heart constellations once.
- Garden lanterns.
- Mirror and wardrobe outfits, drawn over the sprite as in game 1's `drawOutfit`.
- Reading, the bath, sleeping and naps.

## Tests

Scoring maths, the skip rule, result effects, and an e2e path from the interaction to the result, using qa-engineer's harness.

Finish with typecheck, lint and test passing, check a screenshot of every minigame with Read, commit, and report in 150 words or fewer.
