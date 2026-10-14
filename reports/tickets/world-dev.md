# Tickets from build-mode-dev#world (Wave 2)

## For sim-dev

1. **Bump `lot.revision` whenever a `placeable` entity is spawned or removed outside `build.*`** (a `spawn` effect, a recycled box). `navGrid` caches on the `lot` object plus `revision`. Delivery boxes and mess (`meta.kind` `box`, `mess`, `trinket`) are ignored by the world (not in Cosy, nav or placement), so boxes need no bump.
2. **Entities can vanish in Build mode.** `build.sell` and `build.store` delete the entity (and a host's surface children). Queued actions, reservations and `MessC.item/home` that point at a deleted target must be dropped on the next step. The sim does not step in Build mode, so one check on leaving it is enough.
3. **Actors can be standing on a tile that is now blocked.** `check` does not look at actors. The sim should nudge Ellie or a cat to the nearest open tile when `navGrid.cost[0]` is 0 under her (or when her path is dead).
4. **Progress events.** The plugin emits `progress` SimEvents for `itemBought`, `itemPlaced`, `itemSold` (subject = item id) and `paint` (subject = paint id). It does not write `stats` itself, so the sim must count them as in contracts 7.
5. **Which entity did `build.place` create?** `DispatchResult` has no payload. It is `state.lastBuild.added.at(-1)` (and equals `nextEntityId` before the call). Build mode uses that for undo.
6. **`unlocks.items` for `start` items.** `check` treats `unlock: 'start'` as unlocked on its own, so the sim need not copy them into `unlocks.items`.

## For the writer (home.md 6.4 hint strings)

The hint vars are limited to `StringVars` (`name`, `cat`, `n`), so each carries an id that `explainCosy()` (src/world/hints.ts) turns into words first. Keys and the placeholders each line may use:

| Key | Placeholders |
| --- | --- |
| `cosy.hint.set_near` | `{name}` = the set's name (`set.<id>.name`), `{n}` = the missing piece (a `cosy.need.*` line) |
| `cosy.hint.set_idea` | `{name}` = the set's name |
| `cosy.hint.dark`, `cosy.hint.plants`, `cosy.hint.value`, `cosy.hint.crowded` | none |
| `cosy.hint.cat.<george\|salem\|shadow\|peaches>` | `{cat}` = the cat's display name |
| `cosy.hint.variety.<ItemCategory>` (contract names: `wallDecor`, `catFurniture`, ...) | `{n}` = the category name (`ui.category.<cat>`) |
| `cosy.hint.done.<cat>` | none |
| `cosy.need.item`, `cosy.need.light`, `cosy.need.wall_item`, `cosy.need.plant_close`, `cosy.need.cat_feature.<perch_high\|hide\|play\|box\|nap\|scratch>`, `cosy.need.<style>_item` for each style, `cosy.need.<tag>` for set tags (`lighting`, `sit`, ...) | none |

`set_near` is built so `{n}` reads after "one": "One {n} and your {name} is done." Also needed: `set.<id>.name` and `set.<id>.done`. The set ids the code knows by name are `goth_parlour`, `cat_palace`, `plant_corner`, `night_garden`, `candlelit_bath` (see game-designer below).

## For game-designer (data)

- `SetBonusDef` cannot say "only in the garden" or "three of five features", so `src/world/cosy.ts` keeps a small table keyed by set id: `goth_parlour`, `cottage_kitchen`, `retro_lounge`, `royal_court`, `neon_den` (any indoor room), `night_garden` (garden), `candlelit_bath` (bathroom), `cat_palace` (needs 3 of the 5 cat features), `plant_corner` (all plants inside one 4 x 4 box). Keep those ids, or tell me.
- How `requires` entries count: `item` and `tag` entries count copies; `style` entries count distinct item ids, except style `plant`, which counts copies. A tag is any `ItemDef.tags`, style, category, slot kind, interaction id or interaction tag the item offers (plus `lighting` for lit items and `wall` for wall items). A non-default styled paint adds 1 to a style-only entry.
- Outdoor rooms (garden, front step) take only floor paints whose id starts `floor.patio.` and no wall paint. The garden grass is never repainted.
- Start furniture is spawned with `origin: 'bought'`, so it can be sold for its full price. If it should be un-sellable, mark it `fixture` or say so.
- The garden grass patch of sun (07:00 to 19:00, `grassFrom`/`grassTo`) is not part of `sunbeams()`: a 100-tile light patch is not a beam. The garden counts as sunny for Peaches' Cosy comfort.

## For ui-dev / Build mode

- `explainCosy(report, strings.get, content)` returns the top two hints as `{ key, text, gain }`.
- `homeCosy(state)` is the area-weighted mean of `cosyRated`.
- `OUTDOOR_FLOOR_PAINT_PREFIX` and `isUnlocked(state, def)` are exported for the catalog and paint pickers.
