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

