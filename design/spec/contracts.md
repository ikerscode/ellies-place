# Module contracts

Owner: architect. The code is the source of truth: `src/core/types.ts` (types) and the helpers next to it in `src/core/`. This page explains them. If you need a change, write the exact diff in `reports/contract-requests/<agent-id>.md` (one file per agent, no root file), and put bugs and follow-ups in `reports/tickets/<agent-id>.md`; the integrator merges tickets into `TICKETS.md` (FROZEN 35).

## v3 changes (Wave 1, from the contracts review and `FROZEN.md` rows 20 to 40)

Everything is in `src/core`. Wave 2 owners: read your row.

**Seams (everyone).**
- **World access (B1, FROZEN 20).** `WorldQueries` (`roomAt`, `navGrid`, `slotPose`, `footprintTiles`, `sunbeams`) is the read-only part of `World`. It is a required field of `CreateSimOptions`, `SystemContext`, `AiContext` and `EngineOptions`, and `Sim.world` exposes it. The world computes sunbeams; the engine only draws them. Tests use `makeFixtureWorld(content)` or `makeFakeWorld`.
- **Time (B4, F4, F5, F34, FROZEN 17 and 23).** `effectiveSteps(activity) = 1` (the house runs at x1 behind a minigame). Fast-forward replaces speed, never multiplies. `GameTime.lastSpeed`; soft-pausing panels dispatch `time.setSpeed 0`; `normaliseLoadedState` (Sim.load) restores the speed, drops any activity session and goes back to `live`. The tour does not freeze the clock; `cutscene` mode only suspends need decay. `TICKS_PER_GAME_MINUTE = 20`, `minutesToTicks`, `timeAtTick`: never accumulate `minuteOfDay`.
- **Activity outcomes (B6, F24, FROZEN 25).** Need effects, Hearts and XP come only from `InteractionDef.effects`, `ECONOMY.minigame` and `ECONOMY.skillXp`, scaled by `needFactor` and `resultScore`. `ActivityResult.effects` is typed `ResultEffect[]`: only `skillXp`, `record`, `stat`, `feeling`, `flag`. `skill?: SkillId` on `InteractionDef` and `ActivityResult`; `SkillId = HyroxStation | 'kitchen'`; training PBs are points 0..100 (`stationPb`), race PBs ms; `ActivityResult.details` carries race `stationScores` and `splitsMs`; the race coefficients are `ContentDb.race` (`RaceModel`).
- **Type tightening (F3, FROZEN 29).** `exactOptionalPropertyTypes`; `IdMap` is a `Record`; `DeepReadonly<SimState>` replaces `Readonly<SimState>`; `DispatchResult.reason` is a `StringKey`.
- **Keys (B3, FROZEN 22).** `src/core/keys.ts`: one builder per family, runtime enum lists, `requiredEnumKeys()`. `validateContent(db, { sprites, strings, complete })` checks every key and spelling.

**Sim, data and cats.**
- **Plugin toolkit (F30).** `SimToolkit`: `evalCondition`, `applyEffects`, `startAction`, `cancelAction`, `reserveSlot`, `releaseSlot`, exported by `src/sim`. `createCatsPlugin(): SimPlugin` replaces `registerCats(sim)`; plugins go in `CreateSimOptions.plugins` and `createSim` starts or loads the game only after registering them. `Sim.use` throws once a game exists.
- **Events (F6).** `ctx.emit` buffers; `Sim.step` flushes (`createEventQueue`) after the last system. The bus catches per handler and skips handlers unsubscribed mid-emit. `dispatch` outside a step applies at once and flushes its own events.
- **State.** `ActivitySession.rngSeed` (F1), `SimState.lastBuild` (F28), `MoodC.buffs` and Effect `buff` (F21), `Feeling.untilTick: number | null` (F9), `WishesState.fullSets`, `lastDone`, `offered`, `ActiveWish.baseline` (F18), `QueuedAction.autonomous` is gone: `isAutonomousSource(source)` (N13).
- **Conditions (F20, F21).** `catState`, `recordAtMost`, `recordAtLeast`, `ownedCount`, `doing`, `posture`, `buff`. `DecayModifier.perCount` (`CountSource`: mess, low needs, cats doing a tag). Stat, flag and record names: `src/core/stats.ts`.
- **Tuning (F22, F15).** Typed blocks `tuning.cats`, `visitors`, `weather`, `bubbles`, `sun`, `clutter`, plus `ai.repeatCap`, `recency`, `bedtime`, `lateNight`, `lowEnergySleep`, `wishFactor`, `catCircadian`, `idleScore`, `wanderScore` and wish roll rules in `tuning.wishes`. `tuning.extra` stays only for numbers no spec names yet.
- **Wishes and the housewarming (F18, F19, FROZEN 26).** `WishDef.category` and `size`; no wish swap; action `housewarming.rsvp { tonight }`.
- **Reaction events (F29).** `ActivityContext.event(id)`, action `activity.event`, SimEvent `reaction`; `ReactionEventId`.
- **Items (F10, F11, F13, F14, F17).** `ItemDef.fixture`, `valueOverride` (replaces `cosy`), `states` (replaces `sprites` and `flipFor`: keys are derived by `itemSpriteKey`). `Mount` and `MountRef` lose `fixed`. `PaintDef.unlock` is an `UnlockCode`, plus `variant`, `template`, `sound`. `PlacementRequest.source`. `InteractionDef.slots` is `slotKinds` and `slotIds` (N5). `requires` is `{ when, reason }[]` (F26).

**UI, engine, audio, build, save, app.**
- **Names.** `DayPhase` is `dawn | day | dusk | night`; `OutfitSlot` is `head | clip | neck | top | feet`; `GymSound` for `gym.stroke`.
- **Onboarding (F25).** `hint`, `hintAfterSec`, `nextAfterSec`. **Photos (F32).** `PhotoMeta.tags` (`PhotoTag`). **Music (F27).** `musicContextOf(state)`; `raceDay` only inside the race activity.
- **Save (F33 to F37, FROZEN 28).** Photos travel inside export and import (`PhotoBundle`, one cap of 100). `PersonalMail.id`, `MailRef` personal `{ id }`, `MailEntry.snapshot`, `personalSent: string[]`, `localDate(wallMs)`. `LoadResult` adds `tooNew`; a newer save is never overwritten. `makeFile` returns null on non-JSON. `validateSimState`, `fillMissing`, `reconcileState`, `migrationChainProblems`. Settings have their own key (`saveSettings`, `loadSettings`). Relaxed timing is cut.
- **Test hooks (F7).** `TestHooks.nonJson()`.
- **Tooling.** `scripts/lint.mjs` bans random and time APIs in sim, world, activities, content/data and core (except `clock.ts`). `happy-dom` for per-file DOM tests. Fakes for every module interface: `tests/unit/core/fakes.ts`.
- **Sprites (FROZEN 21, 39, 40).** Families `item.<ItemId>[.r1|.r2][.on|.open|.full|.overhead]`, `icon.int.<glyph>`, `struct.wall.<style>`, `struct.door.<kind>`, `struct.window.<kind>`, `paint.<paintId>`, `pattern.<surface>.<variant>`.

## v2 changes (Wave 1, from `FROZEN.md` §2 to §4)

Requests archived in `reports/contract-requests/`. Everything below is in `types.ts` and, for formulas, `src/core/rules.ts`.

- **Audio.** `SimpleCueName` adds `build.wall`, `build.floor`, `race.horn`.
- **UI (R1 to R5).** `KeyAction` adds `secondary`, `cats`, `toggleHud`, `help`, `store`. `Ui.region(id: UiRegionId)` with `'buildTop' | 'buildBar' | 'catalog'`. Bus events `app.request` (`AppRequest`), `photo.request` (`{ filter, frame: Rect, snap }`), `activity.skippable`, `activity.skip`, `activity.leave`. `UiDeps.loadPhoto(meta)`. New `Rect`.
- **Time.** `GameTime.fastForward` stays a number: 1, or `SimTuning.time.sleepFastForward` (10) while sleeping through the night. It **replaces** `speed` in `effectiveSteps` (200 ticks/s), it does not multiply it, and never applies in real-time mode. `SystemContext` adds `dtGameMin` (decay, schedules) and `dtActionMin` (interaction progress); `dtMinutes` is a deprecated alias of `dtGameMin`. `LIMITS.maxTicksPerFrame = 12`.
- **Needs and mood.** `NEED_FLOORS` (Fitness 20, every cat need 10) and `clampNeed`. `MOOD_STEPS`: six steps at 0, 25, 45, 65, 80, 92 with Hearts ×0.8, 0.9, 1.0, 1.15, 1.3, 1.5. `MoodBand` keeps its five display values (steps 4 and 5 both show `great`, so `ui.mood.<band>` keys and portraits are unchanged); `MoodStep` is 0..5. `moodBandOf` defaults to these floors. `SimTuning.mood.bands`, `mood.heartsMultiplier` and `SimTuning.hearts` are gone (frozen rules in core, economy in `EconomyTable`). Moodlets are `Feeling`s with `MoodletId` (`moodlet.wish_done`...).
- **Interactions.** `InteractionTag` closed union (sim.md §4.2, Ellie and cat tags). `InteractionDef.tags` is `InteractionTag[]`; `icon` is required; new `posture`, `window`, `bondGain`, `autoFetch`, `repeatExempt`, `recencyExempt`; duration `between` and `untilNeed.chunkMinutes`. `QueuedAction.autonomous` (v3: derived from `source`). `ActiveAction.totalMinutes` and `fetch`. `CatDef.tagWeights` is keyed by `InteractionTag`; new `decayWeights`, `runSpeed`. `SimTuning` realigned to sim.md (urgency curve, `distanceD0`, `freeWillIdleTicks`, `catIdleGapTicks`, `urgency`, `ellieTagWeights`, bond soft cap, `nightDarkness`, `cosyEasePerHour`...).
- **State.** `hearts.earnedTotal` (play.md `heartsEarnedTotal`) and `earnedToday`. `inventory.storedFree` and `inventory.freeOrigin`; `PlaceableC.origin`. `unlocks.codes`. `daily: DailyState` (coffees, knocks, bond per cat, Shadow trust, uses, minigames paid...). `quirks`. `visitors.bruce` / `poe` / `pickle` (replacing `bruceSpotted` and `poeOffers`). `environment.rain`, `lastRainDay`, `lanternsUntilTick`, `music.untilTick`. Component `mess` (`MessC`); `BoxC.createdTick`; `CatC.request` and `requestCooldowns`. `RoomState.cosy` is now `cosyRated` and `cosyLive`, plus `scored` and `area`.
- **Events.** New sim events `visitor.arrived`, `visitor.left`, `bruce.spotted`, `quirk`, `request.started`, `request.ended`. sim.md's `bondLevelUp` is the existing `bond.level`, and `moodBandChanged` is the existing `mood.band` (now with `step`).
- **Items (home.md).** `ItemDef.mount` is replaced by `placement: Placement` (`floor | in | out | rug | wall | window | surface | front`; `mountOf()` derives the `Mount`, which adds `window`). `ItemDef.unlock` is an `UnlockCode` string, not a `Condition`: `start`, `fixture`, `day:N`, `asp.<hyrox|royalty|home|collect>.<1-4>`, `bond:<cat>:<1-4>`, `poe:N`, `secret:<id>`. `parseUnlockCode`, `unlockGivesFreeCopy` (secret and Poe only). New `maxCopies`, `uncounted`. `ItemDef.price` is the home.md base price; the shop price is `priceOf(price, ECONOMY)`. Tags may include `room.<RoomKind>`. `LotSpot` Bruce spots now use home.md ids (`BruceSpot`), plus `deliveryBox` and `bruce.wall`. `PlacementError` adds `needsIndoor`, `needsOutdoor`, `needsWindow`, `needsFrontStep`, `oneRugPerTile`, `maxCopies`. `RoomDef` adds `scored`, `cosyTarget`, `plantTarget`.
- **Progression.** `ASPIRATION_IDS` (`asp.hyrox`, `asp.royalty`, `asp.home`, `asp.collect`); tier ids `asp.<key>.<n>`; tier keys `asp.<key>.tier.<n>` and `.goal` (FROZEN 6a); `AspirationTierDef.gift` and `goalText`. Conditions `setBonusCount`, `roomsCosy`, and `cosy.reading`. `HeartsReason` adds `sticker`, `medal`, `housewarming`. Flag families `known.<cat>.<like|dislike|quirk>.<id>`, `secret.<id>`, `quirk.<id>` (`KnownFlag`, `knownFlag()`).
- **Economy.** `EconomyTable` (`ContentDb.economy`, written as `ECONOMY` in `src/content/data`): start Hearts, `priceScale` (1.6) and `priceStep` (5), `passScore`/`autoPlayScore` (typed to the core constants), wish Hearts, trickle rows, minigame pay and daily cap, flat activity Hearts, bond level-up (25), aspiration tiers (50/100/175/275), race, medals, Critterbound, stickers, housewarming, skill XP curve, the 2000-a-day guard.
- **Activities.** `ActivityResult` adds `misses` and `auto`. `PASS_SCORE` 0.5, `AUTO_PLAY_SCORE` 0.6, `SKIP_NEED_FACTOR` 0.8, `AUTO_NEED_FACTOR` 1.0; `resultScore`, `needFactor`, `canSetPb`. Activities no longer put `hearts` effects in results: the sim pays minigame Hearts from the score.
- **Resolved in v3.** The house keeps running at ×1 behind an activity (FROZEN 17); `effectiveSteps(activity)` is 1.

## 1. Principles

- **State is JSON.** `SimState` holds plain objects, arrays, strings, finite numbers, booleans and `null`. It has no classes, `Map`, `Set`, functions, `undefined` values, `NaN` or `Infinity`. `findNonJson(state)` must return `[]`, and `hashState(state)` must not throw.
- **Determinism.** Same seed plus the same `PlayerAction`s at the same ticks gives the same `hashState`. Sim code uses `state.rng` (`nextFloat`, `nextInt`, `pick`, `chance`, `forkRng`) and the injected `Clock`. It never uses `Math.random`, `Date.now` or the iteration order of a `Map`.
- **Data first.** Numbers and content live in `ContentDb` (`src/content/data`). Code does not hold design numbers. The only code constants are the engineering limits in `LIMITS` and the canvas, tile and tick constants.
- **Ids.** Table ids are branded strings (`ItemId`, `WishId`, `StringKey`...) and entity ids are branded numbers (`EntityId`). Content casts with `asItemId('sofa_small')` etc. Small open vocabularies (`Tag`, `CarryKind`, `AnimKey`, `StatKey`, `FlagKey`) are `Known | (string & {})`, so you get autocomplete and can still add values in data.
- **Unions.** Data unions are discriminated by `kind`. Events and actions are discriminated by `type`. Audio cues are discriminated by `cue`.
- **One way in.** Every change to the sim from outside goes through `dispatch(PlayerAction)`. Activities return results as data and never mutate the sim.
- **No `any`** in exported APIs. The lint rule is stricter: no `any` anywhere in `src/`.

## 2. Module map and entry points

| Module | Owner | Entry point (in its `index.ts`) |
| --- | --- | --- |
| `src/core` | architect | types, `createRng`/`forkRng`, clocks, `createEventBus`/`createEventQueue`, `buildContentIndex`/`validateContent`, `createStringLookup`, `hashState`, geometry, maths and time helpers, key builders (`keys.ts`), stat names (`stats.ts`), `musicContextOf`, save validation (`validate.ts`), `createEmptySimState`, entity store accessors |
| `src/content/data` | game-designer | `createContentDb(): ContentDb` |
| `src/content/strings` | writer | `STRINGS: StringTable` (merged domain tables) |
| `src/content/personal.ts` | writer | `PERSONAL: PersonalConfig` |
| `src/sim` | sim-dev | `createSim(opts: CreateSimOptions): Sim`, and the plugin toolkit `evalCondition`, `applyEffects`, `startAction`, `cancelAction`, `reserveSlot`, `releaseSlot` |
| `src/sim/cats` | cat-ai-dev | `createCatsPlugin(): SimPlugin` |
| `src/world` | build-mode-dev | `createWorld(content: ContentIndex): World` (its `plugin()` goes first in `CreateSimOptions.plugins`; the `World` itself is the `WorldQueries` for sim and engine) |
| `src/build` | build-mode-dev | `createBuild(deps: BuildDeps): BuildMode` |
| `src/engine` | engine-dev | `createEngine(opts: EngineOptions): Engine` |
| `src/ui` | ui-dev | `createUi(deps: UiDeps): Ui` |
| `src/audio` | audio-dev | `createAudio(deps: AudioDeps): AudioApi` |
| `src/save` | save-dev | `createSave(deps: SaveDeps): SaveApi`, `MIGRATIONS` |
| `src/activities` | activities-dev | `registerActivity(def: ActivityDef)`; each family exports `register<Family>()` |
| `src/art/<batch>` | pixel-artist | `BATCH: ArtBatch` |
| `src/testing` | qa-engineer | `installTestHooks(deps, location.search, window): TestHooks \| null` |
| `src/app`, `src/main.ts` | integrator | wiring, plus `src/app/activityHost.ts` (hosts activities, F32) |
| `src/testing`, `tests/soak/*`, `src/testing/headless.ts` | qa-engineer | `installTestHooks`, and `createHeadlessGame({ seed, debug })` (the non-DOM half of boot, shared with the integrator: FROZEN 24) |

Every stub already has the final signature. Today the stubs throw `notImplemented(name)`, except the activity registry and `isTestMode`, which already work.

### Boot sequence (integrator)

1. `const db = createContentDb(); const content = buildContentIndex(db);` (this throws, listing every problem, if the content is inconsistent)
2. `const strings = createStringLookup(STRINGS, { name: PERSONAL.playerName })`
3. `const bus = createEventBus<EpEvents>(); const clock = createSystemClock();`
4. `const save = createSave({ storage: safeLocalStorage(), clock, bus })`, `save.loadSettings()` and then `save.load()` (a `tooNew` result shows the title screen's notice and never overwrites)
5. `const world = createWorld(content)`
6. `const sim = createSim({ content, world, seed, clock, state: loaded?.state, plugins: [world.plugin(), createCatsPlugin()] })`. `createSim` registers every plugin first, then runs `newGame` or `load` (which applies `reconcileState` and `normaliseLoadedState`) and each plugin's `init` once. Plugin order changes the state hash, so soak and the app share `createHeadlessGame`.
7. `sim.onEvent((e) => bus.emit('sim.event', e))`. The app also re-emits the specific events: `cue` → `audio.cue`, `world.changed` → `world.changed`, and `toast` → `ui.toast`.
8. `const engine = createEngine({ canvas, clock, bus, content, world, sprites: [BASE.BATCH, ...], sim })`
9. `const ui = createUi({ root, bus, strings, dispatch: sim.dispatch, sim, content, settings, atlas: () => engine.atlas, worldToScreen: engine.camera.worldToScreen, loadPhoto: (m) => save.loadPhoto(m.id) })`
10. `createBuild({ world, sim, bus, ui, engine, strings })`, `createAudio({ bus, settings })`, and each `register<Family>()` for the activities
11. `installTestHooks({ sim, engine, content }, location.search, window)`, `save.startAutosave(...)`, then `engine.start()`

When the sim emits `activity.request`, the app looks up the `ActivityDef`, calls `create(params)`, and calls `start(ctx)` with `rng: createRng(session.rngSeed)` (the seed was drawn by the sim when it made the session, so the app never touches `state.rng`: F1), `event` forwarding `activity.event` actions, and the rest of the context. It then runs `engine.setActivity(a)` and emits `activity.skippable` once `canSkip()` is true. On `activity.skip` or `activity.leave` from the UI it calls `skip()` (both count as a pass). When `result()` is non-null, it dispatches `{ type: 'activity.finish', result }` and calls `engine.setActivity(null)`. Free-will activity picks never reach the app: the sim resolves them itself with `auto: true` and `AUTO_PLAY_SCORE`.

The app also answers `app.request` (continue, new game, import, export, quit to title) and `photo.request` (engine preview or capture, then `photo.captured`), derives `music.context` with `musicContextOf(state, { title })`, calls `ui.update` each frame, and takes photo tags and captions (`photoTags` in `src/activities/life`). All of that lives in `src/app/activityHost.ts` and its siblings, with tests under `tests/unit/app/` (F32). `getFile()` for autosave never returns an in-activity snapshot (F34): mid-activity it returns the last `live` snapshot or null.

## 3. Time and the tick

- 20 ticks per second (`TICKS_PER_SECOND`). Every tick is 0.05 game minutes at every speed; speed changes ticks per second only, so one game day takes 24 real minutes at ×1.
- Each fixed step, the engine calls `sim.step(sim.stepsPerTick())`, at most `LIMITS.maxTicksPerFrame` ticks per frame (extra real time is dropped). `stepsPerTick` is `effectiveSteps(time, mode)`: `speed` in `live` mode, or `fastForward` instead of `speed` while sleep fast-forward is on, 1 in `cutscene` and `activity` modes, and 0 when paused and in `build` and `photo` modes. Panels that soft-pause send `time.setSpeed 0` (stored: `lastSpeed` brings it back on load). The sim sets `time.fastForward` to `SimTuning.time.sleepFastForward` (10) when Ellie sleeps through the night and back to 1 when she wakes or the player acts.
- Each system gets two deltas: `dtGameMin` (need decay, schedules, cooldowns) and `dtActionMin` (interaction progress). Both are 0.05 except in real-time mode, where `dtGameMin` follows the wall clock.
- `time.tick` is canonical. `day`, `minuteOfDay`, `weekday` and `phase` are derived from it with `timeAtTick(tick, tuning.time)` and stored for convenience. Never accumulate `minuteOfDay += 0.05` (drift: wrong from tick 60). Deadlines are integer ticks (`minutesToTicks`, `TICKS_PER_GAME_MINUTE = 20`). Cutscene mode keeps the clock running and suspends need decay only.
- In real-time mode (`time.realTime`), the time system sets the minute from `clock.wallNow()`. Determinism does not apply in that mode.

### System order

`SYSTEM_ORDER`: `time`, `needsDecay`, `aiDecide`, `actionExec`, `movement`, `triggers`, `progression`, `eventsOut`.

A `System` is `(ctx: SystemContext) => void`. It only mutates `ctx.state` and calls `ctx.emit`, which buffers: events reach `sim.onEvent` listeners after the last system of the step, in order, so a throwing UI handler cannot abort a tick (`createEventQueue`). Plugins add systems per phase, and these run after the core system of that phase in registration order. `dispatch` applies at once and flushes its own events when called outside a step (paused, build and photo modes never step, so deferring would lose build actions); inside a step it is queued to the start of the next one, before `time`. Plugins hold derived caches only: anything that changes the next tick lives in `SimState`, or a save and reload diverges (F8; qa-engineer tests continuation equality).

## 4. SimState

The full shape is in `types.ts`. Here is what each part holds:

| Field | Holds |
| --- | --- |
| `version`, `rng`, `time`, `mode`, `options.freeWill` | Core |
| `nextEntityId`, `nextActionId`, `components` | Entity store (section 5) |
| `lot` | Tiles, room per tile, rooms with paint and cached `cosyRated` and `cosyLive`, and `revision` |
| `environment` | Weather, today's rain window, last rain day, what the record player is playing and until when, lanterns, stars tonight |
| `hearts` | Balance, `earnedTotal` (play.md `heartsEarnedTotal`: never decreases, refunds excluded), spent, `earnedToday` |
| `inventory` | Bought copies stored (`stored`), free copies stored (`storedFree`), the `freeOrigin` set (every item ever received free), trinkets, pending orders |
| `unlocks` | Unlocked items, interactions, outfits, paints, titles and activities, plus `codes` (unlock codes fired, with the day) |
| `daily` | Per-day counters reset at 00:00 (`DailyState`): coffees, knocks, bond gained and lost per cat, Shadow trust, interaction uses, minigames and photos paid |
| `quirks` | Running quirks (id to end tick, also flag `quirk.<id>`) and tonight's zoomies tick |
| `wishes` | Today's 3 (with `baseline`), the roll day, `fullSets`, history, `lastDone` (cooldown) and `offered` (category weights) |
| `aspirations` | Tiers done per aspiration, chosen title |
| `mail` | Inbox (capped; personal entries carry a text `snapshot`), sent ids, `personalSent` (personal mail ids), mailbox waiting count, scheduled |
| `stickers` | Earned sticker ids with the day earned (secrets are stickers with `secret: true`) |
| `records` | Hyrox and kitchen skill, station PBs in points 0..100 (`stationPb`), race PB in ms, races (capped), medals, plus generic `best` (what `recordAtMost` and `recordAtLeast` read) |
| `wardrobe` | What each of Ellie and the cats wears per slot, Ellie's streak colour |
| `album` | Photo metadata with `tags`. The PNGs live in their own storage keys and travel inside export and import |
| `visitors` | Visit timers and counts; `bruce` (spotted, found spots, moved in, visit), `poe` (visit, offers, trades), `pickle` (visit, deliveries) |
| `onboarding`, `housewarming` | Story progress |
| `activity` | The `ActivitySession` in progress (with `rngSeed`), or null |
| `lastBuild` | What the last Build session changed (`closedTick`, `added`, `moved`, `removed`, `painted`), written by the world plugin when Build closes; the cats read it (F28) |
| `stats`, `statsToday` | Counters for progress events and anything else (`interaction.<id>`, `dunk.perfect`, `boxSat.salem`); names in `src/core/stats.ts` |
| `flags` | Story booleans (`bruce.onWall`, `george.knighted`); names in `src/core/stats.ts` |
| `activitySaves` | JSON blobs per activity (Critterbound party) |
| `log` | Recent notable lines for the journal (capped) |

`Settings` (volumes, text size, reduced motion, session count) are not part of determinism: they are saved next to the state in `SaveFile` and under their own key (`SETTINGS_KEY`), so the title screen can change them before any game exists. `createEmptySimState(seed, content, opts)` returns a valid skeleton with no entities; start time, weekday, phase and Hearts come from `content.tuning` and `content.economy`. The sim's new-game setup builds on it.

## 5. Entities and components

`components` is one table per component, keyed by the stringified entity id. Use `allocEntity`, `getC`, `setC`, `hasC`, `removeC`, `removeEntity` and `entitiesWith`. Iteration is in ascending id order, which keeps it deterministic.

| Component | On | Notes |
| --- | --- | --- |
| `meta` | all | `kind` (`ellie`, `cat`, `visitor`, `item`, `box`, `mess`, `trinket`) and `name` |
| `mess` | mess | Dirty dish or knocked item, where it goes back, created tick (clears after 36 game hours) |
| `position` | all | `pos` and `prev` in tile units (prev is for render interpolation), `layer` 0/1/2, `facing`, `room` |
| `motion` | actors | Path with layers, speed, `stuckTicks`, jump progress |
| `sprite` | all | Actors: `base` + `anim` resolved with `spriteFor(base, anim)`. Items: full key. Also `hidden` |
| `agent` | actors | Queue (Ellie holds 4 including the running entry, others 2), each entry with a `source` (autonomous means `freeWill` or `ai`: `isAutonomousSource`); `current` `ActiveAction` with its phase, `totalMinutes` and pending `fetch` steps; `carrying`, `idleTicks`, `asleep`, cooldowns, `lastPick` |
| `needs`, `mood` | Ellie, cats | Needs are 0..100. Mood is Ellie's only, with its band, `Feeling`s and timed `buffs` (`caffeinated`) |
| `bond` | cats | Value 0..100 and level 0..4 |
| `bubble` | actors | Thought icon and speech line with expiry ticks, plus the speech cooldown |
| `cat` | cats | Active `request` and request cooldowns, quirk cooldowns, `following`, JSON `memory` (owned by `src/sim/cats`) |
| `visitor` | visitors | When they leave, which spot |
| `placeable`, `smartObject` | items | Tile (canonical: the world is the only writer of it and of the mirrored `position.pos`), rotation, `MountRef`, placed tick, `origin` (`bought` or `free`); slot reservations and object `flags` (on, station...) |
| `carryable`, `light`, `box` | some items | `box.occupant` is the cat inside; `box.createdTick` for the 48-hour recycle |

## 6. Interactions and smart objects

An item is a smart object when its `ItemDef` lists `interactions` and `slots`. An `InteractionDef` holds:

- **Ids and tags.** Ids are sim.md's `<object>.<verb>`. `tags` are `InteractionTag`s from sim.md §4.2 (closed union); the first tag gives the default effect when data has no numbers. `icon` (required) is the petal and queue-card icon.
- **Who and on what.** `actors: ActorFilter[]`. `target` is one of `object`, `cat`, `ellie`, `self`, `tile` or `visitor`. `targetCats` is optional. `posture` (`stand`, `sit`, `lie`, `exercise`, `offLot`), `window` (time of day), `bondGain` (base bond for the target cat).
- **Advertisements.** `adverts[]` per actor filter. Each one gives the expected `NeedDeltas` over the whole interaction, plus an optional `bias`. The scorer reads these. What actually happens is set by `perHour`, `targetPerHour`, `onStart` and `effects`.
- **Slots.** `slotKinds` and `slotIds` list slots on the target, in order of preference (kinds first; no slot id may equal a kind name). `ItemDef.slots` gives each slot's offset at rotation 0, its facing, layer and allowed actors. `rotateOffset` and `rotateFacing` turn them with the item. A slot is reserved in `smartObject.reservations` while it is in use.
- **Duration** (action minutes). One of `instant`, `fixed`, `between` (drawn when it starts), `untilNeed` (with optional `chunkMinutes`: sleep and naps run in 60-minute chunks that each count as done), or `activity` (hands over to a minigame).
- **Auto-fetch.** `autoFetch` lists the steps the sim prepends inside the same queue entry when a `carrying` or `musicPlaying` requirement fails (`mug.drink` fetches `kettle.make_coffee`).
- **Animation keys.** `anims` per actor kind (`approach`, `loop`, `end`), resolved as `${sprite.base}.${anim}`.
- **Requirements.** `requires: { when: Condition; reason: StringKey }[]`. A failing entry greys out the petal and its `reason` is the text (`ui.reason.<ReasonCode>` generic, `int.<id>.why.<n>` specific). `visibleIf` hides the petal entirely. A dispatch that is refused returns a `StringKey` reason from the same families or `build.err.*`.
- **Rules.** `autonomous` (free will and cat AI may pick it), `cooldownMinutes`, `interruptible`, `repeatExempt`, `recencyExempt`, a start `cue`, an `unlock` condition, `skill` (what an activity interaction trains), and `mvp`.

**Scorer** (sim-dev; cats plug in through `AiHooks`):

```
score = max(0, needTerm − costTerm + careTerm) × P_tag × B × 1/(1 + d/D0) × noise × recency × urgency × Q
```

(sim.md §5.1. `P_tag` is `ai.ellieTagWeights` for Ellie and `CatDef.tagWeights` for cats; `D0` is `ai.distanceD0`.)

The scorer picks a weighted choice among the top `ai.topK`, using `state.rng`. `AiHooks.personality` returns a multiplier per candidate, `candidates` adds extra choices (follow Ellie, a sunbeam tile), and `allow` vetoes a candidate.

**Example:**

```ts
{ id: asInteractionId('sofa.sit'), label: intKey('sofa.sit'), icon: interactionIconKey('sit'), target: 'object',
  actors: [{ kind: 'ellie' }, { kind: 'anyCat' }], tags: ['sit', 'nap'], posture: 'sit',
  adverts: [{ for: { kind: 'ellie' }, needs: { energy: 5, calm: 5 } }, { for: { kind: 'anyCat' }, needs: { nap: 10 } }],
  slotKinds: ['sit'], duration: { kind: 'fixed', minutes: 30 }, perHour: { energy: 6 },
  anims: { ellie: { loop: 'sit' }, cat: { loop: 'lie' } },
  requires: [], effects: [{ kind: 'stat', stat: statInteraction('sofa.sit'), delta: 1 }], autonomous: true, mvp: true }
```

A complete example `ContentDb` lives in `tests/unit/core/fixtures.ts` (`makeFixtureContent()`). Import it in your unit tests until the real data lands.

## 7. Conditions and effects

There is one evaluator (in sim) for every `Condition`. Conditions are used by interaction requirements, wish `offerIf` and `goal`, aspiration tiers, stickers, unlocks, mail `sendIf`, decay modifiers and the housewarming trigger. Kinds:

- **Logic:** `always`, `never`, `not`, `all`, `any`
- **Time:** `timeBetween`, `phase`, `weekday`, `dayAtLeast`
- **Actors:** `actorIs`, `need`, `mood`/`moodBelow`, `bond`, `carrying`, `asleep`, `catNear`, `catState` (a cat seen in a `CatObservedState`, or `near`, for some minutes), `inRoom`, `wearing`, `skill`, `doing` (current interaction tag), `posture`, `buff`
- **World:** `objectFlag`, `targetHasTag`, `musicPlaying`, `placed`, `setBonus`, `setBonusCount`, `cosy`, `roomsCosy`, `weather`
- **Progression:** `flag`, `stat` (scope `ever` or `today`), `recordAtMost`, `recordAtLeast` (read `records.best`; lower is better for times), `hearts`, `heartsEarned`, `owns`, `ownedCount`, `unlocked`, `aspirationTier`, `sticker`, `wishesDone`, `onboardingDone`

`Who` names whose values a condition or effect reads: `actor`, `target`, `ellie`, a cat, `allCats` or `catsInRoom`.

There is also one interpreter for every `Effect`: `need`, `bond`, `hearts` (with a reason, optionally scaled by mood), `feeling`, `buff`, `carry`, `objectFlag`, `flag`, `stat`, `record` (better is `higher` or `lower`), `skillXp` (a `SkillId`), `unlock`, `grantItem`, `trinkets`, `sticker`, `mail`, `spawn`, `removeTarget`, `startActivity`, `cue`, `say`, `thought`, `particles`, `chance` and `when`. Rewards for wishes, aspirations, stickers and mail, and activity results, are all `Effect[]`.

**Progress.** Each `ProgressEvent { kind, subject?, n }` adds to `stats[kind]` and `stats[kind + '.' + subject]`, and to `statsToday` as well. Wishes and stickers then say things like `{ kind: 'stat', stat: STAT.salemBoxSits, atLeast: 50 }` (`boxSat.salem`). Interactions record `interaction.<id>` automatically.

**Names and who writes what (F20).** Every shared counter, flag and record name is a constant or builder in `src/core/stats.ts`; play.md's one-word names (`racesCompleted`, `salemBoxSits`, `bruceOnWall`) are void and the specs' wish and sticker rows map onto these.

| Name | Written by | When |
| --- | --- | --- |
| `interaction.<id>`, `interaction` | sim | an interaction completes |
| `<kind>`, `<kind>.<subject>` for every `ProgressKind` (`boxSat.salem`, `race.gold`, `pb.skiErg`, `photo.<tag>`) | sim, from `ProgressEvent`s | the producer below emits the event |
| `boxSat.salem` | cat AI emits `boxSat` | Salem enters a box (each new sit) |
| `race` | activities (race) via `ActivityResult.progress` | a race finishes, subject is the medal |
| `dunk.perfect`, `ritual.done`, `sushi.made`, `sushi.fishDenied`, `dance.count`, `headbang.count`, `record.minutes`, `star.gaze`, `star.wish`, `read.minutes` | the activity or interaction named, via `ProgressEvent.stat` or `Effect.stat` | on completion |
| `sleep.nights`, `sleep.catsOnBed` | sim | wake-up, and the 03:00 check of cats on her bed |
| `shadow.lapMinutes` | cat AI | while Shadow is on her lap |
| `catState.<cat>.<state>` (minutes today) | sim `catState` tracker | each tick the cat is seen in that state |
| `coffee.lastTick` | sim | a coffee finishes (the race `coffee` bonus reads it) |
| `wish.fullSets` | sim | all three wishes done in a day |
| records `race.totalMs`, `race.splitMs.<station>`, `train.points.<station>`, `sushi.best` | sim, from `ActivityResult` and `Effect.record` | a result that `canSetPb` improves it (also mirrored into `records.hyrox`) |
| flags `bruce.onWall`, `george.knighted`, `housewarming.held`, `quirk.<id>`, `secret.<id>`, `known.<cat>.*` | sim and cat AI | when the thing happens |

## 8. Items, catalog, placement, paint

- **`ItemDef`** (home.md §4.4): `category`, `styles: StyleTag[]` (`goth`, `cottage`, `neon`, `gym`, `cat`, `plant`, `retro`: home.md's capitalised names in lower case), free `tags` (function tags like `perch`, `box`, `light`, `solitude`, and `room.<RoomKind>` for the catalog room filter), `price` (the home.md base price), optional `valueOverride`, optional `fixture`, and `placement` (home.md §1.1 codes). The footprint is given at rotation 0, and `rotations` lists the allowed ones (home.md orientations `4`, `2`, `1` are `[0,1,2,3]`, `[0,1]`, `[0]`: `rotationsFor`). Rotation 0 faces down (south), 1 left, 2 up, 3 right. Sprite keys are derived, not listed (below). It also has `states` (which of `on`, `open`, `full`, `overhead` exist), `blocksPath`, `topLayer` (what cats can jump onto), `slots`, `surfaceSlots` (home.md "slots" column), `interactions` (sim.md ids), `light`, initial `flags`, `unlock` (an `UnlockCode`), `unlockHint`, `maxCopies`, `hidden` (not in the catalog: fixtures), `uncounted` (left out of completion and R(d)) and `mvp`. Fixtures use `unlock: 'fixture'`, `hidden` and `fixture: true`; they can be moved and rotated but not sold, stored, duplicated or bought, and keep their real mount (the `fixed` placement error means "cannot be sold or stored").
- **Unlock codes.** `start`, `fixture`, `day:N` (Pickle's new stock), `asp.<key>.<tier>` (home.md `asp:homemaker:3` is `asp.home.3`), `bond:<cat>:<level>`, `poe:N` (trinkets), `secret:<id>` (flag `secret.<id>`). Unlocking makes an item buyable and gives no copy, except `poe:` and `secret:`, which arrive as a free first copy (`unlockGivesFreeCopy`). Aspiration gifts, sticker gifts and housewarming gifts are `grantItem` effects, which always give free copies.
- **Prices and refunds.** Shop price is `priceOf(item.price, ECONOMY)`: base × `priceScale`, to the nearest `priceStep` (5), at least 5, and 0 stays 0. A bought copy refunds its shop price in full. A free copy (`PlaceableC.origin === 'free'`, or `inventory.storedFree`) shows "Put away" and never refunds. Placing from storage uses free copies first.
- **Wall items** hang on a back-wall run of `footprint.w` tiles. **Surface items** sit in a parent's `surfaceSlots` (`MountRef.surface` holds the parent entity and slot index). **Window items** sit in a window tile. `mountOf(placement)` gives the `Mount`. Moving a host moves its surface children with it; selling or storing a host sends its children to `inventory.stored` or `storedFree`, keeping their origin, so `MountRef.surface.parent` never dangles (F12; the world tests it).
- **`PlacementRequest`** holds the item, tile, rotation, mount, and an optional `moving` entity and a `source` (`stored` or `buy`: `check` reports `notOwned` and `cannotAfford` only when it is set). `World.check` returns `PlacementCheck`, either `{ ok: true, tiles }` or `{ ok: false, reason: PlacementError, tiles }`. The reasons cover bounds, blocking, door and path connectivity, wall or surface needs, rotation, ownership and affordability.
- **Paint.** `PaintDef` is per surface (`wall` or `floor`) with a `variant` (`plain`, `stripes`, `checks`, `wood`, `tiles`, `wallpaper`, `hex`, `flags`, `brick`, `herringbone`, `carpet`, `rubber`, `band`), colours, a `template` sprite (`pattern.<surface>.<variant>` shared and recoloured, or `paint.<paintId>` one-off), a footstep `sound`, an `UnlockCode` unlock (the same mechanism as items), price and cosy. Each room stores its `wallPaint` and `floorPaint`.
- **Set bonuses.** `SetBonusDef.requires` lists style, tag or item counts in one room, and gives a bonus to `cosy`.
- **Cosy readings.** Each `RoomState` holds `cosyRated` (Build meter, milestones, housewarming) and `cosyLive` (real time and lights, cats, mess: Ellie's Cosy need). Only `scored` rooms count; Home Cosy is the `area`-weighted mean of `cosyRated`.
- **Item sprites (F14, FROZEN 21).** `itemSpriteKey(item, rotation, flags, has?)` gives `item.<ItemId>`, plus `.r1` (left view; rotation 3 is `.r1` flipped) or `.r2` (back), then `.on`, `.open` or `.full` when that flag is true and the item has the state; `.overhead` is a companion drawn on the overhead layer. Rotation comes before state (`item.record_player.r1.on`). `itemSpriteKeys(item)` lists every key an item needs; `validateContent(db, { sprites })` checks them.
- **Catalog.** `CatalogCategoryDef` groups `ItemCategory`s under a label and an icon. Locked items show their `unlockHint`.

## 9. World (build-mode-dev)

`WorldQueries` (read-only; also injected into the sim and engine) plus the rest of `World` and one `SimPlugin`:

- `createLot()`: builds `LotState` from `content.lot`, finding rooms by flood fill from `RoomDef.seed`.
- `check`, `footprintTiles`, `slotPose`, `roomAt`.
- `cosy(state, room, reading = 'rated')`: returns a `CosyReport` with the score 0..100, `parts` per `CosyFactor`, `sets`, and the top 2 `hints`.
- `navGrid(state)`: per-layer costs (0 blocked, 1 normal, above 1 slower) plus cat `jumps`. It is cached by `lot.revision`.
- `sunbeams(state)`: the world computes them (sim.md 11: left, back and right windows, 06:30 to 19:00, `WindowDef.facing` is outward, south windows cast nothing), from `lot.windows`, `tuning.sun` and the time, so it is deterministic. The engine only draws the beams; Peaches seeks them.
- `plugin()`: handles `build.place`, `build.move`, `build.sell`, `build.store` and `build.paint`, spawns the start placements on a new game, refreshes `cosyRated` on `world.changed` and `cosyLive` every 20 ticks in `triggers`, bumps `lot.revision`, and emits the `world.changed` sim event. It owns `build.*` only: `catalog.order`, the Order lifecycle, box spawn, the `delivery` event and Pickle's visit belong to the sim core, and the cats only animate Pickle from `visitors.pickle.visit` (F31, see 13).

Build mode keeps its own undo/redo history (up to `LIMITS.buildUndo` steps) and replays it as these actions. It follows `mode.changed` (the UI dispatches `mode.set`). When it closes, the world plugin writes `SimState.lastBuild { closedTick, added, moved, removed, painted }` (the cats read that in a system) and the app also emits `build.closed` on the bus.

## 10. Needs, mood, bond

- **Ellie** has `energy`, `hunger`, `fun`, `fitness`, `calm` and `cosy`. Cosy does not decay: it is the current room's score.
- **Cats** share `food`, `play`, `affection` and `nap`, plus one personality need each: George `royalty`, Salem `chaos`, Shadow `solitude`, Peaches `vibes` (`PERSONALITY_NEED`).
- **`NeedSpec`** (per need, in `SimTuning.needs`): `start`, `decayPerHour`, `modifiers` (each a `Condition` with a multiplier or an added amount per hour), `lowAt`, the response `curve` and the scorer `gain`.
- **Floors.** `NEED_FLOORS`: Fitness 20, every cat need 10, the rest 0. Use `clampNeed`; nothing pushes a need below its floor.
- **Mood** is sim.md §3.1: weighted needs, pulled toward the lowest daily need, plus active moodlets (`Feeling`s, positive only, sum capped by `mood.moodletCap`, at most `LIMITS.moodlets`). `moodStepOf(mood)` gives the step 0..5 and `heartsMultiplierOf(mood)` the stepped multiplier (×0.8, 0.9, 1.0, 1.15, 1.3, 1.5). `moodBandOf(mood)` gives the display band (`mopey` to `great`). `mood.walk` slows Ellie when she is low. Nothing else ever happens at low needs.
- **Bond** runs 0..100. `bondLevelOf(value, tuning.bond.thresholds)` gives the level, 0..4, and levels never drop. Daily soft cap and the over-handling loss are in `tuning.bond`, today's totals in `state.daily`. `CatDef.bondRate` lets Shadow warm up slowly.

## 11. Wishes, aspirations, Hearts, mail, stickers

- **Wishes.** When Ellie first wakes after `wishes.earliestMinute` (or at `rollMinute` if she is already up), `perDay` wishes are drawn from those whose `offerIf` holds and that can still be finished today. Weights: `weight`, x`unseenWeight` if the category was not offered in `unseenDays`, x`neverDoneWeight` if never completed, 0 within `cooldownDays` of `lastDone`; at most `perCategory` per category and `maxCatWishes` cat wishes (`WishCategory`). A wish with a delta goal stores its `baseline` at the roll. There is no swap (FROZEN 26). A wish completes when its `goal` holds (counting `statsToday` since the roll). It then pays `ECONOMY.wishHearts[size]` (mood-scaled; Hearts come only from there) and its `rewards` (non-Hearts: the +8 for 90 minutes mood boost) and emits `wish.completed`.
- **Aspirations.** Ids are `ASPIRATION_IDS` (`asp.hyrox`, `asp.royalty`, `asp.home`, `asp.collect`). Each has 4 `tiers` (`AspirationTierDef`), each with a `goal`, non-Hearts `rewards`, an optional free `gift` item and a title key `asp.<key>.tier.<n>` (goal text `.goal`). `aspirations.tiers[id]` holds the number of tiers done. A tier's id `asp.<key>.<n>` is also the unlock code for its items.
- **Hearts** are earned through `hearts` effects with a `HeartsReason`, plus the sources the sim pays straight from `ECONOMY` (trickle, minigames, bond level-ups, aspiration tiers). Mood-scaled sources (wishes, races, minigames, the trickle: FROZEN 1) use `scaleHearts(base, mood)`; the rest are flat. Every earning adds to `hearts.earnedTotal`; refunds do not. Spending happens in `catalog.order` and `build.place` (`source: 'buy'`). Selling a bought copy refunds its price in full.
- **Mail.** `MailDef.sendIf` is checked each morning, and a mail goes out at most once unless it is `repeatable`. Attachments are `Effect[]`, claimed on read. Personal mail comes from `PERSONAL.mail` by the player's local date (`localDate(clock.wallNow())`), keyed by `PersonalMail.id`: it is stored as `MailRef { kind: 'personal', id }` with a text `snapshot` taken at delivery, so editing or deleting letters later never changes one she has and is literal text, not string keys.
- **Stickers and secrets.** `StickerDef.goal` is a `Condition`, and `secret: true` shows "???" until the sticker is earned. Bruce's sightings are counted per `LotSpot` in `visitors.bruceSpotted`.
- **Onboarding** is a list of `OnboardingStepDef`, each with a speaker, lines, an optional `waitFor` condition and a highlight. A step can carry a `hint` after `hintAfterSec` (20) and a Next button after `nextAfterSec` (60). It is driven by `onboarding.next` and `onboarding.skip`; the tour does not stop the clock.
- **Housewarming** triggers when `tuning.housewarming.unlockIf` holds. Its status runs from `locked` to `ready`; the action `housewarming.rsvp { tonight }` (letter button or journal) sets `housewarming.day` to today for `tonight: true`, and the party runs from 18:30 to `happening` and `done`.

## 12. Activities (minigames)

```ts
interface Activity {
  id; start(ctx: ActivityContext); update(dtMs); render(ctx2d); onInput(input: ActivityInput);
  canSkip(): boolean;          // true after two misses
  skip(): void;                // ends now, counts as a pass
  result(): ActivityResult | null;
}
```

- **Context.** `ActivityContext` gives a private `rng` (`createRng(session.rngSeed)`: deterministic, and `state.rng` is never touched), `params`, a read-only `state`, `content`, the `actor`, `strings`, `sprites` (null in tests), and the `cue`, `say`, `particles` (canvas pixels) and `event` (a reaction event such as `ev.ball_loose`, forwarded as the `activity.event` action) callbacks. The state is `DeepReadonly`.
- **Input.** `ActivityInput` is semantic: `button` (`primary`, `secondary`, `up`, `down`, `left`, `right`, `cancel`) plus `pointer` and `pointerMove` in logical canvas pixels. The engine maps keys, clicks and taps onto it.
- **Result.** `ActivityResult` holds `completed`, `skipped`, `auto`, `score` 0..1, `misses`, `grade`, `timeMs`, `skill`, `details` (race: `stationScores`, `splitsMs`) and `effects: ResultEffect[]` (only `skillXp`, `record`, `stat`, `feeling`, `flag`; need effects, Hearts and XP come from `InteractionDef.effects`, `ECONOMY.minigame` and `ECONOMY.skillXp`, so a played run and a free-will auto-play award the same), `progress: ProgressEvent[]`, and an optional `save` (stored in `activitySaves[id]`). The sim applies it when it receives `activity.finish`: `resultScore(r)` (PASS_SCORE 0.5 when skipped) drives Hearts, XP, race time and wishes; `needFactor(r)` (0.8 skipped, 1.0 auto, else 0.8 + 0.4 s) scales positive need and Fitness effects; `canSetPb(r)` guards records.
- **Registration.** `ActivityDef { id, title, instructions, family, create(params) }` is registered with `registerActivity`. An interaction with `duration.kind === 'activity'` triggers the `activity.request` sim event.

## 13. Player actions and dispatch

`dispatch(action: PlayerAction): DispatchResult` returns `{ ok: true }` or `{ ok: false, reason }`, where `reason` is always a `StringKey` (`ui.reason.<ReasonCode>` from `keys.ts` or `build.err.<PlacementError>`) so raw English can never leave the sim; the UI toasts it gently. The actions:

- **Live:** `walkTo`, `interact`, `queue.cancel` (by action id), `time.setSpeed` (non-zero also sets `lastSpeed`; panels that soft-pause send 0), `time.togglePause`, `mode.set`, `options.set`
- **Build:** `build.place` (`source: 'stored' | 'buy'`), `build.move`, `build.sell`, `build.store`, `build.paint`, `catalog.order`
- **Activities:** `activity.finish`, `activity.event` (a mid-play reaction event for the cats)
- **Journal and the rest:** `wardrobe.wear`, `wardrobe.streak`, `mail.collect`, `mail.read`, `photo.save`, `photo.delete`, `title.set`, `trade.accept`, `onboarding.next`, `onboarding.skip`, `housewarming.rsvp { tonight }`
- **Debug** (only with `createSim({ debug: true })`, used by tests and `?test=1`): `debug.setNeed`, `debug.addHearts`, `debug.setTime`, `debug.unlockAll`, `debug.setBond`

**Ownership (F31).** The sim core owns `catalog.order`, the order lifecycle (Pickle's 30-minute delivery, or instant in Build mode), box spawn, the `delivery` event and the Pickle visit's timing; the cats plugin animates Pickle from `visitors.pickle.visit`; the world plugin owns `build.*` only. The core sim handles the actions it owns. Plugins handle the rest through `SimPlugin.actions` (for example, `world.plugin()` handles `build.*`). The app emits `action.dispatched` on the bus.

## 14. Events

There are two layers:

1. **`SimEvent`** is pure data from `sim.onEvent`: `cue`, `say`, `thought`, `emote`, `particles`, `toast`, `hearts`, `progress`, `interaction.start`/`interaction.end`, `activity.request`, `wish.rolled`/`wish.completed`, `aspiration.tier`, `sticker`, `unlock`, `mail.arrived`, `reaction` (a cat-AI reaction event, `ev.*`), `delivery`, `mood.band` (sim.md `moodBandChanged`, with `band` and `step`), `bond.level` (sim.md `bondLevelUp`), `visitor.arrived`/`visitor.left`, `bruce.spotted`, `quirk`, `request.started`/`request.ended`, `time.hour`/`time.day`, `mode`, `world.changed`, `onboarding.step`, `housewarming`.
2. **`EpEvents`** is the app bus (`createEventBus<EpEvents>()`). It carries:
   - `sim.event`
   - `world.changed` (`WorldChanged`: reason, revision, rooms, entities)
   - `build.opened`, `build.closed`
   - `mode.changed`
   - `audio.cue`, `music.context`
   - `action.dispatched`
   - `input.click`, `input.hover`, `input.drag`, `input.wheel` (`PointerInfo` with screen, world, tile, entity, button, mods) and `input.key` (a semantic `KeyAction`)
   - `ui.toast`, `ui.panel`, `ui.menu`
   - `activity.started`, `activity.ended`
   - `settings.changed`, `save.result`, `app.visibility`, `photo.captured`
   - `app.request` and `photo.request` (UI to app)
   - `activity.skippable` (app to UI), `activity.skip` and `activity.leave` (UI to app)

Autosave listens for `sim.event` `time.hour`, `mode.changed` and `app.visibility`.

**Delivery rules (F6).** A system's `ctx.emit` buffers and `Sim.step` flushes after the last system, so listeners never see a half-finished tick. The bus calls handlers in subscription order, skips one unsubscribed during the emit, and reports a throwing handler (`EventBusOptions.onError`, default `console.error`) without stopping the rest. Particle positions: `SimEvent.particles.at` is in tiles; `ActivityContext.particles` and `ParticleApi.emit` are in logical canvas pixels (480 x 270); the engine converts.

## 15. UI

`createUi(deps)` returns `Ui`:

- `update(state, dtMs)` and `setScale(scale)`
- `open(panel, { tab })`, `close`, `isOpen`
- `toast(ToastSpec)`
- `showMenu(InteractionMenuSpec)` and `hideMenu()`. The menu's options come from `sim.menuFor(target, tile)` as `MenuOption[]`.
- `kit`, `region(id)` (UI-owned frames `buildTop`, `buildBar`, `catalog` that build-mode-dev fills) and `destroy`
- `UiDeps.loadPhoto(meta)` returns an album PNG data URL or null

`PanelId` and `JournalTab` list the panels and journal tabs. The `UiKit` (`panel`, `button`, `tabs`, `slider`, `toggle`, `card`, `meter`, `tooltip`) returns `UiComponent`s with `el` and `destroy()`, and build-mode-dev builds the catalog with it. All text arrives as a `StringKey` plus optional `StringVars`.

## 16. Audio

`AudioCue` is the shared union: simple cue names (UI, mode, build including `build.wall` and `build.floor`, home things, gym and race including `race.horn`, cats, visitors), plus cues with a payload: `meow`, `purr`, `mrrp`, `chirp`, `huff` (each with a `Meower`), `blip` (`BlipVoice`), `step` (`FloorSound`), `gym.stroke` (`GymSound`: a `HyroxStation`, `treadmill` or `kettlebell`), `gym.hit` (`HitGrade`) and `race.crowd` (intensity). `src/audio` keeps its own local `Cue` union, which must stay a superset of `AudioCue`, and maps the core names onto it. `MusicContext` (mode, activity, room, phase, radio, weather, race day, housewarming) drives the music state machine; build it with `musicContextOf(state, { title })` in `src/core/music.ts` (`raceDay` is true only while the race activity runs, never merely on a Saturday). `AudioApi` provides `unlock()` (on the first gesture), `play`, `setMusic`, `duck`, `applySettings`, `levels` and `dispose`.

## 17. Strings

Each domain file in `src/content/strings/` exports a `Record<string, string>` with dotted keys, such as `cat.george.idle.01`. The index merges them with `mergeStringTables`, which throws on a duplicate key. `createStringLookup(STRINGS, { name, onMissing })` returns a `StringLookup` that fills `{name}`, `{cat}` and `{n}`. A missing key renders as `[key]` and is reported once. Code and data only ever hold `StringKey`s, and build them with the builders in `src/core/keys.ts` (`intKey`, `wishTitleKey`, `mailSubjectKey`, `itemNameKey`, `placementErrorKey`, `needNameKey`, `aspTierKey`, `reasonKey`, `moodKey`...): spellings per FROZEN 22, enum-keyed families listed in `ENUM_KEY_FAMILIES`, checked by `tests/unit/core/keyCoverage.test.ts` (a ratchet with an allowlist the writer empties) and, for table-keyed ones, by `validateContent(db, { strings })`. `{n}` is "any short value" (a number, or a word such as an item or aspiration name).

## 18. Sprites

- **Shapes.** `SpriteDef { key, grid, palette, anchor, frames?, dirs?, outline?, fps? }` and `ArtBatch { id, title, sprites }`, exported as `BATCH` from each `src/art/<batch>/index.ts`.
- **Keys.** Keys are dotted: `ellie.walk`, `cat.salem.idle`, `item.sofa_basic.r1.on`, `icon.need.energy`, `icon.int.sit`, `struct.wall.goth`, `struct.door.front`, `struct.window.sash`, `paint.<paintId>`, `pattern.floor.hex`; builders in `keys.ts`, item keys from `itemSpriteKey` (see 8). Actor animations resolve with `spriteFor(base, anim)`, and `spriteDirFor(facing)` gives the drawn direction plus `flipX` for left.
- **Atlas.** The engine compiles every batch into a `SpriteAtlas` with `has`, `frame(key, facing, timeMs)`, `frameCount`, `keys`, `draw` and `toDataUrl`, the last used for DOM icons.

## 19. Save

- **Keys.** The main save is `SAVE_KEY` (`ellies-place:save:v1`), the previous good save is `SAVE_BACKUP_KEY`, settings are `SETTINGS_KEY` (independent of any game), and photos are `PHOTO_KEY_PREFIX + id`. Photos also travel inside export and import: `exportFile(file, photos)` writes them into the JSON, `importText` returns them as a `PhotoBundle` for the app to store (QA's export-then-import into a fresh profile keeps every image). One cap, `LIMITS.photos` (100).
- **`SaveFile`.** `{ format: 'ellies-place', version: SAVE_VERSION, savedAtWallMs, build, state, settings }`.
- **Migrations.** `Migration { from, to, migrate(raw) }` steps live in `MIGRATIONS`. `migrate` takes the `SaveFile` root at `from` and returns it at `to` (single steps), bumping both `version` and `state.version`. Bump `SAVE_VERSION` and add a step for every breaking change to `SimState`; `migrationChainProblems(MIGRATIONS)` must be empty (tested). Additive fields need no step: `reconcileState` fills them from `createEmptySimState`.
- **`LoadResult`.** One of `none`, `ok`, `recovered` (from backup), `tooNew` (a newer build wrote it: never loaded, never overwritten), `corrupt` or `unavailable`. `ImportResult` validates (`validateSimState`), migrates and reconciles without replacing anything.
- **On load (F34).** `Sim.load` runs `reconcileState` (fill new fields, drop ids the content no longer has) then `normaliseLoadedState`: mode back to `live`, any activity session dropped and its action cancelled, a soft-paused speed restored from `lastSpeed`, fast-forward cleared. A `cutscene` resumes from `onboarding.step`. `getFile()` never returns an in-activity snapshot.
- **Never save a bug.** `makeFile` runs `findNonJson` first and returns null with a `save.result` error (`nonJson`) instead of writing NaN as `null`.
- **`SaveApi`.** `save` (refuses `tooNew`), `load`, `makeFile`, `collectPhotos`, `exportFile(file, photos)`, `importText`, `migrate`, `saveSettings`, `loadSettings`, `savePhoto`, `loadPhoto`, `deletePhoto` and `startAutosave(getFile)`. Every storage call sits in a `try/catch`, and `storage: null` means it plays without saving.

## 20. Test hooks

`window.__EP__: TestHooks` exists only when the URL has `?test=1`. It provides:

- `step(n)`: synchronous, exactly n ticks
- `setSpeed`
- `getState()`: a JSON deep copy (NaN and Infinity become `null` in it, so it cannot show them)
- `nonJson()`: `findNonJson` on the LIVE state; soak's "no NaN" invariant reads this
- `dispatch`
- `findEntity(EntityQuery)`
- `seed(n)`: a fresh game
- `frameStats()`: render and sim p50/p95, fps
- `hash()`
- `screenOf(entity)` and `screenOfTile(tile)`: CSS pixels, for Playwright clicks
- `ready()` and `version`

## 21. Shared helpers in `src/core`

| File | Exports |
| --- | --- |
| `rng.ts` | `createRng`, `cloneRng`, `nextU32`, `nextFloat`, `nextInt`, `chance`, `pick`, `forkRng` |
| `clock.ts` | `Clock`, `createManualClock`, `createSystemClock`, `localDate` |
| `events.ts` | `createEventBus<M>(opts?)`, `createEventQueue` |
| `strings.ts` | `formatString`, `mergeStringTables`, `createStringLookup` |
| `hash.ts` | `stableStringify`, `hashString`, `hashState`, `findNonJson` |
| `geometry.ts` | `rotateSize`, `rotateOffset`, `rotateFacing`, `nextRotation`, `footprintTiles`, `inBounds`, `tileIndex`, `tileFromIndex`, `tileCenter`, `tileOf`, `sameTile`, `octile`, `facingFromDelta`, `spriteDirFor`, `spriteFor` |
| `math.ts` | `clamp`, `clamp100`, `lerp`, `lerpRange`, `bondLevelOf`, `MOOD_BAND_FLOORS`, `moodBandOf`, `bandAtLeast`, `phaseAt`, `weekdayOf`, `minuteInRange`, `hourOf`, `clockText`, `effectiveSteps`, `darknessAt`, `minutesToTicks`, `timeAtTick` |
| `rules.ts` | `roundHalfUp`, `moodStepOf`, `heartsMultiplierOf`, `scaleHearts`, `trickleBase`, `needFloor`, `clampNeed`, `resultScore`, `needFactor`, `canSetPb`, `priceOf`, `parseUnlockCode`, `isUnlockCode`, `unlockGivesFreeCopy`, `secretFlag`, `rotationsFor`, `mountOf`, `knownFlag`, `isAutonomousSource`, `itemSpriteKey`, `itemSpriteKeys` |
| `content.ts`, `contentChecks.ts` | `buildContentIndex`, `validateContent(db, { sprites, strings, activities, complete })`, `walkCondition`, `walkEffect`, `REQUIRED_SPOTS` |
| `keys.ts` | key and sprite-key builders, `ENUM_KEY_FAMILIES`, `requiredEnumKeys`, runtime enum lists (`PLACEMENT_ERRORS`, `ITEM_CATEGORIES`, `COSY_FACTORS`, `JOURNAL_TABS`, `RADIO_STATIONS`, `REASON_CODES`) |
| `stats.ts` | `STAT`, `FLAG`, `RECORD`, `statInteraction`, `progressStats`, `statPhotoTag`, `statCatState`, `recordSplit`, `recordTrain` |
| `music.ts` | `musicContextOf`, `RACE_ACTIVITY_ID` |
| `validate.ts` | `validateSimState`, `fillMissing`, `reconcileState`, `migrationChainProblems` |
| `state.ts` | `createEmptySimState`, `emptyDaily`, `emptyLot`, `emptyComponentStore`, `componentKeys`, `allocEntity`, `getC`, `setC`, `hasC`, `removeC`, `removeEntity`, `entitiesWith`, `cloneState`, `normaliseLoadedState`, `notImplemented` |

Test helpers (not shipped): `tests/unit/core/fixtures.ts` (`makeFixtureContent`, `makeFixtureWorld`, `FIXTURE_START`) and `tests/unit/core/fakes.ts` (fake bus, world, sim, engine, ui, audio, memory storage with the final signatures). Import them; do not write your own.

## 22. Open points for the designers' specs

These are typed generically, so the specs can fill them in without a contract change:

- the numbers in `SimTuning` (every number a spec names has a typed home: `ai`, `cats`, `visitors`, `weather`, `bubbles`, `sun`, `clutter`, `wishes`; anything newer goes in `tuning.extra` until it earns a field, and its key is listed in the spec that adds it) and `EconomyTable`
- the items, paints and set bonuses
- the lot rows and legend
- the `LotSpot` positions
- the key bindings for `KeyAction`
- the music track choice per `MusicContext`
- the Hyrox time model, through `HyroxStationDef.worstSeconds` and `bestSeconds` and `ContentDb.race`

A spec that needs a new `Condition` or `Effect` kind, a component field, or a `SimState` field goes through `reports/contract-requests/<agent-id>.md` (FROZEN 35).
