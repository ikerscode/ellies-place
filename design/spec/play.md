# play.md: activities, progression and the Hearts economy

Owner: game-designer#play (Wave 1). Status: draft for freeze.

This spec turns `design/BRIEF.md` sections 10 to 15 into exact numbers, rules and content rows. Wave 2 transcribes it into `src/content/data/`. Activities devs build from it. The soak test checks the Hearts band in section 8.

Read with: `design/ELLIE.md` (tone, facts), `design/BRIEF.md`, `design/spec/sim.md` (needs, decay, mood, bonds), `design/spec/home.md` (items, rooms, Cosy, prices), `design/spec/contracts.md` (types).

## Contents

1. Conventions and shared rules
2. Hyrox: training, skills, race day, PBs and medals
3. Kitchen: veggie sushi, coffee, the rusk dunk, eating
4. Critterbound (console and handheld)
5. Life: records, photo mode, stargazing and lanterns
6. Wardrobe: outfits and streak colours
7. Progression: wishes and aspirations
8. The Hearts economy and the soak band
9. Onboarding (first day)
10. Secrets and stickers
11. Mail
12. Housewarming
13. What other specs and the contract must match

---

## 1. Conventions and shared rules

### 1.1 Notation

- **Ids** are stable `snake_case` strings. Prefixes: `act.` activities, `stn.` Hyrox stations, `wish.` wishes, `asp.` aspirations, `out.` outfits, `stk.` stickers, `mail.` mail, `crit.` critters. In data tables the prefix is part of the id.
- **Item ids** (catalog) are written bare, like `pb_board`. They are proposals. If `home.md` names the same thing differently, `home.md` wins and the Wave 2 data uses its id. What must survive is the unlock source and the price band.
- **Interaction ids** (like `cat.bow`) are proposals in the same way. `sim.md` wins on names.
- **String keys** are in `code`. A short placeholder in quotes after a key, like `wish.bow_george.title` "Bow to George", is a hint for the writer only. The writer owns every final word.
- **Game time:** `hh:mm` is the in-game clock. "Game minute" and "game hour" are in-game. "s" means real seconds while an activity screen is open. At speed x1 one game hour is one real minute (BRIEF section 4).
- **Day 1 is a Monday.** Saturdays are days 6, 13, 20, 27 and so on.
- **Needs** are 0 to 100 and every change is clamped to that range. `+12 Calm` means add 12, then clamp.
- **MVP** column: `Y` must ship in MVP, `F` is full scope.

### 1.2 The minigame frame (every minigame)

Every minigame in this spec runs inside the same frame, which `activities-dev` builds once.

| Rule | Value | Reason |
| --- | --- | --- |
| Length | 15 to 30 s of play | BRIEF section 10. Short enough to repeat daily. |
| Intro | One line on screen, key `<act>.instr`, shown 1.5 s, then a 3-beat count-in (0.4 s per beat) | She always knows the one control before it matters. |
| Controls | One action key: Space or Enter, or click/tap anywhere on the activity. Arrow keys only where the row says so. Left/Right arrows can also be the left/right half of the screen for click and tap. | One-button play, mouse first. |
| Score | A number from 0.0 to 1.0, shown as points `round(score x 100)` | One scale for every game, so Hearts and XP use one formula. |
| Grade | `grade.perfect` >= 90 points, `grade.great` >= 70, `grade.nice` >= 40, `grade.done` below 40 | Every grade is a positive word. No "fail" text exists. |
| Miss | Defined per minigame below. A miss only lowers the score. | |
| Skip | After the 2nd miss, a **Skip** button appears (key `ui.skip`, "Skip"), hotkey Esc or S. Skip ends the minigame as a **pass**. | Pillar 1. |
| Pass | A skipped minigame scores **0.5** (`PASS_SCORE`), counts as completed for wishes, aspirations and race time, and pays the normal result effects at 0.5. It never sets a PB. | "Skip counts as pass", fixed and predictable. |
| Relaxed timing | Setting `settings.relaxed_timing` (default off) widens every timing window and band by x1.5 | Accessibility. Never mentioned as easier, just "Relaxed timing". |
| Pause | Esc opens pause (resume, restart, skip if available, quit as pass). Quitting from pause also counts as a pass. | Leaving never costs anything. |
| Sim time | The house simulation is paused while a minigame screen is open. On close, the activity's game-time cost is applied at once. | Simple and deterministic. |
| Autonomous use | When free will picks an activity that has a minigame, it resolves with no screen at **score 0.6** | Free will can't play minigames. 0.6 is "decent". Also used by the soak. |
| Feel | Particles on Perfect hits. Audio cues `mg.hit_perfect`, `mg.hit_good`, `mg.miss_soft`, `mg.finish`. Nearby cats react through cat-ai events. | activities-dev rules. |

### 1.3 Shared result formulas

These apply to every minigame unless a row says otherwise. `s` is the final score (0.0 to 1.0).

| Quantity | Formula | Reason |
| --- | --- | --- |
| Hearts | `round((2 + 4 x s) x moodMult)`. Paid in full for the first 6 minigame results each game day, then 1 Heart each. | Small, steady income. The soft daily cap keeps a long grind from breaking the economy band without ever paying zero. |
| Mood multiplier | `moodMult = 0.8 + 0.7 x mood / 100` (0.8 at mood 0, 1.5 at mood 100). If `sim.md` defines a different mapping inside the same range, `sim.md` wins. | BRIEF section 6. |
| Skill XP | `10 + round(20 x s)` (10 to 30). A pass gives 20. | Even a skip moves her forward. |
| Training Fitness | `+4 + round(3 x s)` | Training always helps. |

### 1.4 Skills (0 to 10)

There are 9 skills: one per Hyrox station (8) and `kitchen` (sushi and coffee). They share one XP curve.

XP needed to go from level L to L+1 is `15 + 5 x L`.

| Level | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| XP for next level | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 55 | 60 | max |
| Cumulative XP to reach | 0 | 15 | 35 | 60 | 90 | 125 | 165 | 210 | 260 | 315 | 375 |

Reason: a typical session (score 0.6) gives 22 XP, so level 3 takes 3 sessions and level 10 about 17 sessions per station. With roughly 3 sessions a day spread over 8 stations, every station reaches 5 to 6 by game day 28 and a keen player can max one station in a week. Skills never go down.

Level-up gives a toast `skill.level_up` "{skill} is now {level}", sound `mg.level_up`, and 0 Hearts (Hearts come from the session).

### 1.5 Effects notation

Each activity row lists **Needs** (deltas applied once at the end), **Time** (game minutes the activity costs), **Hearts**, **XP**, and **Other** (counters, PBs, unlocks, cat events). Cat reactions are events that `cat-ai` listens for. They are named `ev.<name>` here and listed in section 13.

