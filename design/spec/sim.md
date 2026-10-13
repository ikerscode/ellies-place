# Simulation spec (`sim.md`)

Owner: `game-designer#systems`, Wave 1. Every number the simulation needs: time, Ellie's needs, mood, utility AI, the action queue, carrying, the cats, bonds, quirks, sunbeams, visitors, weather and the soak targets.

**Conventions**

- Needs run 0..100 and are clamped after every change. "+12" means points added, "/h" means per **game hour**.
- Interaction effects listed as totals are **net**: while an interaction advertises a positive change on a need, that need's base decay is suspended for the actor (decay modifiers in §2.3 still apply to the *other* needs).
- Interaction ids are `<object>.<verb>` (`bed.sleep`, `cat.pet`). Interaction **tags** are `snake_case` (§4.2). Player-facing text is a string key (`mood.band.3`); the writer fills in the words.
- **MVP** rows must ship; **Full** rows are full scope.
- Never punish: no need ever causes a failure, an injury, a loss of items or progress, or a forced action. The only effects of low values are listed in §2.5 and §6.6.

---

## 1. Time

### 1.1 Constants

| Constant | Value | Reason |
| --- | --- | --- |
| `TICKS_PER_SECOND` (at ×1) | 20 | TECH fixed timestep; already in `types.ts`. |
| Game minutes per tick (`GAME_MIN_PER_TICK`) | 0.05 (3 game seconds) | A fixed game-time quantum at every speed keeps runs deterministic regardless of speed. |
| Game minutes per real second at ×1 | 1 | 1440 game min = 1440 real s = **24 real minutes per day**, as the brief asks. |
| Ticks per game minute | 20 | So `durationTicks = gameMinutes × 20`. |
| Ticks per game hour | 1200 | Unit for hourly checks and the soak's "one action per game hour". |
| Ticks per game day | 28 800 | |

### 1.2 Speeds

Speed changes **how many ticks run per real second**, never the size of a tick.

| Speed | Ticks per real second | Game min per real s | A day takes | Notes |
| --- | --- | --- | --- | --- |
| Pause (0) | 0 | 0 | n/a | Build mode forces pause. |
| ×1 | 20 | 1 | 24 real min | Default. |
| ×2 | 40 | 2 | 12 real min | |
| ×3 | 60 | 3 | 8 real min | 1 tick per frame at 60 fps. |
| Sleep fast-forward | 200 | 10 | n/a | Automatic, see §1.3. 3.3 ticks per frame at 60 fps fits the 2 ms tick budget. |

- Movement and animation are **per tick** (tiles per tick), so walking looks proportionally faster at ×2 and ×3, like other life sims.
- The loop runs at most **12 ticks per frame**; if it falls further behind it drops the backlog (the sim simply runs slower in real time). Determinism is unaffected because ticks are never skipped, only delayed.
- `Speed` stays `0 | 1 | 2 | 3`. Fast-forward is a separate flag `time.fastForward: boolean` (contract note, §15).

### 1.3 Sleep fast-forward

| Rule | Value | Reason |
| --- | --- | --- |
| Starts | When `bed.sleep` begins and the queue holds nothing after it | Sleeping through the night should cost under a minute of real time. |
| Rate | 200 ticks/s (×10) | An 8-hour night passes in 48 real seconds. |
| Ends | Ellie wakes (§2.4), the player queues anything, presses any speed key, or opens a menu | The player can always take control back. |
| After | Speed returns to the value before sleep | |
| Naps | Never fast-forward | Naps are short and the cats are fun to watch. |
| Real-time mode | Disabled | Days never skip in that mode. |

### 1.4 Calendar

| Rule | Value | Reason |
| --- | --- | --- |
| New game starts | Day 1, 09:00, a **Thursday** | Daylight for the tour; the first Saturday (race day) is day 3, about an hour of play in, after she has met the gym. |
| Weekday | `weekday = (day + 2) mod 7`, with 0 = Monday … 5 = Saturday, 6 = Sunday | Day 1 → 3 (Thursday). |
| Saturday | Race day (play.md owns what happens) | Brief §4. |
| Daily roll time | 00:00 | All once-a-day random rolls happen here, in the order in §13. |

### 1.5 Light phases (for lighting, lamps and quirks)

`darkness` is the alpha of the night layer (engine draws it; these are its targets).

| Phase | Time | `darkness` | Notes |
| --- | --- | --- | --- |
| Night | 21:00–05:00 | 0.65 | Lamps matter. Stargazing window. |
| Dawn | 05:00–07:00 | 0.65 → 0 (linear) | |
| Day | 07:00–18:30 | 0 | Sunbeams (§10). |
| Dusk | 18:30–21:00 | 0 → 0.65 (linear) | |

- "**Lamps count**" (for Cosy lighting in home.md) whenever `darkness ≥ 0.3`: about 19:40–05:55.
- "**Night**" in quirk rules means 22:00–06:00 unless a rule says otherwise.

### 1.6 Real-time mode

| Rule | Value |
| --- | --- |
| Clock | `minuteOfDay` and `day` follow the wall clock (`clock.wallNow()` → local time). Weekday follows the wall clock too. |
| Need decay | Uses wall-clock game time: 1 game minute per 60 real seconds, so needs move 60× slower than at ×1. |
| Interaction progress | Uses **action time**: 0.05 action minutes per tick, exactly as at ×1. A 30-minute bath still takes 30 real seconds and gives its full effect. |
| Speed controls | Hidden. Free will still runs (§5). |
| Sleep | Allowed, never fast-forwards. Sleep ends after its normal action time (an 8-hour sleep is 8 real minutes); she may then sit up and stargaze at a 2 a.m. wall clock, which is fine. |
| Daily rolls | Fire when the wall clock passes 00:00, or once on load if the day changed. Missed days are **not** replayed (no catch-up, no penalty). |

So every system takes two deltas per tick: `dtGameMin` (decay, schedules) and `dtActionMin` (interaction progress). Outside real-time mode both are 0.05.

---

## 2. Ellie's needs

### 2.1 Starting values (new game)

| Need | Start | Reason |
| --- | --- | --- |
| Energy | 80 | Morning, fresh. |
| Hunger | 60 | First wish set can include "eat something". |
| Fun | 60 | |
| Fitness | 55 | Just above the soak's 50 line. |
| Calm | 70 | Moving day, but it is her place. |
| Cosy | room score | Not a stored need, see §2.2. |

### 2.2 Base decay (per game hour, awake)

| Need | Decay/h | Floor | Reason |
| --- | --- | --- | --- |
| Energy | 5.5 | 0 | 16 waking hours cost 88: one night's sleep covers a day, and a coffee or a nap matters by mid-afternoon. |
| Hunger | 5.0 | 0 | About three meals a day (sushi 50 + toast 25 + a snack or rusk). |
| Fun | 5.0 | 0 | Four or five fun things a day keep it high; a 10-minute session (10 game hours) shows it moving. |
| Fitness | 0.75 | 20 | "Drops slowly": 18 a day, covered by one run or two gym sessions. The floor means skipping the gym never feels like losing progress. |
| Calm | 2.5 + modifiers (§2.3) | 0 | Calm is mostly moved by the house: mess, noise, other low needs. |
| Cosy | none | n/a | It is the current room's score (home.md formula), smoothed: Ellie's Cosy moves towards the room score at up to **30 points per game hour**, so walking through the bathroom doesn't snap her mood. Garden counts as a room. |

### 2.3 Decay modifiers

Multipliers on base decay. They stack multiplicatively.

| Condition | Energy | Hunger | Fun | Fitness | Calm | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| Asleep in `bed.sleep` | restores (§2.4) | ×0.4 | ×0.3 | ×0.5 | restores +4/h | Nights cost little. |
| Exercise (tag `exercise`) | ×3 | ×1.5 | ×1 | n/a (gaining) | ×0.5 | "Energy drops faster when training": 20 min of training costs ~5.5 Energy. |
| Light exercise (`exercise_light`) | ×1.8 | ×1.2 | n/a | n/a | ×1 | Dancing and headbanging. |
| `caffeinated` buff (120 game min after coffee) | ×0.5 | ×1 | ×1 | ×1 | ×1 | Coffee is "a short boost". |
| Seated or lying (any sit/lie posture, awake) | ×0.8 | ×1 | ×1 | ×1 | ×1 | Rest helps a little. |
| Rain outside, Ellie indoors | ×1 | ×1 | ×1 | ×1 | ×0.6 | Rain on the window is cosy. |

**Calm extra decay** (added to the 2.5 base, while awake):

| Source | Extra Calm decay | Cap | Reason |
| --- | --- | --- | --- |
| Mess items in the current room (dirty dishes, knocked items, §7.4) | +0.5/h each | +3/h | Mess nags, gently. |
| Salem's zoomies within 6 tiles | +4/h while they last (3–6 min) | n/a | "Noise". About −0.3 per burst; funny, not stressful. |
| Each of Energy, Hunger, Fun below 25 | +1/h each | +3/h | "Other low needs". Fitness doesn't count (it has a floor and is slow). |

Heavy music is **not** noise for Ellie. She loves it.

### 2.4 Restoring (summary, full list in §4.4)

| Need | Main sources (net totals) |
| --- | --- |
| Energy | `bed.sleep` +14/h until 100; `bed.nap` +12 (60 min); `sofa.nap` +8 (45 min); `mug.drink` +18 then the `caffeinated` buff; rusk ritual +18 (it includes the coffee). Third and later coffees in a game day give +6 instead of +18 (diminishing, not negative). |
| Hunger | `counter.make_sushi` +50; `counter.make_toast` +25; `fridge.snack` +15; rusk ritual +8. |
| Fun | Console +36/h; records listen +12/30 min; dance +10; headbang +12; cat play +8; photos +5. |
| Fitness | `front_door.run` +14; each gym station +10; headbang +3; dance +2; race (play.md). |
| Calm | Rusk ritual +30 (+15 on a perfect dunk); bath +27; reading +15; stargazing +12; cat on lap +15/h; sleep +4/h. |
| Cosy | Decorating, lamps at night, plants, cats nearby: all through the room score (home.md). Lighting a lamp or lanterns advertises the Cosy gain it will cause. |

**Waking rule for `bed.sleep`.** She wakes at the first chunk boundary (§6.5) where Energy ≥ 98 **and** either the time is 05:30–10:00 or the sleep started between 06:00 and 20:00 (a day sleep). Hard cap: 10 game hours. She never oversleeps past 10:00.

### 2.5 Thresholds: mopey and slow

Low needs only change how Ellie looks and walks. They never block, fail or cancel anything.

| Threshold | Effect | Reason |
| --- | --- | --- |
| Any need (not Cosy) < 30 | That need's thought icon appears over her for 3 s, at most every 60–120 real s (rng) | Readable at a glance. |
| Energy < 15 | Yawn idle animation; walk ×0.9 (stacks with mood) | Tired feels tired. |
| Mood < 45 | "Meh" idle set | |
| Mood < 25 | **Mopey**: slouched walk cycle, sigh idle, small rain-cloud emote | Visible, never harmful. |
| Walk speed vs mood | `walkMul = 0.75 + 0.25 × clamp((mood − 20) / 40, 0, 1)` → 0.75 at mood ≤ 20, 1.0 at mood ≥ 60 | "Low needs slow Ellie down." Floor 0.7 after the Energy multiplier. |
| Interaction durations | **Unchanged** by needs | Slowness is walking only, so nothing takes longer to finish. |
| Pass-out | Never | Energy 0 just means yawning and a strong pull to bed (§5.4). |

---

## 3. Mood and the Hearts multiplier

### 3.1 Mood formula

```
moodRaw  = 0.20·Energy + 0.20·Hunger + 0.20·Fun + 0.20·Calm + 0.08·Fitness + 0.12·Cosy
lowest   = min(Energy, Hunger, Fun, Calm)
mood     = clamp(0.8·moodRaw + 0.2·lowest + Σ moodlets, 0, 100)
```

| Choice | Reason |
| --- | --- |
| Four daily needs weigh 0.20 each | They are the ones she tends every day. |
| Fitness 0.08 | Slow and floored at 20; it shouldn't drag mood on a lazy day. |
| Cosy 0.12 | Decorating should visibly lift her, but a sparse new flat must not make her glum. |
| 20 % pulled to the lowest daily need | One neglected need shows, like a life sim should. |

Check: the new-game state (80/60/60/70/55, Cosy ~30) gives mood ≈ 62 (multiplier ×1.0). All needs at 65 with Cosy 40 and one wish moodlet gives ≈ 71 (×1.15).

Mood is recomputed every 20 ticks (1 game minute) and smoothed: displayed mood moves at most 5 points per game minute.

### 3.2 Moodlets (positive only)

| Id | Trigger | Mood | Lasts (game min) | Reason |
| --- | --- | --- | --- | --- |
| `moodlet.wish_done` | Completing a daily wish | +8 | 90 | Wishes should feel good straight away. |
| `moodlet.aspiration_tier` | Aspiration tier reached | +12 | 240 | |
| `moodlet.bond_up` | Any cat's bond level rises | +6 | 120 | |
| `moodlet.perfect_dunk` | Perfect rusk dunk | +8 | 180 | The signature ritual. |
| `moodlet.first_coffee` | First coffee of the game day | +4 | 120 | |
| `moodlet.cat_on_lap` | A cat is on her lap | +6 | while it lasts | |
| `moodlet.race_done` | Finishing a race | +10 | 360 | |
| `moodlet.pb` | Any station or race PB | +6 | 240 | |
| `moodlet.housewarming` | Housewarming night | +15 | 720 | |
| `moodlet.new_decor` | Leaving Build mode with ≥1 new item placed | +4 | 120 | Her place, her rules. |
| `moodlet.bruce_spotted` | Spotting Bruce | +3 | 60 | |

- The same id refreshes its timer and does not stack.
- **Cap:** the sum of active moodlets is capped at +25. At most 8 active (soak cap).
- There are **no negative moodlets**.

### 3.3 Mood bands and the Hearts multiplier

| Band | Mood | Key | Hearts × | Walk / idle |
| --- | --- | --- | --- | --- |
| 0 | 0–24 | `mood.band.0` | ×0.8 | Mopey (§2.5) |
| 1 | 25–44 | `mood.band.1` | ×0.9 | Meh idles |
| 2 | 45–64 | `mood.band.2` | ×1.0 | Normal |
| 3 | 65–79 | `mood.band.3` | ×1.15 | Light step |
| 4 | 80–91 | `mood.band.4` | ×1.3 | Bouncy idles, hums |
| 5 | 92–100 | `mood.band.5` | ×1.5 | Little dance in idles |

- The multiplier is read **at the moment Hearts are awarded** and rounded half up to a whole Heart.
- It applies to: daily wishes, races, minigame Hearts and the good-mood trickle.
- It does **not** apply to: aspiration tiers, bond level-ups, secrets/stickers, Poe trades and refunds. Milestones never shrink.
- **Good-mood trickle:** at each full game hour, if mood ≥ 65, emit `heartsEarned` with base amount `GOOD_MOOD_HEARTS` (play.md owns the amount; suggested 2) × multiplier. Not while asleep.
- With band 2 starting at 45, a normal day sits at ×1.0 to ×1.15. ×0.8 only happens if several needs are ignored, and even then Hearts still come in.

---

## 4. Interactions as data

### 4.1 What every interaction declares (for the architect's schema)

| Field | Meaning |
| --- | --- |
| `id` | `<object>.<verb>`, stable. |
| `tags` | One or more tags from §4.2. Tags drive personality multipliers, Ellie's favourites, quirks and the default numbers. |
| `actor` | `ellie`, `anyCat` or a specific cat (`ActorFilter`). |
| `effects` | Need changes for the actor (and, for social interactions, for the target cat), as totals or `/h` rates. |
| `durationMin` | Game minutes (action time). `until` rules for sleep. |
| `autonomous` | Whether free will (or cat AI) may pick it. |
| `window` | Allowed time of day, if any. |
| `requires` | Carried item, music on, bond level, weather, a visitor present. |
| `posture` | `stand`, `sit`, `lie`, `exercise`, `offLot`: used by Shadow's trust rule and mood idles. |
| `bondGain` | Base bond points for the target cat (§9.3). |

### 4.2 Interaction tags (stable ids)

`Ellie ×` is her favourites multiplier in the utility score (§5.1). It makes free will choose her favourite things a bit more often. **Default effect** is what an item interaction gets when home.md or play.md gives a tag but no numbers of its own.

| Tag | Used for | Ellie × | Default effect (Ellie) |
| --- | --- | --- | --- |
| `sleep` | Night sleep | 1.0 | Energy +14/h |
| `nap` | Naps (Ellie or cat) | 1.0 | Energy +10/h |
| `coffee` | Making or drinking coffee | 1.15 | Energy +18, buff |
| `rusk_ritual` | Coffee and a rusk in the grass | 1.3 | Calm +30, Hunger +8, Energy +18, Fun +6 |
| `eat` | Any eating | 1.0 | Hunger +15 |
| `cook` | Cooking at the counter | 1.0 | Hunger +25 |
| `cook_sushi` | Veggie sushi | 1.2 | Hunger +50, Fun +10, Calm +5 |
| `snack` | Quick fridge food | 1.0 | Hunger +15 |
| `gaming` | Console, handheld, laptop games | 1.15 | Fun +36/h |
| `music_on` | Starting a record station | 1.0 | none (enables `music_*`) |
| `music_listen` | Sitting with music | 1.15 | Fun +24/h, Calm +12/h |
| `dance` | Dancing | 1.0 | Fun +40/h |
| `headbang` | Headbanging (Heavy only) | 1.2 | Fun +72/h |
| `read` | Books | 1.0 | Calm +20/h, Fun +8/h |
| `bath` | Bath | 1.0 | Calm +40/h |
| `stargaze` | Lying in the grass at night | 1.1 | Calm +24/h, Fun +16/h |
| `lanterns` | Lighting garden lanterns | 1.0 | Calm +2 |
| `lamp` | Switching a lamp | 1.0 | Calm +1 |
| `exercise` | Gym stations, runs, race | 1.0 | modifiers §2.3 |
| `exercise_light` | Dance, headbang | 1.0 | modifiers §2.3 |
| `train_hyrox` | Gym station training | 1.15 | Fitness +30/h, Fun +15/h |
| `run` | Run from the front door | 1.0 | Fitness +21/h |
| `race` | Race day | n/a (player only) | play.md |
| `garden_sit` | Sitting in the grass | 1.1 | Calm +16/h |
| `sit` | Any seat | 1.0 | Calm +6/h, Energy +2/h |
| `admire` | Looking at decor, mirror | 1.0 | Fun +2, Calm +2 |
| `dress` | Wardrobe or mirror outfit change | 1.0 | Fun +3 |
| `photo` | Photo mode | n/a (player only) | Fun +5 |
| `laptop` | Laptop use (catalog, browsing) | 1.0 | Fun +24/h |
| `tidy` | Washing up, putting things back, flattening boxes | 1.0 | Calm +1 per item |
| `care` | Anything Ellie does for a cat's needs | 1.0 | adds the care term (§5.2) |
| `cat_social` | Ellie with a cat (pet, play, talk) | 1.2 | Fun +3, Calm +4 |
| `visitor` | Bruce, Poe, Pickle interactions | 1.1 | Fun +3 |
| `plant` | Watering, tending plants | 1.0 | Calm +4 |

Cat-side tags (personality multipliers in §8.4):

| Tag | Used for |
| --- | --- |
| `eat` | Eating from a bowl |
| `treat_ham` | Ham (Salem's favourite) |
| `treat` | Any other treat |
| `nap` | Generic nap spot (sofa, rug, floor) |
| `nap_bed` | Cat bed |
| `nap_ellie_bed` | Ellie's bed (pillow at night for George) |
| `nap_box` | Sleeping in a box |
| `perch_high` | Any layer-2 perch (wardrobe top, fridge top, cat tree top, high shelf) |
| `perch_window` | Window sill |
| `hide_dark` | Dark quiet spots (under the bed, closet, behind the sofa) |
| `box_sit` | Sitting in a box (awake) |
| `scratch` | Scratchers, the sofa side |
| `groom` | Self-grooming (George licks his paw) |
| `zoomies` | Running laps |
| `knock` | Knocking a small item off a surface |
| `play_toy` | Self-play with floor toys |
| `play_laser` | Laser pointer with Ellie |
| `play_wand` | Feather wand with Ellie |
| `pet` | Being petted |
| `brush` | Being brushed |
| `pick_up` | Being picked up and cuddled |
| `lap_sit` | Sitting on Ellie's lap |
| `near_ellie` | Sitting within 4 tiles of Ellie |
| `follow_ellie` | Following Ellie to her room |
| `request` | Walking to Ellie to ask for something |
| `bow` | Being bowed to (George) |
| `knight` | The Knighting (George, bond level 4) |
| `claim_spot` | Taking the seat Ellie is about to use (George) |
| `inspect` | Inspecting new furniture |
| `sunbeam` | Lying in a sunbeam |
| `music_vibe` | Bopping or loafing near music |
| `warm_device` | Lying on a warm laptop or console |
| `watch_bird` | Watching the bird bath, Poe or Bruce through a window |
| `garden_roll` | Rolling in the garden grass |
| `cheer` | Cheering at a race |

### 4.3 Ellie's interactions (advertised = actual)

Effects are **net totals** at the listed duration (rates where marked `/h`). Advertised numbers are honest: the AI sees the same numbers the sim applies. Minigame interactions multiply their positive effects by a **result factor** 0.8–1.2 (skip = 0.8, autonomous auto-play = 1.0).

| Id | Tags | Object | Min | Effects (Ellie) | Free will | Window / requires | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `bed.sleep` | sleep | Bed | until wake (§2.4) | Energy +14/h, Calm +4/h; modifiers §2.3 | Yes | 21:00–03:00, or any time if Energy < 30 | MVP |
| `bed.nap` | nap | Bed | 60 | Energy +12, Calm +3 | Yes | Energy < 50 | MVP |
| `sofa.nap` | nap, sit | Sofa | 45 | Energy +8, Calm +2 | Yes | Energy < 50 | MVP |
| `kettle.make_coffee` | coffee | Kettle or coffee machine | 5 | Gives `mug_full` | As a fetch step only | | MVP |
| `mug.drink` | coffee | Carried `mug_full` | 8 | Energy +18 (+6 from the 3rd coffee of the day), Fun +2, `caffeinated` 120 min | Yes | Requires `mug_full` (auto-fetch) | MVP |
| `rusk_tin.take` | rusk_ritual | Rusk tin on the counter | 1 | Puts a rusk on the mug (`mug_rusk`) or in hand | As a fetch step only | | MVP |
| `grass.rusk_ritual` | rusk_ritual, garden_sit, coffee, eat | Garden grass | 20 | Calm +30 (+15 perfect dunk), Energy +18, Hunger +8, Fun +6, `caffeinated` | Yes (auto result: good, no perfect) | 06:30–20:00, not raining; requires `mug_rusk` (auto-fetch both) | MVP |
| `grass.sit` | garden_sit | Garden grass | 30 | Calm +8, Fun +2 | Yes | 06:30–21:00, not raining | MVP |
| `fridge.snack` | snack, eat | Fridge | 5 | Hunger +15 | Yes | | MVP |
| `counter.make_toast` | cook, eat | Counter, then table | 15 | Hunger +25, Fun +2 | Yes | | MVP |
| `counter.make_sushi` | cook_sushi, cook, eat | Counter (minigame), then table | 40 | Hunger +50, Fun +10, Calm +5 (× result) | Yes (auto-play, no minigame shown) | | MVP |
| `bowls.fill` | care | Cat bowls | 3 | Fun +2, Calm +3; refills every empty bowl | Yes | At least one bowl empty | MVP |
| `fridge.give_ham` | care, cat_social | Fridge → Salem | 4 | Fun +4 | Yes | Salem awake, ≤ 2 per game day give food | MVP |
| `treat_jar.give` | care, cat_social | Treat jar → any cat | 3 | Fun +3 | Yes | | Full |
| `console.play` | gaming | Console + TV, from the sofa | 45 (auto) / while Critterbound is open | Fun +36/h, Calm +4/h | Yes (plays off-screen, no Critterbound progress) | | MVP |
| `handheld.play` | gaming, sit | Bed or sofa | 30 | Fun +12, Calm +3 | Yes | Handheld owned | Full |
| `laptop.browse` | laptop, gaming | Laptop | 20 | Fun +8; laptop is warm for 30 min | Yes | | MVP |
| `laptop.catalog` | laptop | Laptop or catalog button | player | Opens the catalog | No | | MVP |
| `record_player.play` | music_on | Record player | 1 | Starts a station for 120 game min or until stopped. Free will picks Heavy 0.4, Lo-fi 0.3, Cosy 0.3 | As a fetch step, or alone | | MVP |
| `record_player.stop` | music_on | Record player | 1 | Stops music | No | | MVP |
| `record_player.listen` | music_listen, sit | Sofa or chair in the same room | 30 | Lo-fi or Cosy: Fun +12, Calm +6. Heavy: Fun +15, Calm +2 | Yes | Music on (auto-prepends `record_player.play`) | MVP |
| `record_player.dance` | dance, exercise_light | Floor near the player | 15 | Fun +10, Fitness +2 | Yes | Music on | MVP |
| `record_player.headbang` | headbang, exercise_light | Floor near the player | 10 | Fun +12, Fitness +3 | Yes | Heavy on | MVP |
| `bookshelf.read` | read, sit | Any seat or bed (carries a book) | 45 | Calm +15, Fun +6 | Yes | | MVP |
| `bath.bathe` | bath | Bath | 40 | Calm +27, Energy +4 | Yes | | MVP |
| `sink.wash_up` | tidy | Sink | 6 | Clears all dirty dishes in the kitchen-diner and in hand; Calm +1 each (max +4) | Yes | Any dirty dish exists | MVP |
| `mess.put_back` | tidy | A knocked-over item | 1 | Returns it to its slot; Calm +1 | Yes | | MVP |
| `box.flatten` | tidy | Delivery box | 2 | Removes the box; Calm +1 | Yes | No cat inside; ≥ 2 boxes on the lot | MVP |
| `grass.stargaze` | stargaze, garden_sit | Garden grass | 30 | Calm +12, Fun +8 | Yes (no wishes made) | 21:00–04:30, not raining | MVP |
| `lanterns.light` | lanterns | Garden lanterns | 3 | Calm +2; lanterns lit until 02:00 | Yes | 19:30–01:00 | MVP |
| `lamp.toggle` | lamp | Any lamp | 1 | Calm +1 when switching on at night | Yes (on at dusk in her room; off when leaving bed) | | MVP |
| `front_door.run` | run, exercise | Front door (Ellie leaves the lot) | 40 | Fitness +14, Calm +8, Fun +4; exercise modifier costs ~ Energy −11, Hunger −5 | Yes | 06:00–21:00 | MVP |
| `gym.<station>.train` | train_hyrox, exercise | Each of 8 stations | 20 | Fitness +10, Fun +5 (× result), skill (play.md); exercise modifier costs ~ Energy −5.5, Hunger −2.5 | Yes (auto-play) | Station placed | MVP |
| `race_board.race` | race, exercise | Race board | play.md | play.md | No | | MVP |
| `wardrobe.dress` | dress | Wardrobe or mirror | 5 | Fun +3 (first change of the day +5) | No | | MVP |
| `mirror.admire` | admire | Mirror | 2 | Fun +2, Calm +2 | Yes | | Full |
| `decor.admire` | admire | Any decor item | 2 | Fun +2, Calm +2 | Yes (≤ 1 per item per day) | | Full |
| `plant.water` | plant | Any plant | 2 | Calm +4 | Yes (each plant once a day) | | Full |
| `camera.photo` | photo | Photo mode | player | Fun +5 for the first shot of each subject per day | No | | MVP |
| `door.answer` | visitor | Front door | 3 | Fun +3, Pickle's line | Yes | Pickle present | MVP |
| `bruce.spot` | visitor | Bruce | 1 | Fun +4, `moodlet.bruce_spotted` | No (see §11.1 for passing by) | Bruce visible | MVP |
| `poe.trade` | visitor | Poe at the bird bath | 5 | Fun +4; opens trade (play.md) | No | Poe present | MVP |
| `poe.watch` | visitor | Poe at the bird bath | 5 | Fun +3, Calm +2 | Yes | Poe present | Full |

Ellie → cat interactions (the cat side is in §8.6):

| Id | Tags | Min | Effects (Ellie) | Free will | Requires | Scope |
| --- | --- | --- | --- | --- | --- | --- |
| `cat.pet` | cat_social, care | 5 | Fun +3, Calm +4 | Yes | | MVP |
| `cat.brush` | cat_social, care | 8 | Calm +5, Fun +2 | Yes | Brush owned (starter item) | MVP |
| `cat.pick_up` | cat_social, care | 2 | Fun +4, Calm +3 | Yes | Shadow: bond ≥ 40 | MVP |
| `cat.play_wand` | cat_social, care | 10 | Fun +8 | Yes | Wand owned (starter item) | MVP |
| `cat.play_laser` | cat_social, care | 10 | Fun +8 | Yes | Laser owned (starter item) | MVP |
| `cat.talk` | cat_social | 2 | Fun +2 | Yes | | MVP |
| `george.bow` | cat_social, care | 2 | Fun +4 | Yes | George | MVP |
| `george.knight` | cat_social | 5 | Fun +10; title "Sir Ellie" | No (player, once) | George bond level 4 | MVP |
| `peaches.headbang_together` | cat_social, headbang, exercise_light | 10 | Fun +14, Fitness +3 | Yes | Peaches bond level 2, Heavy on | MVP |
| `cat.call` | cat_social | 1 | Calls the cat over (cat accepts per §8.7) | No | Bond level 3 | Full |

Counts: 38 MVP Ellie interactions (brief needs 25), 11 Full.

### 4.4 Rules shared by all interactions

- **Partial progress keeps its gains.** Rates apply every tick; totals are spread evenly over the duration. Cancelling keeps what was gained.
- **Minigame interactions** apply their totals × result factor when the minigame ends (or is skipped). While an activity overlay is open the sim keeps running, forced to ×1, so the cats keep living behind it; the previous speed returns afterwards.
- **Repeat cap:** an interaction's need effects drop to 50 % for its 3rd and later uses in one game day by the same actor (except sleep, eating, `bowls.fill`, gym, run). Nothing ever goes negative.
- **Effects never push a need below its floor or above 100.**

