# Simulation spec (`sim.md`)

Owner: `game-designer#systems`, Wave 1. Every number the simulation needs: time, Ellie's needs, mood, utility AI, the action queue, carrying, the cats, bonds, quirks, sunbeams, visitors, weather and the soak targets.

**Conventions**

- Needs run 0..100 and are clamped after every change. "+12" means points added, "/h" means per **game hour**.
- Interaction effects listed as totals are **net**: while an interaction advertises a positive change on a need, that need's base decay is suspended for the actor (decay modifiers in §2.3 still apply to the *other* needs).
- Interaction ids are `<object>.<verb>` (`bed.sleep`, `cat.pet`). Interaction **tags** are `snake_case` (§4.2). Player-facing text is a string key (`mood.band.3`); the writer fills in the words.
- **MVP** rows must ship; **Full** rows are full scope.
- Never punish: no need ever causes a failure, an injury, a loss of items or progress, or a forced action. The only effects of low values are listed in §2.5 (Ellie) and §8.1–§8.2 (cats).

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
- The loop runs at most **12 ticks per frame**. If it falls further behind, it discards the extra real time instead of piling up ticks, so the game runs a little slower in real time. Every tick is still a full 0.05-minute step, so results never depend on frame rate.
- `Speed` stays `0 | 1 | 2 | 3`. Fast-forward is a separate flag `time.fastForward: boolean` (contract note, §16.2).

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
| Daily roll time | 00:00 | All once-a-day random rolls happen here, in the order in §14. |

### 1.5 Light phases (for lighting, lamps and quirks)

`darkness` is the alpha of the night layer (engine draws it; these are its targets).

| Phase | Time | `darkness` | Notes |
| --- | --- | --- | --- |
| Night | 21:00–05:00 | 0.65 | Lamps matter. Stargazing window. |
| Dawn | 05:00–07:00 | 0.65 → 0 (linear) | |
| Day | 07:00–18:30 | 0 | Sunbeams (§11). |
| Dusk | 18:30–21:00 | 0 → 0.65 (linear) | |

- "**Lamps count**" (for Cosy lighting in home.md) whenever `darkness ≥ 0.3`: about 19:40–06:05.
- "**Night**" in quirk rules means 22:00–06:00 unless a rule says otherwise.

### 1.6 Real-time mode

| Rule | Value |
| --- | --- |
| Clock | `minuteOfDay` and `day` follow the wall clock (`clock.wallNow()` → local time). Weekday follows the wall clock too. |
| Need decay | Uses wall-clock game time: 1 game minute per 60 real seconds, so needs move 60× slower than at ×1. |
| Interaction progress | Uses **action time**: 0.05 action minutes per tick, exactly as at ×1. A 30-minute bath still takes 30 real seconds and gives its full effect. |
| Speed controls | Hidden. Free will still runs (§5). |
| Sleep | Allowed, never fast-forwards. The waking rule uses only Energy ≥ 98 and the 10-hour cap, both in action time, so a full sleep takes at most 10 real minutes; she may then get up at a 2 a.m. wall clock and stargaze, which is fine. |
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

### 2.4 Restoring (summary, full list in §4.3)

| Need | Main sources (net totals) |
| --- | --- |
| Energy | `bed.sleep` +14/h until 100; `bed.nap` +12 (60 min); `sofa.nap` +8 (45 min); `mug.drink` +18 then the `caffeinated` buff; rusk ritual +18 (it includes the coffee). Third and later coffees in a game day give +6 instead of +18 (diminishing, not negative). |
| Hunger | `counter.make_sushi` +50; `counter.make_toast` +25; `fridge.snack` +15; rusk ritual +8. |
| Fun | Console +36/h; records listen +12/30 min; dance +10; headbang +12; cat play +8; photos +5. |
| Fitness | `front_door.run` +14; each gym station +10; headbang +3; dance +2; race (play.md). |
| Calm | Rusk ritual +30 (+15 on a perfect dunk); bath +27; reading +15; stargazing +12; cat on lap +15/h; sleep +4/h. |
| Cosy | Decorating, lamps at night, plants, cats nearby: all through the room score (home.md). Lighting a lamp or lanterns advertises the Cosy gain it will cause. |

**Waking rule for `bed.sleep`.** Sleep runs as 60-game-minute chunks; each chunk counts as a completed action (§15 #4) and the next starts automatically. At each chunk boundary she wakes if: Energy ≥ 98 and the time is 05:30–10:00; or Energy ≥ 98 and the sleep started between 06:00 and 20:00 (a day sleep); or the time has reached 10:00; or she has slept 10 game hours. She never oversleeps past 10:00, and a short night just means a coffee tomorrow.

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
| `care` | Anything Ellie does for a cat's needs | 1.0 | adds the care term (§5.1) |
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
| `trinket.pick_up` | tidy | A Shiny Trinket on the floor | 1 | Trinket to pocket (cap 99); Fun +2 | Yes | | MVP |
| `box.flatten` | tidy | Delivery box | 2 | Removes the box; Calm +1 | Yes | No cat inside; ≥ 2 boxes on the lot | MVP |
| `grass.stargaze` | stargaze, garden_sit | Garden grass | 30 | Calm +12, Fun +8 | Yes (no wishes made) | 21:00–04:30, not raining | MVP |
| `lanterns.light` | lanterns | Garden lanterns | 3 | Calm +2; lanterns lit until 02:00 | Yes | 19:30–01:00 | MVP |
| `lamp.toggle` | lamp | Any lamp | 1 | Calm +1 when switching on at night | Yes (on at dusk in the room she is in; off when she goes to sleep) | | MVP |
| `front_door.run` | run, exercise | Front door (Ellie leaves the lot) | 40 | Fitness +14, Calm +8, Fun +4; exercise modifier costs ~ Energy −11, Hunger −5 | Yes | 06:00–21:00 | MVP |
| `gym.<station>.train` | train_hyrox, exercise | Each of 8 stations | 20 | Fitness +10, Fun +5 (× result), skill (play.md); exercise modifier costs ~ Energy −5.5, Hunger −2.5 | Yes (auto-play) | Station placed | MVP |
| `race_board.race` | race, exercise | Race board | play.md | play.md | No | | MVP |
| `wardrobe.dress` | dress | Wardrobe or mirror | 5 | Fun +3 (first change of the day +5) | No | | MVP |
| `mirror.admire` | admire | Mirror | 2 | Fun +2, Calm +2 | Yes | | Full |
| `decor.admire` | admire | Any decor item | 2 | Fun +2, Calm +2 | Yes (≤ 1 per item per day) | | Full |
| `plant.water` | plant | Any plant | 2 | Calm +4 | Yes (each plant once a day) | | Full |
| `camera.photo` | photo | Photo mode | player | Fun +5 for the first shot of each subject per day | No | | MVP |
| `door.answer` | visitor | Front door | 3 | Fun +3, Pickle's line | Yes | Pickle present | MVP |
| `bruce.spot` | visitor | Bruce | 1 | Fun +4, `moodlet.bruce_spotted` | No (see §12.1 for passing by) | Bruce visible | MVP |
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
| `cat.call` | cat_social | 1 | Calls the cat over (cat accepts per §8.7) | No | That cat at bond level 4 | Full |

Counts: 47 MVP Ellie interactions (brief asks for 25) and 7 Full, 54 in total (brief full target 45). Cat interactions are counted in §8.6.

### 4.4 Rules shared by all interactions

- **Partial progress keeps its gains.** Rates apply every tick; totals are spread evenly over the duration. Cancelling keeps what was gained.
- **Minigame interactions** apply their totals × result factor when the minigame ends (or is skipped). While an activity overlay is open the sim keeps running, forced to ×1, so the cats keep living behind it; the previous speed returns afterwards.
- **Repeat cap (Ellie only):** an interaction's need effects drop to 50 % for its 3rd and later uses in one game day. Exempt: `bed.sleep`, naps, eating and cooking, `bowls.fill`, coffee and the rusk ritual (they have their own coffee rule, §2.4), gym stations, `front_door.run` and tidying. Nothing ever goes negative. Cats have no repeat cap; their quirks have their own cooldowns.
- **Effects never push a need below its floor or above 100.**

---

## 5. Utility AI (Ellie's free will and all four cats)

One scorer for everyone, as in TECH.

### 5.1 Score

For actor `a` and candidate `c` (an interaction on a specific object slot or target):

```
needTerm  = Σ over needs n with advertised Δn > 0:   curve_n(v_n) × min(Δn, 100 − v_n) / 10
costTerm  = Σ over needs n with advertised Δn < 0:   0.5 × curve_n(v_n) × |Δn| / 10
careTerm  = (Ellie only, tag `care`)  0.5 × Σ over target cats t: curveCat_m(v_t,m) × min(Δt,m, 100 − v_t,m) / 10  ÷ T
base      = needTerm − costTerm + careTerm

score = max(0, base) × P_tag × B × F_dist × N × R × U × Q
```

| Factor | Formula | Reason |
| --- | --- | --- |
| `min(Δ, 100 − v)` | Gain clipped to headroom | No overkill: a full need gets nothing from more of it. |
| `/ 10` | Score units | Keeps typical scores 0.5–6, easy to read in debug overlays. |
| `costTerm` weight 0.5 | Costs count half | Training is still attractive at full Energy; costs bite only when that need is already low. |
| `careTerm` ÷ T | T = 4 for `bowls.fill` (all cats), T = 1 for single-cat targets | Ellie looks after the cats on her own, so cat Food and Affection recover with free will on. |
| `P_tag` | Ellie: the highest `Ellie ×` among the interaction's tags (§4.2). Cats: the highest personality multiplier among its tags (§8.4) | Personality as numbers. |
| `B` (bond) | Social tags (`cat_social`, `pet`, `brush`, `pick_up`, `lap_sit`, `near_ellie`, `follow_ellie`, `request`, `play_laser`, `play_wand`): `B = 0.7 + 0.006 × bond` (0.7 at 0, 1.0 at 50, 1.3 at 100). All other interactions: 1 | Cats who like her seek her out more, and she seeks them. |
| `F_dist` | `1 / (1 + d / D0)`, d = octile tile distance to the slot (+2 per layer change for cats). D0 = 15 for Ellie, 12 for cats | Prefer near things. Across the whole 30 × 17 lot (d ≈ 34) it is ×0.31 for Ellie, so far favourites still win sometimes. |
| `N` (noise) | Uniform 0.85–1.15 from the state RNG, one draw per candidate per decision | Variety without randomness taking over. |
| `R` (recency) | Same interaction id done by this actor within 60 game min: ×0.5; within 180: ×0.8; else 1 | Stops loops (coffee, coffee, coffee). Sleep, eat and `bowls.fill` are exempt. |
| `U` (urgency) | If any need n has v_n < 20 and the candidate advertises Δn > 0: ×2.5 | Guarantees low needs recover (soak invariant). |
| `Q` (quirk/schedule) | From §5.4 and §10–§13 (time windows, quirks, requests) | Schedules and personality beats. |

**Threshold.** Candidates with score < 0.25 are dropped. If nothing is left: Ellie plays an idle (mood-based) and free will waits for the next trigger; cats pick `idle` (§8.8).

### 5.2 Need curves (urgency)

```
curve(v) = A × ((100 − v) / 100)^p + 0.15
```

| Need | A | p | v = 0 | 25 | 50 | 75 | 100 | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Energy | 3.0 | 2.0 | 3.15 | 1.84 | 0.90 | 0.34 | 0.15 | Body needs: quiet when fine, loud when low. |
| Hunger | 3.0 | 2.0 | 3.15 | 1.84 | 0.90 | 0.34 | 0.15 | Same. |
| Fun | 2.0 | 1.5 | 2.15 | 1.45 | 0.86 | 0.40 | 0.15 | Steadier pull: she always enjoys fun things. |
| Calm | 2.0 | 1.5 | 2.15 | 1.45 | 0.86 | 0.40 | 0.15 | Same. |
| Fitness | 1.6 | 1.2 | 1.75 | 1.28 | 0.85 | 0.45 | 0.15 | Nearly linear: training is a hobby, not an emergency. |
| Cosy | 1.0 | 1.0 | 1.15 | 0.90 | 0.65 | 0.40 | 0.15 | Linear and small: lamps and lanterns at night, never urgent. |
| Cat Food | 3.0 | 2.0 | 3.15 | 1.84 | 0.90 | 0.34 | 0.15 | |
| Cat Nap | 2.5 | 2.0 | 2.65 | 1.56 | 0.78 | 0.31 | 0.15 | Cats nap a lot without fuss. |
| Cat Play | 2.0 | 1.5 | 2.15 | 1.45 | 0.86 | 0.40 | 0.15 | |
| Cat Affection | 2.0 | 1.5 | 2.15 | 1.45 | 0.86 | 0.40 | 0.15 | |
| Personality (all four) | 2.5 | 1.5 | 2.65 | 1.77 | 1.03 | 0.46 | 0.15 | Personality needs score highest at mid values, so the cats act in character most of the time. |

**Advertising long actions.** `bed.sleep` advertises its projected total (`100 − Energy`), not one hour's chunk, so it competes fairly with whole activities. Cat naps advertise 60 minutes' worth.

### 5.3 Choosing: top 3, weighted

1. Score every candidate (at most the **60 nearest** by octile distance, for the 2 ms tick budget).
2. Sort by score descending; ties broken by interaction id, then entity id (determinism).
3. Take the top 3 that pass the threshold.
4. Pick one with probability proportional to score (one RNG draw).
5. Path to it. If A* fails, drop that candidate and pick again from the remaining top 3 (max 3 tries, then idle).

### 5.4 Ellie's free will

| Rule | Value | Reason |
| --- | --- | --- |
| Default | On (settings toggle) | Brief §5. |
| Trigger | Queue empty and Ellie not executing for **160 ticks** (8 s at ×1; 4 s at ×2) | Brief: 8 seconds idle. Counted in ticks so it is deterministic and scales with speed. |
| Re-trigger after idle fallback | Another 160 ticks | |
| Never picks | `autonomous: false` interactions: race, catalog, photo, dress, trades, `bruce.spot`, Knighting, anything that opens a full-screen UI | Free will does sensible life things, not the player's choices. |
| Minigame interactions | Run as auto-play (result factor 1.0) without showing the minigame | Keeps the soak meaningful. |
| Night bias (Q) | `bed.sleep` ×2.5 at 22:00–02:00, ×1.5 at 21:00–22:00 and 02:00–05:00, ×0.3 at 09:00–19:00. Every other candidate ×0.6 from 23:30 to 05:00, except `read`, `stargaze`, `lanterns`, `lamp` | She keeps a sensible bedtime (soak target §15 #6). |
| Energy 0–10 | `sleep` and `nap` candidates ×2 on top of urgency | Strong pull to bed, never a pass-out. |
| Cat requests (Q) | A pending cat request (§8.7) gives matching candidates ×1.5 for 30 game min | The cats can ask her for things. |
| Wishes (Q) | Candidates that would complete an active daily wish: ×1.3 | Free will helps, but the player still does most wishes. |
| Free will off | Ellie only does what is queued and idles otherwise | Cats still have their AI. |

### 5.5 Cat decisions

| Rule | Value | Reason |
| --- | --- | --- |
| When | When the current action ends, after an idle gap of 40–120 ticks (2–6 s at ×1, RNG) | Cats pause, look around, then go. Reads as thinking. |
| Commitment | Every cat action runs at least 3 game min before anything but an interrupt (§6.4) can end it | No twitching between goals. |
| Same scorer | §5.1 with cat curves, personality multipliers, D0 = 12 | |
| Max nap chunk | 60 game min, then re-decide (usually the same nap continues with no visible break) | Soak: every agent finishes an action each game hour. |
| Circadian bias (Q) | 11:00–16:00: `nap*` ×1.3. 06:00–08:00 and 18:00–21:00: `play_toy`, `zoomies`, `knock`, `follow_ellie` ×1.3. 23:00–05:00: everything but `nap*` and scheduled quirks ×0.5 | Cats nap in the afternoon and are lively at dawn and dusk. |
| Garden access | Cats may enter the garden 07:00–21:00, and at night only while Ellie is in the garden | Peaches can join the rusk ritual; nobody gets locked out (the door is a cat flap). |

---

## 6. Action queue

### 6.1 Rules

| Rule | Value | Reason |
| --- | --- | --- |
| Capacity | **4 entries including the running one** (index 0 runs) | Brief: up to 4, shown top-left. |
| Adding when full | Rejected; the queue panel shakes and toast `queue.full` shows | Never silently drop her choice. |
| Floor click | Queues a `walkTo` entry like any action (it counts toward the 4) | One mental model. |
| Duplicates | Allowed | |
| Sub-steps | Auto-fetch steps (§7.2), walking, and setting things down live inside one entry and never count toward the cap | |
| Order | FIFO | |
| Cats | No visible queue. One current action, cap 1 | Cats are autonomous. |

### 6.2 Cancelling

| Case | Result |
| --- | --- |
| Click a waiting entry (index ≥ 1) | Removed at once. |
| Click the running entry (index 0) | Graceful stop within 20 ticks (she stands up, puts the mug down); gains so far are kept. |
| Cancel during a minigame | Exits the minigame with the skip result factor 0.8; no penalty. |
| Cancel during sleep | She wakes, fast-forward ends. |

### 6.3 Autonomous vs player entries

- A free-will action occupies index 0 with `autonomous: true`. There is at most one autonomous entry, and never while player entries exist.
- When the player queues anything while an autonomous action runs, the autonomous action stops gracefully (10 ticks) and the player's entry starts. Gains so far are kept.
- Free will never interrupts or reorders player entries.

### 6.4 Interrupts

Low needs **never** interrupt anything. The full list:

| Priority | Interrupt | Effect on Ellie's queue |
| --- | --- | --- |
| 1 | Player cancels | §6.2 |
| 2 | Player queues while an autonomous action runs | §6.3 |
| 3 | Scripted beats (onboarding tour step, housewarming, the Knighting cutscene) | Queue is **suspended**, not cleared. It resumes afterwards. |
| 4 | Target becomes unreachable or is sold in Build mode | Entry dropped with toast `queue.dropped`; no cost. |
| 5 | Slot taken by a cat | Cats always yield to Ellie within 2 game min, except George's `claim_spot` (§10.2), which resolves within 4 game min. Ellie waits beside it with an idle. |

Cat interrupts (they end the cat's current action regardless of commitment): being picked up or petted (accept/refuse, §8.7), a scheduled quirk (§10), a fresh bowl fill for a cat with Food < 65, a new delivery box for Salem, Ellie's mood < 35 for Shadow, Heavy starting in Shadow's room.

---

## 7. Carrying and small objects

### 7.1 Hands and pocket

| Rule | Value | Reason |
| --- | --- | --- |
| Hand slot | 1 item | Simple and readable. |
| Hand items | `mug_full`, `mug_empty`, `rusk`, `mug_rusk` (a rusk balanced on the mug counts as one item), `plate_full`, `plate_dirty`, `book`, `delivery_box` (two hands, walk ×0.85), a picked-up cat during `cat.pick_up` | Brief's list: mug, rusk, plate, trinket, delivery box. |
| Pocket (no hand needed) | Shiny Trinkets (count, cap 99), laser pointer, feather wand, brush, handheld, camera | Owned tools are always to hand; trinkets go in the pocket when picked up. |
| Walking while carrying | Normal speed (box ×0.85) | No penalty for holding a mug. |
| Cats | Carry nothing | |

### 7.2 Auto-fetch

If an interaction `requires` a hand item Ellie doesn't hold, the sim prepends the fetch steps inside the same queue entry:

| Needs | Prepends | Example |
| --- | --- | --- |
| `mug_full` | `kettle.make_coffee` | `mug.drink` |
| `mug_rusk` | `kettle.make_coffee`, then `rusk_tin.take` | `grass.rusk_ritual` |
| Music on | `record_player.play` | `record_player.listen` |
| `book` | Take a book from the nearest bookshelf (1 min); if there is no bookshelf she reads her own paperback (always owned) | `bookshelf.read` |

- The utility score's distance uses the full trip (fetch object, then target).
- If a fetch object doesn't exist (no kettle), the interaction is not offered and free will skips it.

### 7.3 Setting things down

| Situation | What happens |
| --- | --- |
| A new hand item is needed while holding another | She sets the current one on the nearest free surface slot within 3 tiles, else on the floor beside her (1 s). |
| After drinking or eating | The empty `mug_empty` or `plate_dirty` goes back to the sink automatically if the sink is ≤ 8 tiles of path away (adds the walk); otherwise she sets it down and it becomes a **dirty dish** (mess). |
| `book` after reading | Returned to its shelf if ≤ 8 tiles, else left on the seat (not mess). |
| Delivery box | Can be carried and set down anywhere; it is never mess. |

### 7.4 Mess (gentle)

| Rule | Value | Reason |
| --- | --- | --- |
| Mess kinds | Dirty dishes, items Salem knocked off (§10.3) | Salem's mess from the brief. |
| Effect | Calm decay (§2.3) and the clutter penalty in Cosy (home.md) | Gentle nudge to tidy. |
| Lot cap | 12 mess items; at the cap the oldest one clears itself | Soak cap. |
| Auto-clear | Any mess item older than 36 game hours clears itself: dirty dishes vanish (washed off-screen), knocked items hop back to their slot | Nothing piles up while she is away or free will is off, and no decor is ever lost. |
| Knocked items | Never break. `mess.put_back` returns them to their slot | Nothing gets taken away. |

### 7.5 Delivery boxes

| Rule | Value |
| --- | --- |
| Appears | On the front step with each delivery (§12.3). Build-mode instant orders leave one box on the front step too. |
| Lot cap | 3 boxes. A 4th recycles the oldest box with no cat in it (if all have cats, the new box simply doesn't appear). |
| Auto-recycle | A box with no cat in it disappears after 48 game hours. |
| Salem | §10.3. |

---

## 8. The cats

### 8.1 Movement speeds (all actors)

Tiles per real second at ×1 (divide by 20 for tiles per tick).

| Actor | Walk | Run / zoomies | Reason |
| --- | --- | --- | --- |
| Ellie | 3.0 × `walkMul` (§2.5) | n/a | Crosses the 30-tile lot in 10 s. |
| George | 3.0 | 5.0 | Regal pace. |
| Salem | 4.0 | 7.0 | Small and everywhere at once. |
| Shadow | 2.8 | 5.0 | Big, unhurried. |
| Peaches | 3.0 | 5.0 | Laid-back. |
| Bruce, Poe, Pickle | 3.0 (Poe flies 6.0) | n/a | |

Cats below 20 in any need walk ×0.9 (looks grumpy, nothing else).

### 8.2 Shared needs

| Need | Start | Decay/h awake | Decay/h asleep | Floor | Reason |
| --- | --- | --- | --- | --- | --- |
| Food | 60 | 4.0 | 2.0 | 10 | Two bowl fills a day (each +60) keep every cat fed. |
| Play | 70 | 5.0 | 1.0 | 10 | Mostly self-served with toys and zoomies; Ellie's play is a bonus. |
| Affection | 70 | 4.0 | 1.0 | 10 | A pet or two plus time near Ellie covers it. |
| Nap | 70 | 5.0 | restores | 10 | ~14 h awake costs 70; ~10 h of naps at +7–9/h restore it. Real cats nap a lot, and sleeping cats are cosy to look at. |

**Floors** mean a neglected cat sits at 10, shows a thought icon and walks a bit slower. Nothing worse ever happens: no sickness, no leaving, no bond loss from neglect.

Per-cat decay multipliers:

| Cat | Food | Play | Affection | Nap | Reason |
| --- | --- | --- | --- | --- | --- |
| George | 1.0 | 0.8 | 0.9 | 1.0 | Too dignified to need much play. |
| Salem | 1.1 | 1.3 | 1.2 | 0.85 | Goofy, hungry, clingy, always awake. |
| Shadow | 1.0 | 0.7 | 0.5 | 1.2 | Unimpressed; sleeps the most. |
| Peaches | 1.0 | 0.8 | 1.0 | 1.1 | Laid-back. |

### 8.3 Personality needs

| Cat | Need | Start | Decay/h | Satisfied by (rates while doing it) |
| --- | --- | --- | --- | --- |
| George | Royalty | 60 | 4.0 awake, 2.0 asleep | Layer-2 perch +15/h (+8/h while dozing there); `george.bow` +30; `claim_spot` +12; being served first at `bowls.fill` (within 8 tiles) +12; sitting on what Ellie uses +10; Ellie's pillow at night +10/h; `inspect` +3 each; `cat.brush` +6; `george.knight` +40 |
| Salem | Chaos | 60 | 6.0 awake, 3.0 asleep | `self.zoomies` +25 (+30 at 3 a.m.); `surface.knock` +15; `box.sit` +20/h; `box.nap` +5/h; `toy.play` +8; `cat.play_laser` +15; `cat.play_wand` +10; `ellie.follow` +6/h; `window.sit` +8/h; `bird_bath.watch` +10/h; `inspect` +3 |
| Shadow | Solitude | 60 | 4.0/h while any other actor is within 3 tiles; 1.5/h otherwise (awake or asleep). ×2 in a room playing Heavy | `hide.sit` (dark spot) +25/h; layer-2 perch +10/h; any tile with no actor within 5 tiles and `darkness ≥ 0.3` or under cover +8/h |
| Peaches | Vibes | 60 | 4.0 awake, 2.0 asleep | `sunbeam.bask` +25/h; `music.vibe` +20/h (Lo-fi or Cosy +25/h); `device.warm` +20/h; `ellie.lap_sit` +10/h; `peaches.headbang_together` +20; `record_player.lid_sit` +5; garden grass in sun counts as a sunbeam |

### 8.4 Personality multipliers per tag

Used as `P_tag` in the score (§5.1). For effects Ellie causes on a cat (petting, play), the cat-side need gains and the bond gain are also multiplied by `clamp(P_tag, 0.5, 1.5)`. A dash means the cat never picks it.

| Tag | George | Salem | Shadow | Peaches | Notes |
| --- | --- | --- | --- | --- | --- |
| `eat` | 1.0 | 1.1 | 1.0 | 1.0 | Salem is always first at the bowl after George. |
| `treat_ham` | 1.0 | 1.6 | 1.0 | 1.0 | Salem loves ham. |
| `treat` | 1.0 | 1.3 | 1.0 | 1.1 | |
| `nap` | 1.0 | 0.9 | 1.1 | 1.2 | |
| `nap_bed` | 1.0 | 0.9 | 1.2 | 1.2 | |
| `nap_ellie_bed` | 1.3 | 1.1 | 0.8 | 1.1 | George's pillow. Shadow prefers the dark under it. |
| `nap_box` | 0.6 | 1.5 | 1.0 | 0.9 | |
| `perch_high` | 1.6 | 1.0 | 1.3 | 0.8 | The King sits high. Shadow likes the wardrobe top. |
| `perch_window` | 1.2 | 1.1 | 0.9 | 1.3 | Peaches likes warm sills. |
| `hide_dark` | 0.6 | 0.7 | 1.6 | 0.7 | |
| `box_sit` | 0.5 | 1.8 | 1.0 | 0.8 | Salem lives in the box now. |
| `scratch` | 1.0 | 1.2 | 1.0 | 0.9 | |
| `groom` | 1.4 | 0.8 | 1.0 | 1.0 | George licks his paw when idle. |
| `zoomies` | 0.3 | 1.8 | 0.5 | 0.6 | |
| `knock` | — | 1.7 | — | — | Only Salem knocks things off. |
| `play_toy` | 0.7 | 1.5 | 0.6 | 0.9 | |
| `play_laser` | 0.7 | 1.6 | 0.6 | 0.9 | |
| `play_wand` | 0.9 | 1.5 | 0.8 | 1.0 | |
| `pet` | 1.0 | 1.3 | 0.7 | 1.2 | |
| `brush` | 1.3 | 0.9 | 1.0 | 1.3 | Grooming is a royal service. |
| `pick_up` | 0.8 | 1.3 | 0.5 | 1.0 | Shadow is gated below bond 40 (§10.4). |
| `lap_sit` | 0.9 | 1.2 | 1.0 | 1.3 | Shadow gated below bond 60. |
| `near_ellie` | 1.0 | 1.3 | 1.0 | 1.1 | Shadow keeps 3–5 tiles away. |
| `follow_ellie` | 0.5 | 1.7 | 0.3 | 0.7 | Salem follows her everywhere. |
| `request` | 1.2 | 1.4 | 0.6 | 1.0 | |
| `bow` | 1.8 | — | — | — | |
| `knight` | 1.8 | — | — | — | |
| `claim_spot` | 1.7 | — | — | — | |
| `inspect` | 1.8 | 1.2 | 0.6 | 0.7 | George inspects everything. |
| `sunbeam` | 1.0 | 0.8 | 0.5 | 1.8 | |
| `music_vibe` | 0.8 | 1.0 | 0.6 (0 for Heavy) | 1.7 | |
| `warm_device` | 1.1 | 1.0 | 0.8 | 1.5 | |
| `watch_bird` | 1.0 | 1.4 | 1.0 | 0.9 | |
| `garden_roll` | 0.6 | 1.3 | 0.7 | 1.4 | |
| `cheer` | 1.2 | 1.5 | 0.6 | 1.0 | George judges; Shadow cheers quietly. |

### 8.5 Likes and dislikes (style tags and situations)

Used for George's verdicts (§10.2), cat happiness (§8.9) and thought icons. Dislikes never cause losses; they only produce a line or an icon and change where a cat chooses to be.

| Cat | Likes | Dislikes |
| --- | --- | --- |
| George | Goth, Retro, layer-2 perches, items priced ≥ 150 Hearts, being served first | Neon, Gym items, being picked up below bond 60 (he accepts at a lower rate) |
| Salem | Cat, Neon, boxes, ham, anything new | The bath (he runs past it) |
| Shadow | Goth, Plant, dark corners, quiet | Neon, Heavy music, three or more actors within 3 tiles |
| Peaches | Cottage, Plant, Retro, music, sun | Rain (sits at the window looking pensive) |

### 8.6 Cat interactions

Cat-only interactions (autonomous). Effects are for the acting cat.

| Id | Tags | Who | Min | Effects | Notes | Scope |
| --- | --- | --- | --- | --- | --- | --- |
| `bowl.eat` | eat | Own bowl | 8 | Food +60 | Only with a serving in the bowl; chosen when Food < 65 | MVP |
| `spot.nap` | nap | Sofa, rug, floor | ≤ 60 chunk | Nap +7/h | | MVP |
| `cat_bed.nap` | nap_bed | Cat bed | ≤ 60 chunk | Nap +9/h | | MVP |
| `bed.cat_nap` | nap_ellie_bed | Ellie's bed (4 cat slots: pillow, side, foot, corner) | ≤ 60 chunk | Nap +9/h; Affection +6/h while Ellie is in the bed | | MVP |
| `box.nap` | nap_box, box_sit | Delivery box | ≤ 60 chunk | Nap +8/h (+ Chaos +5/h for Salem) | | MVP |
| `perch.sit` | perch_high | Any layer-2 slot | 30 | George Royalty +15/h; Shadow Solitude +10/h; dozing (Nap < 50): Nap +7/h, Royalty +8/h | | MVP |
| `window.sit` | perch_window, watch_bird | Window sill | 30 | Play +6/h; Salem Chaos +8/h; Peaches Vibes +12/h if a sunbeam is on it | | MVP |
| `hide.sit` | hide_dark | Under bed, closet, behind sofa | 45 | Shadow Solitude +25/h; dozing Nap +6/h | | MVP |
| `box.sit` | box_sit | Delivery box | 20 | Salem Chaos +20/h; Play +5/h | Counts once per box for the 50-box sticker | MVP |
| `scratcher.scratch` | scratch | Scratcher or sofa side | 3 | Play +5; Salem Chaos +3 | Never damages anything | MVP |
| `self.groom` | groom | Anywhere | 5 | George Royalty +3; others Play +1 | Also the idle fallback | MVP |
| `self.zoomies` | zoomies | Route through ≥ 3 rooms | 3–6 | Salem Chaos +25; Play +15; costs Nap −4 | Cooldown 90 game min per cat | MVP |
| `surface.knock` | knock | Small decor in a surface slot | 2 | Salem Chaos +15, Play +5 | §10.3 caps and trinkets | MVP |
| `toy.play` | play_toy | Floor toy (starter toy mouse) | 10 | Play +20; Salem Chaos +8 | | MVP |
| `sunbeam.bask` | sunbeam | Sunbeam tiles (§11) | until the beam leaves, ≤ 60 | Peaches Vibes +25/h; dozing Nap +7/h | Follows the beam (§10.5) | MVP |
| `music.vibe` | music_vibe | Within 5 tiles of a playing record player | ≤ 30 | Peaches Vibes +20/h (+25/h Lo-fi or Cosy); Play +4/h | | MVP |
| `device.warm` | warm_device | Laptop or console used in the last 30 game min | ≤ 45 | Peaches Vibes +20/h; Nap +5/h | | MVP |
| `record_player.lid_sit` | music_vibe | Record player lid, when off | 20 | Peaches Vibes +5 | A hint: Q ×1.5 when Vibes < 50 and Ellie is in the room | MVP |
| `ellie.near` | near_ellie | 1–4 tiles from Ellie (Shadow 3–5) | 20 | Affection +6/h | Ellie must be seated, lying or asleep (waived for Shadow's secret softness, §10.4) | MVP |
| `ellie.follow` | follow_ellie | Ellie's current room | until in her room, + 5 min | Affection +4/h; Salem Chaos +6/h | §10.3 | MVP |
| `ellie.request` | request | Walk to 2 tiles from Ellie | 2, then waits ≤ 30 | none (creates a request, §8.7) | | MVP |
| `ellie.lap_sit` | lap_sit | Ellie seated (sofa, chair, grass) | ≤ 45 | Affection +15/h; Nap +6/h; Peaches Vibes +10/h; Ellie Calm +15/h and `moodlet.cat_on_lap` | Shadow needs bond ≥ 60 and Ellie reading | MVP |
| `furniture.inspect` | inspect | A newly placed item | 2 | George Royalty +3; Salem Chaos +3; Play +2 | §10.2 | MVP |
| `spot.claim` | claim_spot | The seat or bed slot Ellie just queued | ≤ 4 | George Royalty +12 | §10.2 | MVP |
| `garden.roll` | garden_roll | Garden grass in sun | 3 | Play +8; Peaches Vibes +6 | | Full |
| `bird_bath.watch` | watch_bird | Near the bird bath or a garden window | 15 | Play +8/h; Salem Chaos +10/h | | Full |
| `race.cheer` | cheer | Race sideline | race | Affection +5; bond +2 | play.md runs the race | Full |
| `idle` | (none) | Current spot | 1–3 | none | Fixed score 0.3 (§8.8) | MVP |

Cat side of Ellie's interactions (applied to the target cat, × `clamp(P_tag, 0.5, 1.5)`):

| Ellie interaction | Cat effects | Bond base (§9.3) |
| --- | --- | --- |
| `cat.pet` | Affection +20 | +2 |
| `cat.brush` | Affection +20; George Royalty +6 | +3 |
| `cat.pick_up` | Affection +12 | +3 |
| `cat.play_wand` | Play +25; Salem Chaos +10 | +4 |
| `cat.play_laser` | Play +30; Salem Chaos +15. Salem "wins" (catches the dot) at the end every time | +4 |
| `cat.talk` | Affection +4 | +1 |
| `george.bow` | Royalty +30 (once per 2 game h; later bows get a line and +0) | +4 |
| `george.knight` | Royalty +40 | +5 |
| `fridge.give_ham` | Salem Food +20, Affection +10, Chaos +5 (food part ≤ 2 per day) | +3 |
| `treat_jar.give` | Food +8, Affection +8 | +2 |
| `bowls.fill` | Refills each empty bowl (1 serving); George Royalty +12 if within 8 tiles | +1 to each cat that eats from it within 2 game h |
| `peaches.headbang_together` | Vibes +20, Play +10 | +4 |

Counts: 25 MVP cat-only interactions (including `idle`) plus 10 MVP Ellie-to-cat ones, 35 MVP in all (brief asks for 12 MVP, 25 full); 4 more are Full scope.

### 8.7 Accepting, refusing and requests

When Ellie starts a social interaction on a cat:

```
pAccept = clamp(0.55 + 0.4 × (P_tag − 1) + bond / 250 + (Affection < 50 ? 0.15 : 0), 0.25, 1.0)
asleep → pAccept × 0.5
```

| Rule | Value | Reason |
| --- | --- | --- |
| Hard gates | Shadow `cat.pick_up` below bond 40: always refuses. Shadow `ellie.lap_sit` needs bond ≥ 60. | Slow trust from the brief. |
| Refusal | The cat steps 2–3 tiles away with a line; Ellie still gets Fun +1; **no bond change** | Refusals are characterful, not punishing. |
| Free will | Never targets a sleeping cat | |
| Examples | Salem pet at bond 35: 0.55 + 0.12 + 0.14 = 0.81. Shadow pet at bond 8: 0.55 − 0.12 + 0.03 = 0.46. George pet at bond 85: 0.89 | |

**Requests.** A cat with a need below 35 that only Ellie can fix walks to her and asks (`ellie.request`):

| Cat need | When it asks | Ellie candidates boosted ×1.5 for 30 game min |
| --- | --- | --- |
| Food | Own bowl empty | `bowls.fill` (Salem also boosts `fridge.give_ham`) |
| Affection | Any cat | `cat.pet`, `cat.brush`, `cat.pick_up` on that cat |
| Play | Salem, Peaches | `cat.play_wand`, `cat.play_laser` on that cat |
| Vibes | Peaches, music off | `record_player.listen` (and through it `record_player.play`) |
| Royalty | George | `george.bow` |

Cooldown: 120 game min per cat per need. The request shows the need icon in a thought bubble over the cat.

### 8.8 Idle and fallback

- `idle` has a fixed score of 0.3 for cats (loaf, look around, tail flick, George's paw lick).
- A cat with nothing above 0.3 for two decisions in a row wanders to a random reachable tile in its room or the next room (score fixed 0.28, so idle still wins half the time with noise).

### 8.9 Cat happiness (for home.md's Cosy)

```
happiness = 0.6 × mean(Food, Play, Affection, Nap) + 0.4 × personalityNeed  (+5 if the cat's current room has ≥ 2 items in a liked style), capped at 100
```

Home.md's Cosy formula uses the mean happiness of the cats currently in the room.

### 8.10 Thought and speech bubbles (frequency)

| Bubble | Trigger | Chance | Cooldown |
| --- | --- | --- | --- |
| Thought (icon) | Any need < 30, or an active request | 1.0 | Every 900–1800 ticks per cat, shown 60 ticks |
| Speech | End of an interaction with Ellie | 0.4 | Global 400 ticks between any two speech bubbles; per cat 1200 ticks |
| Speech | End of a cat-only interaction | 0.15 | same |
| Speech | Quirk fires (§10) | 0.8 | same |
| Speech | Bond level up | 1.0 (ignores cooldowns) | |
| Speech | Refusal (§8.7) | 1.0 | same |
| Speech | Furniture verdict (George) | 0.9 | same |
| Speech | Sees a visitor | 0.5 | same |

UI decides how long a bubble stays up.

---

## 9. Bond

### 9.1 Levels

| Level | Range | Key | Placeholder |
| --- | --- | --- | --- |
| 0 | 0–19 | `bond.level.0` | <!-- Aloof --> |
| 1 | 20–39 | `bond.level.1` | <!-- Curious --> |
| 2 | 40–59 | `bond.level.2` | <!-- Friendly --> |
| 3 | 60–79 | `bond.level.3` | <!-- Close --> |
| 4 | 80–100 | `bond.level.4` | <!-- Inseparable --> |

**Levels never go down.** Once a level is reached, the bond value can't fall below that level's lower bound.

### 9.2 Starting bonds

| Cat | Start | Level | Reason |
| --- | --- | --- | --- |
| George | 25 | 1 | He tolerates her. He'd never say more. |
| Salem | 35 | 1 | Loves everyone; first to level 2. |
| Shadow | 8 | 0 | Slow trust is his whole arc. |
| Peaches | 25 | 1 | Easy-going. |

### 9.3 Gains

Each source gives base points × `clamp(P_tag, 0.5, 1.5)` for that cat (§8.4).

| Source | Base | Notes |
| --- | --- | --- |
| `cat.pet` | +2 | |
| `cat.brush` | +3 | |
| `cat.pick_up` | +3 | |
| `cat.play_wand`, `cat.play_laser` | +4 | |
| `cat.talk` | +1 | |
| `fridge.give_ham` (Salem), `treat_jar.give` | +3, +2 | |
| `george.bow` | +4 | |
| `george.knight` | +5 | Once. |
| `peaches.headbang_together` | +4 | |
| `ellie.lap_sit` (the cat chose it) | +3 per session | |
| Eating from a bowl Ellie filled within 2 game h | +1 | Once per fill per cat. |
| Shadow trust: Ellie still nearby (§10.4) | +1 per 10 game min | Own cap: +6 per game day; not counted in the soft cap. |
| Photo of the cat (first per cat per day) | +1 | |
| Cat in the same room while Ellie does its favourite thing (George: she eats at the table, he supervises; Salem: she plays the console, he watches the screen; Peaches: music on; Shadow: she reads) | +1 per game hour | Max +3 per day. |
| Race cheer | +2 | Full scope. |

**Daily soft cap:** the first **10 points** per cat per game day count fully; further gains count ×0.3. The day resets at 00:00.

**Pace check.** Playing with a cat on purpose earns about 8–10 a day. George 25 → 80 takes about 7 game days (about 3 hours at ×1, less with ×2/×3 and sleep fast-forward). Shadow 8 → 80 takes 7–9 days if she sits near him, which fits his slow-trust arc. All four at level 4 lands around 8–10 hours of play, in step with the catalog's 8–10 hour target.

### 9.4 Gentle loss (the only one)

| Source | Loss | Limits |
| --- | --- | --- |
| Over-handling: a 3rd social interaction on the same cat within 20 game min while that cat's Affection ≥ 90 | −1, with a "that's enough" line | Max −2 per cat per game day; never below the current level's floor; never from neglect, refusals, Heavy music or anything else |

### 9.5 Rewards per level

Level-up also pays Hearts (flat, no mood multiplier). Suggested amounts for play.md: level 1 **15**, level 2 **25**, level 3 **40**, level 4 **60**. Each level emits `bondLevelUp { cat, level }` and unlocks catalog items under the unlock key `bond:<cat>:<level>` (home.md assigns at least one item per cat to levels 2, 3 and 4).

| Cat | Level 1 | Level 2 | Level 3 | Level 4 |
| --- | --- | --- | --- | --- |
| George | Claims her pillow at night (§10.2) | Joins her on the sofa (`ellie.near` on the same sofa); approves new furniture more often (+0.2) | Outfit `outfit.george_crown` | `george.knight` once → title `title.sir_ellie`; he calls her "Sir Ellie" from then on; sleeps on the bed |
| Salem | Follows her room to room (§10.3) | Brings her a gift once a day (p 0.5): a Shiny Trinket dropped at her feet | Outfit `outfit.cat_ears` | Sleeps on the bed; joins any `record_player.dance` with a hop animation |
| Shadow | Turns up at a polite distance for the rusk ritual and stargazing (§10.5) | `cat.pick_up` allowed | Sits on her lap while she reads (§10.4); outfit `outfit.frost_scarf` | Comes when called (`cat.call`); sleeps on the bed |
| Peaches | Sits on the record player lid as a hint (§10.5) | `peaches.headbang_together` | Outfit `outfit.peaches_headphones` | Sleeps on the bed; lap sit while she listens to music |

All four at level 4 sleeping on the bed while Ellie sleeps is the Cat Royalty final tier (play.md). At night, every level-4 cat gets Q ×3 on its own bed slot (George pillow, Salem side, Peaches foot, Shadow corner), so the scene happens within a night or two of the last level-up.

---

## 10. Quirk schedules

Quirks are utility boosts (Q) or scheduled actions. Scheduled ones interrupt a cat's current action (§6.4). All times use `minuteOfDay` (wall clock in real-time mode).

### 10.1 Salem: 3 a.m. zoomies

| Rule | Value | Reason |
| --- | --- | --- |
| Roll | At 00:00, p = 0.70 | Most nights, not all, so it stays a surprise. |
| Start | Uniform in 02:45–03:30 (RNG at the roll) | "3 a.m." |
| Length | 3–6 game min (RNG) | |
| Route | Laps through at least 3 rooms (all reachable rooms if fewer), at 7 tiles/s, ending with a skid and a sit | |
| Effects | Salem Chaos +30, Play +15, Nap −4 | |
| On Ellie | None while she sleeps (no Calm cost, no waking). If she is awake within 6 tiles: the noise rule in §2.3 applies | Never punish her sleep. |
| Photo flag | `quirk.zoomies3am` is active for the duration, for the photo sticker | Brief §15. |
| Daytime zoomies | `self.zoomies` at any time (90 game min cooldown) | |

### 10.2 George

| Quirk | Rule | Effect |
| --- | --- | --- |
| **Pillow at night** | From bond level 1. When Ellie starts `bed.sleep` between 21:00 and 03:00, or at 22:30 if she isn't in bed yet: p = 0.6 he takes the pillow slot of her bed. He stays until she wakes or 07:00. | Royalty +10/h, Nap +9/h. Ellie's sleep and Energy are unchanged; she curls up on the other side. |
| **Sits on what she's using** | When Ellie starts `laptop.*`, `bookshelf.read`, `console.play` or eating at a table, with George awake within 10 tiles and Royalty < 70: p = 0.15, at most once per 2 game h | He sits on the keyboard, book or plate edge for up to 3 game min. Her action pauses (its duration extends; gains unchanged). Royalty +10, Ellie Fun +3. |
| **Claims her spot** | When Ellie queues a seat or bed interaction, with George within 8 tiles, Royalty < 60, and his path shorter than hers: p = 0.3 | He sits there first. Ellie waits beside it; he yields after 2–4 game min with a line. Royalty +12. |
| **Served first** | During `bowls.fill`, if George is within 8 tiles | His bowl is filled first (animation order). Royalty +12. |
| **Inspects new furniture** | On leaving Build mode: up to 3 newly placed items, most expensive first, within 10 game min, 2 min each | Verdict: approve if the item has a George-liked style or costs ≥ 150 Hearts; disapprove if it has a disliked style and no liked one; otherwise approve with p = 0.6 (+0.2 from bond level 2). Verdicts are cosmetic: a line and a crown-up or crown-down icon. Royalty +3 each. |
| **Paw lick** | Idle animation weight 0.5 when idle | |
| **Sushi** | Asks for fish during `counter.make_sushi` (play.md owns the line; Ellie always says no) | No sim effect. |

### 10.3 Salem

| Quirk | Rule | Effect |
| --- | --- | --- |
| **Follows Ellie** | From bond level 1. For 10 game min after Ellie enters a new room, `ellie.follow` gets Q ×2 (on top of P 1.7) while Salem is awake and not eating | Target: Salem shares Ellie's room ≥ 40 % of her awake time (§15). |
| **Every box** | When a delivery box appears: `box.sit` on it gets Q ×3 for 60 game min while Chaos < 95 | Target: ≥ 80 % of boxes get Salem within 60 game min while he's awake. Each box counts once for the 50-box sticker. |
| **Knocking** | `surface.knock` on small decor in surface slots. Cap 3 knocks per game day | The item lands on the floor (mess) and never breaks. |
| **Shiny Trinkets** | Each knock: p = 0.35 that a Shiny Trinket lands beside the item. Max 2 trinkets per day from knocks (+1 from the bond level 2 gift, so max 3 a day) | Feeds Poe's trades. |
| **The new vase** | On leaving Build mode, if a new small item was placed on a surface: p = 0.5 he knocks it within 10 game min (counts toward the daily cap) | The brief's joke. |
| **Ham** | `fridge.give_ham` is his favourite treat (P 1.6) | |
| **Can't read** | Sits on mail and on the catalog laptop's warm spot; no sim effect (lines only) | |

### 10.4 Shadow

| Quirk | Rule | Effect |
| --- | --- | --- |
| **Slow trust** | Ellie is in a `sit` or `lie` posture (any interaction, awake or asleep) and Shadow is awake, not hiding, in the same room (garden counts) within 6 tiles, for 10 continuous game minutes | Bond +1 per full 10 game min, max +6 per game day (own cap). |
| **Won't be picked up** | Below bond 40, `cat.pick_up` is refused (§8.7) | A line, no loss. |
| **Lap while reading** | Bond ≥ 60 and Ellie is in `bookshelf.read` (or any read): every 10 game min p = 0.25 he picks `ellie.lap_sit` | Brief: "At a high bond he sits on her lap while she reads." |
| **Secret softness** | Ellie's mood < 35: Shadow's `ellie.near` gets Q ×4, ending 2 tiles from her, for 30 game min; cooldown 180 game min. Works at any bond level | While he's within 3 tiles: Ellie Calm +10/h. He doesn't let it raise his Solitude decay (the 3-tile rule is suspended for this action). |
| **Leaves for Heavy** | When Heavy starts in his room (or he's in a room with Heavy playing): he leaves within 1 game min for the furthest room, preferring `hide.sit`. Candidates in that room score 0 while Heavy plays | A line on the way out (p 0.8). |
| **Crowds** | Three or more actors within 3 tiles: candidates in that spot ×0.5 | |

### 10.5 Peaches

| Quirk | Rule | Effect |
| --- | --- | --- |
| **Follows sunbeams** | While in `sunbeam.bask`, every 10 game min: if her tile is no longer a sunbeam tile, she stretches and moves to the nearest sunbeam tile of the same beam within 4 tiles; if none, the action ends | She drifts across the floor through the day. |
| **Bops to music** | `music.vibe` (P 1.7). Lo-fi and Cosy give +25/h | Bop animation on the beat. |
| **Record player lid** | Music off, Vibes < 50, Ellie in the living room: `record_player.lid_sit` Q ×1.5 | A hint to put music on. |
| **Warm devices** | `device.warm` on a laptop or console used within 30 game min | |
| **Rusk ritual** | When Ellie starts `grass.rusk_ritual` (garden open, Peaches awake): `sunbeam.bask` on grass within 3 tiles of Ellie gets Q ×3 | Brief §10.3: Peaches lies in the sun beside her. |
| **Shadow at the ritual** | When Ellie starts `grass.rusk_ritual` or `grass.stargaze`, from Shadow's bond level 1: `ellie.near` at 4–6 tiles gets Q ×2 | "Shadow turns up at a polite distance." |

### 10.6 Reactions when Build mode closes

| Cat | Reaction | Chance |
| --- | --- | --- |
| George | Inspects (§10.2) | 1.0 |
| Salem | Knocks the new vase (§10.3); sits in any new box or tunnel | 0.5; 0.8 |
| Peaches | Tries a new seat, bed or rug within 15 game min | 0.6 per item, max 2 |
| Shadow | Tries a new hiding spot or dark corner within 30 game min; ignores everything else | 0.7 |

---

## 11. Sunbeams

### 11.1 The sun

The in-game sun path is stylised for the top-down three-quarter view: it rises at **screen-left**, arcs over the **back (top) wall**, and sets at **screen-right**. Light falls down-screen into rooms.

| Window wall | Active | Peak | Beam direction |
| --- | --- | --- | --- |
| Left wall (morning) | 06:30–11:00 | 08:00 | Into the room towards screen-right |
| Back wall (midday) | 09:00–16:30 | 12:45 | Down-screen into the room |
| Right wall (evening) | 14:30–19:00 | 17:30 | Into the room towards screen-left |
| Front wall | none | | Not drawn in this view |

No sunbeams on rain days (§13). The garden grass is "in sun" 07:00–19:00 except the tree's shade (a 3 × 2 tile patch below the tree, home.md places the tree).

### 11.2 Beam shape

For a window `w` tiles wide, with `p = (t − start) / (end − start)` in 0..1:

| Wall | Depth into the room (tiles) | Sideways shear across the full depth (tiles) |
| --- | --- | --- |
| Left | `D = 5 − 3p` (long at dawn, shorter later) | `+1` (drifts down-screen) |
| Back | `D = 2 + 2 × (1 − sin(πp))` (4 at the edges, 2 at noon) | `S = 3 × (1 − 2p)`: slants right in the morning, left in the afternoon |
| Right | `D = 2 + 3p` (lengthens towards sunset) | `+1` |

- The beam is the parallelogram from the window span, extended `D` tiles inwards and sheared by `S`, clipped to the room's floor.
- **Sunbeam tiles** (for logic) are floor tiles at least 50 % covered. Beams also light layer-1 surfaces they cross (bed, sofa, rug), so Peaches can bask on the bed.
- Logic recomputes the tile set every **5 game min** (deterministic); the renderer interpolates the shape smoothly.
- **Intensity** (additive light alpha): `0.1 + 0.35 × sin(πp)`.

### 11.3 What home.md must provide

At least one left-wall window, one back-wall window and one right-wall window across the indoor rooms, with the living room having at least one. Then indoor sunbeams cover 06:30–19:00 and Peaches always has somewhere to go on a dry day.

---

## 12. Visitors

### 12.1 Bruce (flame point Siamese)

| Rule | Value | Reason |
| --- | --- | --- |
| First visit | Day 2, at a uniform time 11:00–15:00, at the garden fence | Guaranteed early mystery. |
| Hourly roll | Each game hour from 07:00 to 21:00: p = 0.08 | ≈ 1.1 visits a day. |
| Limits | Max 2 visits per game day; at least 4 game h between visits | Rare enough to be a treat. |
| Where | Garden fence 0.35, under the kitchen table 0.20, behind the TV 0.15, on top of the fridge 0.15, in a delivery box 0.15 (needs a box; otherwise its weight goes to the fence). A not-yet-found hiding spot gets ×1.5 weight | The five hiding places from the brief; new ones come up faster. |
| Window peeks | Separately, p = 0.10 per visit that he appears at a window instead (flavour, doesn't count as a hiding spot) | Brief: "at the garden fence or a window". |
| Stays | 45–90 game min, or until spotted | |
| Spotted | The player clicks him (`bruce.spot`), or Ellie passes within 3 tiles with a clear line | He says a denial line, then vanishes 5 s later. Spot count +1; the hiding spot is marked found. |
| Moves in | After **10 spots with all 5 spots found**, or after **15 spots** in any case | Brief: "eventually he moves onto the garden wall for good." The 15 fallback means a missing box never blocks it. |
| After moving in | On the garden wall 08:00–20:00 every day (still denies everything when clicked). Hiding visits continue at p = 0.04 per hour | |
| Cats | Within 8 tiles of a visible Bruce: Salem `window.sit` / `watch_bird` Q ×2; George a disapproving look; others ignore him | |

### 12.2 Poe (raven)

| Rule | Value | Reason |
| --- | --- | --- |
| First visit | Day 3, 10:00–14:00 | After Salem has had time to knock things off. |
| Daily roll | At 00:00: p = 0.60. Forced to 1.0 if Ellie holds ≥ 3 trinkets and Poe hasn't come for 2 days | Trades never stall. |
| Arrival | Uniform 09:00–16:00, not in rain (if rain covers the time, he comes right after) | |
| Stays | 90 game min, or 10 min after a trade | |
| Where | The bird bath (always in the garden) | |
| Trades | `poe.trade` opens the trade screen; play.md owns the table | |
| Cats | Salem `bird_bath.watch` Q ×2; Peaches ignores; George watches from a perch | |

### 12.3 Pickle (frog, Pickle's Deliveries)

| Rule | Value | Reason |
| --- | --- | --- |
| Delivery wait | 45 game min after ordering in Live mode | "A short in-game wait": 45 s at ×1. |
| Batching | Every order placed during the wait joins the same delivery | One knock, one box. |
| Night | Deliveries come at any hour (Pickle works nights; it's a joke in his note) | No waiting until morning. |
| Arrival | A knock (audio cue), Pickle at the front step for 15 game min, a box on the doormat, a delivery note (mail item, play.md) | |
| Answering | Optional: `door.answer` within the 15 min gives Fun +3 and his line. Nothing is lost if she doesn't | |
| Build mode orders | Arrive instantly; one box is left on the front step for Salem when she returns to Live mode | Brief §9. |
| Day 1 | Pickle visits during the tour (onboarding, play.md) | |
| Cats | Salem's box rule (§10.3); George inspects the box (`furniture.inspect`, Royalty +3) | |

---

## 13. Weather

| Rule | Value | Reason |
| --- | --- | --- |
| Rain roll | At 00:00, p = 0.18 (about 4 rain days a month after the exclusions) | Occasional rain, as in the audio brief. |
| Never | Day 1, Saturdays, or two days in a row | Race day and the first day stay dry. |
| Rain window | Start uniform 06:00–18:00, lasts 120–360 game min | |
| Effects | No sunbeams; outdoor interactions ×0.3 in free will (never forbidden); Ellie's Calm decay ×0.6 indoors; Peaches watches from a window (`window.sit` Q ×1.5) | Rain is cosy, not a loss. |

---

## 14. RNG order (determinism)

All randomness uses the state RNG. Daily rolls at 00:00 happen in this fixed order: rain, Salem's zoomies (and start time), Poe's visit (and arrival time), Bruce's daily bookkeeping. Hourly rolls on the hour, in this order: Bruce, then the good-mood trickle (no RNG). George's pillow roll happens when its trigger fires. Within a tick, actors decide in entity id order (Ellie first). Candidate noise draws happen in sorted candidate order.

---

## 15. Soak invariants (targets for `npm run soak`)

Run: 30 game days, free will on, no player input, seed fixed. Start from a new game with the starting home (home.md) and no purchases.

| # | Invariant | Target |
| --- | --- | --- |
| 1 | Ellie's needs (Energy, Hunger, Fun, Fitness, Calm) | After dropping below 50, each is back above 50 within 24 game hours. Cosy is excluded (it is a room score). |
| 2 | Cat needs (Food, Play, Affection, Nap and the personality need, for all four) | Same: back above 50 within 24 game hours. |
| 3 | Daily mean mood | ≥ 50 on every day; time with mood < 25 ≤ 5 % of the run. |
| 4 | Actions complete | Every agent completes ≥ 1 action per game hour. Sleep and naps count because they run in 60-minute chunks (§5.5, §2.4). |
| 5 | Stuck | No agent without progress (no position change and no action progress) for > 2 game hours. |
| 6 | Bedtime | Ellie starts `bed.sleep` between 21:00 and 01:00 on ≥ 80 % of days and wakes between 05:30 and 10:00 on every day. |
| 7 | Bonds | Every cat gains ≥ 15 bond over the 30 days; no cat ever loses more than 2 in a day; levels never drop. |
| 8 | Salem | Shares Ellie's room ≥ 40 % of her awake time; 3 a.m. zoomies happen on 14–28 nights. |
| 9 | Peaches | Basks in a sunbeam ≥ 60 game min on ≥ 70 % of dry days. |
| 10 | Shadow | Trust gain happens on ≥ 50 % of days. |
| 11 | Visitors | Bruce 15–45 visits, max 2 per day; Poe 12–24 visits; Pickle 0 (no orders in an idle soak). |
| 12 | Weather | 1–9 rain days, never two in a row, never on a Saturday. |
| 13 | Caps | Ellie's queue ≤ 4; moodlets ≤ 8 and sum ≤ 25; mess ≤ 12; boxes ≤ 3; trinkets ≤ 99; Salem knocks ≤ 3 per day. |
| 14 | Ranges | Every need in [floor, 100]; bond in [0, 100]; no NaN, undefined or Infinity. |
| 15 | Hearts | Inside play.md's band. The mood multiplier stays in [0.8, 1.5]. |
| 16 | Determinism | Same seed and inputs give the same final hash; save and reload round-trips deep-equal. |

Rough day budget behind targets 1–3 (free will only): sleep ~7–8 h; three meals (~70 min, Hunger +90); two coffees or a ritual; four or five Fun actions (~150 min, Fun +60–80); one run or two gym sessions (Fitness +14–20 vs 18 decay); one Calm action (+15–30) plus sleep's +4/h; two bowl fills and two or three pets. That's about 8 of 16 waking hours busy, leaving room for walking and idling.

---

## 16. Notes for other specs and the architect

### 16.1 Other specs must match

| Spec | Must match |
| --- | --- |
| home.md | Interaction ids and tags in §4.3, §4.2 and §8.6 (item rows should reference them; new item interactions pick a tag and get its default effect). At least 2 layer-2 perch slots in the start home (wardrobe top, fridge top), one dark hide spot (under the bed), Ellie's bed with 4 cat slots, 4 cat bowls, a starter cat bed, a toy mouse, a brush, a feather wand and a laser pointer (pocket items), a kettle, a rusk tin, a bookshelf or a paperback, garden grass and a bird bath. Windows on left, back and right walls (§11.3). Unlock keys `bond:<cat>:<level>`. Cosy uses cat happiness (§8.9) and the mess count (§7.4). Lamps count when `darkness ≥ 0.3`. |
| play.md | Good-mood trickle amount (`GOOD_MOOD_HEARTS`, suggested 2); bond level-up Hearts (15/25/40/60, flat); which Hearts sources take the mood multiplier (§3.3); minigame result factor 0.8–1.2 and skip = 0.8; race on Saturdays (weekday formula §1.4); Cat Royalty final tier = all four level-4 cats in bed slots while she sleeps; Poe's trade table uses Shiny Trinkets; the 50-box, 3 a.m. zoomies, Bruce five-spots and Shadow lap stickers use the flags here. |
| ui.md | Queue cap 4 incl. the running entry, `queue.full` and `queue.dropped` toasts, mood band keys `mood.band.0..5`, bond level keys `bond.level.0..4`, thought/speech frequencies (§8.10). |
| voice.md / strings | Lines for: refusals, "that's enough", George verdicts, Bruce denials, Shadow leaving for Heavy, Salem's 3 a.m. zoomies, "Sir Ellie" after the Knighting. |
| audio.md | Cues: knock (Pickle), zoomies, knocked item landing, rain start and stop, bowl fill. |

### 16.2 Contract notes for `types.ts` (the architect decides the exact shape)

- `GameTime.fastForward: boolean` (sleep fast-forward, §1.3); per-tick `dtGameMin` and `dtActionMin` (§1.6).
- `InteractionTag` string union with the ids in §4.2.
- Interaction def fields listed in §4.1, including `autonomous`, `posture`, `window`, `requires`, `bondGain`.
- `ActionRequest` (or the queued entry) carries `autonomous: boolean`; Ellie's queue cap is 4 including the running entry.
- Sim state needs: moodlets (id, amount, endsAtTick), daily counters (coffees, knocks, trinkets, bond-points-today per cat, Shadow trust-today), Bruce state (spots, found set, movedIn), Poe and Pickle schedule, weather (raining, window), mess items, delivery boxes, trinket count, outfit and title unlock flags, active cat requests, quirk flags (`quirk.zoomies3am`).
- Events: `bondLevelUp { cat, level }`, `visitorArrived/visitorLeft { visitor }`, `bruceSpotted { spot }`, `quirk { id }`, `requestStarted { cat, need }`, `moodBandChanged { band }`.
- `NeedValues` floors: Fitness 20; cat needs 10.
