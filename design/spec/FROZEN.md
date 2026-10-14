# FROZEN: Wave 1 decisions

Frozen by the lead on Tue 13 Oct 2026. This file beats every `design/spec/*.md` where they disagree. Only `design/ELLIE.md` and `design/BRIEF.md` rank above it. To change anything here, ask the lead; don't edit a spec to route around it.

## 1. Which spec owns what

| Topic | Owner | Notes |
| --- | --- | --- |
| Time, needs, mood, utility AI, queue, carrying, cats, bond, quirks, sunbeams, visitors, weather, soak invariants | `sim.md` | |
| Lot, rooms, windows, starting furniture, catalog items and ids, base prices, unlock assignment, paints, Cosy, sets, Bruce's spots | `home.md` | |
| Activities and minigames, skills, race model, Critterbound, wardrobe, wishes, aspirations, Hearts sources, catalog reach R(d) and the band, onboarding, stickers, mail, housewarming flow | `play.md` | Except where §3 below gives a topic to `home.md` |
| Screens, HUD, menus, keys, component kit, theme tokens, accessibility | `ui.md` | |
| Palette, sprite rules, sprite list, batches | `art.md` | |
| Buses, instruments, arrangements, stations, music states, SFX list | `audio.md` | |
| Voices, string key convention, banned phrases, lengths | `voice.md` | |
| Types, events, entry points | `contracts.md` + `src/core/types.ts` | |

## 2. Numbers that conflicted

| # | Topic | Decision | Void |
| --- | --- | --- | --- |
| 1 | Mood → Hearts multiplier | `sim.md` §3.3 stepped bands: ×0.8, 0.9, 1.0, 1.15, 1.3, 1.5. Applies to wishes, races, minigame Hearts and the good-mood trickle only. | `play.md` linear formula |
| 2 | Good-mood trickle | Each awake game hour: +1 if mood ≥ 50, +2 if mood ≥ 75, × multiplier (`play.md` §8.2). | `sim.md` "≥ 65 → 2" |
| 3 | Bond level-up Hearts | 25 flat per level, no multiplier (`play.md` §8.2). | `sim.md` 15/25/40/60 |
| 4 | Minigame score and result factor | One score `s` in 0..1. Need and Fitness effects use factor `f = 0.8 + 0.4·s`. Skip or cancel: `s = 0.5` (`PASS_SCORE`) for Hearts, XP, race time, wishes; `f = 0.8` for needs. Free-will auto-play: `s = 0.6`, `f = 1.0`. Skips never set a PB. | |
| 5 | Mood and bond string keys | `ui.mood.<MoodBand>` and `ui.bond.<0-4>` (contract enum values). | `sim.md` `mood.band.N`, `bond.level.N` |
| 6 | Personal mail shape | Contract `{date, subject, body}`. | BRIEF's `{date, from, lines}` |
| 6a | Aspiration tier string keys | `asp.<id>.tier.<n>` (title) and `asp.<id>.tier.<n>.goal` (goal text), with ids from #7. | `play.md` `asp.<id>.<n>.name`, `ui.md` `asp.<id>.tier<n>.goal` |
| 6b | IP and tone review | All findings in `reports/wave1-ip-tone.md` applied (6825fca): band names only under `record.sleeve.*`; Splash starter is Drippet; mood label "Alright"; Salem is "she"; displayed text says "catalogue"; "moodlet" never reaches players; the print phrase lives only in `personal.ts`. | |

## 3. Catalog and economy (home.md vs play.md)

| # | Topic | Decision |
| --- | --- | --- |
| 7 | Aspiration ids | `play.md`: `asp.hyrox`, `asp.royalty`, `asp.home`, `asp.collect`. Map `home.md` codes: `asp:hyrox:N` → `asp.hyrox.N`, `asp:royalty:N` → `asp.royalty.N`, `asp:homemaker:N` → `asp.home.N`, `asp:collector:N` → `asp.collect.N`. |
| 8 | Home Maker tiers | `home.md` §6.6 thresholds (calibrated on its Cosy maths): T1 any room rated ≥ 45; T2 first set completed; T3 3 rooms ≥ 65 and 3 different sets; T4 home Cosy ≥ 80. |
| 9 | Housewarming available | Home Cosy (rated) ≥ 60 AND every scored room ≥ 40 AND day ≥ 5 AND not yet held. Flow, RSVP, beats and rewards as `play.md` §12. |
| 10 | Which items unlock where | `home.md` unlock column wins, bond items included. `play.md`'s per-tier "unlock item" names are void. `play.md`'s per-tier "gift item" stays as one free copy; the data owner picks the `home.md` item unlocked by that tier that is closest to the named gift. |
| 11 | Pickle's new stock | New unlock code `day:N`. Full: 14 items on days 2, 3, 4, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25. MVP: 3 items on days 3, 8, 15. Taken from `home.md`'s `asp:homemaker:3/4` lists. |
| 12 | Free first copies | Secret items, Poe trades, aspiration gifts, sticker gifts, housewarming gifts. Free items show "Put away" and never refund. Bought items refund the full price. Unlocking alone gives no copy. |
| 13 | Prices | `home.md` base price × `ECONOMY.priceScale`, rounded to the nearest 5 (minimum 5; 0 stays 0). Start value `priceScale = 1.6`. balance-analyst tunes `priceScale` and earnings in Wave 4 against the `play.md` §8.6 band. |
| 14 | Band measure | `play.md` R(d): unlocked and affordable, cheapest first, `W = 150 + heartsEarnedTotal`. N = 124 full (123 with the framed print off), N = count of MVP-flagged items in MVP. `home.md`'s "owned" reading is void. |
| 15 | Delivery | 30 game minutes in Live mode; box at (6,14) or the nearest free living-room tile; instant in Build mode. |
| 16 | All economy numbers | Live in one `ECONOMY` table in `src/content/data/`. |
| 17 | Time during minigames | `sim.md` wins: the sim keeps running, forced to ×1, while an activity overlay is open (the cats keep living behind it); the previous speed returns afterwards. The architect's "pause" default is void. |
| 18 | Interaction ids | `sim.md` §4.3 / §8.6 ids win (e.g. `sofa.sit`). `home.md` item rows that use other ids (`sit`, `cat_nap`) are mapped to the `sim.md` id by the data owner (game-designer#data). |
| 19 | Placement error strings | The 6 new placement errors get strings from the Wave 2 writer. |

## 3b. Contract review rulings (reports/wave1-contracts-review.md, Wed 14 Oct)

| # | Topic | Decision |
| --- | --- | --- |
| 20 | World access (B1) | New `WorldQueries` (read-only subset of `World`: roomAt, navGrid, slotPose, footprintTiles, sunbeams). It is a required field of `CreateSimOptions`, `SystemContext`, `AiContext` and `EngineOptions`, and `Sim.world` is exposed for cats. The **world computes sunbeams**; the engine only draws them. `makeFixtureWorld` goes in the fixtures. |
| 21 | Sprite ids (B2) | `home.md` item ids win; `art.md`'s item list is void. An item's sprite key is `item.<ItemId>`, plus `.r1`/`.r2` for rotations and `.on`, `.open`, `.full`, `.overhead` for states (pure `itemSpriteKey` in core). `base#palette` means one grid recoloured. Art checklist generated at `design/spec/art-checklist.md`. `validateContent(db, {sprites, strings})` checks every key. |
| 22 | String key spelling (B3) | `voice.md` forms: `int.<interactionId>`, `wish.<wishId>` (ids don't repeat the prefix), `mail.<mailId>.subject/.body`, `item.<ItemId>.name`, `build.err.<PlacementError>`, `ui.need.<k>.name` and `.help`, `asp.<id>.tier.<n>` + `.goal` + `.reward`. One builder per family in `src/core/keys.ts`; coverage test walks the enums. The writer renames the Wave 1 keys. |
| 23 | Time (B4, F5, F34) | `effectiveSteps(activity) = 1`. Fast-forward replaces speed (never multiplies). Soft-pausing panels use `time.setSpeed 0`; `GameTime` stores `lastSpeed`; `Sim.load` normalises: mode to live, drop any activity session and cancel its action, restore speed from `lastSpeed`. `getFile()` never returns an in-activity snapshot. The onboarding tour does **not** freeze the clock (no `clockTick`); `cutscene` mode suspends need decay only. |
| 24 | Soak and headless boot (B5) | qa-engineer owns `tests/soak/*` and `src/testing/headless.ts` (`createHeadlessGame({seed, debug})`). sim-dev owns `tests/unit/sim/*` only and writes no runner. The integrator reuses `createHeadlessGame` for the non-DOM half of boot. |
| 25 | Activity outcomes (B6, F24) | Need effects, Hearts and XP come only from `InteractionDef.effects`, `ECONOMY.minigame` and `ECONOMY.skillXp`, scaled by `needFactor` and the score. `ActivityResult.effects` may hold only `skillXp`, `record`, `stat`, `feeling`, `flag`. `skill?: SkillId` on `InteractionDef` and `ActivityResult`. `SkillId = HyroxStation \| 'kitchen'`. Training PBs are points 0..100 (`stationPb`); race PBs in ms. `ActivityResult.details?: JsonObject` carries race `stationScores` and `splitsMs`. Race coefficients live in `ContentDb`. |
| 26 | Wishes and housewarming (F18, F19) | Cut the wish swap. Keep roll rules: add `WishDef.category` and `size`, `ActiveWish.baseline`, `WishesState.lastDone`, `offered`. Hearts come from ECONOMY only. Add action `housewarming.rsvp { tonight: boolean }`. Mood-boost numbers: `sim.md` wins (+8 for 90 min); `play.md`'s values void. |
| 27 | Sun model (F15) | `sim.md` model wins (left, back and right windows, 06:30 to 19:00; south windows cast nothing); `home.md` §2.4 hours and geometry void. `WindowDef.facing` is documented as **outward**. Add `SimTuning.sun`. |
| 28 | Save (F33 to F37) | Photos travel inside export and import (`photos: Record<PhotoId, string>`), one cap (100). Personal mail gets stable `PersonalMail.id`; delivered mail stores a text snapshot; `personalSent: string[]`; `localDate(wallMs)` helper. `LoadResult` adds `{kind:'tooNew', version}` and a newer save is never overwritten. `validateSimState` and `reconcileState`; chain test for `MIGRATIONS`. `Settings` get their own storage key (`saveSettings`/`loadSettings`). **Relaxed timing is cut.** |
| 29 | Type tightening (F3) | `exactOptionalPropertyTypes`, `IdMap = Record`, `DeepReadonly` (primitives first so brands survive) in place of `Readonly<SimState>`, `DispatchResult.reason: StringKey`. |
| 30 | Fixtures (F10) | `fixture` items can be moved and rotated, not sold, stored, duplicated or bought. `ItemDef.fixture?: true`; the `fixed` placement error means "cannot be sold or stored". |
| 31 | Cosy value (F11) | `ItemDef.valueOverride?: number` replaces `cosy`; the world derives v(i) from base `price` per `home.md` §6. |
| 32 | Outfit slots (F23) | `OutfitSlot` = head, clip, neck, top, feet. `ui.md` wardrobe rows follow. Grade names `good`/`okay` are contract suffixes; `play.md` keys follow. |
| 33 | Day numbers (N12) | Data uses weekday conditions. `play.md`'s absolute day numbers are pacing hints only. |
| 34 | Day phases (N1) | `DayPhase` = `dawn`, `day`, `dusk`, `night`. |
| 35 | Request files (F41) | Contract requests go to `reports/contract-requests/<agent-id>.md`, tickets to `reports/tickets/<agent-id>.md`. No root `CONTRACT_REQUEST.md`. The integrator merges tickets into `TICKETS.md`. |
| 36 | DOM tests (F39) | `happy-dom` as a devDependency; per-file `// @vitest-environment happy-dom`. |
| 38 | Art batch split | Rebalance per `design/spec/art-checklist.md` suggestion: lighting and electronics move B to C; wall decor and rugs move B to D; the 10 later outfits and the visitors (Bruce, Poe, Pickle) move A to D. Target drawn kpx: A 86, B 74, C 76, D 78. The generator `scripts/art-checklist.mjs` is updated by the pixel-artist who owns the move. |
| 39 | Icon keys | `icon.int.<glyph>` (shared glyphs) as in `contracts.md` and `ui.md`; the checklist's 21 new glyphs plus 41 reused keys stand. Wallpaper motifs: 7 (not 8). |
| 40 | Structure sprites | Key families `struct.wall.<style>`, `struct.door.<kind>`, `struct.window.<kind>` (batch D), and `paint.<paintId>` for floor/wall patterns with a `template` sprite and variant (hex, flags, brick, herringbone, carpet, rubber, band) on `PaintDef` (F13). |
| 37 | Scope | All other review items (F1, F2, F4, F6 to F9, F12 to F14, F16, F17, F20 to F22, F25 to F32, F38, F40, nits) are accepted as the reviewer wrote them; the architect applies the types and helpers, owners apply the rest during Wave 2. |

## 4. Contracts v2 (architect applies before Wave 2)

All additive. Requests are archived in `reports/contract-requests/`.

- **Audio:** `AudioCue` adds `build.wall`, `build.floor`, `race.horn`.
- **UI (R1–R5):** KeyActions `secondary`, `cats`, `toggleHud`, `help`, `store`; `Ui.region()`; bus events `app.request`, `photo.request`; `UiDeps.loadPhoto`; bus events `activity.skippable`, `activity.skip`, `activity.leave`.
- **Sim (`sim.md` §16.2):** `GameTime.fastForward`; per-tick `dtGameMin` and `dtActionMin`; `InteractionTag` union; interaction def fields from §4.1; queued entries carry `autonomous`; moodlets, daily counters, Bruce, Poe, Pickle, weather, mess, delivery boxes, trinkets, unlock flags, cat requests, quirk flags in state; events `bondLevelUp`, `visitorArrived`, `visitorLeft`, `bruceSpotted`, `quirk`, `requestStarted`, `moodBandChanged`; need floors (Fitness 20, cat needs 10).
- **Play (`play.md` §13.4):** `ActivityResult` carries `score` and `misses`; progression state includes `heartsEarnedTotal` and the set of free-origin items; unlock code `day:N`.
- **UI cross-spec (`ui.md` §25):** items carry `room.<kind>` tags; every interaction declares an icon key; cat discovery flags `known.<cat>.like.*`.

## 5. Accepted design calls made by spec authors

- Every tick is 0.05 game minutes; speed changes ticks per second only. Sleep fast-forward ×10. Day 1 is a Thursday, 09:00. 1 real hour ≈ 3.5 game days.
- Bond levels never drop. The only loss is over-handling: −1 per event, at most −2 per day.
- Mess clears itself after 36 game hours. Plants never wilt. Decor is never lost.
- Rain chance 0.18 a day, never on Saturdays. Race day is Saturday.
- The garden is on the east side; the front faces south.
- Two Cosy readings: `cosyLive` (drives her Cosy need) and `cosyRated` (Build meter, milestones, housewarming).
- Race time is a fixed formula with no RNG (about 1:53 down to 0:56).
- Critterbound triangle: Spark beats Splash beats Sprout beats Spark.
- One XP curve for every skill (375 XP to level 10). Starting Hearts 150.
- UI: world first. Small corner clusters fade when Ellie walks behind them. The queue hangs as cards on a peg line. Needs are six candles. Wish cards peek up from the bottom edge. Cat tabs sit on the right edge. The interaction menu is a bloom of petals in an arc above the target. `--u` is one canvas pixel, with a 12 px text floor. Some panels pause time. Credits roll when the housewarming reaches `done`.
- String keys: `domain.subject.situation.nn`, for example `cat.george.idle.01`.
- Band names appear only as plain text on plain sleeves (`home.md` §4.1).
- `frame_grazie` exists only when `personal.ts` has `framedPrint: true` (default true). It unlocks at the housewarming, costs 0, max 1.

## 6. MVP versus full scope

MVP must ship. Full ships if the clock allows. The cut order from PROMPT.md §8 applies inside "full".

| Feature | MVP | Full |
| --- | --- | --- |
| Live mode, 6 needs, mood, free will, queue, speeds, sleep fast-forward | all | + real-time mode |
| The four cats: needs, personality, bond 0–4, quirks, bubbles | all | |
| Cat interactions | 12 | 25 |
| Cat lines | 120 | 300 |
| Visitors | Pickle deliveries; Bruce at the fence with 5 hiding spots; Poe visits | Bruce moves in; Poe trinket trades |
| Build mode: place, move, rotate, sell, undo/redo, paint, catalog, delivery, Cosy meter with hints | all | + duplicate, eyedropper, store |
| Wall-building tool and attic or balcony room | no | stretch only |
| Catalog items | 75 MVP-flagged (`home.md`) | 124 |
| Ellie interactions | 25 | 45 |
| Hyrox: 8 station minigames, skills, race day, PB board, medals | all | + George's commentary lines in full |
| Kitchen: veggie sushi, coffee (kettle and machine), rusk dunk in the grass, eating | all | |
| Critterbound | no | yes (cut #1) |
| Records: 3 stations, dance, headbang | yes | |
| Photo mode with album and PNG save | yes | + all filters and cat captions |
| Stargazing: shooting-star wishes | yes | + constellations |
| Wardrobe outfits | 15 (play.md lists 21 MVP; ship ≥ 15) | 30+ |
| Daily wishes | 30 | 60 |
| Aspirations | Hyrox Hero, Cat Royalty, Home Maker × 4 tiers | + Collector |
| Mail | 10 | 25 (+ personal mail by date) |
| Stickers and secrets | MVP rows in `play.md` §10.3 | all 36 |
| Weather (rain) | no | yes (cut #5) |
| Housewarming and credits | yes | |
| Onboarding (George's royal tour, skippable) | yes | |
| Saves: autosave, backup slot, export and import JSON | yes | |
| Journal tabs | wishes, aspirations, cats, mail, stickers, race PBs, settings | + collection, photos |
| Settings: volumes, text size, text speed, reduced motion, free will | yes | + real time |
| Handheld console | no | yes (cut #6) |
| Audio: theme, Home, Night, Gym, 3 radio stations, cat sounds, SFX | yes | + Race Day, housewarming arrangements |

## 7. Platform

- WebKit (Safari stand-in) can't run in this environment without system libraries; see `PROGRESS.md`. Every gate runs on Chromium; the WebKit run is owed before ship and is raised with the user. The MacBook Safari check is never cut.
