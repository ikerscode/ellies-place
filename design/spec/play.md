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

---

## 2. Hyrox

### 2.1 Stations and the equipment that unlocks training

Training a station needs its item placed somewhere Ellie can reach (usually the spare room, the sled track runs along the garden). Burpee broad jumps need no equipment, so she can train on day 1. All gym items are in the catalog from the start (section 8.3), so Hyrox never waits on an unlock.

| # | Station id | Race distance | Training needs item | Skill id | Training activity id |
| --- | --- | --- | --- | --- | --- |
| 1 | `stn.skierg` | SkiErg 1000 m | `ski_erg` | `skill.skierg` | `act.train.skierg` |
| 2 | `stn.sled_push` | Sled push 50 m | `sled` (placed in the garden, needs a 6-tile straight run) | `skill.sled_push` | `act.train.sled_push` |
| 3 | `stn.sled_pull` | Sled pull 50 m | `sled` (same item) | `skill.sled_pull` | `act.train.sled_pull` |
| 4 | `stn.burpee` | Burpee broad jumps 80 m | none (any 4 free floor or grass tiles in a row) | `skill.burpee` | `act.train.burpee` |
| 5 | `stn.row` | Rowing 1000 m | `rower` | `skill.row` | `act.train.row` |
| 6 | `stn.farmers` | Farmers carry 200 m | `farmers_handles` | `skill.farmers` | `act.train.farmers` |
| 7 | `stn.lunges` | Sandbag lunges 100 m | `sandbag` | `skill.lunges` | `act.train.lunges` |
| 8 | `stn.wallballs` | Wall balls 100 reps | `wallball_target` | `skill.wallballs` | `act.train.wallballs` |

Other gym items: `kettlebell` (interaction `act.kettlebell`, no minigame), `treadmill` (`act.run_treadmill`), `gym_mat` (`act.stretch`). Running outside starts from the front step (`act.run_outside`).

### 2.2 Training sessions: shared effects

Every `act.train.*` row uses these effects. Rows below only add what differs.

| Field | Value | Reason |
| --- | --- | --- |
| Time | 40 game minutes | Two sessions fit before lunch. |
| Needs | Energy -8, Hunger -6, Fun +5, Calm +3, Fitness `+4 + round(3 x s)` | Training tires her but clears her head. Energy -8 means about 3 sessions a day before she wants coffee. |
| Hearts | Shared formula (1.3) | |
| XP | Shared formula to that station's skill | |
| PB | Points above the stored training PB for that station set a new `pb.train.<station>` and fire `ev.train_pb` | Feeds `wish.station_pb`. |
| Cats | `ev.training` (George judges from the doorway, Salem copies the move badly, Shadow leaves if the room is busy) | |
| Low Energy | Below 15 Energy she still trains. Her animation is slower and her bubble says `train.tired.<n>`. No penalty to score. | Never punish. |

### 2.3 The eight station minigames

Each is 15 to 30 s. Windows are in milliseconds either side of the ideal moment, or in percent of a bar. All randomness uses the activity's seeded RNG.

#### 1. SkiErg: rhythm pull (`act.train.skierg`)

- **Instruction:** `act.train.skierg.instr` "Pull when the ring hits the handles."
- **Length:** 20 s, 22 beats. Tempo rises from 60 to 78 bpm over the run.
- **Controls:** action key or click on each beat.
- **Play:** a ring shrinks onto the handles. Pressing when it lands pulls the handles down.
- **Scoring per beat:** Perfect within 80 ms = 1.0, Good within 160 ms = 0.6, otherwise 0. Score = mean over 22 beats.
- **Miss:** a beat with no press inside 160 ms, or an extra press between beats. Extra presses count once per beat at most.
- **Feel:** chalk puff on Perfect, the flywheel whirr speeds up with the streak.

#### 2. Sled push: hold and pump (`act.train.sled_push`)

- **Instruction:** `act.train.sled_push.instr` "Hold to push. Ease off to stay in the green."
- **Length:** 20 s.
- **Controls:** hold the action key.
- **Play:** a power bar rises at 60 %/s while held and falls at 45 %/s when released. The green band is 55 to 80 %. In the band the sled moves at full speed, outside it at 40 %. Every 4 s a "heavy patch" (sticky floor) widens the drop rate to 60 %/s for 1 s, telegraphed by a dark stripe 0.8 s ahead.
- **Score:** fraction of time the bar spends in the green band.
- **Miss:** 2 continuous seconds outside the band. The counter resets when she re-enters the band.

#### 3. Sled pull: hold and pump, rope version (`act.train.sled_pull`)

- **Instruction:** `act.train.sled_pull.instr` "Hold to haul. Let go on the slack, grab again."
- **Length:** 20 s, 12 hauls.
- **Controls:** hold the action key to haul, release and press again to re-grip.
- **Play:** while held, the rope comes in. Each haul ends with a "slack" flash on the rope. She must release, then press again within the re-grip window after the flash.
- **Scoring per haul:** re-grip within 150 ms of the flash = 1.0, within 300 ms = 0.6, later = 0.2.
- **Miss:** a re-grip later than 300 ms, or holding through the flash.

#### 4. Burpee broad jumps: timing hops (`act.train.burpee`)

- **Instruction:** `act.train.burpee.instr` "Jump at the top of the bar."
- **Length:** 20 s, 10 jumps.
- **Controls:** action key or click.
- **Play:** after each burpee, a crouch meter swings up and down (1.1 s cycle). Pressing jumps forward. Distance depends on meter height.
- **Scoring per jump:** top 15 % of the meter = 1.0, top 35 % = 0.6, anything lower = 0.25.
- **Miss:** a jump below the top 35 %, or no press for a whole cycle (she does a little hop on her own and the meter restarts).

#### 5. Rowing: stroke timing (`act.train.row`)

- **Instruction:** `act.train.row.instr` "Press at the catch, let go at the finish."
- **Length:** 25 s, 14 strokes.
- **Controls:** hold the action key during the drive.
- **Play:** the handle slides forward to the catch marker and back to the finish marker. Press at the catch, hold through the drive, release at the finish.
- **Scoring per stroke:** catch press within 120 ms and finish release within 120 ms = 1.0. One of the two in window (or both within 240 ms) = 0.5. Neither = 0.
- **Miss:** a stroke scoring 0.
- **Feel:** the water ripple grows with the streak, Peaches' ear twitches at the whoosh if she's in the room.

#### 6. Farmers carry: balance bar (`act.train.farmers`)

- **Instruction:** `act.train.farmers.instr` "Keep the bar in the middle with Left and Right."
- **Length:** 20 s.
- **Controls:** Left and Right arrows (or left/right half of the screen), held.
- **Play:** a tilt marker drifts on a bar. Drift is seeded smooth noise up to 25 %/s, plus a "wobble" gust every 3 to 5 s (shown by a wind tick on the bar 0.5 s early). Holding a direction pushes back at 40 %/s.
- **Score:** fraction of time inside the centre band (middle 30 %).
- **Miss:** the marker reaches either edge. She sets the handles down for 1 s, shakes out her hands and picks them up with the marker re-centred. Nothing is dropped for good.

#### 7. Sandbag lunges: alternating taps (`act.train.lunges`)

- **Instruction:** `act.train.lunges.instr` "Left, right, left. Follow the footprints."
- **Length:** 20 s, 20 lunges.
- **Controls:** Left and Right arrows (or left/right half of the screen).
- **Play:** footprints slide in on a beat (one per second), alternating sides. Each must be stepped with the matching key as it lands.
- **Scoring per lunge:** correct side within 150 ms = 1.0, within 300 ms = 0.6, otherwise 0.
- **Miss:** wrong side, or no step within 300 ms. She wobbles, Salem's ears go flat in sympathy.

#### 8. Wall balls: power and target arc (`act.train.wallballs`)

- **Instruction:** `act.train.wallballs.instr` "Hold to squat, let go in the target."
- **Length:** 25 s, 10 throws.
- **Controls:** hold and release the action key.
- **Play:** holding fills a power meter from 0 to 100 % in 1.2 s, then it falls back (ping-pong). The target band sits at a seeded height between 55 and 85 % per throw, drawn on the meter. Release throws the ball in an arc at the target on the wall.
- **Scoring per throw:** within 5 % of band centre = 1.0, within 12 % = 0.6, otherwise 0.2.
- **Miss:** a throw outside 12 %. The ball bounces off the wall and Salem chases it (`ev.ball_loose`).

### 2.4 Other fitness interactions (no minigame)

| Id | Where | Time | Needs | Hearts | Notes |
| --- | --- | --- | --- | --- | --- |
| `act.run_outside` | Front step | 45 min, off-screen | Fitness +6, Energy -10, Hunger -6, Calm +6 | 2 | Counts for `wish.go_run`. Salem waits at the door. |
| `act.run_treadmill` | `treadmill` | 30 min | Fitness +5, Energy -8, Hunger -5, Fun +2 | 2 | Counts for `wish.go_run`. Peaches watches the belt. |
| `act.kettlebell` | `kettlebell` | 20 min | Fitness +3, Energy -4, Fun +2 | 1 | |
| `act.stretch` | `gym_mat` or grass | 15 min | Calm +6, Energy +2 | 1 | Shadow approves of stillness: Shadow bond +1 if within 4 tiles. |

These pay flat Hearts (times moodMult, rounded) and do not count toward the 6-a-day minigame cap.

### 2.5 Race day

**Where and when.**

- **Official race:** every Saturday. `mail.race.confirm` arrives Friday 08:00. On Saturday from 07:00 to 11:00 the front door and the race board offer `act.race` ("Go to the race"). If she doesn't go, nothing happens and the race board stays open all day.
- **Any time:** the race board (in the laptop's Race tab, and on the `pb_board` item once owned) starts a race on any day from 07:00 to 19:00.
- **Hearts limit:** the race finish bonus pays once per game day. PB and medal bonuses always pay. A second race the same day is still allowed and still sets PBs.

**Flow (about 4 to 5 real minutes).**

1. Venue card: `race.venue.title` "Race day", her start time, the cats on the side (art: the four cats behind a rope, George on a folding chair).
2. Repeat 8 times: **run** segment (a 3 s scrolling vignette, no input, shows her split), then **station** segment (that station's minigame, race variant).
3. Results card: total time, splits, PBs, medals, George's verdict.

The race variant of each station minigame is identical to training (same controls, timings, length and Skip rule). Skip in a race gives 0.5 for that station.

**Game-time cost:** 120 game minutes (Ellie is out of the house). The house sim jumps 2 hours on return.

**Race effects (on finish):**

| Field | Value | Reason |
| --- | --- | --- |
| Needs | Energy -30, Hunger -20, Fun +20, Calm +8, Fitness +8 | A big day. Leaves room for a nap and sushi. |
| Hearts | Finish 40 (once per game day) x moodMult. New overall PB +30. Each new station split PB +5. First-time medal bonus, see 2.7. | |
| XP | +12 XP to each station skill | Racing teaches too, at about half a session. |
| Counters | `racesCompleted += 1`, `racePBs` updated, `ev.race_done` | Feeds wishes, aspirations, mail. |
| Cats | When she gets home, all present cats gather at the door (`ev.home_from_race`). George inspects the medal. | |

### 2.6 The race-time model

All times are whole seconds. No RNG: the same inputs always give the same time.

**Inputs**

- `skill[i]`: station skill 0 to 10, read at race start.
- `F`: Fitness 0 to 100, read at race start.
- `score[i]`: that station's minigame score in this race, 0.0 to 1.0 (0.5 if skipped).
- `races`: races completed before this one.
- `fresh`: 1 if Energy >= 60 at race start, else 0.
- `coffee`: 1 if she finished a coffee in the 3 game hours before the start, else 0.

Bonuses only add. Nothing in the model makes a time worse than the baseline for those skills and that Fitness.

**Segment performance** (each clamped to 0..1)

```
P_station[i] = 0.45 * skill[i]/10 + 0.35 * F/100 + 0.20 * score[i] + 0.03 * fresh
P_run        = 0.80 * F/100 + 0.20 * min(1, races/5) + 0.03 * fresh + 0.02 * coffee
```

Reasons: station skill is the biggest lever because training is the main loop. Fitness carries the runs. Race experience gives the last 20 % of run pace, so racing itself is rewarded. The minigame matters (20 %) but a skip only costs a little.

**Segment time**

```
t = worst - (worst - best) * P
total = sum over 8 runs (all use P_run) + sum over 8 stations
```

| Segment | Worst (P = 0) | Best (P = 1) |
| --- | --- | --- |
| Each 1 km run | 7:30 (450 s) | 3:50 (230 s) |
| 1 SkiErg 1000 m | 6:30 (390) | 3:40 (220) |
| 2 Sled push 50 m | 6:00 (360) | 2:30 (150) |
| 3 Sled pull 50 m | 7:00 (420) | 3:20 (200) |
| 4 Burpee broad jumps 80 m | 8:00 (480) | 3:30 (210) |
| 5 Rowing 1000 m | 6:30 (390) | 3:45 (225) |
| 6 Farmers carry 200 m | 3:30 (210) | 1:30 (90) |
| 7 Sandbag lunges 100 m | 7:00 (420) | 3:30 (210) |
| 8 Wall balls 100 reps | 9:00 (540) | 4:00 (240) |
| **Total** | **1:53:30** | **0:56:25** |

The range runs from a slow first-timer to a very fast amateur, which keeps every PB reachable and every race feel like progress.

**Worked examples** (all eight stations at the same skill and score, for readability)

| Case | Skill | Fitness | Scores | Races before | Fresh | Coffee | Run split | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| First race, skipped every station | 0 | 30 | 0.5 | 0 | no | no | 6:37 | **1:40:44** |
| Week 2 | 2 | 45 | 0.6 | 1 | no | no | 6:02 | **1:31:35** |
| Week 3 to 4 | 4 | 60 | 0.7 | 2 | yes | no | 5:20 | **1:20:38** |
| Strong | 7 | 80 | 0.8 | 4 | yes | yes | 4:23 | **1:06:46** |
| Everything maxed | 10 | 100 | 1.0 | 5 | yes | yes | 3:50 | **0:56:25** |

Example station split, week 2 case, SkiErg: `P = 0.45*0.2 + 0.35*0.45 + 0.2*0.6 = 0.3675`, `t = 390 - 170*0.3675 = 327.5`, rounded to 328 s (5:28).

Rounding: round each segment to the nearest second (half up), then sum.

### 2.7 PB board and medals

**PB board** (journal page `journal.race`, and drawn in-world on the `pb_board` item):

- Overall PB (best total) with date.
- Best split per station (`pb.race.<station>`) and best run split.
- Training PB per station (`pb.train.<station>`, points 0 to 100).
- Last 5 races: date, total, medal.
- Station skills as 10-pip bars.

**Medals** are awarded by finish time. Each race gives the best medal its time earns. The first time she earns each medal she gets the bonus Hearts and its sticker.

| Medal id | Time | First-time Hearts | Sticker | Reason |
| --- | --- | --- | --- | --- |
| `medal.finisher` | any finish | 0 (the finish bonus covers it) | `stk.first_race` | Every race ends with a medal. |
| `medal.bronze` | under 1:35:00 | 50 | none | About week 2 for a regular trainer. |
| `medal.silver` | under 1:20:00 | 100 | none | About week 3 to 4. |
| `medal.gold` | under 1:08:00 | 150 | `stk.medal_gold` | Needs most skills around 7. |
| `medal.royal` "The King's Medal" | under 1:00:00 | 200 | `stk.royal_medal` | George's own medal. Needs near-max everything. |

Medal names: `medal.<id>.name`. George presents the royal medal himself (`race.george.royal`).

### 2.8 George commentates

During the race, after each station George says one line from `race.george.<station>.<grade>` (8 stations x 4 grades = 32 keys) and one line at the finish from `race.george.finish.<medal>` (5 keys). On a skipped station he says `race.george.skip.<n>` (3 variants), which is approving, never disappointed. Salem cheers with `race.salem.cheer.<n>` (4 variants) on Perfect-grade stations. Shadow says one line per race, at the finish only, `race.shadow.finish.<n>` (3 variants). Peaches bops to the race music in the background.

---

## 3. Kitchen

### 3.1 Kitchen skill

`skill.kitchen` (0 to 10, curve in 1.4) rises from sushi and the coffee machine minigame. Each level widens every sushi and coffee timing window and band by 3 % (level 10 = +30 %), and unlocks small things to discover:

| Level | Unlock |
| --- | --- |
| 2 | Plating layout `plate.fan` |
| 3 | Recipe variant "rainbow roll" (avocado slices on top, `sushi.variant.rainbow`) |
| 5 | Latte art shapes `art.leaf` and `art.cat` (from the start she has `art.heart`) |
| 7 | Plating layout `plate.tower` and an inari side pocket option |
| 10 | Plating layout `plate.royal`, George's line `sushi.george.royal_plate` (he still asks for fish) |

### 3.2 Veggie sushi (`act.sushi`)

**Starts from:** the kitchen counter, interaction `kitchen.make_sushi`. Ingredients are always in the fridge (no shopping, no cost).

**Instruction:** `act.sushi.instr` "Rice, fillings, roll, slice. No fish."

**Steps** (about 26 s total):

| Step | Length | Controls | Play | Scoring | Miss |
| --- | --- | --- | --- | --- | --- |
| 1. Nori | 1 s | none | The sheet lays itself on the bamboo mat. | none | none |
| 2. Rice | up to 5 s | hold | Hold to spread rice. A coverage bar fills at 30 %/s. Release in the band **85 to 100 %** (leaves the top strip bare). Auto-release at 115 %. | 85 to 100 % = 1.0; 70 to 84 % or 101 to 110 % = 0.6; else 0.3 | below 70 % or above 110 % |
| 3. Fillings | up to 6 s | keys 1 to 5, or click | Pick up to 3 of: avocado (`ing.avocado`), cucumber (`ing.cucumber`), carrot (`ing.carrot`), pickled radish (`ing.radish`), inari (`ing.inari`). Press action to confirm. If nothing is picked after 6 s, avocado and cucumber are chosen for her. | Variety: 1 filling 0.6, 2 fillings 0.9, 3 fillings 1.0. +0.1 (max 1.0) for a pairing: avocado + cucumber, carrot + pickled radish, inari + cucumber. | none (no wrong answers) |
| 4. Roll | up to 4 s | hold | Hold to roll. A tightness gauge rises at 30 %/s. Release in **70 to 90 %**. | 70 to 90 % = 1.0; 60 to 69 % or 91 to 95 % = 0.6; else 0.3 | outside 60 to 95 % |
| 5. Slice | 6 s | action key per cut | The knife glides along the roll at a steady speed past 5 guide marks (makes 6 pieces). Press as it crosses each mark. | Per cut: within 4 px = 1.0, within 8 px = 0.6, else 0.2. Mean of 5. | each cut outside 8 px |
| 6. Plate | up to 4 s | Left/Right then action | Choose a layout (`plate.row` from the start, more from kitchen skill). Garnish is automatic. The fish moment happens here (below). | none | none |

**Score:** `s = 0.25 x rice + 0.25 x roll + 0.35 x slice + 0.15 x variety`. Shown as neatness stars: `max(1, ceil(s x 5))` out of 5 (`sushi.stars`).

**Inari note:** inari is a filling choice like the rest. If picked, it also adds two inari pockets beside the roll on the plate (art only).

**George asks for fish (every time).** At the plate step George appears on the counter (cat-ai listens for `ev.sushi_start` and walks him in with top priority; if he cannot arrive in time he appears at the plate step anyway from off-screen left). His bubble: `sushi.george.ask.<n>` (6 variants, e.g. "Where is the fish."). Two buttons appear, both refusals:

- `sushi.deny.a` "No fish, George."
- `sushi.deny.b` "It's veggie, Your Majesty."

Either one plays George's reply `sushi.george.denied.<n>` (6 variants), he sits on the counter offended for 30 game minutes, and the counter `fishDenied += 1`. There is no option to give him fish. There is no fish in the fridge to give. If she ignores the buttons for 3 s, button A is chosen.

**Result:** she carries a `plate_sushi` (carryable). Eating it is a separate interaction (3.5).

| Field | Value |
| --- | --- |
| Time | 30 game minutes |
| Needs (making) | Fun +6, Calm +4 |
| Hearts | Shared formula |
| XP | Shared formula to `skill.kitchen` |
| Counters | `sushiMade += 1`, `fishDenied += 1`, `bestSushi = max(...)`, filling flags for wishes |
| Cats | `ev.sushi_start` (George), `ev.sushi_done` (Salem sniffs the cucumber end, gets nothing, is thrilled anyway) |
| Unlock | 3rd sushi made unlocks `out.chefhat` |

### 3.3 Coffee (`act.coffee_kettle`, `act.coffee_machine`)

Both give a carried `mug_coffee`. Drinking happens while carrying (sitting, standing, or in the grass with a rusk).

**Kettle** (start item `kettle`): no minigame, 8 game minutes, coffee quality 0.5.

**Machine** (catalog item `coffee_machine`): optional 15 s minigame. Free will uses the machine without the minigame at quality 0.6.

| Step | Length | Controls | Play | Scoring | Miss |
| --- | --- | --- | --- | --- | --- |
| 1. Tamp | up to 4 s | hold | Pressure gauge rises at 30 %/s. Release in 60 to 80 %. | in band 1.0; within 10 % of band 0.6; else 0.3 | outside the 0.6 zone |
| 2. Pull | 4 s | action | The shot bar fills over 4 s. Press to stop between 70 and 85 % (the crema line). | same bands | same |
| 3. Pour (optional) | 5 s | action x3 | The milk jug sways left and right (1.2 s cycle). Press when it is centred, three times, to draw the shape (heart from the start; leaf and cat at kitchen 5). Choosing "black" (`coffee.black`) skips this step. | Per pour: within 8 % of centre 1.0, within 18 % 0.6, else 0.2. Mean of 3. | per pour outside 18 % |

**Score:** with milk `0.3 x tamp + 0.3 x pull + 0.4 x pour`, black `0.5 x tamp + 0.5 x pull`.

**Coffee effects (on drinking, for both):**

| Field | Value | Reason |
| --- | --- | --- |
| Energy | +12 at once, then +1 every 10 game minutes for 2 game hours (+12) | BRIEF: "a short boost". 24 total covers about three training sessions. |
| Diminishing | 3rd and later coffees in one game day give half the Energy. Calm and Fun stay the same. | Keeps sleep the real Energy source without ever making coffee bad. |
| Calm | +4, plus +3 if quality >= 0.7 | |
| Fun | +2 | |
| Hearts | Machine minigame only: shared formula | |
| XP | Machine minigame only: to `skill.kitchen` | |
| Flags | `lastCoffeeAt` (for the race `coffee` bonus and `wish.morning_coffee`) | |

### 3.4 The rusk dunk in the grass (`act.rusk_dunk`)

The signature ritual. It should feel slow and warm.

**Set-up.**

1. A coffee from 3.3 (`mug_coffee` carried).
2. A rusk from the `rusk_jar` on the kitchen counter (start item, refills itself): interaction `kitchen.grab_rusk`, gives carried `rusk`. She can carry the mug and the rusk together (this is the one two-item carry).
3. `garden.sit_grass` on any grass tile. With both carried, the petal menu offers **Dunk** (`act.rusk_dunk`). With only a rusk she eats it dry (Hunger +8, no minigame). With only a coffee she just drinks it in the grass (coffee effects + Calm +6).

At night or in rain the same ritual works. In rain she sits on the back step under the overhang instead (same tile rules as `sit_grass` but on the step).

**Minigame.**

- **Instruction:** `act.rusk_dunk.instr` "Hold to dunk. Let go before it gives up."
- **Length:** 3 dunks, about 18 s.
- **Controls:** hold the action key (or press and hold on the mug).
- **Play:** holding lowers the rusk into the coffee and a soak meter rises. The rusk darkens, crumbs drift, and from 70 % it starts to wobble (a clear visual tell, plus a soft creak sound). Releasing lifts it out and she takes a bite. Each dunk the rusk is shorter and soaks faster.
- **Soak rate:** `35 %/s x [1.0, 1.15, 1.3][dunk] x jitter`, jitter seeded per dunk in 0.9 to 1.1.
- **Bands per dunk:**

| Soak at release | Result | Dunk score |
| --- | --- | --- |
| 0 to 49 % | `rusk.crunchy` "Crunchy" | 0.3 |
| 50 to 74 % | `rusk.nice` "Nice" | 0.6 |
| **75 to 90 %** | **`rusk.perfect` "Perfect dunk"** | **1.0** |
| 91 to 99 % | `rusk.close` "Close one" | 0.6 |
| 100 % (auto at full soak) | `rusk.plop` "Plop" | 0.0, counts as a miss |

A plop is not a loss: the bit falls in, she fishes it out with a spoon (`rusk.plop.line.<n>`), and the next dunk goes on with a new end of the rusk.

- **Score:** mean of the 3 dunk scores.
- **Miss:** a plop. Skip after 2 plops follows the shared rule (pass = 0.5, and the pass also counts as 1 perfect dunk for Calm, not for the sticker).

**Effects.**

| Field | Value | Reason |
| --- | --- | --- |
| Time | 30 game minutes sitting | |
| Calm | **+15, plus +10 per perfect dunk** (max +45) | "A perfect dunk gives a big Calm boost." The biggest single Calm source in the game. |
| Hunger | +10 | |
| Fun | +4 | |
| Hearts | Shared formula, plus 1 per perfect dunk | |
| Coffee | The coffee is drunk as part of the ritual (3.3 effects apply) | |
| Counters | `perfectDunks += n` (sticker `stk.rusk_10` at 10), `ritualsDone += 1` | |
| Cats | `ev.ritual_start`. Peaches walks over and lies in the sun beside her (by day; by night she sits beside her). Shadow settles 3 to 4 tiles away, facing the other way. George watches from a high spot. Salem tries to sit on the rusk jar on the way. | BRIEF 10.3. |

### 3.5 Eating and other kitchen interactions

Listed so wishes can point at them. `sim.md` may tune these; the ids are what wishes depend on.

| Id | Needs | Time | Notes |
| --- | --- | --- | --- |
| `eat.sushi` | Hunger +45, Fun +4; +Calm 4 if seated at a table | 20 min | Needs `plate_sushi` carried. Sets `ateAtTable` when seated. |
| `kitchen.make_toast` | Hunger +20 when eaten | 10 min | No minigame. Sets `toastAt`. |
| `fridge.snack` | Hunger +12 | 5 min | |
| `kitchen.grab_rusk` | none until eaten | 2 min | |
| `cat.feed` (cat bowls) | per `sim.md` | 5 min | Order of filling is recorded for `wish.serve_george_first`. |
| `cat.treat_ham` | Salem Food and Affection per `sim.md` | 3 min | Salem only. Ham comes from the fridge, free. `hamGiven += 1`. |

---

## 4. Critterbound

A tiny original creature-befriending RPG that Ellie plays on the TV and console (`tv_console`, living room, start item) or on the `handheld` (catalog item, played in bed). It has its own screen and its own small save summary inside the main save.

### 4.1 Names and words (IP rules)

Original words only. The UI never uses: trainer, gym, evolve, ball, wild X appeared, HP, PP, faint, type chart, or any other Pokémon term.

| Concept | Our word | Key |
| --- | --- | --- |
| A creature | critter | `cb.word.critter` |
| Your team | crew (max 6) | `cb.word.crew` |
| A battle | spar | `cb.word.spar` |
| Health | Pep | `cb.word.pep` |
| A move | trick | `cb.word.trick` |
| Catching | befriending, with a Snack Tin | `cb.word.befriend`, `cb.word.snack_tin` |
| Getting stronger | Grit stars (0 to 5) | `cb.word.grit` |
| Opponents | wanderers | `cb.word.wanderer` |
| Element | kind: Spark, Splash, Sprout | `cb.kind.spark`, `cb.kind.splash`, `cb.kind.sprout` |

### 4.2 The kind triangle

**Spark beats Splash** (a zap travels through water). **Splash beats Sprout** (a flood washes the seedlings away). **Sprout beats Spark** (roots ground the charge).

| Attacker vs defender | Multiplier |
| --- | --- |
| Strong (as above) | x1.5 |
| Weak (the reverse) | x0.67 |
| Same kind or neutral trick | x1.0 |

The in-game help card shows the triangle as three icons in a loop (`cb.help.triangle`).

### 4.3 The six critters

All designs and names are original. Each is 16 x 16 px. Short art notes are for the pixel artist.

| Id | Name key (placeholder) | Kind | Pep | Pow | Guard | Speed | Kind trick (power 8) | Art note | Where |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `crit.fizzlet` | `cb.crit.fizzlet` "Fizzlet" | Spark | 22 | 7 | 3 | 6 | `cb.trick.static_pop` "Static Pop" | A round puff of fluff whose fur stands on end and crackles. Two dot eyes, tiny feet. | Starter |
| `crit.plipp` | `cb.crit.plipp` "Plipp" | Splash | 24 | 6 | 4 | 5 | `cb.trick.drizzle_dash` "Drizzle Dash" | A raindrop-shaped newt with a curly tail and a drip on its nose. | Starter |
| `crit.mossby` | `cb.crit.mossby` "Mossby" | Sprout | 26 | 5 | 5 | 4 | `cb.trick.bramble_hug` "Bramble Hug" | A pebble-shaped hedgehog covered in moss, one sprout on top. | Starter |
| `crit.kettlecoil` | `cb.crit.kettlecoil` "Kettlecoil" | Spark | 24 | 6 | 5 | 3 | `cb.trick.steam_whistle` "Steam Whistle" | A tiny snail whose shell is a little kettle that whistles and sparks. | Meadow grass |
| `crit.brineling` | `cb.crit.brineling` "Brineling" | Splash | 22 | 6 | 5 | 5 | `cb.trick.bubble_pinch` "Bubble Pinch" | A sea-glass crab that hides in jars. | Pond edge |
| `crit.thistlepup` | `cb.crit.thistlepup` "Thistlepup" | Sprout | 23 | 7 | 3 | 6 | `cb.trick.burr_toss` "Burr Toss" | A puppy-shaped ball of burrs that sticks to everything. | Meadow grass |

Every critter also knows `cb.trick.bump` "Bump" (power 5, no kind).

### 4.4 Spar rules (simple numbers)

- Turn order: higher Speed goes first. Ties: the player's critter goes first.
- **Damage** = `max(1, trickPower + Pow - Guard) x kindMultiplier`, rounded half up, then +1 on a seeded 50 % roll. Example: Fizzlet's Static Pop on Brineling: `(8 + 7 - 5) x 1.5 = 15`, so 15 or 16.
- **Menu** (four petals, the main game's own style): `cb.cmd.trick` (choose one of two tricks), `cb.cmd.snack` (restore 8 Pep, 2 uses per spar), `cb.cmd.swap` (change crew member, uses the turn), and in befriendable spars `cb.cmd.befriend`, otherwise `cb.cmd.scoot` (leave a meadow spar, always works).
- **Opponent choice:** uses its kind trick unless that would be weak against the target, then Bump. 25 % of turns it picks at random instead (seeded).
- **Grit:** each crew member that took part in a won spar gains 1 Grit star (max 5). Each star gives +2 max Pep and +1 Pow. Opponents have fixed Grit.
- **Pep at 0:** the critter "curls up for a nap" (`cb.nap`) and swaps out. If the whole crew naps, the spar ends with `cb.spar.rest` "Everyone needs a nap." She wakes up at the Nap Nook with the crew fully restored. Nothing is lost. All Pep also refills after every spar.

### 4.5 Befriending

- Only in meadow and pond spars (not wanderer spars).
- Using a Snack Tin takes the turn. Chance = `0.35 + 0.65 x (1 - pep / maxPep)`. **The third attempt in the same spar always succeeds.** Snack Tins never run out.
- A befriended critter joins the crew at Grit 0 with full Pep. Already-owned kinds of critter can't be befriended twice; their spar offers `cb.cmd.scoot` and Snack Tin is greyed with `cb.befriend.have`.

### 4.6 The map (one screen)

One 30 x 17 tile screen, its own tiny tile set (`art.cb.*`), drawn in a slightly brighter palette so it reads as "a game on the TV".

| Area | What happens |
| --- | --- |
| Nap Nook (start, bottom left) | Choose a starter on first play. Walk in to restore the crew. Save point (auto-saves on leaving the screen too). |
| Meadow (tall grass, centre) | Each step in tall grass has an encounter chance; first encounter no sooner than 6 steps, average one per 10 steps (seeded). Encounters: Thistlepup 60 %, Kettlecoil 40 %. Wild critters have Grit 0 to 1. |
| Pond (top centre) | Same encounter rule on the reeds. Brineling 100 %. After spar 1, the starter Ellie did not pick (the first of the two in the order Fizzlet, Plipp, Mossby) waits shyly at the pond edge as a one-time befriendable spar. |
| Wooden bridge (centre right) | Wanderer spar 1: **Pip** (`cb.npc.pip`), one critter: the kind her starter beats, Grit 0. |
| Dock (top right) | Wanderer spar 2: **Marlow** (`cb.npc.marlow`), two critters at Grit 1: one her starter beats, one neutral. Opens after spar 1. |
| Lantern Hill (far right) | Wanderer spar 3: **Old Wren** (`cb.npc.old_wren`), two critters at Grit 2: one that beats her starter, one neutral. Opens after spar 2. Winning gives the last missing starter as a gift (`cb.wren.gift`). |

Never stuck: after **2 lost spars against the same wanderer**, the next attempt shows `cb.cmd.shake_paws` "Shake paws" from the first turn. It ends that spar as a win (the shared Skip rule).

All 6 critters can be befriended in one or two sessions: starter (1), meadow (2), pond Brineling (1), shy starter at the pond (1), Old Wren's gift (1).

### 4.7 Sessions, effects and the save summary

- Opening Critterbound pauses the house sim (shared rule). A session can be any length. She can leave at any moment with Esc; progress inside Critterbound is always kept.
- On leaving, the house clock moves forward by `min(120, 10 x realMinutesPlayed)` game minutes, rounded to whole minutes.

| Field | Value |
| --- | --- |
| Needs per real minute played (cap +40 Fun per session) | Fun +6, Calm +1, Energy -1 |
| Handheld in bed | Same, plus Calm +4 per session; counts for `wish.handheld_bed` |
| Hearts | 10 per new critter befriended; 25 for each wanderer beaten the first time; 5 for other won spars (max 3 a day). All x moodMult. |
| Cats | `ev.console_on`: Peaches comes to lie by the warm console. Salem sits in front of the TV and paws at the critters. |
| Stickers | `stk.critter_starter`, `stk.critter_all6`, `stk.critter_champion` |
| Outfit | Beating Old Wren unlocks `out.bandana` |

**Save summary** stored in the main save as `critterbound`:

```
{ starter: 'fizzlet' | 'plipp' | 'mossby' | null,
  crew: { id: CritterId, grit: 0..5 }[],      // max 6
  wanderersBeaten: 0..3,
  lossesVs: { pip: n, marlow: n, wren: n },
  pos: { tx, ty },
  sessions: n,
  realSecondsPlayed: n }
```

---

## 5. Life activities

### 5.1 Records (`record_player`, living room, start item)

**Stations.** Three procedural stations, all original music from `audio-dev`:

| Station id | Feel | Tempo | Listen effects per game hour | Cats |
| --- | --- | --- | --- | --- |
| `station.heavy` | The metal remix of the home theme | 140 bpm (prompts at 70 half-time) | Fun +14, Calm +0 | Shadow leaves the room when it starts (`ev.music_heavy`). Peaches bops. George tolerates it from the highest perch. |
| `station.lofi` | Dusty beats, rain hiss | 80 bpm | Fun +10, Calm +8 | Everyone naps more nearby. |
| `station.cosy` | Soft, warm, the record player's game 1 tune | 90 bpm | Fun +8, Calm +10 | Peaches purrs louder. |

Music plays house-wide but listen effects apply in the same room or one room away. A station keeps playing until stopped (`record.stop`) or until Ellie sleeps.

**Sleeves.** The `record_shelf` (start item) holds sleeves she can browse (`record.browse`, 10 game minutes, Fun +3). Sleeves are text only:

| Sleeve key | Text | Station it starts |
| --- | --- | --- |
| `record.sleeve.ptv` | Pierce the Veil | Heavy |
| `record.sleeve.deftones` | Deftones | Heavy |
| `record.sleeve.suicideboys` | Suicideboys | Heavy |
| `record.sleeve.lofi_a`, `_b` | original titles from the writer | Lo-fi |
| `record.sleeve.cosy_a`, `_b` | original titles from the writer | Cosy |

Band names appear only as printed text on the sleeve. No logos, art, lyrics or sound-alikes. The Heavy station is the same procedural track whatever sleeve starts it; each sleeve only changes the seed of the drum fills.

**Interactions.**

| Id | Needs | Minigame | Notes |
| --- | --- | --- | --- |
| `record.play.<station>` | none | none | Peaches gets off the lid if she was sitting on it as a hint. |
| `record.listen` | Station listen effects, 30 min | none | Sitting on the sofa or the floor. |
| `act.dance` | Fun +12, Fitness +2, Energy -4, Calm +3 | Yes, 20 s | Any station. |
| `act.headbang` | Fun +15, Fitness +3, Energy -5 | Yes, 15 s | Heavy only. |

**Dance minigame (`act.dance`).**

- **Instruction:** `act.dance.instr` "Hit the arrows on the beat."
- **Length:** 20 s, 20 prompts at the station's prompt tempo.
- **Controls:** the four arrow keys (or tap the matching quarter of the screen).
- **Scoring per prompt:** within 90 ms = 1.0, within 180 ms = 0.6, else 0. Score = mean.
- **Miss:** wrong arrow or outside 180 ms.

**Headbang minigame (`act.headbang`).**

- **Instruction:** `act.headbang.instr` "Nod on the big beat."
- **Length:** 15 s, 16 downbeats (half-time 70 bpm).
- **Controls:** action key.
- **Scoring per beat:** within 90 ms = 1.0, within 180 ms = 0.6, else 0. A combo counter grows with each hit of 0.6 or more and shows on screen.
- **Miss:** a downbeat with no press within 180 ms.
- **Peaches joins** if she is in the room and her bond is level 2 or more: from combo 8 she headbangs too (`ev.peaches_headbang`). This sets `stk.peaches_headbang`.

Both minigames pay the shared Hearts formula. They give no skill XP. Counters: `danceCount`, `headbangCount` (3 headbangs unlocks `out.band_tee`), `recordMinutes` (3 game hours unlocks `out.vinyl_clip`).

### 5.2 Photo mode (P)

**Open:** press P in Live mode, or the camera button. The sim pauses. Esc or P closes.

**Frame.**

- A 4:3 viewfinder in three sizes, S 96 x 72, M 160 x 120, L 240 x 180 logical px. `[` and `]` (or the mouse wheel) change size; arrows or mouse drag move it. Default M, centred on Ellie.
- Space, Enter or click takes the photo, with a shutter sound and a white flash.

**Filters** (Tab or the filter buttons, keys `photo.filter.<id>`):

| Filter id | Look |
| --- | --- |
| `none` | As seen. |
| `polaroid` | A cream border (8 px sides, 20 px bottom), slightly lifted blacks, warm cast. The caption is written on the bottom strip. |
| `night` | Blue-violet tint, crushed highlights, a few star specks added. |
| `warm` | Golden-hour tint, soft glow on light sources. |

**Tags.** When the photo is taken, the game records tags from the frame contents (an actor counts if at least 40 % of its sprite is inside the frame):

- Subjects: `ellie`, `george`, `salem`, `shadow`, `peaches`, `bruce`, `poe`, `pickle`, `all_four` (all four cats).
- States: `sleeping` (any cat asleep), `in_box`, `zoomies`, `eating`, `on_lap`, `sunbeam`.
- Context: `night` (20:00 to 06:00), `garden`, `outfit` (Ellie wearing any non-default outfit piece), `lanterns`, `stars`.
- Special: `zoomies_3am` = `salem` + `zoomies` between 02:00 and 04:00.

**Caption.** One automatic caption from a cat, picked by this rule:

1. Pick the speaker: the cat with the largest visible area in the frame. If no cat is in frame, the speaker is the nearest cat in the house (they comment from off-frame).
2. Pick the context, in this priority: `bruce` (Bruce in frame, the speaker comments and Bruce's photo caption is always `photo.cap.bruce.<n>`, him denying it), `all_four`, `zoomies_3am`, `in_box`, `sleeping`, `on_lap`, `eating`, `sunbeam`, `outfit`, `night`, `self` (the speaker is in frame alone), `ellie` (only Ellie in frame), `generic`.
3. Key: `photo.cap.<speaker>.<context>.<n>`, with 3 variants each where the context makes sense for that cat (at least 40 keys for MVP, 120 full). Seeded pick, never the same as the previous caption.

**Album.**

- The album lives in the journal (`journal.photos`). Capacity 100 photos. When it is full, taking a photo asks her to choose one to take out (`photo.album_full`), or cancel. Nothing is ever removed automatically.
- Each photo can be saved as PNG (`photo.save_png`), at 3x scale with the filter and caption baked in.
- Storage: a photo is stored as its rendered pixels at 1x (save-dev picks the encoding). Budget: the whole album must fit in 1.5 MB of the save.

**Effects.** Fun +5 for each photo, counted for at most 3 photos per game hour. Hearts: 1 per photo for the first 3 photos of each game day. `photosTaken += 1`. Cats in frame get `ev.photographed` (George poses, Shadow turns away, Salem walks up to the lens).

### 5.3 Stargazing and star wishes (`act.stargaze`)

**When and where:** 21:00 to 04:30, on a garden grass tile, `garden.stargaze` ("Lie down and watch the sky"). Not offered in rain.

**Minigame** (not a scored minigame, so no misses and no Skip button needed; it simply ends):

- **Instruction:** `act.stargaze.instr` "Watch the sky. Click a shooting star to make a wish."
- **Length:** 25 s, standing for 60 game minutes.
- **Stars:** 2 to 4 shooting stars, seeded, never in the first 3 s, at least 4 s apart, each visible for 1.2 s. A star wish boon from yesterday (`sky`) guarantees at least 3.
- **Catching a star:** action key or click while it streaks. Time slows, and three star-wish lines appear (`star.wish.<category>.<n>`, a callback to game 1's wishes, written fresh). She picks one; its category gives a small boon:

| Category | Boon | Reason |
| --- | --- | --- |
| `cats` | Next morning every cat starts with Affection +15 | |
| `home` | Her next catalog order arrives instantly | |
| `race` | +0.02 to every `P` in her next race | Only adds. |
| `luck` | +10 Hearts now | |
| `sky` | Her next stargaze has at least 3 shooting stars | |

The three lines offered are three different categories, seeded. Missing a star costs nothing.

**Effects (per session):** Calm +20, Fun +6, Energy -3. Hearts: 2 per star wish (max 3 a night). Counters: `stargazes += 1`, `starWishes += n` (first star wish unlocks `out.star`, first stargaze unlocks `out.moon`, 3 stargazes unlock `out.scarf`, 10 star wishes give `stk.wish_star_10`).

**Constellations (once each, ever):**

| Id | When it appears | What happens | Reward |
| --- | --- | --- | --- |
| `const.cat` | The first stargaze on day 3 or later | A cat shape joins up across the sky over 5 s, with a George line `star.const.cat.george` | `stk.cat_constellation` |
| `const.heart` | The first stargaze after the housewarming, or on day 10 or later, whichever comes first | A heart shape of stars, with a Peaches line `star.const.heart.peaches` | `stk.heart_constellation`, gift item `star_map_print` |

Both are then shown in the journal (`journal.secrets`). They never appear again in the sky.

**Cats:** `ev.stargaze`. Peaches lies next to her. Salem stares at the stars, then at her, then falls asleep. Shadow sits on the fence.

### 5.4 Garden lanterns (`garden_lanterns`, start catalog item)

| Id | When | Effect |
| --- | --- | --- |
| `lantern.light` | 18:00 to 02:00 | Lanterns stay lit until 06:00. Calm +5 on lighting. While lit, the garden counts them as light for Cosy (per `home.md`), and Ellie gets Calm +3 per game hour in the garden. `lanternNights += 1` (once per night). 5 lantern nights unlock `out.firefly`. |
| `lantern.out` | any time lit | Turns them off. |

### 5.5 Other life interactions

Reading, the bath, sleep and naps are `sim.md` interactions. play.md only needs these ids and flags to exist for wishes, stickers and aspirations:

| Id | Flag or counter it must set |
| --- | --- |
| `read.book` | `readMinutes`, and `shadowOnLap` while Shadow is on her lap |
| `bath.soak` | `bathsTaken` |
| `bed.sleep` | `nightsSlept`, and at 03:00 a check of which cats are on her bed (`catsOnBed`) |
| `nap.sofa` | `napsTaken` |
| `cat.bow` | `bowedToGeorge` (per day) |
| `cat.play_laser`, `cat.play_feather` | per cat; `cat.play_laser` with Salem has a result `salemWins` (she lets the dot rest where Salem pounces) |
| `cat.pet`, `cat.brush` | per cat |
| `george.knight` | George only, bond level 4. Sets `knighted`. |
| `bruce.spot` | clicking Bruce in a hiding place; per spot id |
| `poe.trade` | per trade |

---

## 6. Wardrobe

### 6.1 How it works

- Open from the mirror (`mirror.dress`) or the wardrobe (`wardrobe.dress`). The sim pauses. Changing takes 5 game minutes.
- **Slots:** `head`, `clip`, `neck`, `top`, `feet`. One item per slot, or empty. A head item and a clip can be worn together.
- **Her look stays fixed:** hair, nose ring, tattoos and face never change. Default tops show her shoulders and arms (ELLIE.md). The cosy jumper, gym hoodie, pyjamas and raincoat cover her arms; that is her choice to wear.
- Drawn over the sprite in the style of game 1's `drawOutfit`. The game 1 items reuse game 1's drawings.
- Each cat reacts to each new outfit piece once (`outfit.react.<cat>.<outfit>` falls back to `outfit.react.<cat>.generic.<n>`).
- Wearing a non-default piece sets the `outfit` photo tag. Changing outfit counts for `wish.wear_outfit`.

### 6.2 Outfits (36 rows: 21 MVP, 36 full)

Game 1 items are marked G1.

| # | Id | Slot | Name key (placeholder) | Unlock source | MVP |
| --- | --- | --- | --- | --- | --- |
| 1 | `out.crown` | head | `out.crown.name` "George's crown" (G1) | George bond level 4: after he knights her | Y |
| 2 | `out.chefhat` | head | `out.chefhat.name` "Royal chef's hat" (G1) | Make sushi 3 times | Y |
| 3 | `out.bucket` | head | `out.bucket.name` "Salem's fishing hat" (G1) | Salem bond level 2 | Y |
| 4 | `out.headphones` | head | `out.headphones.name` "Peaches' headphones" (G1) | Peaches bond level 2 | Y |
| 5 | `out.catears` | head | `out.catears.name` "Café cat ears" (G1) | Start | Y |
| 6 | `out.beanie` | head | `out.beanie.name` "Black beanie" | Start | Y |
| 7 | `out.sweatband` | head | `out.sweatband.name` "Sweatband" | Aspiration Hyrox Hero tier 1 | Y |
| 8 | `out.delivery_cap` | head | `out.delivery_cap.name` "Pickle's spare cap" | 10 catalog orders | F |
| 9 | `out.moonless_hood` | head | `out.moonless_hood.name` "Shadow's hood" | Shadow bond level 2 | F |
| 10 | `out.flower_crown` | head | `out.flower_crown.name` "Flower crown" | First Plant Corner set bonus | F |
| 11 | `out.firefly` | clip | `out.firefly.name` "Firefly hair clip" (G1) | Light the garden lanterns on 5 nights | Y |
| 12 | `out.moon` | clip | `out.moon.name` "Moon hair pin" (G1) | First stargaze | Y |
| 13 | `out.star` | clip | `out.star.name` "Star clip" (G1) | First star wish | F |
| 14 | `out.feather` | clip | `out.feather.name` "Poe's feather" (G1) | First Poe trade | Y |
| 15 | `out.bow` | clip | `out.bow.name` "Market ribbon" (G1) | Comes in Pickle's first new-stock box (day 2) | F |
| 16 | `out.paw_clip` | clip | `out.paw_clip.name` "Paw clip" | Aspiration Cat Royalty tier 1 | Y |
| 17 | `out.sushi_clip` | clip | `out.sushi_clip.name` "Tiny maki clip" | First sushi with 5 stars | F |
| 18 | `out.vinyl_clip` | clip | `out.vinyl_clip.name` "Record clip" | 3 game hours of records | F |
| 19 | `out.scarf` | neck | `out.scarf.name` "Frost scarf" (G1) | Stargaze 3 times | Y |
| 20 | `out.bell_choker` | neck | `out.bell_choker.name` "Bell choker" | Aspiration Cat Royalty tier 3 | Y |
| 21 | `out.spike_choker` | neck | `out.spike_choker.name` "Spiked choker" | Start | Y |
| 22 | `out.medal_ribbon` | neck | `out.medal_ribbon.name` "Finisher medal" | Finish a first race | F |
| 23 | `out.knight_sash` | neck | `out.knight_sash.name` "Knight's sash" | `mail.george.knighthood` (the morning after the knighting) | F |
| 24 | `out.bandana` | neck | `out.bandana.name` "Critter bandana" | Beat Old Wren in Critterbound | F |
| 25 | `out.tank_black` | top | `out.tank_black.name` "Black vest" | Start (default) | Y |
| 26 | `out.race_kit` | top | `out.race_kit.name` "Race kit" | Aspiration Hyrox Hero tier 2 | Y |
| 27 | `out.cosy_jumper` | top | `out.cosy_jumper.name` "Cosy jumper" | Aspiration Home Maker tier 2 | Y |
| 28 | `out.band_tee` | top | `out.band_tee.name` "Band tee" | Headbang 3 times | Y |
| 29 | `out.gym_hoodie` | top | `out.gym_hoodie.name` "Hero hoodie" | Aspiration Hyrox Hero tier 4 | F |
| 30 | `out.dungarees` | top | `out.dungarees.name` "Garden dungarees" | Aspiration Home Maker tier 4 | F |
| 31 | `out.pyjamas` | top | `out.pyjamas.name` "Moon pyjamas" | Sleep 3 nights | F |
| 32 | `out.raincoat` | top | `out.raincoat.name` "Raincoat" | First time she goes into the garden while it rains | F |
| 33 | `out.boots` | feet | `out.boots.name` "Chunky boots" | Start (default) | Y |
| 34 | `out.trainers` | feet | `out.trainers.name` "Race trainers" | Aspiration Hyrox Hero tier 3 | Y |
| 35 | `out.cat_slippers` | feet | `out.cat_slippers.name` "Cat slippers" | Aspiration Cat Royalty tier 4 | Y |
| 36 | `out.striped_socks` | feet | `out.striped_socks.name` "Striped socks" | Poe trade (trade table in `home.md`) | F |

MVP count: 21 (target 15). Full count: 36 (target 30). Start outfits: 5 (cat ears, beanie, spiked choker, black vest, boots).

**Band tee design note (original):** a black tee with a cracked moon and a moth print, and a spiky, unreadable "logo" scrawl. It must not resemble any real band's logo or artwork, and it carries no readable band name.

### 6.3 Streak colours

The green streaks are the default. Other colours change only the streak pixels.

| Id | Colour | Unlock |
| --- | --- | --- |
| `streak.green` | Default green | Start |
| `streak.violet` | Violet | Peaches bond level 4 |
| `streak.teal` | Teal | Critterbound: all 6 critters befriended |
| `streak.crimson` | Deep red | 5 game hours of the Heavy station |
| `streak.frost` | Pale ice blue | `const.heart` seen |
| `streak.peach` | Soft peach | Housewarming |

---

## 7. Progression

### 7.1 Daily wishes: rules

| Rule | Value | Reason |
| --- | --- | --- |
| When | 3 wishes are rolled when Ellie first wakes after 05:00, or at 07:00 if she is already awake. | BRIEF section 11. |
| Lifetime | A wish stays until it is completed or until the next morning's roll. Unfinished wishes fade quietly. No message, no cost. | Never punish. |
| Category cap | At most 1 wish per category, and at most 2 cat wishes (`george`, `salem`, `shadow`, `peaches`, `cats`) per day. | Variety. |
| Easy wish | At least 1 of the 3 pays 15 Hearts (an easy one). | Ten minutes should already feel satisfying. |
| Cooldown | A wish completed in the last 2 game days has weight 0. | |
| Weights | Base 1. x2 if its category was not offered in the last 2 days. x3 if it has never been completed (small discoveries). | |
| Context | A wish is only eligible when its context rule is true at roll time, and it must be completable in the rest of that day (time windows checked against the clock). | Never offer the impossible. |
| Day 1 | Fixed set at the end of onboarding: `wish.bow_george`, `wish.coffee_rusk_grass`, `wish.play_heavy`. | Her favourite things first. |
| Saturday | `wish.race_today` takes one slot (outside the caps) whenever it is Saturday. | Race day. |
| Swap | Once per game day she may swap one wish for another eligible one (`wish.swap`). Free. | Choice, not chore. |
| Reward | On completion: Hearts x moodMult (rounded), and a mood boost: a moodlet `moodlet.wish` of the row's size for 4 game hours. Moodlets stack to +20 at most. | |
| Full set | All 3 done in one game day: +15 Hearts x moodMult and `wishesFullSets += 1`. | |
| Toast | `wish.done` "Wish granted: {title}" with a sparkle and the cats' reaction (`ev.wish_done`). | |
| Journal | `journal.wishes` lists today's wishes, the swap button, and a count of all wishes ever completed. | |
| Free will | Free will gives a small utility bonus (x1.2) to interactions that would complete an open wish. | Helps the soak and a hands-off player. |

**Sizes:** easy = 15 Hearts and mood +5; medium = 25 Hearts and +8; big = 40 Hearts and +12.

### 7.2 Condition and context language

Wave 2 encodes conditions as data. "Today" means since the wish was offered.

| Form | Meaning |
| --- | --- |
| `done(X)` | Interaction or activity X completed (a Skip pass counts). Optional filters in brackets. |
| `score(X) >= v` | Activity X finished with score at least v. Skips do not count for score conditions. |
| `photo(tags)` | A photo taken with all of these tags. |
| `observe(cat, state)` | That cat is in that state while Ellie is awake and in the same room or within 8 tiles. |
| `near(cat, r, m)` | That cat stays within r tiles of Ellie for m game minutes in a row. |
| `event(e)` | The event fired. |
| `count(c) +n` | Counter c rose by n today. |
| Context `own(item)` | At least one placed or stored copy. |
| Context `bond(cat) >= L` | Bond level L (0 to 4, levels from `sim.md`). |
| Context `afford(tag)` | At least one unlocked, unowned catalog item with that tag costs no more than her current Hearts. |

### 7.3 The wishes pool (60 rows: 30 MVP)

Title keys are `wish.<id>.title`. Every wish also has `wish.<id>.done` for a one-line cat reaction (optional, falls back to `wish.done.generic.<n>`).

| # | Id | Cat. | Title (placeholder) | Condition | Context | Hearts | Mood | MVP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `wish.bow_george` | george | "Bow to George" | `done(cat.bow)` | always | 15 | +5 | Y |
| 2 | `wish.serve_george_first` | george | "Serve George first" | George's bowl is filled first in a feeding round before 11:00 | rolled before 10:00 | 15 | +5 | F |
| 3 | `wish.george_approves` | george | "Get George to approve something new" | `event(ev.george_verdict)` with verdict approve, on an item placed today | `afford(any)` or an item in storage | 25 | +8 | Y |
| 4 | `wish.george_perch` | george | "Give George a high perch" | `observe(george, nap)` on layer 2 for 30 game min | `own(any perch)` | 25 | +8 | F |
| 5 | `wish.george_pillow` | george | "Let George have the pillow" | at 03:00 George is on her pillow while she sleeps | always | 15 | +5 | F |
| 6 | `wish.laser_salem` | salem | "Let Salem win at laser pointer" | `done(cat.play_laser)[salem, salemWins]` | always (`laser_pointer` is a start item) | 15 | +5 | Y |
| 7 | `wish.ham_salem` | salem | "Give Salem some ham" | `done(cat.treat_ham)` | always | 15 | +5 | Y |
| 8 | `wish.salem_box` | salem | "Find Salem in a box" | `observe(salem, in_box)` | a box exists in the house | 15 | +5 | Y |
| 9 | `wish.salem_zoomies` | salem | "Watch Salem's zoomies" | `observe(salem, zoomies)` | always | 15 | +5 | F |
| 10 | `wish.feather_salem` | salem | "Feather wand time with Salem" | `done(cat.play_feather)[salem]` | `own(feather_wand)` | 15 | +5 | F |
| 11 | `wish.shadow_near` | shadow | "Get Shadow to sit near you" | `near(shadow, 2, 10)` while Ellie is seated | always | 25 | +8 | Y |
| 12 | `wish.shadow_spot` | shadow | "Find Shadow's hiding spot" | `observe(shadow, nap)` in a solitude spot (under the bed, on the wardrobe, in the closet, or any item tagged `solitude`) | always | 15 | +5 | F |
| 13 | `wish.shadow_lap` | shadow | "Read with Shadow on your lap" | `read.book` with `shadowOnLap` for 10 game min | `bond(shadow) >= 3` | 40 | +12 | F |
| 14 | `wish.shadow_pet` | shadow | "Pet Shadow (he stays)" | `done(cat.pet)[shadow]` completes without him leaving | `bond(shadow) >= 1` | 15 | +5 | F |
| 15 | `wish.peaches_sunbeam` | peaches | "Find Peaches in a sunbeam" | `observe(peaches, sunbeam)` | rolled before 15:00, no rain today | 15 | +5 | Y |
| 16 | `wish.peaches_music` | peaches | "Put music on for Peaches" | Peaches in the room with the playing record player for 10 game min | always | 15 | +5 | Y |
| 17 | `wish.peaches_brush` | peaches | "Brush Peaches" | `done(cat.brush)[peaches]` | `own(cat_brush)` | 15 | +5 | F |
| 18 | `wish.peaches_headbang` | peaches | "Headbang with Peaches" | `event(ev.peaches_headbang)` | `bond(peaches) >= 2` | 40 | +12 | F |
| 19 | `wish.feed_all` | cats | "Feed all four cats" | each cat eats from a bowl she filled today | always | 15 | +5 | Y |
| 20 | `wish.photo_all_four` | cats | "Take a photo of all four cats" | `photo(all_four)` | day >= 2 | 40 | +12 | Y |
| 21 | `wish.cats_one_room` | cats | "All four cats in one room" | all four cats in Ellie's room at once | day >= 3 | 25 | +8 | F |
| 22 | `wish.play_each` | cats | "Play with every cat today" | a `cat.play_*` with each of the four cats | `own(laser_pointer)` | 40 | +12 | F |
| 23 | `wish.cat_gift` | cats | "Get the cats something new" | order an item with style tag Cat | `afford(Cat)` | 25 | +8 | F |
| 24 | `wish.make_sushi` | food | "Make vegetarian sushi" | `done(act.sushi)` | always | 25 | +8 | Y |
| 25 | `wish.sushi_great` | food | "Make a Great sushi plate" | `score(act.sushi) >= 0.70` | `sushiMade >= 1` | 40 | +12 | F |
| 26 | `wish.sushi_inari` | food | "Sushi with inari" | `done(act.sushi)[ing.inari]` | `sushiMade >= 1` | 15 | +5 | F |
| 27 | `wish.coffee_rusk_grass` | food | "Coffee and a rusk in the grass" | `done(act.rusk_dunk)` | always | 25 | +8 | Y |
| 28 | `wish.perfect_dunk` | food | "Get a perfect dunk" | 1 perfect dunk (not from a skip) | `ritualsDone >= 1` | 25 | +8 | Y |
| 29 | `wish.morning_coffee` | food | "Coffee before nine" | a coffee finished before 09:00 | rolled before 08:30 | 15 | +5 | F |
| 30 | `wish.latte_art` | food | "Pour some latte art" | `score(act.coffee_machine) >= 0.70` with milk | `own(coffee_machine)` | 25 | +8 | F |
| 31 | `wish.eat_table` | food | "Eat at the table" | `eat.sushi` or toast eaten seated at a table | always (start table) | 15 | +5 | F |
| 32 | `wish.toast` | food | "Toast for breakfast" | toast eaten before 11:00 | rolled before 10:00 | 15 | +5 | F |
| 33 | `wish.train_any` | hyrox | "Do a training session" | `done(act.train.*)` | always | 15 | +5 | Y |
| 34 | `wish.train_two` | hyrox | "Train two different stations" | `done(act.train.*)` on 2 different stations | `own(any station item)` | 25 | +8 | F |
| 35 | `wish.station_pb` | hyrox | "Beat a station PB" | `event(ev.train_pb)` | at least 1 training PB stored | 25 | +8 | Y |
| 36 | `wish.go_run` | hyrox | "Go for a run" | `done(act.run_outside)` or `done(act.run_treadmill)` | always | 15 | +5 | Y |
| 37 | `wish.race_today` | hyrox | "Race today" | finish `act.race` | Saturday | 40 | +12 | Y |
| 38 | `wish.skill_up` | hyrox | "Level up a station" | any station skill goes up a level | some station skill < 10 | 25 | +8 | F |
| 39 | `wish.wallballs_great` | hyrox | "Great wall balls" | `score(act.train.wallballs) >= 0.70` | `own(wallball_target)` | 25 | +8 | F |
| 40 | `wish.play_heavy` | music | "Play something heavy" | `station.heavy` plays for 10 game min | always | 15 | +5 | Y |
| 41 | `wish.headbang` | music | "Headbang to a record" | `done(act.headbang)` | always | 15 | +5 | Y |
| 42 | `wish.dance_cosy` | music | "Dance to the Cosy station" | `done(act.dance)[station.cosy]` | always | 15 | +5 | F |
| 43 | `wish.play_critterbound` | games | "Play Critterbound" | a Critterbound session of 60 real s or more | always | 15 | +5 | Y |
| 44 | `wish.befriend_critter` | games | "Befriend a new critter" | a new crew member | starter chosen and crew < 6 | 25 | +8 | Y |
| 45 | `wish.win_spar` | games | "Win a spar" | beat a wanderer | `wanderersBeaten < 3` | 25 | +8 | F |
| 46 | `wish.handheld_bed` | games | "Play the handheld in bed" | Critterbound on the handheld in bed | `own(handheld)` | 15 | +5 | F |
| 47 | `wish.photo_cat` | photo | "Take a photo of a cat" | `photo(any cat)` | always | 15 | +5 | Y |
| 48 | `wish.photo_night` | photo | "A night photo" | `photo(night)` with the night filter | always | 15 | +5 | F |
| 49 | `wish.photo_outfit` | photo | "A selfie in a new look" | `photo(ellie, outfit)` | owns a non-default outfit piece | 15 | +5 | F |
| 50 | `wish.order_something` | home | "Order something from Pickle" | an order placed | `afford(any)` | 15 | +5 | Y |
| 51 | `wish.cosy_up` | home | "Make a room cosier" | any room's Cosy is 10 above its value when the wish was rolled | some room below 90 | 25 | +8 | Y |
| 52 | `wish.plant` | home | "Put a plant somewhere new" | place an item tagged Plant | a Plant item in storage, or `afford(Plant)` | 15 | +5 | F |
| 53 | `wish.lamps_on` | home | "Lamps on after dark" | 3 or more lights on after 20:00 while she is awake | `own` 3 lights | 15 | +5 | F |
| 54 | `wish.stargaze` | evening | "Watch for shooting stars" | `done(act.stargaze)` | no rain tonight (weather is rolled each morning) | 25 | +8 | Y |
| 55 | `wish.lanterns` | evening | "Light the garden lanterns" | `done(lantern.light)` | `own(garden_lanterns)` | 15 | +5 | Y |
| 56 | `wish.bath` | evening | "A long bath" | `done(bath.soak)` | always | 15 | +5 | Y |
| 57 | `wish.read` | evening | "Read a chapter" | `read.book` for 30 game min | always | 15 | +5 | F |
| 58 | `wish.wear_outfit` | style | "Wear something different" | any outfit slot changed | owns 2 or more pieces in some slot | 15 | +5 | Y |
| 59 | `wish.spot_bruce` | visitors | "Spot Bruce" | `done(bruce.spot)` | day >= 3 | 25 | +8 | Y |
| 60 | `wish.poe_trade` | visitors | "Trade a trinket with Poe" | `done(poe.trade)` | holding at least 1 Shiny Trinket | 25 | +8 | Y |

Counts: 60 rows, 30 MVP (rows 1, 3, 6, 7, 8, 11, 15, 16, 19, 20, 24, 27, 28, 33, 35, 36, 37, 40, 41, 43, 44, 47, 50, 51, 54, 55, 56, 58, 59, 60). MVP covers every category except `games` full rows and gives her favourites (sushi, coffee and rusk, heavy music, Hyrox, the cats, gaming) at least one MVP wish each.

### 7.4 Aspirations

Four aspirations, each with 4 tiers. Tiers complete in order; progress toward a later tier is tracked from the start but only pays once the tier before it is done. MVP ships Hyrox Hero, Cat Royalty and Home Maker (3 x 4). Collector is full scope.

Each tier gives:

- **Hearts:** tier 1 = 50, tier 2 = 100, tier 3 = 175, tier 4 = 275. Not multiplied by mood.
- **Gift item:** delivered free by Pickle the next morning (or at once in Build mode), and unlocked for re-buying in the catalog. Gift items can be put away but not sold for Hearts (see 13).
- **Unlock item (full scope only):** added to the catalog to buy.
- Sometimes an **outfit**, and at tier 4 a **title** (`title.<id>`), shown in the journal header and used by the cats now and then.
- A toast `asp.tier_done`, a short fanfare `asp.fanfare`, and every present cat reacts (`ev.aspiration_tier`).

Bond levels below are `sim.md`'s levels 0 to 4 (top level 4).

#### Hyrox Hero (`asp.hyrox`, MVP)

| Tier | Id | Name (placeholder) | Exact condition | Gift item | Unlock item | Outfit or title |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `asp.hyrox.1` | `asp.hyrox.1.name` "Warm-up" | 5 training sessions completed (any stations, passes count) | `pb_board` (wall PB board) | `kettlebell_rack` | `out.sweatband` |
| 2 | `asp.hyrox.2` | `asp.hyrox.2.name` "Race Day" | Finish 1 race | `medal_hooks` (wall medal display) | `foam_roller` | `out.race_kit` |
| 3 | `asp.hyrox.3` | `asp.hyrox.3.name` "Target Time" | Finish a race in under 1:30:00 | `trophy_shelf` | `recovery_beanbag` | `out.trainers` |
| 4 | `asp.hyrox.4` | `asp.hyrox.4.name` "PB Streak" | After tier 3: set a new overall PB in 3 races, and have every station skill at 5 or more | `champion_banner` | `pro_treadmill` | `out.gym_hoodie`, `title.hyrox_hero` |

Reference pace: tier 1 on day 2, tier 2 on day 6 (first Saturday), tier 3 around day 13, tier 4 around day 24.

#### Cat Royalty (`asp.cats`, MVP)

| Tier | Id | Name (placeholder) | Exact condition | Gift item | Unlock item | Outfit or title |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `asp.cats.1` | `asp.cats.1.name` "Cat Friend" | Any one cat at bond level 2 | `cat_bed_round` | `cat_scratcher_post` | `out.paw_clip` |
| 2 | `asp.cats.2` | `asp.cats.2.name` "Court of Four" | All four cats at bond level 2 or more at the same time | `cat_tree_tall` | `cat_tunnel` | none |
| 3 | `asp.cats.3` | `asp.cats.3.name` "Royal Favour" | George has knighted her (`knighted`), and Shadow has sat on her lap at least once (`shadowOnLap` ever) | `royal_cushion` (George's throne cushion) | `window_perch` | `out.bell_choker` |
| 4 | `asp.cats.4` | `asp.cats.4.name` "Four on the Bed" | All four cats at bond level 4, and on one night all four are on her bed at the 03:00 check while she sleeps | `four_cats_portrait` | `canopy_cat_bed` | `out.cat_slippers`, `title.cat_royalty` |

Reference pace: tier 1 day 3, tier 2 day 9, tier 3 day 17, tier 4 day 25. For tier 4, `cat-ai` must give every cat at bond level 4 a strong pull to Ellie's bed at night (see 13).

#### Home Maker (`asp.home`, MVP)

Rooms counted: bedroom, living room, kitchen-diner, bathroom, spare room, back garden (6). The front step is not counted.

| Tier | Id | Name (placeholder) | Exact condition | Gift item | Unlock item | Outfit or title |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `asp.home.1` | `asp.home.1.name` "Settling In" | Any room at Cosy 40 or more | `pothos_plant` | `bookshelf_tall` | none |
| 2 | `asp.home.2` | `asp.home.2.name` "A Matching Set" | Any room has an active set bonus (`home.md` sets) | `string_lights` | `velvet_armchair` | `out.cosy_jumper` |
| 3 | `asp.home.3` | `asp.home.3.name` "Home Sweet Home" | All 6 rooms at Cosy 45 or more, with an average of 60 or more, at the same time | `lantern_arch` | `garden_swing` | none. Also makes the housewarming available (section 12). |
| 4 | `asp.home.4` | `asp.home.4.name` "Dream Place" | 3 different set bonuses active at once, and one room at Cosy 90 or more | `stained_glass_lamp` (or `attic_ladder` if the stretch attic exists) | `chandelier_goth` | `out.dungarees`, `title.home_maker` |

Reference pace: tier 1 day 2, tier 2 day 5, tier 3 day 11, tier 4 day 22.

#### Collector (`asp.collect`, full scope)

"Catalog items owned" counts distinct catalog items with at least one copy owned (placed or stored), including gifts and trades. Items excluded from the catalog count: this aspiration's tier 4 gift.

| Tier | Id | Name (placeholder) | Exact condition | Gift item | Unlock item | Outfit or title |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `asp.collect.1` | `asp.collect.1.name` "First Finds" | 1 Poe trade and 5 photos taken | `curio_shelf` | `glass_cloche` | none |
| 2 | `asp.collect.2` | `asp.collect.2.name` "Curator" | 50 % of catalog items owned, and 20 photos taken | `photo_wall_frames` | `display_cabinet` | none |
| 3 | `asp.collect.3` | `asp.collect.3.name` "Magpie's Rival" | 8 Poe trades and 15 stickers | `gilded_poe_perch` | `map_of_stars_rug` | none |
| 4 | `asp.collect.4` | `asp.collect.4.name` "The Whole Collection" | 95 % of catalog items owned, 50 photos taken, and all 6 critters befriended | `golden_polaroid_frame` (not counted in the catalog) | none | `title.collector` |

Reference pace: tier 1 day 4, tier 2 day 12, tier 3 day 19, tier 4 day 29.

**Item count check.** Full: 16 gift items and 15 unlock items (Collector tier 4 has none). MVP: 12 gift items, and unlock items are full scope only. Section 8.3 gives the catalog unlock budget these fit into.

