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
