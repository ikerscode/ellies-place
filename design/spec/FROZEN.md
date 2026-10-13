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
