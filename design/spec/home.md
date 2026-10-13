# Home spec: lot, rooms, furniture, catalog and Cosy

Owner: game-designer#home (Wave 1). Sources: `design/ELLIE.md`, `design/BRIEF.md` §3, 8, 9, 10, 18, 20, `design/TECH.md` (Display), `src/core/types.ts` (draft).

This spec gives exact numbers. Every player-facing word is a string key (`item.<id>.name`, `cosy.hint.*`, ...). The writer fills them in. Placeholders in comments are only there to show intent.

---

## 1. Conventions

| Thing | Rule | Why |
| --- | --- | --- |
| Tile | 16 × 16 px. `TilePos {tx, ty}`, origin top-left, `tx` 0..29 left to right, `ty` 0..16 top to bottom. | Matches TECH Display and `TilePos` in `types.ts`. |
| Compass | Screen up is **north**. The house front (front door) faces **south**; the back garden is on the **east** side. | Needed for window facing and sunbeams. |
| Screen fit | The lot is 30 × 17 tiles = 480 × 272 px. The logical canvas is 480 × 270, so the bottom 2 px of row 16 (hedge and front step) are cropped. Nothing interactive sits in those 2 px. | Keeps the brief's 30 × 17 lot on one screen. |
| Walls | Walls occupy whole tiles. **Back walls** (a wall tile whose south neighbour is room floor) are drawn as a full-height face and take wall items. Side walls and the front wall (row 15) are drawn as low cutaway strips and take no wall items. | Three-quarter view: you only see wall faces that point at the camera. |
| Rotation | `Rotation` 0 = facing down (south), 1 = facing left (west), 2 = facing up (north), 3 = facing right (east). The "front" of an item (where an actor stands or sits to use it) is the side it faces. | Matches the `Facing` order `down, up, left, right` art directions; side art is flipped for the other side. |
| Footprint | Written `w×h` for rotation 0. Rotations 1 and 3 swap w and h. The anchor is the top-left tile **after** rotation. | One rule for Build mode and data. |
| Orientations column | `4` = rotations 0..3 (art: down, up, side). `2` = rotations 0 and 1 only (art: down, side; used for symmetric things like rugs and mats). `1` = no rotation (round or wall-flat things). | Keeps the pixel-art budget down: 2-way and 1-way items need fewer frames. |
| Layers | `Layer` 0 floor, 1 surface, 2 perch (TECH). Rugs draw under layer 0 objects and stay walkable. | Cats jump to 1 and 2. |
| Room membership | A floor tile belongs to exactly one room (§2.2). Door, archway and wall tiles belong to no room. An item belongs to the room its anchor tile is in; a wall item belongs to the room on the south side of its wall tile. | Cosy is per room, so membership must be unambiguous. |

### 1.1 Placement codes

| Code | Where it may go |
| --- | --- |
| `floor` | Any walkable floor tile, indoor or garden. |
| `in` | Indoor floor only (bedroom, living, kitchen, bathroom, spare). |
| `out` | Garden floor only (grass or patio). |
| `rug` | Any floor tile, drawn under furniture, stays walkable. Max one rug per tile. |
| `wall` | A back-wall tile (§2.5), including the garden wall. `w×1` along the wall. Not on doors or windows. |
| `window` | A window tile only (any facing). |
| `surface` | One surface slot on a table, counter, shelf or unit (the host's `slots` column). |

A floor or `in` item may not block a door's inside tile, the archway tiles' neighbours, or the last walkable path between two doors. Build mode shows the tile red and refuses (it never deletes anything). Reason: Ellie and the cats must never get stuck (pillar 1).

---

## 2. The lot

### 2.1 Tile map (empty lot)

```
                11111111112222222222
      012345678901234567890123456789
ty 0  ###^^#####^#####^^###=========
ty 1  #bbbbbbb#tttt#ssssss#pggggggg|
ty 2  #bbbbbbb#tttt#ssssss>pggggggg|
ty 3  <bbbbbbb#tttt#ssssss#pggggggg|
ty 4  #bbbbbbb#tttt#ssssssDpggggggg|
ty 5  #bbbbbbb#tttt#ssssss#pggggggg|
ty 6  #bbbbbbb#tttt#ssssss#pggggggg|
ty 7  ####d#####d#####d####pggggggg|
ty 8  #llllllllll#kkkkkkkk#pggggggg|
ty 9  #llllllllll#kkkkkkkk>pggggggg|
ty10  <llllllllllakkkkkkkk#pggggggg|
ty11  <llllllllllakkkkkkkk#pggggggg|
ty12  #llllllllll#kkkkkkkkDpggggggg|
ty13  #llllllllll#kkkkkkkk#pggggggg|
ty14  #llllllllll#kkkkkkkk#pggggggg|
ty15  #####D#vv######vv####pggggggg|
ty16  hh.mooo..hhhhhhhhhhhh---------
```

**Legend**

| Char | Meaning | Walkable |
| --- | --- | --- |
| `#` | House wall (exterior or interior) | no |
| `^` `v` `>` `<` | Window, and the way it faces outward: `^` north, `v` south, `>` east, `<` west | no |
| `d` | Interior door (always open, no animation needed beyond a frame) | yes |
| `D` | Exterior door: front door (5,15), gym patio door (20,4), kitchen back door (20,12) | yes |
| `a` | Open archway between living room and kitchen-diner | yes |
| `b` | Bedroom floor | yes |
| `t` | Bathroom floor | yes |
| `s` | Spare room floor (future home gym) | yes |
| `l` | Living room floor | yes |
| `k` | Kitchen-diner floor | yes |
| `p` | Garden patio paving (part of the garden room) | yes |
| `g` | Garden grass | yes |
| `=` | Garden wall (brick, waist-high, takes wall items; Bruce's perch) | no |
| `\|` | Garden fence (east edge; Bruce's first spot) | no |
| `-` | Garden fence (south edge) | no |
| `o` | Front step | yes |
| `.` | Front path | yes |
| `m` | Mailbox (fixture item, see §3) | no |
| `h` | Front hedge | no |

Tile totals: 86 house wall, 14 window tiles (9 window openings, §2.4), 3 interior doors, 3 exterior doors, 2 archway tiles, 228 indoor floor, 120 garden floor, 33 fence and garden wall tiles, 6 walkable front tiles plus the mailbox, 14 hedge.

### 2.2 Rooms

| Room id | Name key | Floor tiles | Bounds (inclusive) | Default floor | Default walls | Cosy item target `T` | Plant target `P` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `bedroom` | `room.bedroom` | 42 | tx 1..7, ty 1..6 | `floor.carpet.plum` | `wall.plain.lavender` | 100 | 2 |
| `bathroom` | `room.bathroom` | 24 | tx 9..12, ty 1..6 | `floor.tiles.hex_white` | `wall.tiles.mint` | 60 | 1 |
| `spare` | `room.spare` | 36 | tx 14..19, ty 1..6 | `floor.plain.concrete` | `wall.plain.plaster` | 90 | 2 |
| `living` | `room.living` | 70 | tx 1..10, ty 8..14 | `floor.wood.oak` | `wall.plain.dusk` | 160 | 3 |
| `kitchen` | `room.kitchen` | 56 | tx 12..19, ty 8..14 | `floor.check.ink_cream` | `wall.tiles.cream` | 130 | 2 |
| `garden` | `room.garden` | 120 | patio tx 21, ty 1..15; grass tx 22..28, ty 1..15 | `floor.grass` + `floor.patio.stone` | `wall.garden.brick` | 150 | 5 |
| `front` | `room.front` | 6 | (2,16), (4..8,16) | `floor.patio.stone` | none | not scored | not scored |

Reasons:
- The spare room (36 tiles) fits all seven indoor Hyrox stations plus the mat with a 1-tile walkway (stations use 1 + 3 + 1 + 1 + 1 + 1 + 3 + 2 = 13 tiles, 36%), so the Home Gym set is reachable without moving the gym into the living room.
- The living room is the largest indoor room because the sofa, TV, record player and the cats' main hangout all live there.
- The kitchen-diner is 8 × 7 so the sushi counter run, fridge, table and cat bowls all fit with space for upgrades (range cooker, dining table).
- The garden is the biggest room (120 tiles) because the coffee-and-rusk ritual, stargazing, lanterns, the sled track and Bruce all happen there.
- `T` is roughly 2.2 × floor tiles indoors (lower for the big garden, where open grass is the point). See §6 for how `T` is used.

The front step is not a scored room. While Ellie is on it her Cosy need holds its last value. Reason: it's a 6-tile doorstep for mail and deliveries, and scoring it would only add a chore.

### 2.3 Doors

| Id | Tile | Connects | Notes |
| --- | --- | --- | --- |
| `door.bed_living` | (4,7) | bedroom (4,6) and living (4,8) | interior |
| `door.bath_living` | (10,7) | bathroom (10,6) and living (10,8) | interior |
| `door.spare_kitchen` | (16,7) | spare (16,6) and kitchen (16,8) | interior |
| `arch.living_kitchen` | (11,10), (11,11) | living (10,10..11) and kitchen (12,10..11) | 2-tile open arch, so the kitchen-diner reads as open plan |
| `door.front` | (5,15) | living (5,14) and front step (5,16) | Pickle knocks here; delivery boxes appear at (6,14) |
| `door.patio` | (20,4) | spare (19,4) and patio (21,4) | gym to garden, right beside the suggested sled track |
| `door.back` | (20,12) | kitchen (19,12) and patio (21,12) | coffee and rusk route: kettle, door, grass in under 10 tiles |

The "inside tile" of every door (listed in the Connects column) must stay walkable (see §1.1).

Reason for the back door position: the signature ritual (BRIEF §10.3) should feel effortless. From the kettle at (14,8) to the grass at (22,12) is 9 tiles of walking.

### 2.4 Windows and sunbeams

Nine window openings. Sunbeams are real floor light patches (TECH render layer 6). Peaches follows them.

| Id | Tiles | Wall | Faces | Room | Sunbeam hours |
| --- | --- | --- | --- | --- | --- |
| `win.bed_n` | (3,0), (4,0) | north, back wall | north | bedroom | none (soft daylight only) |
| `win.bed_w` | (0,3) | west, side | west | bedroom | 15:00 to 19:30 |
| `win.bath_n` | (10,0) | north, back wall | north | bathroom | none (frosted) |
| `win.spare_n` | (16,0), (17,0) | north, back wall | north | spare | none |
| `win.spare_e` | (20,2) | east, side | east | spare | 06:30 to 11:00 |
| `win.living_w` | (0,10), (0,11) | west, side | west | living | 15:00 to 19:30 |
| `win.living_s` | (7,15), (8,15) | south, front | south | living | 09:00 to 16:00 |
| `win.kitchen_e` | (20,9) | east, side | east | kitchen | 06:30 to 11:00 |
| `win.kitchen_s` | (15,15), (16,15) | south, front | south | kitchen | 09:00 to 16:00 |

Sun times are fixed every day: sunrise 06:30, sunset 19:30. There are no seasons. Reason: predictable for Peaches' routine and for a 10-minute session; seasons would add nothing she'd notice.

**Beam geometry.** For a beam with hours `start..end`, let `u = (t − start) / (end − start)` in 0..1, with `t` in game hours.

| Facing | Patch width (along the wall) | Depth into the room (tiles) | Lateral drift (tiles, along the wall) |
| --- | --- | --- | --- |
| South | window width | `round(2 + 3 × abs(2u − 1))`: 5 at the ends of the day, 2 at midday | `round(6u − 3)` in x: from 3 west to 3 east |
| East | window width | `round(5 − 4u)`: 5 at sunrise, 1 by 11:00 | `round(1 − 2u)` in y: from 1 south to 1 north |
| West | window width | `round(1 + 4u)`: 1 at 15:00, 5 by sunset | `round(2u − 1)` in y: from 1 north to 1 south |

- The patch starts at the floor tile just inside the window and extends away from it. It is clipped to that room's floor tiles. It never crosses walls, doors or the archway.
- **Intensity** ramps 0 to 1 over the first 30 game minutes and 1 to 0 over the last 30. A tile counts as "in a sunbeam" (for Peaches' Vibes and `cat_sunbathe`) while intensity ≥ 0.5.
- Rain (if the weather system has it) switches beams off.
- Example: at 12:30 the living room south beam has `u = 0.5`, depth 2, drift 0, so it covers (7..8, 13..14). At 15:30, `u = 0.93`, depth 5, drift +3, so it covers (10, 10..14): column 11 is wall, so the patch is clipped to 1 tile wide. Peaches walks from the middle of the rug toward the archway over the afternoon. That's the point.

Reason for the hour windows: east 06:30 to 11:00 and west 15:00 to 19:30 give a beam somewhere in the home from sunrise to sunset, with the long midday south beams in the two big rooms where Peaches is most visible.

### 2.5 Back walls (where wall items go)

| Room | Back-wall tiles that take wall items | Count |
| --- | --- | --- |
| bedroom | (1,0), (2,0), (5,0), (6,0), (7,0) | 5 |
| bathroom | (9,0), (11,0), (12,0) | 3 |
| spare | (14,0), (15,0), (18,0), (19,0) | 4 |
| living | (1,7), (2,7), (3,7), (5,7), (6,7), (7,7), (8,7), (9,7) | 8 |
| kitchen | (12,7), (13,7), (14,7), (15,7), (17,7), (18,7), (19,7) | 7 |
| garden | garden wall (21,0) to (28,0) | 8 |

`(29,0)` is the wall-fence corner post and takes nothing. Wall items wider than 1 need that many adjacent free back-wall tiles in the same room.

`window` items (curtain-like and the cat window perch) go on the 14 window tiles listed in §2.4, one per tile.

---

## 3. Starting furniture

The place starts sparse on purpose (BRIEF §3). 18 catalog items (21 instances) plus 5 fixtures. Rotation codes are from §1.

### 3.1 Placement map

```
                11111111112222222222
      012345678901234567890123456789
ty 0  ###^^#####^###R#^^###=========
ty 1  #WWbbBBL#TTTt#ssssss#pggggggg|
ty 2  #bbbbBBb#tttt#ssssss>pggggggg|
ty 3  <bbbbBBb#tttS#ssssss#pggggggg|
ty 4  #Mbbbbbb#tttt#ssssssDpggggYYg|
ty 5  #bbbbbbb#tttt#ssssss#pggggYYg|
ty 6  #bbbbbbb#tttt#ssssss#pggggggg|
ty 7  ####d#####d#####d####pggUgggg|
ty 8  #PllllVVlll#CCCFkkkk#pggggggg|
ty 9  #llllllllll#kkkkkkkk>pggggggg|
ty10  <llllllllllakkkkkkkk#pggggggg|
ty11  <llllOOOlllakkkkXXHk#pggggggg|
ty12  #llllllllll#kkkHXXkkDpggggggg|
ty13  #llllllllll#kkkkkkkk#pgNNNNgg|
ty14  #llllllllll#QQkkkkkk#pggggggg|
ty15  #####D#vv######vv####pggggggg|
ty16  hh.moZo..hhhhhhhhhhhh---------
```

Overlay letters: `W` wardrobe, `B` bed, `L` small lamp, `M` standing mirror, `T` bath, `S` bathroom sink, `R` race board (on the wall), `P` record player, `V` TV unit (console on top), `O` sofa, `C` counters (kettle and rusk tin on top), `F` fridge, `X` small table, `H` chairs, `Q` cat bowls, `Y` tree, `U` bird bath, `N` washing line, `Z` doormat, `m` mailbox.

### 3.2 Placement table

| Instance | Item id | Room | Anchor (tx,ty) | Rot | Tiles covered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `start.bed` | `bed_double_basic` | bedroom | (5,1) | 0 | (5..6, 1..3) | Headboard on the north wall. A double, so all four cats fit on it for Cat Royalty tier 4. George's pillow is the left pillow tile (5,1). |
| `start.wardrobe` | `wardrobe_basic` | bedroom | (1,1) | 0 | (1..2, 1) | Shadow's top-of-wardrobe perch (layer 2). |
| `start.lamp` | `lamp_small_floor` | bedroom | (7,1) | 0 | (7,1) | The only light in the flat at night on day 1. |
| `start.mirror` | `mirror_standing` | bedroom | (1,4) | 3 | (1,4) | Faces east; Ellie stands at (2,4) to dress up. |
| `start.bath` | `bath_basic` | bathroom | (9,1) | 0 | (9..11, 1) | Under the frosted window. |
| `start.sink_bath` | `sink_bath_basic` | bathroom | (12,3) | 1 | (12,3) | Faces west, against the east wall. |
| `start.tv` | `tv_small_unit` | living | (6,8) | 0 | (6..7, 8) | Against the back wall. Surface slot 0 holds the console, slot 1 is free. |
| `start.console` | `console_home` | living | on `start.tv` slot 0 | - | - | Peaches' warm spot while it's on. |
| `start.records` | `record_player` | living | (1,8) | 0 | (1,8) | The record player from game 1, in the corner. Peaches sits on the lid when it's off. |
| `start.sofa` | `sofa_basic` | living | (5,11) | 2 | (5..7, 11) | Faces up (north) toward the TV, 2 tiles away. |
| `start.counter1` | `counter_basic` | kitchen | (12,8) | 0 | (12,8) | Free surface slot. |
| `start.counter2` | `counter_basic` | kitchen | (13,8) | 0 | (13,8) | Slot 0: `rusk_tin`. |
| `start.counter3` | `counter_basic` | kitchen | (14,8) | 0 | (14,8) | Slot 0: `kettle_basic`. |
| `start.rusks` | `rusk_tin` | kitchen | on `start.counter2` | - | - | Added to the brief's list so the coffee-and-rusk ritual works from minute one. |
| `start.kettle` | `kettle_basic` | kitchen | on `start.counter3` | - | - | |
| `start.fridge` | `fridge_basic` | kitchen | (15,8) | 0 | (15,8) | Bruce's "on top of the fridge" spot. (16,8) stays free for the door. |
| `start.table` | `table_small_round` | kitchen | (16,11) | 0 | (16..17, 11..12) | Bruce's "under the kitchen table" spot. 2 free surface slots (the laptop can go here). |
| `start.chair1` | `chair_basic` | kitchen | (15,12) | 3 | (15,12) | Faces east, into the table. |
| `start.chair2` | `chair_basic` | kitchen | (18,11) | 1 | (18,11) | Faces west, into the table. |
| `start.bowls` | `cat_bowls_basic` | kitchen | (12,14) | 0 | (12..13, 14) | Four bowls in one item. |
| `start.doormat` | `doormat_basic` | front | (5,16) | 0 | (5,16) | Rug layer on the front step. |
| `fix.race_board` | `race_board` | spare | wall (14,0) | 0 | wall (14,0) | Fixture. The only thing in the spare room: a corkboard that says "this will be the gym". Opens the race board from day 1. |
| `fix.tree` | `garden_tree_old` | garden | (26,4) | 0 | (26..27, 4..5) | Fixture. The canopy draws on the overhead layer and covers (25..28, 2..5). George climbs it. |
| `fix.bird_bath` | `garden_bird_bath` | garden | (24,7) | 0 | (24,7) | Fixture. Poe lands here. |
| `fix.washing_line` | `garden_washing_line` | garden | (23,13) | 0 | posts (23,13) and (26,13); (24..25,13) walkable under the line | Fixture. |
| `fix.mailbox` | `front_mailbox` | front | (3,16) | 0 | (3,16) | Fixture. |

Walk check: every door's inside tile, both archway sides, (5,14) inside the front door and (19,12) inside the back door are free. A path exists from the bed to the grass: (4,6), door (4,7), living, arch (11,10), kitchen, back door (20,12), patio (21,12).

The suggested spot for `gym_sled_track` (once unlocked) is (22,3) rotation 0, covering (22, 3..10): right outside the gym patio door, along the house. Build mode highlights this spot the first time the track is placed.

**Fixtures** can be moved and rotated in Build mode but not sold, duplicated or bought. They aren't catalog items and don't count toward catalog completion. Reason: the race board, bird bath (Poe), mailbox (mail) and tree are anchors for systems and secrets; losing one could strand a feature (pillar 1).

---

## 4. Catalog: Pickle's Deliveries

### 4.1 Rules

- **124 catalog items** (123 if the framed print is switched off) plus 5 fixtures. **74 are MVP.** **40 are unlocked at the start**, and 18 of those are already placed.
- **Unlocking** an item makes it buyable. It does not give a free copy. Pickle's next delivery note mentions what's new (`mail.pickle.new_stock`).
  - Exceptions that arrive as a free first copy: **secret** items, and **Poe trades** (she paid in Shiny Trinkets). After that they're buyable at the listed price.
- **Price** is in Hearts. Selling always refunds the full listed price (BRIEF §8). A price-0 item refunds 0 and stays in the catalog at 0, so selling it loses nothing.
- **Copies:** unlimited, except `frame_grazie` and `bruce_wall_cushion` (max 1 each; both are free to re-order).
- **Delivery** (proposal, play.md may override): in Live mode an order arrives 30 game minutes later. Pickle knocks at the front door, a delivery box appears at (6,14) (or the nearest free living-room tile), and the item goes to the Build-mode tray. In Build mode it's placed instantly. Salem gets in every box.
- **Surface items** (`slot`) need a free surface slot. Hosts and their slots are in the `slots` column.
- **`frame_grazie`** exists only when `personal.ts` has `framedPrint: true` (default `true`). It unlocks at the housewarming (`secret:housewarming`), arrives in that night's last delivery box, costs 0 and shows only the line "Grazie per essere te stessa" (string key `item.frame_grazie.text`, never translated or added to). When the flag is false it's removed from the catalog, from completion counts, and from the housewarming rewards.
- **`bruce_wall_cushion`** goes only on the garden wall (row 0, tx 21..28). It's where Bruce lives once he moves in.
- **Band names:** `record_shelf`, `record_player` and the record sleeves show "Pierce the Veil", "Deftones" and "Suicideboys" as plain text on plain coloured sleeves. No logos, artwork or lyrics (BRIEF §20). No poster or other item carries a band name.
- **Laptop:** a plain silver laptop with no logo. It is where she orders (`order_catalog`) and it's warm for Peaches.
- **Art key** `base#palette` means one sprite grid (`base`) with a palette map (`palette`), using game 1's `makeSprite` palette maps. The catalog has 123 distinct bases (80 in MVP).
- **Plants never wilt.** `water_plant` gives a small Calm boost and a sparkle, and nothing bad happens if she never waters (pillar 1).

### 4.2 Unlock codes

| Code | Meaning | Count |
| --- | --- | --- |
| `start` | Buyable from minute one | 40 |
| `asp:hyrox:N` | Hyrox Hero aspiration, tier N reached | 8 |
| `asp:royalty:N` | Cat Royalty aspiration, tier N | 10 |
| `asp:homemaker:N` | Home Maker aspiration, tier N | 32 |
| `asp:collector:N` | Collector aspiration, tier N (full scope only) | 7 |
| `bond:<cat>:N` | That cat's bond reaches level N (1..4) | 13 |
| `poe:N` | Poe trades it for N Shiny Trinkets | 6 |
| `secret:<id>` | Found by doing something (see §7.2) | 8 |

Reasons:
- **40 at start (32%)** covers every category and gives each MVP style at least 3 items, so the first session already has real choices. The Goth Parlour set is buildable from start items alone (§6.5). Cottage Kitchen is 2 cheap purchases away from the starting kitchen. A first set inside the first 10 to 20 minutes is the hook.
- **Home Maker carries the most unlocks (32).** It is the decorating aspiration, so decorating unlocks more decorating. Its tier 1 is front-loaded (10 items) to land inside the first hour.
- **Bond items are each cat's taste:** George gets royal things, Salem gets catnip, a neon cat and a box castle, Shadow gets a felt cave and a dim moon lamp, and Peaches gets sun, music and warmth.
- **Poe and Collector items are full scope** (non-MVP), so MVP doesn't depend on the trinket loop or the fourth aspiration.

### 4.3 Price bands and why

| Band | Hearts | Examples |
| --- | --- | --- |
| Tiny decor and surface items | 5 to 15 | vase, candles, kettle, books, scratch post |
| Small furniture, wall decor, rugs | 15 to 45 | chairs, posters, lamps, plants, cat beds |
| Medium furniture | 45 to 95 | sofa, wardrobe, fridge, TV, cat throne, stations |
| Feature pieces | 110 to 180 | rower, treadmill, sled track, cat tower, range cooker, canopy bed, stained-glass lamp |

- **Sum of one of each:** 5,300 Hearts (MVP items: 3,019). Start-unlocked but not yet owned: 22 items for 788 Hearts. Mean price 43.
- Feature pieces sit at about 3 to 4 times a mid item, so one big buy feels like a small goal (about one day of wishes), not a grind.
- The 8 Hyrox stations total 595 Hearts (sled track included), so a full home gym is a 2 to 3 hour goal alongside decorating.
- **For play.md's Hearts band** (measured as items *owned*, since 32% is already *unlocked* at minute one):
  - 0 h: 18 of 124 owned (15%).
  - 2 h target, 25 to 40% owned: 31 to 50 items, so 13 to 32 bought. The cheapest path costs 164 to 692 Hearts; a realistic mix is about 300 to 1,000. Unlocks by then must include Home Maker 1, Hyrox Hero 1 and Cat Royalty 1 (44 buyable non-starter items).
  - 8 h target, 85 to 100% owned: 106 to 124 items. 14 of them arrive free (6 Poe, 8 secret). Buying the other 92 costs 4,347 Hearts; 85% costs at least 2,257 (cheapest path), realistically about 3,500.
  - play.md must set Hearts earnings and aspiration pacing so both windows are hit.

### 4.4 Catalog table

Columns: `orient.` uses the codes in §1; `placement` uses §1.1; `light r` is the light radius in tiles (lights only); `slots` is the number of surface slots the item offers. The name key is always `item.<id>.name`, and the description key is `item.<id>.desc`.

| # | id | name key | category | footprint | orient. | placement | style tags | price ♥ | unlock | art key | interactions | light r | slots | MVP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `sofa_basic` | `item.sofa_basic.name` | seating | 3×1 | 4 | in | - | 60 | start | `sofa#plum` | sit, nap, cat_nap | - | - | Y |
| 2 | `chair_basic` | `item.chair_basic.name` | seating | 1×1 | 4 | floor | Cottage | 15 | start | `chair_wood#oak` | sit | - | - | Y |
| 3 | `armchair_velvet` | `item.armchair_velvet.name` | seating | 1×1 | 4 | in | Goth | 45 | start | `armchair#wine` | sit, read_book, cat_nap | - | - | Y |
| 4 | `beanbag_neon` | `item.beanbag_neon.name` | seating | 1×1 | 1 | in | Neon | 30 | start | `beanbag#neon` | sit, play_handheld, cat_nap | - | - | Y |
| 5 | `floor_cushions` | `item.floor_cushions.name` | seating | 2×1 | 2 | floor | Cottage, Cat | 30 | asp:royalty:2 | `floor_cushions` | sit, cat_nap | - | - | N |
| 6 | `sofa_coffin` | `item.sofa_coffin.name` | seating | 3×1 | 4 | in | Goth | 120 | asp:homemaker:3 | `sofa_coffin` | sit, nap, cat_nap, cat_hide | - | - | N |
| 7 | `bed_double_basic` | `item.bed_double_basic.name` | beds | 2×3 | 4 | in | - | 80 | start | `bed_double#plain` | sleep, nap, read_book, play_handheld, cat_nap, cat_hide | - | - | Y |
| 8 | `bed_quilt_cottage` | `item.bed_quilt_cottage.name` | beds | 2×3 | 4 | in | Cottage | 140 | asp:homemaker:2 | `bed_double#quilt` | sleep, nap, read_book, play_handheld, cat_nap, cat_hide | - | - | N |
| 9 | `bed_canopy_goth` | `item.bed_canopy_goth.name` | beds | 2×3 | 4 | in | Goth | 180 | asp:homemaker:4 | `bed_canopy` | sleep, nap, read_book, play_handheld, cat_nap, cat_hide | - | - | Y |
| 10 | `hammock_garden` | `item.hammock_garden.name` | beds | 1×3 | 2 | out | Cottage | 75 | bond:peaches:4 | `hammock` | nap, cat_nap, cat_sunbathe | - | - | N |
| 11 | `table_small_round` | `item.table_small_round.name` | tables | 2×2 | 1 | floor | Cottage | 40 | start | `table_round#oak` | eat, cat_hide | - | 2 | Y |
| 12 | `table_coffee_low` | `item.table_coffee_low.name` | tables | 2×1 | 2 | in | - | 30 | asp:homemaker:1 | `table_coffee` | - | - | 2 | Y |
| 13 | `desk_simple` | `item.desk_simple.name` | tables | 2×1 | 4 | in | - | 45 | asp:homemaker:3 | `desk` | - | - | 2 | N |
| 14 | `nightstand_coffin` | `item.nightstand_coffin.name` | tables | 1×1 | 4 | in | Goth | 35 | start | `nightstand_coffin` | cat_hide | - | 1 | Y |
| 15 | `sideboard_retro` | `item.sideboard_retro.name` | tables | 2×1 | 4 | in | Retro | 50 | asp:homemaker:2 | `sideboard` | - | - | 3 | Y |
| 16 | `table_dining_long` | `item.table_dining_long.name` | tables | 3×2 | 2 | in | Cottage | 90 | asp:homemaker:3 | `table_dining` | eat, cat_hide | - | 4 | N |
| 17 | `table_side_neon` | `item.table_side_neon.name` | tables | 1×1 | 1 | in | Neon | 25 | asp:collector:2 | `table_side#neon` | - | - | 1 | N |
| 18 | `wardrobe_basic` | `item.wardrobe_basic.name` | storage | 2×1 | 4 | in | - | 60 | start | `wardrobe#plain` | dress_up, cat_perch_high, cat_hide | - | - | Y |
| 19 | `wardrobe_gothic` | `item.wardrobe_gothic.name` | storage | 2×1 | 4 | in | Goth | 130 | asp:homemaker:3 | `wardrobe_gothic` | dress_up, cat_perch_high, cat_hide | - | - | N |
| 20 | `bookshelf_tall` | `item.bookshelf_tall.name` | storage | 1×1 | 4 | in | - | 40 | start | `bookshelf` | read_book, cat_perch_high | - | 2 | Y |
| 21 | `record_shelf` | `item.record_shelf.name` | storage | 2×1 | 4 | in | Retro | 45 | start | `record_shelf` | browse_records | - | 1 | Y |
| 22 | `shelf_wall_float` | `item.shelf_wall_float.name` | storage | 1×1 | 1 | wall | - | 15 | asp:homemaker:1 | `shelf_wall#oak` | - | - | 2 | Y |
| 23 | `shelf_wall_bat` | `item.shelf_wall_bat.name` | storage | 1×1 | 1 | wall | Goth | 20 | asp:homemaker:2 | `shelf_wall_bat` | - | - | 2 | N |
| 24 | `cabinet_curio` | `item.cabinet_curio.name` | storage | 2×1 | 4 | in | Goth | 80 | poe:5 | `cabinet_curio` | admire, cat_perch_high | - | 3 | N |
| 25 | `counter_basic` | `item.counter_basic.name` | kitchen | 1×1 | 4 | in | - | 20 | start | `counter#plain` | make_sushi, grab_rusk, wash_dishes | - | 1 | Y |
| 26 | `fridge_basic` | `item.fridge_basic.name` | kitchen | 1×1 | 4 | in | - | 70 | start | `fridge#white` | fridge_snack, cat_perch_high | - | - | Y |
| 27 | `kettle_basic` | `item.kettle_basic.name` | kitchen | slot | 1 | surface | - | 10 | start | `kettle` | make_coffee, make_tea | - | - | Y |
| 28 | `rusk_tin` | `item.rusk_tin.name` | kitchen | slot | 1 | surface | Cottage | 8 | start | `rusk_tin#blue` | grab_rusk | - | - | Y |
| 29 | `coffee_machine` | `item.coffee_machine.name` | kitchen | slot | 1 | surface | Retro | 50 | start | `coffee_machine` | make_coffee | - | - | Y |
| 30 | `stove_basic` | `item.stove_basic.name` | kitchen | 1×1 | 4 | in | - | 60 | start | `stove#white` | cook_simple, make_toast | - | 1 | Y |
| 31 | `stove_range_cottage` | `item.stove_range_cottage.name` | kitchen | 2×1 | 4 | in | Cottage | 110 | asp:homemaker:2 | `stove_range` | cook_simple, make_toast | - | 2 | Y |
| 32 | `fridge_retro` | `item.fridge_retro.name` | kitchen | 1×1 | 4 | in | Retro | 95 | bond:salem:4 | `fridge#mint` | fridge_snack, cat_perch_high | - | - | N |
| 33 | `bath_basic` | `item.bath_basic.name` | bath | 3×1 | 4 | in | - | 70 | start | `bath#white` | take_bath | - | - | Y |
| 34 | `sink_bath_basic` | `item.sink_bath_basic.name` | bath | 1×1 | 4 | in | - | 25 | start | `sink_bath` | freshen_up | - | - | Y |
| 35 | `cabinet_mirror_bath` | `item.cabinet_mirror_bath.name` | bath | 1×1 | 1 | wall | - | 20 | asp:homemaker:2 | `cabinet_mirror` | admire_self | - | 1 | N |
| 36 | `bath_clawfoot` | `item.bath_clawfoot.name` | bath | 3×1 | 4 | in | Cottage | 140 | asp:homemaker:4 | `bath_clawfoot#cream` | take_bath | - | - | N |
| 37 | `gym_skierg` | `item.gym_skierg.name` | gym | 1×1 | 4 | floor | Gym | 90 | start | `gym_skierg` | train_skierg | - | - | Y |
| 38 | `gym_rower` | `item.gym_rower.name` | gym | 1×3 | 4 | floor | Gym | 110 | start | `gym_rower` | train_row | - | - | Y |
| 39 | `gym_wallball_target` | `item.gym_wallball_target.name` | gym | 1×1 | 1 | wall | Gym | 40 | start | `gym_wallball` | train_wallball | - | - | Y |
| 40 | `gym_kettlebell` | `item.gym_kettlebell.name` | gym | 1×1 | 1 | floor | Gym | 25 | asp:hyrox:1 | `gym_kettlebell` | train_kettlebell | - | - | Y |
| 41 | `gym_sandbag` | `item.gym_sandbag.name` | gym | 1×1 | 1 | floor | Gym | 35 | asp:hyrox:1 | `gym_sandbag` | train_sandbag | - | - | Y |
| 42 | `gym_farmers_handles` | `item.gym_farmers_handles.name` | gym | 1×1 | 2 | floor | Gym | 45 | asp:hyrox:1 | `gym_farmers` | train_farmers | - | - | Y |
| 43 | `gym_mat` | `item.gym_mat.name` | gym | 2×1 | 2 | rug | Gym | 15 | asp:hyrox:1 | `gym_mat#plum` | stretch, cat_nap | - | - | Y |
| 44 | `gym_sled_track` | `item.gym_sled_track.name` | gym | 1×8 | 2 | out | Gym | 120 | asp:hyrox:2 | `gym_sled_track` | train_sled_push, train_sled_pull | - | - | Y |
| 45 | `gym_treadmill` | `item.gym_treadmill.name` | gym | 1×3 | 4 | in | Gym | 130 | asp:hyrox:2 | `gym_treadmill` | run_treadmill, cat_nap | - | - | Y |
| 46 | `gym_medal_rack` | `item.gym_medal_rack.name` | gym | 1×1 | 1 | wall | Gym | 30 | asp:hyrox:3 | `gym_medal_rack` | admire | - | - | Y |
| 47 | `gym_trophy_podium` | `item.gym_trophy_podium.name` | gym | 1×1 | 1 | floor | Gym | 60 | asp:hyrox:4 | `gym_trophy` | admire | - | - | N |
| 48 | `lamp_small_floor` | `item.lamp_small_floor.name` | lighting | 1×1 | 1 | in | - | 15 | start | `lamp_small#plum` | toggle_light | 3 | - | Y |
| 49 | `lamp_candelabra` | `item.lamp_candelabra.name` | lighting | 1×1 | 1 | in | Goth | 45 | start | `lamp_candelabra` | toggle_light | 3 | - | Y |
| 50 | `fairy_lights` | `item.fairy_lights.name` | lighting | 2×1 | 1 | wall | Cottage | 20 | start | `fairy_lights#warm` | toggle_light | 3 | - | Y |
| 51 | `garden_lantern` | `item.garden_lantern.name` | lighting | 1×1 | 1 | out | Cottage | 15 | start | `lantern#warm` | light_lantern | 3 | - | Y |
| 52 | `lamp_floor_arc` | `item.lamp_floor_arc.name` | lighting | 1×1 | 4 | in | Retro | 40 | asp:homemaker:3 | `lamp_arc` | toggle_light | 4 | - | N |
| 53 | `sconce_iron` | `item.sconce_iron.name` | lighting | 1×1 | 1 | wall | Goth | 30 | asp:homemaker:2 | `sconce_iron` | toggle_light | 3 | - | N |
| 54 | `candles_cluster` | `item.candles_cluster.name` | lighting | slot | 1 | surface | Goth | 10 | asp:homemaker:1 | `candles` | toggle_light | 1 | - | Y |
| 55 | `garden_lantern_string` | `item.garden_lantern_string.name` | lighting | 3×1 | 1 | wall | Cottage | 30 | asp:homemaker:2 | `lantern_string#warm` | light_lantern | 4 | - | Y |
| 56 | `sign_neon_bat` | `item.sign_neon_bat.name` | lighting | 2×1 | 1 | wall | Neon, Goth | 50 | asp:homemaker:3 | `neon_sign#bat` | toggle_light | 3 | - | N |
| 57 | `lamp_stained_glass` | `item.lamp_stained_glass.name` | lighting | 1×1 | 1 | in | Goth, Retro | 160 | asp:homemaker:4 | `lamp_stained` | toggle_light | 4 | - | N |
| 58 | `sign_neon_cat` | `item.sign_neon_cat.name` | lighting | 2×1 | 1 | wall | Neon, Cat | 50 | bond:salem:2 | `neon_sign#cat` | toggle_light | 3 | - | N |
| 59 | `lamp_lava` | `item.lamp_lava.name` | lighting | slot | 1 | surface | Retro, Neon | 25 | asp:collector:2 | `lamp_lava` | toggle_light | 2 | - | N |
| 60 | `garden_lantern_paper` | `item.garden_lantern_paper.name` | lighting | 1×1 | 1 | out | Retro | 25 | poe:2 | `lantern#paper` | light_lantern | 3 | - | N |
| 61 | `lamp_moon_orb` | `item.lamp_moon_orb.name` | lighting | 1×1 | 1 | in | Goth | 35 | bond:shadow:2 | `lamp_moon` | toggle_light | 2 | - | N |
| 62 | `plant_monstera` | `item.plant_monstera.name` | plants | 1×1 | 1 | floor | Plant | 25 | start | `plant_monstera` | water_plant | - | - | Y |
| 63 | `plant_snake` | `item.plant_snake.name` | plants | 1×1 | 1 | floor | Plant, Goth | 20 | start | `plant_snake` | water_plant | - | - | Y |
| 64 | `plant_succulent` | `item.plant_succulent.name` | plants | slot | 1 | surface | Plant | 8 | start | `plant_succulent` | water_plant | - | - | Y |
| 65 | `plant_pothos_hanging` | `item.plant_pothos_hanging.name` | plants | 1×1 | 1 | wall | Plant, Cottage | 18 | asp:homemaker:1 | `plant_pothos` | water_plant | - | - | Y |
| 66 | `plant_herb_box` | `item.plant_herb_box.name` | plants | 1×1 | 1 | wall | Plant, Cottage | 15 | asp:homemaker:1 | `plant_herbs` | water_plant | - | - | Y |
| 67 | `plant_fern_stand` | `item.plant_fern_stand.name` | plants | 1×1 | 1 | floor | Plant, Cottage | 30 | asp:homemaker:2 | `plant_fern` | water_plant | - | - | Y |
| 68 | `garden_flowerbed` | `item.garden_flowerbed.name` | plants | 2×1 | 2 | out | Plant, Cottage | 25 | asp:homemaker:2 | `flowerbed` | water_plant | - | - | Y |
| 69 | `plant_catnip` | `item.plant_catnip.name` | plants | slot | 1 | surface | Plant, Cat | 15 | bond:salem:1 | `plant_catnip` | water_plant, cat_play | - | - | Y |
| 70 | `plant_black_rose` | `item.plant_black_rose.name` | plants | 1×1 | 1 | floor | Plant, Goth | 40 | poe:2 | `plant_black_rose` | water_plant | - | - | N |
| 71 | `cat_bowls_basic` | `item.cat_bowls_basic.name` | cat | 2×1 | 2 | floor | Cat | 15 | start | `cat_bowls#plain` | fill_bowls, cat_eat | - | - | Y |
| 72 | `cat_scratch_post` | `item.cat_scratch_post.name` | cat | 1×1 | 1 | floor | Cat | 15 | start | `cat_scratch_post` | cat_scratch | - | - | Y |
| 73 | `cat_toy_basket` | `item.cat_toy_basket.name` | cat | 1×1 | 1 | floor | Cat | 12 | start | `cat_toy_basket` | play_laser, play_feather, cat_play | - | - | Y |
| 74 | `cat_tree_small` | `item.cat_tree_small.name` | cat | 1×1 | 1 | floor | Cat | 45 | asp:royalty:1 | `cat_tree_small` | cat_perch_high, cat_scratch, cat_nap | - | - | Y |
| 75 | `cat_bed_round` | `item.cat_bed_round.name` | cat | 1×1 | 1 | floor | Cat | 20 | asp:royalty:1 | `cat_bed_round#plum` | cat_nap | - | - | Y |
| 76 | `cat_tunnel` | `item.cat_tunnel.name` | cat | 2×1 | 2 | floor | Cat | 25 | asp:royalty:1 | `cat_tunnel` | cat_play, cat_hide | - | - | N |
| 77 | `cat_wall_steps` | `item.cat_wall_steps.name` | cat | 3×1 | 1 | wall | Cat | 30 | asp:royalty:2 | `cat_wall_steps` | cat_perch_high | - | - | N |
| 78 | `cat_bed_coffin` | `item.cat_bed_coffin.name` | cat | 1×1 | 4 | in | Cat, Goth | 35 | asp:royalty:2 | `cat_bed_coffin` | cat_nap, cat_hide | - | - | Y |
| 79 | `cat_tree_tower` | `item.cat_tree_tower.name` | cat | 2×2 | 1 | in | Cat | 110 | asp:royalty:3 | `cat_tree_tower` | cat_perch_high, cat_scratch, cat_nap, cat_hide | - | - | Y |
| 80 | `cat_crown_cushion` | `item.cat_crown_cushion.name` | cat | 1×1 | 1 | floor | Cat | 40 | bond:george:1 | `cat_crown_cushion` | cat_nap, bow_to_george | - | - | Y |
| 81 | `cat_throne` | `item.cat_throne.name` | cat | 1×1 | 4 | in | Cat, Goth | 90 | bond:george:2 | `cat_throne` | cat_throne, cat_perch_high, bow_to_george | - | - | Y |
| 82 | `cat_window_perch` | `item.cat_window_perch.name` | cat | 1×1 | 1 | window | Cat | 40 | bond:peaches:1 | `cat_window_perch` | cat_sunbathe, cat_perch_high | - | - | Y |
| 83 | `cat_cave_felt` | `item.cat_cave_felt.name` | cat | 1×1 | 1 | floor | Cat, Cottage | 35 | bond:shadow:1 | `cat_cave_felt` | cat_hide, cat_nap | - | - | Y |
| 84 | `cat_box_castle` | `item.cat_box_castle.name` | cat | 2×2 | 1 | floor | Cat | 50 | bond:salem:3 | `cat_box_castle` | cat_box, cat_hide, cat_play | - | - | N |
| 85 | `cat_heated_pad` | `item.cat_heated_pad.name` | cat | 1×1 | 1 | in | Cat | 30 | bond:peaches:3 | `cat_heated_pad` | cat_warm, cat_nap | - | - | N |
| 86 | `box_throne_salem` | `item.box_throne_salem.name` | cat | 1×1 | 1 | floor | Cat | 25 | secret:salem_boxes50 | `box_throne` | cat_box, cat_nap | - | - | N |
| 87 | `bruce_wall_cushion` | `item.bruce_wall_cushion.name` | cat | 1×1 | 1 | wall | Cat | 0 | secret:bruce_all5 | `bruce_cushion` | - | - | - | N |
| 88 | `poster_moth` | `item.poster_moth.name` | walldecor | 1×1 | 1 | wall | Goth | 15 | start | `poster_moth` | admire | - | - | Y |
| 89 | `poster_cat_loaf` | `item.poster_cat_loaf.name` | walldecor | 1×1 | 1 | wall | Cat | 15 | asp:royalty:1 | `poster_cat_loaf` | admire | - | - | Y |
| 90 | `frame_polaroids` | `item.frame_polaroids.name` | walldecor | 2×1 | 1 | wall | Retro | 15 | asp:collector:1 | `frame_polaroids` | view_photos | - | - | N |
| 91 | `painting_meadow` | `item.painting_meadow.name` | walldecor | 1×1 | 1 | wall | Cottage | 30 | asp:homemaker:3 | `painting_meadow` | admire | - | - | N |
| 92 | `mirror_ornate` | `item.mirror_ornate.name` | walldecor | 1×1 | 1 | wall | Goth | 45 | asp:homemaker:2 | `mirror_ornate` | admire_self, dress_up | - | - | N |
| 93 | `tapestry_moon` | `item.tapestry_moon.name` | walldecor | 2×1 | 1 | wall | Goth | 35 | asp:homemaker:3 | `tapestry_moon` | admire | - | - | N |
| 94 | `portrait_four_cats` | `item.portrait_four_cats.name` | walldecor | 2×1 | 1 | wall | Cat | 60 | asp:royalty:4 | `portrait_four_cats` | admire | - | - | Y |
| 95 | `frame_grazie` | `item.frame_grazie.name` | walldecor | 1×1 | 1 | wall | - | 0 | secret:housewarming | `frame_grazie` | admire | - | - | Y |
| 96 | `portrait_george` | `item.portrait_george.name` | walldecor | 1×1 | 1 | wall | Cat, Goth | 40 | bond:george:3 | `portrait_george` | admire, bow_to_george | - | - | N |
| 97 | `poster_critterbound` | `item.poster_critterbound.name` | walldecor | 1×1 | 1 | wall | Neon, Retro | 20 | asp:collector:1 | `poster_critterbound` | admire | - | - | N |
| 98 | `raven_silhouette` | `item.raven_silhouette.name` | walldecor | 1×1 | 1 | wall | Goth | 20 | poe:1 | `raven_silhouette` | admire | - | - | N |
| 99 | `plaque_sir_ellie` | `item.plaque_sir_ellie.name` | walldecor | 1×1 | 1 | wall | Cat | 0 | secret:knighted | `plaque_sir_ellie` | admire | - | - | N |
| 100 | `frame_zoomies` | `item.frame_zoomies.name` | walldecor | 1×1 | 1 | wall | Cat | 0 | secret:zoomies_photo | `frame_zoomies` | admire | - | - | N |
| 101 | `poster_peaches_rock` | `item.poster_peaches_rock.name` | walldecor | 1×1 | 1 | wall | Cat, Retro | 0 | secret:headbang_peaches | `poster_peaches` | admire | - | - | N |
| 102 | `rug_round_plum` | `item.rug_round_plum.name` | rugs | 2×2 | 1 | rug | - | 20 | start | `rug_round#plum` | - | - | - | Y |
| 103 | `rug_bat` | `item.rug_bat.name` | rugs | 3×2 | 2 | rug | Goth | 35 | asp:homemaker:2 | `rug_bat` | - | - | - | Y |
| 104 | `rug_braided` | `item.rug_braided.name` | rugs | 3×2 | 2 | rug | Cottage | 30 | asp:homemaker:1 | `rug_braided` | - | - | - | Y |
| 105 | `rug_cat_face` | `item.rug_cat_face.name` | rugs | 2×2 | 1 | rug | Cat | 30 | asp:royalty:3 | `rug_cat_face` | cat_nap | - | - | N |
| 106 | `doormat_basic` | `item.doormat_basic.name` | rugs | 1×1 | 1 | rug | - | 5 | start | `doormat#coir` | - | - | - | Y |
| 107 | `rug_neon_grid` | `item.rug_neon_grid.name` | rugs | 3×2 | 2 | rug | Neon | 35 | asp:collector:3 | `rug_neon_grid` | - | - | - | N |
| 108 | `tv_small_unit` | `item.tv_small_unit.name` | electronics | 2×1 | 4 | in | - | 70 | start | `tv_small` | watch_tv, cat_hide | - | 2 | Y |
| 109 | `console_home` | `item.console_home.name` | electronics | slot | 1 | surface | Neon | 60 | start | `console_home` | play_console, cat_warm | - | - | Y |
| 110 | `record_player` | `item.record_player.name` | electronics | 1×1 | 4 | in | Retro | 60 | start | `record_player` | listen_records, dance, headbang, cat_perch_lid | - | 1 | Y |
| 111 | `laptop` | `item.laptop.name` | electronics | slot | 1 | surface | - | 40 | start | `laptop#silver` | use_laptop, order_catalog, cat_warm | - | - | Y |
| 112 | `handheld_console` | `item.handheld_console.name` | electronics | slot | 1 | surface | Retro | 30 | asp:homemaker:1 | `handheld` | play_handheld | - | - | Y |
| 113 | `radio_retro` | `item.radio_retro.name` | electronics | slot | 1 | surface | Retro, Cottage | 25 | bond:peaches:2 | `radio` | listen_radio | - | - | N |
| 114 | `arcade_cabinet` | `item.arcade_cabinet.name` | electronics | 1×1 | 4 | in | Neon, Retro | 140 | asp:collector:4 | `arcade` | play_arcade | - | - | N |
| 115 | `bench_garden` | `item.bench_garden.name` | garden | 2×1 | 4 | floor | Cottage | 35 | asp:homemaker:1 | `bench_garden` | sit | - | - | Y |
| 116 | `garden_picnic_blanket` | `item.garden_picnic_blanket.name` | garden | 2×2 | 1 | rug | Cottage | 15 | asp:homemaker:1 | `picnic_blanket` | sit, cat_nap, cat_sunbathe | - | - | Y |
| 117 | `garden_gargoyle` | `item.garden_gargoyle.name` | garden | 1×1 | 4 | out | Goth | 30 | poe:3 | `gargoyle` | admire, cat_perch_high | - | - | N |
| 118 | `garden_telescope` | `item.garden_telescope.name` | garden | 1×1 | 1 | out | Retro | 60 | asp:collector:3 | `telescope` | stargaze | - | - | N |
| 119 | `mirror_standing` | `item.mirror_standing.name` | decor | 1×1 | 4 | in | - | 35 | start | `mirror_standing` | dress_up, admire_self | - | - | Y |
| 120 | `vase_bud` | `item.vase_bud.name` | decor | slot | 1 | surface | Cottage | 8 | start | `vase_bud#cream` | admire | - | - | Y |
| 121 | `books_stack` | `item.books_stack.name` | decor | slot | 1 | surface | - | 6 | asp:homemaker:1 | `books_stack` | read_book | - | - | N |
| 122 | `vase_black_crackle` | `item.vase_black_crackle.name` | decor | slot | 1 | surface | Goth | 15 | poe:1 | `vase_bud#ink` | admire | - | - | N |
| 123 | `figurine_pickle` | `item.figurine_pickle.name` | decor | slot | 1 | surface | Cottage | 0 | secret:pickle20 | `figurine_pickle` | admire | - | - | N |
| 124 | `rusk_tin_gold` | `item.rusk_tin_gold.name` | decor | slot | 1 | surface | Retro | 0 | secret:dunks10 | `rusk_tin#gold` | grab_rusk | - | - | N |

### 4.5 Fixtures (not in the catalog)

`value price` is used only for the Cosy item value (§6.2). Fixtures can't be bought or sold.

| id | name key | category | footprint | orient. | placement | style tags | value price | unlock | art key | interactions | light r | slots | MVP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `race_board` | `item.race_board.name` | gym | 1×1 | 1 | wall | Gym | (30) | fixture | `race_board` | open_race_board | - | - | Y |
| `garden_tree_old` | `item.garden_tree_old.name` | plants | 2×2 | 1 | out | Plant | (80) | fixture | `tree_old` | sit, cat_perch_high | - | - | Y |
| `garden_bird_bath` | `item.garden_bird_bath.name` | garden | 1×1 | 1 | out | Cottage | (40) | fixture | `bird_bath` | bird_watch | - | - | Y |
| `garden_washing_line` | `item.garden_washing_line.name` | garden | 4×1 | 2 | out | - | (30) | fixture | `washing_line` | hang_washing | - | - | Y |
| `front_mailbox` | `item.front_mailbox.name` | front | 1×1 | 1 | front | - | (20) | fixture | `mailbox#red` | check_mail | - | - | Y |

---

## 5. Paint

Paint applies per room: one wall paint (all of that room's wall faces) and one floor paint (all of that room's floor tiles). Patterns are 16 × 16 tileable. Wallpaper motifs show on back-wall faces; side walls and cutaways use the paint's base colour.

- **Cost:** free to apply once unlocked, with undo and redo. Reason: paint is the cheapest way to make the place hers (pillar 3), and charging per coat adds friction for nothing.
- **Cosy:** a non-default wall paint and a non-default floor paint each add **6** item value to that room, and either one adds the category `paint` for Variety (§6.2). A paint with a style tag counts as **one item** of that tag toward a set's item count. It never satisfies a set's light or wall-item requirement.
- The garden grass and the garden wall can't be painted. The patio (column 21) and the front step take `floor.patio.*` paints.
- Colours are suggestions from game 1's palette family; the pixel-artist may adjust within it.

### 5.1 Wall paints (18)

| Id | Name key | Pattern | Colours | Tag | Unlock | Default in |
| --- | --- | --- | --- | --- | --- | --- |
| `wall.plain.lavender` | `paint.wall.plain.lavender` | plain | #c9a2ff | - | start | bedroom |
| `wall.plain.dusk` | `paint.wall.plain.dusk` | plain | #6f6488 | - | start | living |
| `wall.plain.plaster` | `paint.wall.plain.plaster` | plain | #e6e6f0 | - | start | spare |
| `wall.plain.plum` | `paint.wall.plain.plum` | plain | #3d3452 | - | start | |
| `wall.plain.wine` | `paint.wall.plain.wine` | plain | #8a2f52 | - | start | |
| `wall.plain.ink` | `paint.wall.plain.ink` | plain | #2a2233 | - | start | |
| `wall.plain.cream` | `paint.wall.plain.cream` | plain | #efe4d0 | - | start | |
| `wall.tiles.mint` | `paint.wall.tiles.mint` | tiles | #bfe3f2 / #efe6f5 grout | - | start | bathroom |
| `wall.tiles.cream` | `paint.wall.tiles.cream` | tiles | #fbf5ee / #cfc6d9 grout | - | start | kitchen |
| `wall.stripes.plum` | `paint.wall.stripes.plum` | stripes | #3d3452 / #6f6488 | - | start | |
| `wall.wood.oak_panel` | `paint.wall.wood.oak_panel` | wood | #c9a24f / #6b4a3a | Cottage | asp:homemaker:1 | |
| `wall.paper.roses` | `paint.wall.paper.roses` | wallpaper (roses) | #efe4d0 / #e5718f / #3f6b4f | Cottage | asp:homemaker:1 | |
| `wall.paper.bats` | `paint.wall.paper.bats` | wallpaper (bats) | #2a2233 / #8e6cc2 | Goth | asp:homemaker:2 | |
| `wall.check.wine` | `paint.wall.check.wine` | checks | #8a2f52 / #2a1d20 | Goth | asp:homemaker:2 | |
| `wall.paper.ferns` | `paint.wall.paper.ferns` | wallpaper (ferns) | #efe6f5 / #3f6b4f | Plant | asp:homemaker:2 | |
| `wall.paper.paws` | `paint.wall.paper.paws` | wallpaper (paw prints) | #f7b7c3 / #3e2c30 | Cat | asp:royalty:2 | |
| `wall.paper.race_stripe` | `paint.wall.paper.race_stripe` | stripes (one bold band) | #e6e6f0 / #b0304f | Gym | asp:hyrox:2 | |
| `wall.paper.moons` | `paint.wall.paper.moons` | wallpaper (moons and stars) | #221c2d / #ffe066 | Goth | asp:homemaker:3 | |
| `wall.paper.geo` | `paint.wall.paper.geo` | wallpaper (70s circles) | #e9c46a / #6b4a3a | Retro | asp:collector:1 | |
| `wall.paper.neon_grid` | `paint.wall.paper.neon_grid` | wallpaper (grid) | #0f0b14 / #c9a2ff / #8fc8ff | Neon | asp:collector:2 | |

(That's 20 rows: 10 at start, 8 MVP unlocks, 2 full scope.)

### 5.2 Floor paints (16)

| Id | Name key | Pattern | Colours | Tag | Unlock | Default in |
| --- | --- | --- | --- | --- | --- | --- |
| `floor.carpet.plum` | `paint.floor.carpet.plum` | plain (carpet) | #3d3452 | - | start | bedroom |
| `floor.carpet.lavender` | `paint.floor.carpet.lavender` | plain (carpet) | #cfc6d9 | - | start | |
| `floor.carpet.ink` | `paint.floor.carpet.ink` | plain (carpet) | #2a2233 | - | start | |
| `floor.wood.oak` | `paint.floor.wood.oak` | wood | #c9a24f / #6b4a3a | - | start | living |
| `floor.tiles.hex_white` | `paint.floor.tiles.hex_white` | tiles (hex) | #fbf5ee / #cfc6d9 | - | start | bathroom |
| `floor.check.ink_cream` | `paint.floor.check.ink_cream` | checks | #2a2233 / #efe4d0 | Retro | start | kitchen |
| `floor.plain.concrete` | `paint.floor.plain.concrete` | plain | #6f6488 at 40% grey | - | start | spare |
| `floor.patio.stone` | `paint.floor.patio.stone` | tiles (flags) | #cfc6d9 / #6f6488 | - | start | patio, front step |
| `floor.wood.walnut` | `paint.floor.wood.walnut` | wood | #6b4a3a / #3e2c30 | - | asp:homemaker:1 | |
| `floor.tiles.terracotta` | `paint.floor.tiles.terracotta` | tiles | #c9a24f / #b0304f | Cottage | asp:homemaker:1 | |
| `floor.plain.rubber` | `paint.floor.plain.rubber` | plain (speckled rubber) | #2a2233 / #8e6cc2 flecks | Gym | asp:hyrox:1 | |
| `floor.wood.painted_white` | `paint.floor.wood.painted_white` | wood | #fbf5ee / #cfc6d9 | Cottage | asp:homemaker:2 | |
| `floor.patio.brick` | `paint.floor.patio.brick` | tiles (brick) | #b0304f / #6b4a3a | Cottage | asp:homemaker:2 | |
| `floor.check.wine_plum` | `paint.floor.check.wine_plum` | checks | #8a2f52 / #3d3452 | Goth | asp:homemaker:3 | |
| `floor.wood.herringbone` | `paint.floor.wood.herringbone` | wood (herringbone) | #c9a24f / #6b4a3a | Retro | asp:homemaker:3 | |
| `floor.stripes.lavender` | `paint.floor.stripes.lavender` | stripes | #cfc6d9 / #8e6cc2 | - | asp:collector:1 | |

Paint counts: 36 paints, 18 at start (incl. the 8 room defaults), 32 MVP. Paints are not catalog items and don't count toward catalog completion.

---

## 6. The Cosy score

### 6.1 Overview

Every scored room (`bedroom`, `bathroom`, `spare`, `living`, `kitchen`, `garden`) has a Cosy score from 0 to 100:

```
cosy(R) = clamp( round( Value + Variety + Light + Plants + Sets + Cats + Clutter ), 0, 100 )
```

| Term | Max | One-line reason |
| --- | --- | --- |
| Value | 30 | Buying things should always move the needle; it's the most direct lever. |
| Variety | 10 | A room needs a mix of kinds of things, not 12 lamps. |
| Light | 15 | "Lamps matter at night" (BRIEF §4). Dark rooms at night feel bare. |
| Plants | 10 | Plants are cheap, friendly and one of the seven styles. |
| Sets | 20 | Sets are the decorating goal. Without one a room tops out at 80, so 85+ needs a theme. |
| Cats | 15 | The cats are the stars (pillar 2): a room the cats like is a cosy room. |
| Clutter | 0 to −10 | Salem's mess matters a little, never a lot (pillar 1). |

Two readings of the same formula:

| Reading | Used for | Time and lights | Live cat bonus | Mess |
| --- | --- | --- | --- | --- |
| `cosyLive(R)` | Ellie's Cosy need, the HUD | the real time of day and real light states | yes | yes |
| `cosyRated(R)` | the Build-mode meter, Home Maker milestones, the housewarming | night (s = 0) with every light on and lanterns lit | no | no (overcrowding only) |

Reason for two readings: decorating should be judged on the design, not on whether Salem just knocked a vase over or the sun is up. The rated reading also shows, while building, how the room will feel at night.

**Home Cosy** = floor-area-weighted mean of `cosyRated` over the six scored rooms (floor tiles from §2.2: 42, 24, 36, 70, 56, 120; total 348).

### 6.2 The terms

All counts use the room membership rule in §1. Surface items count in their host's room.

**Item value `v(i)`**

```
v(i) = clamp( round(2 × sqrt(price)), 2, 24 )
```

- Price-0 items (secret keepsakes, the framed print) have v = 12.
- Fixtures use their value price (§4.5).
- Non-default wall paint and floor paint add 6 each.
- **Copies:** the 2nd and 3rd copy of the same id in one room count v/2. The 4th and later count 0.
- Examples: a 15-Heart lamp gives 8, a 60-Heart sofa 15, a 180-Heart canopy bed 24 (capped).

Reasons: the square root means cheap things still count (a 10-Heart candle is worth 6, more than half of a 40-Heart lamp's 13) while big pieces aren't mandatory. The copy rule stops 20 candles from maxing a room.

**Value** = `30 × min(1, V / T_R)`, where V is the sum of v(i) in the room and T_R is the room's target from §2.2 (bedroom 100, bathroom 60, spare 90, living 160, kitchen 130, garden 150).

**Variety** = `10 × min(1, C / 6)`, where C is the number of distinct catalog categories among the room's items (§4.4 `category`, plus `paint` when any paint is non-default). Fixtures count with their category. Reason for 6: a finished room has its function piece plus about five supporting kinds (seating, light, rug, wall decor, plant).

**Light**

- A tile is lit by a light if `(dx² + dy²) ≤ (r + 0.5)²`, measured between tile centres, where r is the light radius. Light passes over furniture but not through walls, doors or the archway: a light only lights its own room.
- Light origins: a floor light at its anchor tile, a surface light at its host's tile, and a wall light at the floor tile directly south of its wall tile.
- `litOn` = the fraction of the room's floor tiles lit by lights that are **on**. `litAll` = the same with every light counted.
- `Lnight = 15 × min(1, litOn / 0.5)`. Half the floor lit at night gives full marks, so 2 to 3 lamps per room is enough.
- `Lday = 15 × min(1, 0.5 + litAll)`. Daylight gives half marks, and lamps top it up even when switched off, because a lamp in the corner still reads as cosy by day.
- Daylight factor s: 1 from 07:30 to 18:30, 0 from 20:30 to 05:30, linear between (centred on the fixed 06:30 sunrise and 19:30 sunset, §2.4).
- **Light** = `s × Lday + (1 − s) × Lnight`. Rated uses s = 0 with every light on.

Light states (proposal for sim.md):
- Indoor lights switch on automatically when s drops below 0.5 and switch off when Ellie goes to sleep. They switch back on if she gets up before dawn.
- `toggle_light` overrides the automatic state until the next dusk.
- Garden lanterns (`light_lantern` items) never switch on by themselves. One `light_lantern` lights every lantern in the garden, and they stay lit until sunrise. Reason: lighting the lanterns is a ritual and a game 1 callback, while indoor lamps shouldn't be a chore.

**Plants** = `10 × min(1, plantCount / P_R)`. Each Plant-tagged item (including the tree fixture) counts 1, or 2 if its footprint covers 2 or more tiles. P_R is from §2.2 (bedroom 2, bathroom 1, spare 2, living 3, kitchen 2, garden 5).

**Sets** = `min(20, best + 0.5 × secondBest)` over the sets the room satisfies (§6.3). A third set adds nothing. An item may count toward several sets at once. Reason: one strong theme is the main win, but mixing two themes still pays a bit.

**Cats** = `15 × (comfort_george + comfort_salem + comfort_shadow + comfort_peaches) / 4`, where each comfort is 0 to 1:

| Cat | Comfort rule (sum, capped at 1) | Why |
| --- | --- | --- |
| George | +0.5 per item offering `cat_perch_high` or `cat_throne` | The King wants height. |
| Salem | +0.5 per item offering `cat_play` or `cat_box` | Chaos needs equipment. |
| Shadow | +0.5 per item offering `cat_hide` | Dark, quiet spots (under the bed counts). |
| Peaches | +0.5 if the room gets a sunbeam (a south, east or west window, or the garden, or a `cat_sunbathe` item); +0.5 if it has a music source (`listen_records`, `listen_radio`) or a warm thing (`cat_warm`) | Sun, music and warmth. |
| All four | +0.25 per item of category `cat` offering `cat_nap` | A proper cat bed pleases everyone. |
| Live only | +0.25 for each cat currently in the room whose personality need is ≥ 60 | A happy cat in the room is cosy right now. |

**Clutter** (sum, floored at −10):

- Live only: −2 per mess object in the room (a knocked-over item, a dirty plate or mug left out), and −1 per empty delivery box older than one game day.
- Live and rated: overcrowding. Let `b` = the fraction of the room's floor tiles covered by non-rug floor items. Score −1 for every full 5% of `b` above 50%.
- Clearing mess is a normal interaction (put back, `wash_dishes`, flatten the box). Nothing is ever lost.

### 6.3 Set bonuses

"Distinct" means different item ids. Copies count only where a rule says so. A styled paint counts as one tagged item toward an item count (§5).

| Set id | Name key | Bonus | Room | Exact rule | MVP |
| --- | --- | --- | --- | --- | --- |
| `goth_parlour` | `set.goth_parlour.name` | 20 | any indoor | ≥ 5 distinct Goth items, including ≥ 1 `lighting` item and ≥ 1 `wall`-placed item | Y |
| `cat_palace` | `set.cat_palace.name` | 20 | any | ≥ 5 distinct Cat items which, between them, offer ≥ 3 of: `cat_perch_high`, `cat_hide`, `cat_play` or `cat_box`, `cat_nap`, `cat_scratch` | Y |
| `home_gym` | `set.home_gym.name` | 20 | any | ≥ 4 distinct Hyrox station items (items offering a `train_*` interaction or `run_treadmill`) plus ≥ 1 other Gym item (mat, medal rack, trophy, or the race board fixture) | Y |
| `night_garden` | `set.night_garden.name` | 20 | garden only | ≥ 4 `lighting` items (copies count), ≥ 3 Plant items (copies count; the tree counts), and ≥ 1 item offering `sit` | Y |
| `cottage_kitchen` | `set.cottage_kitchen.name` | 16 | any indoor | ≥ 5 distinct Cottage items, including ≥ 1 `kitchen` item | Y |
| `retro_lounge` | `set.retro_lounge.name` | 16 | any indoor | ≥ 4 distinct Retro items, including `record_player` or `record_shelf` | Y |
| `royal_court` | `set.royal_court.name` | 16 | any indoor | `cat_throne` and `cat_crown_cushion`, plus ≥ 2 other distinct Goth items | Y |
| `plant_corner` | `set.plant_corner.name` | 12 | any | ≥ 5 Plant items (copies count) whose tiles all fit inside one 4 × 4 tile box. Wall plants use the floor tile south of their wall tile; surface plants use their host's tile. | Y |
| `candlelit_bath` | `set.candlelit_bath.name` | 12 | bathroom only | a `bath` item offering `take_bath`, ≥ 2 `lighting` items (copies count) and ≥ 1 Plant item | Y |
| `neon_den` | `set.neon_den.name` | 16 | any indoor | ≥ 4 distinct Neon items, including ≥ 1 `electronics` item and ≥ 1 `lighting` item | N |

When a set completes in Live mode (or on leaving Build mode), play a short chime and show `set.<id>.done`; the cat whose taste it matches comments (George for Royal Court and Goth Parlour, Salem for Cat Palace, Peaches for Retro Lounge and Night Garden, Shadow for Candlelit Bath, any cat otherwise). Home Maker milestones read set completions (see §9).

Reachability (why these thresholds):
- **Goth Parlour** can be built from start items alone: `armchair_velvet`, `nightstand_coffin`, `lamp_candelabra` (light), `plant_snake`, `poster_moth` (wall). That's 160 Hearts, about the first hour's earnings, so the first set lands early.
- **Cottage Kitchen**: the starting kitchen already has 3 distinct Cottage items (`chair_basic`, `table_small_round`, `rusk_tin`). `fairy_lights` and `vase_bud` (28 Hearts) finish it. That's the first "oh!" moment, and it's in the room where the coffee ritual starts.
- **Home Gym** needs Hyrox Hero tier 1 (the 4th station), plus the race board already on the wall. Training unlocks the gym, which feels right.
- **Cat Palace** needs Cat Royalty tier 1 (`cat_tree_small`, `cat_bed_round`).
- **Plant Corner** needs Home Maker tier 1 (two wall plants).
- **Night Garden** needs Home Maker tier 1 (a bench or picnic blanket) and 4 lanterns (60 Hearts).
- **Neon Den** is full scope only, because most Neon items come from Collector.

### 6.4 Hint rules (the Build meter)

The meter shows `cosyRated` for the room under the cursor (or the room of the selected item), plus one hint. After every placement, move, sell, paint or undo, recompute and pick a hint:

1. Build the candidate list, each with a predicted **gain** in points (the rated score's rise if the hint were followed with one cheap item):

| Hint id | Condition | Gain | String key and params |
| --- | --- | --- | --- |
| `set_near` | some set misses exactly one requirement | that set's effect on the Sets term | `cosy.hint.set_near` {set, need}; `need` is a key like `cosy.need.goth_item`, `cosy.need.light`, `cosy.need.wall_item`, `cosy.need.cat_feature.hide` |
| `dark` | rated Light < 10 | 15 − Light | `cosy.hint.dark` |
| `cat` | the lowest cat comfort in the room is < 0.5 | 15 × (0.5 − comfort) / 4, rounded up | `cosy.hint.cat.<cat>`: George wants height, Salem a toy or a box, Shadow a hiding spot, Peaches music or something warm (or a window perch if the room has no sunbeam) |
| `plants` | Plants < 10 | 10 − Plants | `cosy.hint.plants` |
| `variety` | Variety < 10 | 10/6 per missing category | `cosy.hint.variety.<category>`, naming the first missing category in the room's list below |
| `value` | Value < 30 | min(30 − Value, 3) | `cosy.hint.value` |
| `set_idea` | no set is at least half met | 0.25 × the best set's bonus | `cosy.hint.set_idea` {set}: the set whose rule is closest to met |
| `crowded` | overcrowding penalty < 0 | the penalty | `cosy.hint.crowded` |

2. Choose the highest gain. Break ties in table order (`set_near` first, `crowded` last). One exception: `set_near` wins outright whenever its gain is ≥ 8, because finishing a set is the best moment in Build mode.
3. If the rated score is ≥ 95, show `cosy.hint.done.<cat>` instead: a cat's approval line, with the cat picked as `roomIndex mod 4` so it's deterministic.
4. The meter shows a ghost segment of `+gain` on top of the current score. Clicking the hint opens the catalog filtered to what it names (a tag, category or cat feature).
5. In Live mode there's no meter. When Ellie's live Cosy is under 40 for a whole game hour, one cat may say the current hint as a thought bubble, at most once per game day. It's never a nag.

Variety category lists, in hint order:

| Room | Categories |
| --- | --- |
| bedroom | beds, lighting, storage, rugs, walldecor, plants, tables, cat |
| bathroom | bath, lighting, plants, walldecor, rugs, storage |
| spare | gym, lighting, rugs, walldecor, plants, seating |
| living | seating, electronics, lighting, rugs, walldecor, plants, tables, cat |
| kitchen | kitchen, tables, seating, lighting, plants, walldecor, cat |
| garden | garden, lighting, plants, seating, cat, decor |

### 6.5 Worked examples

Computed with the rules above (rated, s = 0, all lights on, no sets).

| Room at the start | Value | Variety | Light | Plants | Cats | Rated | Live by day |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bedroom | 15.9 (V 53) | 6.7 (4) | 9.3 (13 of 42 lit) | 0 | 7.5 | **39** | 42 |
| bathroom | 13.5 (V 27) | 1.7 | 0 | 0 | 0 | **15** | 23 |
| spare | 3.7 (V 11) | 1.7 | 0 | 0 | 1.9 | **7** | 15 |
| living | 11.6 (V 62) | 3.3 | 0 | 0 | 5.6 | **21** | 28 |
| kitchen | 18.5 (V 80) | 6.7 | 0 | 0 | 5.6 | **31** | 38 |
| garden | 8.4 (V 42) | 3.3 | 0 | 4.0 | 3.8 | **20** | 27 |

Starting Home Cosy (rated) = **22**. The flat is liveable by day and gloomy at night, so the first lamps and plants make a visible difference straight away.

A decorated living room (2 to 4 hours in): the starting four items plus `record_shelf`, `armchair_velvet`, `rug_bat`, `lamp_candelabra`, `lamp_floor_arc`, `poster_moth`, `sconce_iron`, `plant_snake`, `plant_monstera`, `cat_tree_small`, `nightstand_coffin` and `cat_toy_basket` (about 390 Hearts of purchases). Value 30, Variety 10, Light 15 (59 of 70 lit), Plants 6.7, Cats 13.1, Goth Parlour 20: **95**. Reason this is fine: a single room at 95 is the reward for focusing; the housewarming needs the whole flat.

### 6.6 Thresholds other specs use (proposals)

| Use | Threshold | Why |
| --- | --- | --- |
| Housewarming available | Home Cosy (rated) ≥ 60 and every scored room ≥ 40 | From the starting 22, that's roughly 4 to 6 hours: every room has had attention (including the bathroom and the spare room) without needing the late unlocks. |
| Home Maker tier 1 | any room rated ≥ 45 | Lands in the first 20 to 40 minutes (the bedroom starts at 39). |
| Home Maker tier 2 | first set completed | Usually Cottage Kitchen or Goth Parlour, in the first hour. |
| Home Maker tier 3 | 3 rooms rated ≥ 65 and 3 different sets completed | Mid game. |
| Home Maker tier 4 | Home Cosy ≥ 80 | The decorator's finale; after the housewarming. |
| Ellie's Cosy need | eases toward `cosyLive` of her current room at up to 30 points per game hour, holds on the front step and while asleep | So walking through a door doesn't snap her mood. |

---

## 7. Bruce, Poe and secrets

### 7.1 Bruce's five hiding spots

Spots 2 to 4 are anchored to an item, so they follow it when it's moved. The default tiles below are for the starting layout.

| # | Spot id | Default tile | Layer | Anchor rule | If the anchor is missing |
| --- | --- | --- | --- | --- | --- |
| 1 | `bruce.fence` | (29,9), sitting on the east fence, facing west | 2 | fixed on the lot | always available |
| 2 | `bruce.under_table` | (16,12), under the kitchen table | 0 | the first placed item offering `eat` with a footprint of 2 × 2 or more (`table_small_round`, `table_dining_long`); Bruce sits on its bottom-left tile | unavailable until such a table is placed |
| 3 | `bruce.behind_tv` | (7,8), peeking out from behind the right end of the TV | 1 | the first placed item offering `watch_tv`: its anchor + (w − 1, 0) | unavailable until a TV is placed |
| 4 | `bruce.fridge_top` | (15,8), on top of the fridge | 2 | the first placed item offering `fridge_snack` | unavailable until a fridge is placed |
| 5 | `bruce.delivery_box` | the delivery box tile, (6,14) by default | 0 | any empty delivery box on the floor in Live mode | appears only while a box exists |

- Window peeks (cosmetic, not one of the five): from the patio outside `win.kitchen_e` at (21,9) and outside `win.spare_e` at (21,2).
- **After all five** (`secret:bruce_all5`): `bruce_wall_cushion` arrives, and Bruce lives on the garden wall. His home tile is the cushion's tile if it's placed, otherwise (27,0) on layer 2.
- Never stuck: every anchor item is a starting item that can always be re-bought (`table_small_round` 40, `tv_small_unit` 70, `fridge_basic` 70), and the journal's Bruce page says which spot is missing.

### 7.2 Secret unlocks

| Secret id | Trigger | Item |
| --- | --- | --- |
| `secret:bruce_all5` | Bruce spotted in all five spots | `bruce_wall_cushion` |
| `secret:housewarming` | the housewarming night plays | `frame_grazie` (only if `personal.ts` `framedPrint` is true) |
| `secret:knighted` | George knights her | `plaque_sir_ellie` |
| `secret:zoomies_photo` | a photo with Salem doing 3 a.m. zoomies in frame | `frame_zoomies` |
| `secret:headbang_peaches` | Ellie headbangs while Peaches bops in the same room | `poster_peaches_rock` |
| `secret:salem_boxes50` | Salem has sat in 50 boxes | `box_throne_salem` |
| `secret:dunks10` | 10 perfect rusk dunks | `rusk_tin_gold` |
| `secret:pickle20` | 20 Pickle deliveries received | `figurine_pickle` |

Poe trades (full scope): `raven_silhouette` and `vase_black_crackle` for 1 trinket, `garden_lantern_paper` and `plant_black_rose` for 2, `garden_gargoyle` for 3, `cabinet_curio` for 5. Poe lands on `garden_bird_bath`.

---

## 8. Interaction ids used by this catalog

sim.md and play.md define numbers, slots and animations for these ids. This list is what the catalog references, so every id here must exist there (or be renamed in both places).

| Id | Who | One line |
| --- | --- | --- |
| `sit`, `nap`, `sleep` | Ellie | Sit; short nap; full sleep (beds only). |
| `read_book` | Ellie | Read (Calm). Shadow's lap-sit happens here at high bond. |
| `dress_up`, `admire_self` | Ellie | Change outfit; check the mirror (small Fun). |
| `admire` | Ellie | Look at a piece of decor (tiny Fun or Calm, a cat may comment). |
| `view_photos` | Ellie | Look through the photo album. |
| `watch_tv`, `play_console`, `play_handheld`, `play_arcade` | Ellie | Screens and Critterbound. |
| `use_laptop`, `order_catalog` | Ellie | Laptop browsing; open Pickle's catalog. |
| `listen_records`, `listen_radio`, `browse_records`, `dance`, `headbang` | Ellie | Music (Heavy, Lo-fi and Cosy stations); browse the sleeves. |
| `make_coffee`, `make_tea`, `grab_rusk`, `fridge_snack`, `make_sushi`, `make_toast`, `cook_simple`, `eat`, `wash_dishes` | Ellie | Food and drink; `make_sushi` starts the sushi activity at a counter. |
| `take_bath`, `freshen_up` | Ellie | Bath (Calm); quick wash. |
| `fill_bowls` | Ellie | Feed the cats. |
| `toggle_light`, `light_lantern` | Ellie | Lamps; light every garden lantern. |
| `water_plant`, `hang_washing`, `bird_watch`, `stargaze`, `check_mail`, `open_race_board` | Ellie | Small home and garden actions; the race board starts a race or shows PBs. |
| `train_skierg`, `train_row`, `train_sled_push`, `train_sled_pull`, `train_wallball`, `train_sandbag`, `train_kettlebell`, `train_farmers`, `run_treadmill`, `stretch` | Ellie | Hyrox training activities. |
| `play_laser`, `play_feather` | Ellie with a cat | Toys from the toy basket. Salem loves the laser. |
| `bow_to_george` | Ellie | Bow to George at his throne or cushion (Royalty). |
| `cat_nap`, `cat_perch_high`, `cat_perch_lid`, `cat_hide`, `cat_play`, `cat_box`, `cat_scratch`, `cat_eat`, `cat_sunbathe`, `cat_warm`, `cat_throne` | cats | Cat smart-object uses. `cat_perch_lid` is Peaches on the record player lid; `cat_box` is Salem's favourite. |

Not tied to an item: `sit_grass` and `lie_grass` (any grass tile, for the coffee-and-rusk ritual and stargazing).

---

## 9. What other specs and modules must match

- **types.ts / contracts (architect):** room ids `bedroom`, `bathroom`, `spare`, `living`, `kitchen`, `garden`, `front`. Rotation 0 = facing down (south), 1 = left (west), 2 = up (north), 3 = right (east). Placement codes from §1.1. A suggested item shape:

  ```ts
  type ItemCategory = 'seating' | 'beds' | 'tables' | 'storage' | 'kitchen' | 'bath' | 'gym' | 'lighting'
    | 'plants' | 'cat' | 'walldecor' | 'rugs' | 'electronics' | 'garden' | 'decor' | 'front';
  type StyleTag = 'Goth' | 'Cottage' | 'Neon' | 'Gym' | 'Cat' | 'Plant' | 'Retro';
  type Placement = 'floor' | 'in' | 'out' | 'rug' | 'wall' | 'window' | 'surface' | 'front';
  type Unlock =
    | { kind: 'start' } | { kind: 'fixture' }
    | { kind: 'aspiration'; aspiration: 'hyrox' | 'royalty' | 'homemaker' | 'collector'; tier: 1 | 2 | 3 | 4 }
    | { kind: 'bond'; cat: CatName; level: 1 | 2 | 3 | 4 }
    | { kind: 'poe'; trinkets: number }
    | { kind: 'secret'; secret: string };
  interface ItemDef {
    id: ItemId; name: StringKey; category: ItemCategory;
    footprint: { w: number; h: number } | 'slot'; orientations: 1 | 2 | 4; placement: Placement;
    tags: readonly StyleTag[]; price: number; unlock: Unlock; art: SpriteKey;
    interactions: readonly InteractionId[]; light: number; slots: number; mvp: boolean;
    maxCopies?: number; valueOverride?: number;
  }
  ```

- **play.md:** aspiration ids `hyrox`, `royalty`, `homemaker`, `collector`, and which items each tier unlocks (§4.4); bond-level unlocks; the Poe trinket prices; the secret ids (§7.2); the Hearts band (§4.3); the housewarming and Home Maker thresholds (§6.6); and the 30-minute delivery time.
- **sim.md:** the Cosy need rule (§6.6); light auto-switching (§6.2); sunbeam hours and geometry (§2.4) for Peaches; the cat comfort features (§6.2), which should match what each cat's AI seeks; the interaction ids (§8).
- **build-mode-dev:** the map (§2.1), back-wall tiles (§2.5), the placement rules (§1.1, including never blocking a door's inside tile), fixtures (§3.2), surface slots, Bruce anchors (§7.1), and the hint rules (§6.4).
- **pixel-artist:** 123 distinct item art bases (80 in MVP), 36 paints, window facings, and the band-name rule for sleeves (§4.1).
- **writer:** `item.<id>.name` and `item.<id>.desc` for 124 items and 5 fixtures, `room.*`, `paint.*`, `set.<id>.name` and `set.<id>.done`, `cosy.hint.*`, `cosy.need.*`, and `item.frame_grazie.text` (exactly "Grazie per essere te stessa").
- **personal.ts (writer):** a boolean `framedPrint`, default `true`.
