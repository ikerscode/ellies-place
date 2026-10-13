# Module contracts

Owner: architect. The code is the source of truth: `src/core/types.ts` (types) and the helpers next to it in `src/core/`. This page explains them. If you need a change, write the exact diff in `CONTRACT_REQUEST.md` at the root of your branch.

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
| `src/core` | architect | types, `createRng`/`forkRng`, clocks, `createEventBus`, `buildContentIndex`, `createStringLookup`, `hashState`, geometry and maths helpers, `createEmptySimState`, entity store accessors |
| `src/content/data` | game-designer | `createContentDb(): ContentDb` |
| `src/content/strings` | writer | `STRINGS: StringTable` (merged domain tables) |
| `src/content/personal.ts` | writer | `PERSONAL: PersonalConfig` |
| `src/sim` | sim-dev | `createSim(opts: CreateSimOptions): Sim` |
| `src/sim/cats` | cat-ai-dev | `registerCats(sim: Sim): void` |
| `src/world` | build-mode-dev | `createWorld(content: ContentIndex): World` (its `plugin()` goes into `sim.use`) |
| `src/build` | build-mode-dev | `createBuild(deps: BuildDeps): BuildMode` |
| `src/engine` | engine-dev | `createEngine(opts: EngineOptions): Engine` |
| `src/ui` | ui-dev | `createUi(deps: UiDeps): Ui` |
| `src/audio` | audio-dev | `createAudio(deps: AudioDeps): AudioApi` |
| `src/save` | save-dev | `createSave(deps: SaveDeps): SaveApi`, `MIGRATIONS` |
| `src/activities` | activities-dev | `registerActivity(def: ActivityDef)`; each family exports `register<Family>()` |
| `src/art/<batch>` | pixel-artist | `BATCH: ArtBatch` |
| `src/testing` | qa-engineer | `installTestHooks(deps, location.search, window): TestHooks \| null` |
| `src/app`, `src/main.ts` | integrator | wiring only |

Every stub already has the final signature. Today the stubs throw `notImplemented(name)`, except the activity registry and `isTestMode`, which already work.

### Boot sequence (integrator)

1. `const db = createContentDb(); const content = buildContentIndex(db);` (this throws, listing every problem, if the content is inconsistent)
2. `const strings = createStringLookup(STRINGS, { name: PERSONAL.playerName })`
3. `const bus = createEventBus<EpEvents>(); const clock = createSystemClock();`
4. `const save = createSave({ storage: safeLocalStorage(), clock, bus })` and then `save.load()`
5. `const world = createWorld(content)`
6. `const sim = createSim({ content, seed, clock, state: loaded?.state, plugins: [world.plugin()] })`, then `registerCats(sim)`
7. `sim.onEvent((e) => bus.emit('sim.event', e))`. The app also re-emits the specific events: `cue` → `audio.cue`, `world.changed` → `world.changed`, and `toast` → `ui.toast`.
8. `const engine = createEngine({ canvas, clock, bus, content, sprites: [BASE.BATCH, ...], sim })`
9. `const ui = createUi({ root, bus, strings, dispatch: sim.dispatch, sim, content, settings, atlas: () => engine.atlas, worldToScreen: engine.camera.worldToScreen })`
10. `createBuild({ world, sim, bus, ui, engine, strings })`, `createAudio({ bus, settings })`, and each `register<Family>()` for the activities
11. `installTestHooks({ sim, engine, content }, location.search, window)`, `save.startAutosave(...)`, then `engine.start()`

When the sim emits `activity.request`, the app looks up the `ActivityDef`, calls `create(params)`, and calls `start(ctx)` with a `forkRng(state.rng, salt)` stream. It then runs `engine.setActivity(a)` and shows Skip once `canSkip()` is true. When `result()` is non-null, it dispatches `{ type: 'activity.finish', result }` and calls `engine.setActivity(null)`.

## 3. Time and the tick

- 20 ticks per second (`TICKS_PER_SECOND`). `SimTuning.time.minutesPerTick` is 0.05 at speed 1, so one game day takes 24 real minutes.
- Each fixed step, the engine calls `sim.step(sim.stepsPerTick())`. `stepsPerTick` is `speed × fastForward` in `live` mode, 1 in `cutscene` mode, and 0 in `build`, `photo` and `activity` modes (see `effectiveSteps`). While Ellie sleeps, the sim raises `time.fastForward` to `SimTuning.time.sleepFastForward`.
- `time.tick` is canonical. `day`, `minuteOfDay`, `weekday` and `phase` are derived from it and stored for convenience.
- In real-time mode (`time.realTime`), the time system sets the minute from `clock.wallNow()`. Determinism does not apply in that mode.

### System order

`SYSTEM_ORDER`: `time`, `needsDecay`, `aiDecide`, `actionExec`, `movement`, `triggers`, `progression`, `eventsOut`.

A `System` is `(ctx: SystemContext) => void`. It only mutates `ctx.state` and calls `ctx.emit`. Plugins add systems per phase, and these run after the core system of that phase in registration order. Actions dispatched between ticks are applied at the start of the next `step`, before `time`.

## 4. SimState

The full shape is in `types.ts`. Here is what each part holds:

| Field | Holds |
| --- | --- |
| `version`, `rng`, `time`, `mode`, `options.freeWill` | Core |
| `nextEntityId`, `nextActionId`, `components` | Entity store (section 5) |
| `lot` | Tiles, room per tile, rooms with paint and cached cosy, and `revision` |
| `environment` | Weather, what the record player is playing, stars tonight |
| `hearts` | Balance, earned, spent |
| `inventory` | Items stored but not placed, trinkets, pending orders |
| `unlocks` | Unlocked items, interactions, outfits, paints, titles and activities |
| `wishes` | Today's 3, the roll day, history |
| `aspirations` | Tiers done per aspiration, chosen title |
| `mail` | Inbox (capped), sent ids, personal mail sent, mailbox waiting count, scheduled |
| `stickers` | Earned sticker ids with the day earned (secrets are stickers with `secret: true`) |
| `records` | Hyrox skill, station PBs, race PB, races (capped), medals, plus generic `best` |
| `wardrobe` | What each of Ellie and the cats wears per slot, Ellie's streak colour |
| `album` | Photo metadata. The PNGs live in their own storage keys |
| `visitors` | Visit timers, counts, Bruce sightings per spot, Poe's offers |
| `onboarding`, `housewarming` | Story progress |
| `activity` | The `ActivitySession` in progress, or null |
| `stats`, `statsToday` | Counters for progress events and anything else (`int.makeCoffee`, `dunk.perfect`) |
| `flags` | Story booleans (`bruce.onWall`, `george.knighted`) |
| `activitySaves` | JSON blobs per activity (Critterbound party) |
| `log` | Recent notable lines for the journal (capped) |

`Settings` (volumes, text size, reduced motion, session count) are saved next to the state in `SaveFile`, not inside it, because they are not part of determinism. `createEmptySimState(seed, opts)` returns a valid skeleton with no entities. The sim's new-game setup builds on it.

## 5. Entities and components

`components` is one table per component, keyed by the stringified entity id. Use `allocEntity`, `getC`, `setC`, `hasC`, `removeC`, `removeEntity` and `entitiesWith`. Iteration is in ascending id order, which keeps it deterministic.

| Component | On | Notes |
| --- | --- | --- |
| `meta` | all | `kind` (`ellie`, `cat`, `visitor`, `item`, `box`, `mess`, `trinket`) and `name` |
| `position` | all | `pos` and `prev` in tile units (prev is for render interpolation), `layer` 0/1/2, `facing`, `room` |
| `motion` | actors | Path with layers, speed, `stuckTicks`, jump progress |
| `sprite` | all | Actors: `base` + `anim` resolved with `spriteFor(base, anim)`. Items: full key. Also `hidden` |
| `agent` | actors | Queue (Ellie holds 4, others 2), `current` `ActiveAction` with its phase, `carrying`, `idleTicks`, `asleep`, cooldowns, `lastPick` |
| `needs`, `mood` | Ellie, cats | Needs are 0..100. Mood is Ellie's only, with its band and `Feeling`s |
| `bond` | cats | Value 0..100 and level 0..4 |
| `bubble` | actors | Thought icon and speech line with expiry ticks, plus the speech cooldown |
| `cat` | cats | Quirk cooldowns, `following`, JSON `memory` (owned by `src/sim/cats`) |
| `visitor` | visitors | When they leave, which spot |
| `placeable`, `smartObject` | items | Tile, rotation, `MountRef`, placed tick; slot reservations and object `flags` (on, station...) |
| `carryable`, `light`, `box` | some items | `box.occupant` is the cat inside |

## 6. Interactions and smart objects

An item is a smart object when its `ItemDef` lists `interactions` and `slots`. An `InteractionDef` holds:

- **Who and on what.** `actors: ActorFilter[]`. `target` is one of `object`, `cat`, `ellie`, `self`, `tile` or `visitor`. `targetCats` is optional.
- **Advertisements.** `adverts[]` per actor filter. Each one gives the expected `NeedDeltas` over the whole interaction, plus an optional `bias`. The scorer reads these. What actually happens is set by `perHour`, `targetPerHour`, `onStart` and `effects`.
- **Slots.** `slots` lists slot kinds or ids on the target, in order of preference. `ItemDef.slots` gives each slot's offset at rotation 0, its facing, layer and allowed actors. `rotateOffset` and `rotateFacing` turn them with the item. A slot is reserved in `smartObject.reservations` while it is in use.
- **Duration.** One of `instant`, `fixed` minutes, `untilNeed` (sleep until energy is 95 or more, with a cap), or `activity` (hands over to a minigame).
- **Animation keys.** `anims` per actor kind (`approach`, `loop`, `end`), resolved as `${sprite.base}.${anim}`.
- **Requirements.** `requires: Condition[]`. A failing condition greys out the petal with a reason. `visibleIf` hides the petal entirely.
- **Rules.** `autonomous` (free will and cat AI may pick it), `cooldownMinutes`, `interruptible`, a start `cue`, an `unlock` condition, and `mvp`.

**Scorer** (sim-dev; cats plug in through `AiHooks`):

```
score = Σ_n curve_n(value_n) × gain_n × advertised_n × personality × bond × 1/(1 + falloff × distance) × noise
```

The scorer picks a weighted choice among the top `ai.topK`, using `state.rng`. `AiHooks.personality` returns a multiplier per candidate, `candidates` adds extra choices (follow Ellie, a sunbeam tile), and `allow` vetoes a candidate.

**Example:**

```ts
{ id: asInteractionId('sit'), label: key('int.sit'), target: 'object',
  actors: [{ kind: 'ellie' }, { kind: 'anyCat' }], tags: ['rest'],
  adverts: [{ for: { kind: 'ellie' }, needs: { energy: 5, calm: 5 } }, { for: { kind: 'anyCat' }, needs: { nap: 10 } }],
  slots: ['sit'], duration: { kind: 'fixed', minutes: 30 }, perHour: { energy: 6 },
  anims: { ellie: { loop: 'sit' }, cat: { loop: 'lie' } },
  requires: [], effects: [{ kind: 'stat', stat: 'int.sit', delta: 1 }], autonomous: true, mvp: true }
```

A complete example `ContentDb` lives in `tests/unit/core/fixtures.ts` (`makeFixtureContent()`). Import it in your unit tests until the real data lands.

## 7. Conditions and effects

There is one evaluator (in sim) for every `Condition`. Conditions are used by interaction requirements, wish `offerIf` and `goal`, aspiration tiers, stickers, unlocks, mail `sendIf`, decay modifiers and the housewarming trigger. Kinds:

- **Logic:** `always`, `never`, `not`, `all`, `any`
- **Time:** `timeBetween`, `phase`, `weekday`, `dayAtLeast`
- **Actors:** `actorIs`, `need`, `mood`/`moodBelow`, `bond`, `carrying`, `asleep`, `catNear`, `inRoom`, `wearing`, `skill`
- **World:** `objectFlag`, `targetHasTag`, `musicPlaying`, `placed`, `setBonus`, `cosy`, `weather`
- **Progression:** `flag`, `stat` (scope `ever` or `today`), `hearts`, `heartsEarned`, `owns`, `unlocked`, `aspirationTier`, `sticker`, `wishesDone`, `onboardingDone`

`Who` names whose values a condition or effect reads: `actor`, `target`, `ellie`, a cat, `allCats` or `catsInRoom`.

There is also one interpreter for every `Effect`: `need`, `bond`, `hearts` (with a reason, optionally scaled by mood), `feeling`, `carry`, `objectFlag`, `flag`, `stat`, `record` (better is `higher` or `lower`), `skillXp`, `unlock`, `grantItem`, `trinkets`, `sticker`, `mail`, `spawn`, `removeTarget`, `startActivity`, `cue`, `say`, `thought`, `particles`, `chance` and `when`. Rewards for wishes, aspirations, stickers and mail, and activity results, are all `Effect[]`.

**Progress.** Each `ProgressEvent { kind, subject?, n }` adds to `stats[kind]` and `stats[kind + '.' + subject]`, and to `statsToday` as well. Wishes and stickers then say things like `{ kind: 'stat', stat: 'boxSat.salem', atLeast: 50 }`. Interactions record `interaction.<id>` automatically.

## 8. Items, catalog, placement, paint

- **`ItemDef`:** `category`, `styles: StyleTag[]` (`goth`, `cottage`, `neon`, `gym`, `cat`, `plant`, `retro`), free `tags`, `price` (selling always refunds this in full), `cosy` value, and `mount` (`floor`, `rug`, `wall`, `surface`, `fixed`). The footprint is given at rotation 0, and the item lists its allowed `rotations`. Sprites are keyed per rotation, with `flipFor` reusing a mirrored one. It also has `blocksPath`, `topLayer` (what cats can jump onto), `slots`, `surfaceSlots` (where small decor sits), `light`, initial `flags`, `unlock` (a `Condition`), `unlockHint`, `hidden` and `mvp`.
- **Wall items** hang on a back-wall run of `footprint.w` tiles. **Surface items** sit in a parent's `surfaceSlots` (`MountRef.surface` holds the parent entity and slot index).
- **`PlacementRequest`** holds the item, tile, rotation, mount, and an optional `moving` entity. `World.check` returns `PlacementCheck`, either `{ ok: true, tiles }` or `{ ok: false, reason: PlacementError, tiles }`. The reasons cover bounds, blocking, door and path connectivity, wall or surface needs, rotation, ownership and affordability.
- **Paint.** `PaintDef` is per surface (`wall` or `floor`) with a pattern (`plain`, `stripes`, `checks`, `wood`, `tiles`, `wallpaper`), colours, styles, price and cosy. Each room stores its `wallPaint` and `floorPaint`.
- **Set bonuses.** `SetBonusDef.requires` lists style, tag or item counts in one room, and gives a bonus to `cosy`.
- **Catalog.** `CatalogCategoryDef` groups `ItemCategory`s under a label and an icon. Locked items show their `unlockHint`.

## 9. World (build-mode-dev)

`World` is pure queries over `SimState` plus one `SimPlugin`:

- `createLot()`: builds `LotState` from `content.lot`, finding rooms by flood fill from `RoomDef.seed`.
- `check`, `footprintTiles`, `slotPose`, `roomAt`.
- `cosy(state, room)`: returns a `CosyReport` with the score 0..100, `parts` per `CosyFactor`, `sets`, and the top 2 `hints`.
- `navGrid(state)`: per-layer costs (0 means blocked) plus cat `jumps`. It is cached by `lot.revision`.
- `sunbeams(state)`: computed from `lot.windows` and the time, so it is deterministic. The engine draws the beams and Peaches seeks them.
- `plugin()`: handles `build.place`, `build.move`, `build.sell`, `build.store` and `build.paint`, spawns the start placements on a new game, refreshes `room.cosy`, bumps `lot.revision`, and emits the `world.changed` sim event.

Build mode keeps its own undo/redo history (up to `LIMITS.buildUndo` steps) and replays it as these actions. When it closes, it emits `build.closed { added, moved, removed, painted }` on the bus, so the cats can react.

## 10. Needs, mood, bond

- **Ellie** has `energy`, `hunger`, `fun`, `fitness`, `calm` and `cosy`. Cosy does not decay: it is the current room's score.
- **Cats** share `food`, `play`, `affection` and `nap`, plus one personality need each: George `royalty`, Salem `chaos`, Shadow `solitude`, Peaches `vibes` (`PERSONALITY_NEED`).
- **`NeedSpec`** (per need, in `SimTuning.needs`): `start`, `decayPerHour`, `modifiers` (each a `Condition` with a multiplier or an added amount per hour), `lowAt`, the response `curve` and the scorer `gain`.
- **Mood** is the weighted mean of the needs plus active `Feeling`s. `moodBandOf` maps it onto `mopey`, `low`, `okay`, `good`, `great`. `lerpRange(tuning.mood.heartsMultiplier, mood)` gives the Hearts multiplier (×0.8 to ×1.5), and `walkMultiplier` slows Ellie when she is mopey. Nothing else ever happens at low needs.
- **Bond** runs 0..100. `bondLevelOf(value, tuning.bond.thresholds)` gives the level, 0..4. `CatDef.bondRate` lets Shadow warm up slowly.

## 11. Wishes, aspirations, Hearts, mail, stickers

- **Wishes.** At `wishes.rollMinute` each day, `perDay` wishes are drawn, weighted by `weight`, from those whose `offerIf` holds. A wish completes when its `goal` holds (counting `statsToday` since the roll). It then pays its `rewards` and emits `wish.completed`.
- **Aspirations.** Each has 4 `tiers` (`AspirationTierDef`), each with a `goal`, `rewards` and a title. `aspirations.tiers[id]` holds the number of tiers done.
- **Hearts** are earned through `hearts` effects with a `HeartsReason`. Those marked `moodScaled` use the mood multiplier. Spending happens in `catalog.order` and `build.place` (`source: 'buy'`). Selling refunds the full price.
- **Mail.** `MailDef.sendIf` is checked each morning, and a mail goes out at most once unless it is `repeatable`. Attachments are `Effect[]`, claimed on read. Personal mail comes from `PERSONAL.mail` by real date (`clock.wallNow()`) and is literal text, not string keys.
- **Stickers and secrets.** `StickerDef.goal` is a `Condition`, and `secret: true` shows "???" until the sticker is earned. Bruce's sightings are counted per `LotSpot` in `visitors.bruceSpotted`.
- **Onboarding** is a list of `OnboardingStepDef`, each with a speaker, lines, an optional `waitFor` condition and a highlight. It is driven by `onboarding.next` and `onboarding.skip`.
- **Housewarming** triggers when `tuning.housewarming.unlockIf` holds. Its status runs from `locked` to `ready`, `happening` and `done`.

## 12. Activities (minigames)

```ts
interface Activity {
  id; start(ctx: ActivityContext); update(dtMs); render(ctx2d); onInput(input: ActivityInput);
  canSkip(): boolean;          // true after two misses
  skip(): void;                // ends now, counts as a pass
  result(): ActivityResult | null;
}
```

- **Context.** `ActivityContext` gives a private `rng` (forked, so results are deterministic), `params`, a read-only `state`, `content`, the `actor`, `strings`, `sprites` (null in tests), and the `cue`, `say` and `particles` callbacks.
- **Input.** `ActivityInput` is semantic: `button` (`primary`, `secondary`, `up`, `down`, `left`, `right`, `cancel`) plus `pointer` and `pointerMove` in logical canvas pixels. The engine maps keys, clicks and taps onto it.
- **Result.** `ActivityResult` holds `completed`, `skipped`, `score` 0..1, `grade`, `timeMs`, `effects: Effect[]` (needs, `skillXp`, `record`, hearts, feelings, stats), `progress: ProgressEvent[]`, and an optional `save` (stored in `activitySaves[id]`). The sim applies it when it receives `activity.finish`.
- **Registration.** `ActivityDef { id, title, instructions, family, create(params) }` is registered with `registerActivity`. An interaction with `duration.kind === 'activity'` triggers the `activity.request` sim event.

## 13. Player actions and dispatch

`dispatch(action: PlayerAction): DispatchResult` returns `{ ok: true }` or `{ ok: false, reason }`. The UI may toast the reason when it is a `StringKey`. The actions:

- **Live:** `walkTo`, `interact`, `queue.cancel` (by action id), `time.setSpeed`, `time.togglePause`, `mode.set`, `options.set`
- **Build:** `build.place` (`source: 'stored' | 'buy'`), `build.move`, `build.sell`, `build.store`, `build.paint`, `catalog.order`
- **Activities:** `activity.finish`
- **Journal and the rest:** `wardrobe.wear`, `wardrobe.streak`, `mail.collect`, `mail.read`, `photo.save`, `photo.delete`, `title.set`, `trade.accept`, `onboarding.next`, `onboarding.skip`
- **Debug** (only with `createSim({ debug: true })`, used by tests and `?test=1`): `debug.setNeed`, `debug.addHearts`, `debug.setTime`, `debug.unlockAll`, `debug.setBond`

The core sim handles the actions it owns. Plugins handle the rest through `SimPlugin.actions` (for example, `world.plugin()` handles `build.*`). The app emits `action.dispatched` on the bus.

## 14. Events

There are two layers:

1. **`SimEvent`** is pure data from `sim.onEvent`: `cue`, `say`, `thought`, `emote`, `particles`, `toast`, `hearts`, `progress`, `interaction.start`/`interaction.end`, `activity.request`, `wish.rolled`/`wish.completed`, `aspiration.tier`, `sticker`, `unlock`, `mail.arrived`, `delivery`, `mood.band`, `bond.level`, `time.hour`/`time.day`, `mode`, `world.changed`, `onboarding.step`, `housewarming`.
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

Autosave listens for `sim.event` `time.hour`, `mode.changed` and `app.visibility`.

## 15. UI

`createUi(deps)` returns `Ui`:

- `update(state, dtMs)` and `setScale(scale)`
- `open(panel, { tab })`, `close`, `isOpen`
- `toast(ToastSpec)`
- `showMenu(InteractionMenuSpec)` and `hideMenu()`. The menu's options come from `sim.menuFor(target, tile)` as `MenuOption[]`.
- `kit` and `destroy`

`PanelId` and `JournalTab` list the panels and journal tabs. The `UiKit` (`panel`, `button`, `tabs`, `slider`, `toggle`, `card`, `meter`, `tooltip`) returns `UiComponent`s with `el` and `destroy()`, and build-mode-dev builds the catalog with it. All text arrives as a `StringKey` plus optional `StringVars`.

## 16. Audio

`AudioCue` is the shared union: simple cue names (UI, mode, build, home things, gym and race, cats, visitors), plus cues with a payload: `meow`, `purr`, `mrrp`, `chirp`, `huff` (each with a `Meower`), `blip` (`BlipVoice`), `step` (`FloorSound`), `gym.stroke` (`HyroxStation`), `gym.hit` (`HitGrade`) and `race.crowd` (intensity). `src/audio` keeps its own local `Cue` union, which must stay a superset of `AudioCue`, and maps the core names onto it. `MusicContext` (mode, activity, room, phase, radio, weather, race day, housewarming) drives the music state machine. `AudioApi` provides `unlock()` (on the first gesture), `play`, `setMusic`, `duck`, `applySettings`, `levels` and `dispose`.

## 17. Strings

Each domain file in `src/content/strings/` exports a `Record<string, string>` with dotted keys, such as `cat.george.idle.01`. The index merges them with `mergeStringTables`, which throws on a duplicate key. `createStringLookup(STRINGS, { name, onMissing })` returns a `StringLookup` that fills `{name}`, `{cat}` and `{n}`. A missing key renders as `[key]` and is reported once. Code and data only ever hold `StringKey`s.

## 18. Sprites

- **Shapes.** `SpriteDef { key, grid, palette, anchor, frames?, dirs?, outline?, fps? }` and `ArtBatch { id, title, sprites }`, exported as `BATCH` from each `src/art/<batch>/index.ts`.
- **Keys.** Keys are dotted: `ellie.walk`, `cat.salem.idle`, `item.sofa_small`, `icon.need.energy`. Actor animations resolve with `spriteFor(base, anim)`, and `spriteDirFor(facing)` gives the drawn direction plus `flipX` for left.
- **Atlas.** The engine compiles every batch into a `SpriteAtlas` with `has`, `frame(key, facing, timeMs)`, `frameCount`, `keys`, `draw` and `toDataUrl`, the last used for DOM icons.

## 19. Save

- **Keys.** The main save is `SAVE_KEY` (`ellies-place:save:v1`), the previous good save is `SAVE_BACKUP_KEY`, and photos are `PHOTO_KEY_PREFIX + id`.
- **`SaveFile`.** `{ format: 'ellies-place', version: SAVE_VERSION, savedAtWallMs, build, state, settings }`.
- **Migrations.** `Migration { from, to, migrate(raw) }` steps live in `MIGRATIONS`. Bump `SAVE_VERSION` and add a step for every breaking change to `SimState`.
- **`LoadResult`.** One of `none`, `ok`, `recovered` (from backup), `corrupt` or `unavailable`. `ImportResult` validates and migrates without replacing anything.
- **`SaveApi`.** `save`, `load`, `makeFile`, `exportFile`, `importText`, `migrate`, `savePhoto`, `loadPhoto`, `deletePhoto` and `startAutosave(getFile)`. Every storage call sits in a `try/catch`, and `storage: null` means it plays without saving.

## 20. Test hooks

`window.__EP__: TestHooks` exists only when the URL has `?test=1`. It provides:

- `step(n)`: synchronous, exactly n ticks
- `setSpeed`
- `getState()`: a JSON deep copy
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
| `clock.ts` | `Clock`, `createManualClock`, `createSystemClock` |
| `events.ts` | `createEventBus<M>()` |
| `strings.ts` | `formatString`, `mergeStringTables`, `createStringLookup` |
| `hash.ts` | `stableStringify`, `hashString`, `hashState`, `findNonJson` |
| `geometry.ts` | `rotateSize`, `rotateOffset`, `rotateFacing`, `nextRotation`, `footprintTiles`, `inBounds`, `tileIndex`, `tileFromIndex`, `tileCenter`, `tileOf`, `sameTile`, `octile`, `facingFromDelta`, `spriteDirFor`, `spriteFor` |
| `math.ts` | `clamp`, `clamp100`, `lerp`, `lerpRange`, `bondLevelOf`, `moodBandOf`, `bandAtLeast`, `phaseAt`, `weekdayOf`, `minuteInRange`, `hourOf`, `clockText`, `effectiveSteps` |
| `content.ts` | `buildContentIndex`, `validateContent` |
| `state.ts` | `createEmptySimState`, `emptyLot`, `emptyComponentStore`, `componentKeys`, `allocEntity`, `getC`, `setC`, `hasC`, `removeC`, `removeEntity`, `entitiesWith`, `cloneState`, `notImplemented` |

## 22. Open points for the designers' specs

These are typed generically, so the specs can fill them in without a contract change:

- the numbers in `SimTuning` (anything new goes in `tuning.extra` until it earns a field)
- the items, paints and set bonuses
- the lot rows and legend
- the `LotSpot` positions
- the key bindings for `KeyAction`
- the music track choice per `MusicContext`
- the Hyrox time model, through `HyroxStationDef.baseSeconds` and `skilledSeconds`

A spec that needs a new `Condition` or `Effect` kind, a component field, or a `SimState` field goes through `CONTRACT_REQUEST.md`.
