# Art spec

Owner: pixel-artist (lead). The code half lives in `src/art/base/` (`palette.ts`, `compile.ts`, the ported characters). Contracts: `SpriteDef`, `ArtBatch` and `SpriteAtlas` in `src/core/types.ts`. Footprints in this file are the art's starting point; once `design/spec/home.md` exists, its footprints win and the art follows them.

The look continues game 1 (`reference/every-version-of-me.html`): small outlined sprites, dark plum rooms, lavender and wine accents, warm lamp light.

## 1. Format

- A sprite is an array of equal-width strings, one character per pixel. `.` is transparent. Every other character must be a key in the sprite's palette.
- `makeSprite` (`src/art/base/compile.ts`) adds a 1 px outline on the 4 sides of every filled pixel, so the compiled canvas is `(w + 2) × (h + 2)`.
- Each batch exports `export const BATCH: ArtBatch` from `src/art/<batch>/index.ts`. A `SpriteDef` is `{ key, grid, palette, anchor, frames?, dirs?, outline?, fps? }`.
  - `grid` is the still (or first) frame and is always set.
  - `frames` is a non-directional animation. All frames are the same size.
  - `dirs` is `{ down?, up?, side? }`, each a frame list. `side` always faces **right**; left is `side` mirrored (`flipped`). All frames of one direction are the same size.
  - `outline` overrides the outline colour. `'none'` means no outline (tiles, patterns, outfit overlays).
  - `fps` is the playback speed, default 6.
- Grids are written with a `pad`/`stamp` helper or literally. Keep grids readable: one row per line in source.

### Keys

Dotted, lower case, `[a-z0-9_.]` only. Every key is unique across all batches (a test checks this).

| Prefix | Use | Example |
| --- | --- | --- |
| `ellie.<anim>` | Ellie animations; `spriteFor('ellie', anim)` | `ellie.walk`, `ellie.train.skierg` |
| `cat.<name>.<anim>` | The four cats | `cat.salem.zoomies` |
| `visitor.<name>.<anim>` | Bruce, Poe, Pickle | `visitor.poe.idle` |
| `outfit.<id>` | Outfit overlays (`OutfitDef.sprite`) | `outfit.crown` |
| `item.<id>[.r1\|.r2][.<state>]` | Furniture; rotation 0 has no suffix | `item.sofa_small.r1`, `item.lamp_floor.on` |
| `prop.<kind>` | Carried things and small loose props | `prop.mug`, `prop.rusk` |
| `pattern.<surface>.<pattern>` | 16 × 16 paint templates | `pattern.floor.wood` |
| `motif.<id>` | Wallpaper motifs (`PaintDef.motif`) | `motif.bat` |
| `icon.<group>.<id>` | UI, need, thought and catalog icons | `icon.need.energy`, `icon.thought.ham` |
| `fx.<id>` | Particle and emote sprites | `fx.zz`, `fx.note` |

Rotations follow `Rotation` in `types.ts`: 0 faces down (towards the camera), 1 faces left, 2 faces up (back view), 3 faces right. Rotation 3 is drawn by flipping rotation 1 (`ItemDef.flipFor = { 3: 1 }`) unless the item is asymmetric in a way a flip would break (text, a sink tap on one side is fine to flip). Symmetric items (round rugs, plants, lamps) only have rotation 0.

Object states that change the picture (lamp on, TV on, record playing, box open) are separate keys with a state suffix. Animation inside a state uses `frames`.

### Anchors

The anchor is the grid point (between pixels, before the outline) that lands on the entity's ground position.

| Kind | Anchor | Ground position (engine) |
| --- | --- | --- |
| Actors (Ellie, cats, visitors) | Bottom centre of the feet: `{ x: w / 2, y: h }` | The actor's `Position` in pixels |
| Floor and rug items | Centre of the footprint's front (bottom) edge | `((tx + fw / 2) × 16, (ty + fh) × 16)` |
| Wall items | Centre of the item's bottom edge | Centre of the wall run, on the line where the wall tile meets the floor, minus the item's hang height (default 2 px) |
| Surface decor and props | Bottom centre | The surface slot point |
| Icons, fx, patterns, motifs | `{ x: 0, y: 0 }` (top left) | Wherever the UI or particle puts it |
| Outfit overlays | `{ x: 7, y: 7 }` | The wearer frame's top-centre (wearer grid `(6, 0)`), see §6 |

Y-sorting uses the ground position, so a tall wardrobe's front edge decides what draws over what.

## 2. Palette

All colours live in `PAL` (`src/art/base/palette.ts`). Sprites take colours from `PAL` by name; a raw hex in a batch is a review comment. Each material is a ramp: `hi` (lit, top-left), `base`, `lo` (shade), `deep` (contact shadow and seams). Use 2 or 3 steps of one ramp per material.

| Key | hi | base | lo | deep | Use |
| --- | --- | --- | --- | --- | --- |
| `plum` | `#6b4f8a` | `#5b3f7a` | `#46305f` | `#2e2230` | Fabric, bedding, UI boxes, the house's main colour |
| `lavender` | `#e6d6ff` | `#c9a2ff` | `#8e6cc2` | `#6f5a8c` | Accents, highlights, cushions, sparkles |
| `wine` | `#b0304f` | `#8a2f52` | `#7a2c4a` | `#3a1f2e` | Velvet, roses, record sleeves, goth accents |
| `moss` | `#4f7d5c` | `#3f6b4f` | `#335a42` | `#233a33` | Plants, garden shade, green fabric |
| `leaf` | `#6fbf6a` | `#4f8a3a` | `#2f5a3f` | `#1f3b2d` | Grass, bright leaves, Pickle |
| `wood` | `#8a5a44` | `#6b4a3a` | `#553a2d` | `#3e2c30` | Warm wood: floors, tables, frames |
| `darkwood` | `#5a4046` | `#4a3438` | `#3a282c` | `#2a1d20` | Dark stained wood: shelves, wardrobes, goth furniture |
| `pine` | `#e8d0a8` | `#c49070` | `#a0704f` | `#7a5238` | Pale wood: cottage furniture, cat trees, rusks |
| `stone` | `#b3b0c2` | `#9a97a8` | `#6b6878` | `#55526a` | Stone, paths, the bird bath, concrete |
| `steel` | `#e6e6f0` | `#cfc6d9` | `#8a8599` | `#4d4a5e` | Metal, appliances, gym kit |
| `bone` | `#fbf5ee` | `#efe4d0` | `#c9b8a8` | `#9a8a7c` | Paper, porcelain, sheets, the bath |
| `gold` | `#e9c46a` | `#d4a84f` | `#a8803a` | `#6b4f2a` | Brass, crown, medals, frames |
| `night` | `#5b6f9e` | `#3f5f8a` | `#2e3f66` | `#1f2a44` | Water, glass at night, blue fabric |
| `rose` | `#f7b7c3` | `#e5718f` | `#d98fa0` | `#8e2c4a` | Noses, blush, pink fabric |
| `terracotta` | `#c9785b` | `#b5654a` | `#8a4a3a` | `#5e3329` | Plant pots, bricks |
| `glow` | `#fff3c4` | `#ffd98a` | `#e8b04b` | `#ffb74d` | Lamp shades when lit, flames, lanterns |

Singles:

| Key | Hex | Use |
| --- | --- | --- |
| `ink.outline` | `#1a1320` | The outline on every sprite, and the only "black" allowed inside one |
| `ink.rim` | `#8f84ad` | Lavender rim outline: Salem, Shadow, Poe, and dark items that vanish on dark floors |
| `ink.dim` | `#6f5a8c` | Disabled icons |
| `neon.pink` / `cyan` / `green` / `yellow` | `#ff8fb8` `#8fc8ff` `#5ccf86` `#ffe066` | Only on items tagged Neon (and Ellie's streaks, which are `neon.green`'s twin) |
| `ui.*` | see `palette.ts` | DOM UI colours (box, edge, ink, paper) shared with ui-dev |

Characters have their own named palettes (`PAL.ellie`, `PAL.george`, `PAL.salem`, `PAL.shadow`, `PAL.peaches`, `PAL.bruce`, `PAL.poe`, `PAL.pickle`), all taken from game 1. Ellie's streak colour is a parameter (`elliePalette({ streak })`, BRIEF 10.8); everything else about her is fixed by `design/ELLIE.md`.

**Neon:** only items with the `neon` style tag may use `PAL.neon`. **Lavender rim:** black or near-black subjects (Salem, Shadow, Poe, the record, the black rose, black cat beds) use `outline: PAL.ink.rim` so they read on the dark plum floor.

## 3. Size and view rules

- **Tiles:** 16 px. The canvas is 480 × 270 logical pixels and the lot is 30 × 17 tiles. Silhouettes must read at 2.5× scale.
- **View:** top-down three-quarter, as in game 1. Every object shows its **top face** and its **front face**. The top face is the lighter one. Depth runs up the screen: an object 1 tile deep shows about 10 px of top and the rest as front.
- **Height:** furniture may rise above its footprint by up to 1 tile (16 px), tall items (wardrobe, fridge, cat tree, bookcase) by up to 2 tiles. The front edge stays on the footprint's bottom edge.
- **Fit:** the outlined sprite should cover its footprint. A floor item's grid is `16 × fw − 2` wide so that, with the outline, it is exactly the footprint width. Gaps of 1 to 2 px at the sides are fine for round things.
- **Light:** from the top left. Highlights go on top faces and left edges; `lo` shade on front faces and right edges; `deep` for seams, legs' undersides and contact lines.
- **Shading:** 2 or 3 shades per material, no anti-aliasing, no dithering except on rugs and grass, no gradients. No pure black inside a sprite: use `ink.outline`.
- **Outline:** the compiler adds it. Never draw an outline into the grid, except internal seams in `ink.outline` (for example between a sofa's cushions).
- **Small decor:** surface decor and props stay at or under 12 × 12. Icons are 10 × 10 (need, thought, catalog) or 12 × 12 (toolbar), with the outline making them 12 or 14.
- **Characters:** Ellie is 12 × 16 standing (14 × 18 outlined), so furniture is scaled to her: a seat top is at her row 10 (about 6 px above the floor line), a table top at her row 8, a counter top at her row 6, a bed top at row 11.
- **Wall items:** the back wall face is one tile row. Wall items are at most 16 px tall and as wide as their run (`16 × fw − 2`).
- **Patterns:** 16 × 16, seamless on all sides, no outline. Pattern grids use the palette characters `1`, `2`, `3` for `PaintDef.colors[0..2]`; their registered palette is a default preview.
- **Originality:** never copy or trace any commercial sprite, logo or character (The Sims, Pokémon, Nintendo or anything else). Band names appear only as text on sleeves, drawn by the UI, never as logos. No floating diamonds over heads.
- **Hardware:** consoles, handheld, controller and arcade cabinet use original shapes: no Game Boy brick, no Joy-Con split, no recognisable arcade game on screen (show Critterbound).

## 4. Animation rules

- **Frame counts:** walk 2 to 4 frames, idle 2 frames, special actions 2 to 6 frames. Loops only; one-shots (jump, knock) are played once by the engine and then return to idle.
- **Speeds:** walk 6 fps (8 for zoomies), idle 1 to 2 fps, special actions 4 to 8 fps. Set `fps` on the def.
- **Directions:** `down`, `up`, `side` (facing right). Left is side flipped. If a direction is missing, the atlas falls back to `down`, then `up`, then `side`, and never flips a fallback.
- **Bob:** a frame may lift the body by 1 px, but the head must stay at the same grid rows in every standing frame of Ellie, so outfit overlays line up (§6).
- **Eyes:** blink frames close the eyes with the darker body shade, never with `ink.outline`.
- **Particles** (`fx.*`) cover hearts, notes, zz, sweat, dust and sparkles, so sprites don't draw them in.

## 5. Characters

Batch `base` (lead instance) owns every character sprite. "Wave 1" marks what is ported now from game 1; the rest is drawn later in the same batch with the same keys.

### Ellie

Grid 12 × 16 standing, anchor `(6, 16)`. Black hair (`h`, `H`), green streaks (`g`) at the front and both sides, nose ring (`r`), tattoos (`T`) on both arms and shoulders, sleeveless dark dress, tights, boots. Never cover her shoulders in default outfits.

| Key | Dirs | Frames | Size | fps | Notes |
| --- | --- | --- | --- | --- | --- |
| `ellie.idle` | d u s | 6 (5 open, 1 blink) | 12 × 16 | 2 | **Wave 1** (ported E_DOWN, E_UP, E_SIDE) |
| `ellie.walk` | d u s | 2, later 4 | 12 × 16 | 6 | **Wave 1** (game 1 LEG_F / LEG_S); extend to 4 with a passing frame |
| `ellie.sit` | d (u s later) | 1, later 2 | 12 × 15 | 1 | **Wave 1** (game 1 ELLIE.sit); chairs, sofa, bed edge |
| `ellie.sit_floor` | d s | 2 | 14 × 12 | 1 | Cross-legged in the grass or on a rug |
| `ellie.lie` | s | 2 | 20 × 9 | 1 | Lying in the grass (stargazing, sunbathing); breathing |
| `ellie.sleep` | d | 2 | 12 × 10 | 1 | Head and shoulders on a pillow; the bed's overhead layer draws the blanket |
| `ellie.eat` | d s | 4 | 12 × 15 | 4 | Seated; hand to mouth with the carried food prop |
| `ellie.drink` | d s | 4 | 12 × 15 | 4 | Seated or standing variant via the slot; mug to mouth |
| `ellie.carry` | d u s | 4 | 12 × 16 | 6 | Walk with both arms forward; prop drawn at the hand point |
| `ellie.use` | d u s | 2 | 12 × 16 | 4 | Hands busy at a counter, sink, desk (up = back view) |
| `ellie.read` | d s | 2 | 12 × 15 | 1 | Seated, book open; page turn on frame 2 |
| `ellie.dance` | d | 6 | 14 × 16 | 6 | Arms up, sway, spin through side and up views |
| `ellie.headbang` | d s | 4 | 12 × 16 | 8 | Hair whips forward; streaks flash |
| `ellie.pet` | d s | 2 | 12 × 14 | 3 | Crouched, hand out |
| `ellie.bow` | d s | 2 | 12 × 16 | 2 | Bowing to George |
| `ellie.kneel` | d s | 2 | 12 × 13 | 2 | Being knighted ("Sir Ellie") |
| `ellie.stretch` | d | 4 | 12 × 18 | 4 | Morning stretch, arms up (taller frame) |
| `ellie.bath` | d | 2 | 12 × 9 | 1 | In the bath, head and shoulders; bath front rim is overhead |
| `ellie.game` | d u | 2 | 12 × 15 | 4 | Seated with a controller (up = back view facing the TV) |
| `ellie.handheld` | d | 2 | 12 × 10 | 4 | In bed with the handheld (sleep pose base) |
| `ellie.photo` | d s | 2 | 12 × 16 | 2 | Camera raised |
| `ellie.twirl` | d | 4 | 12 × 16 | 6 | At the mirror; frames show down, side, up, side mirrored |
| `ellie.mope` | d u s | 4 | 12 × 16 | 4 | Mopey walk, head low, slower |
| `ellie.cheer` | d | 2 | 12 × 18 | 4 | Arms up (race finish, perfect dunk) |
| `ellie.dunk` | d | 4 | 14 × 12 | 4 | Sitting in the grass, dunking a rusk |
| `ellie.train.skierg` | s | 4 | 14 × 16 | 6 | Arms pull down from overhead |
| `ellie.train.sledpush` | s | 4 | 16 × 14 | 6 | Leaning forward, arms locked |
| `ellie.train.sledpull` | s | 4 | 16 × 15 | 6 | Leaning back, hand over hand on a rope |
| `ellie.train.burpeebroadjump` | s | 6 | 16 × 16 | 8 | Down, chest to floor, up, jump forward, land |
| `ellie.train.rowing` | s | 4 | 18 × 10 | 6 | Seated: catch, drive, finish, recovery |
| `ellie.train.farmerscarry` | d s | 4 | 14 × 16 | 6 | Walking with a handle in each hand |
| `ellie.train.sandbaglunges` | s | 4 | 14 × 16 | 4 | Bag on shoulders, lunge down and up |
| `ellie.train.wallballs` | d | 4 | 12 × 20 | 6 | Squat, throw up, catch (ball drawn in, taller frame) |
| `ellie.train.run` | s | 4 | 14 × 16 | 8 | Running (treadmill and the race's 1 km runs) |
| `ellie.train.kettlebell` | d | 4 | 12 × 16 | 6 | Swing |

**Hand points** for `ellie.carry`, `ellie.eat`, `ellie.drink` (grid coordinates of the prop's bottom centre): down `(6, 11)`, up hidden (prop drawn behind her), side `(11, 10)`.

### Cats

Each cat keeps its own silhouette from game 1. Black cats (Salem, Shadow) use the lavender rim.

| Cat | Base grid (sitting, front) | Side walk grid | Look |
| --- | --- | --- | --- |
| George | 12 × 12 | 16 × 11 | Ginger with darker stripes, green eyes, a regal upright posture |
| Salem | 9 × 10 | 13 × 9 | Small, black, yellow eyes, sheen on the head, tail often up |
| Shadow | 14 × 14 | 18 × 12 | Big, black, green eyes, broad and low, half-closed eyes by default |
| Peaches | 12 × 12 | 15 × 11 | Dilute calico: white with grey and cream patches, amber eyes, relaxed |
| Bruce (visitor) | 12 × 12 | 16 × 11 | Flame point: white, orange ears and tail tip, light orange marks, blue eyes |

Per cat (`cat.<name>.<anim>`; Bruce uses `visitor.bruce.<anim>`):

| Anim | Dirs | Frames | fps | Notes |
| --- | --- | --- | --- | --- |
| `idle` | d | 2 | 1.2 | **Wave 1**: game 1 sprite plus a 1 px breathing bob |
| `walk` | d u s | 4 | 6 | **Wave 1**: down only, 2 frames (paw lifts); side and up drawn later |
| `sit` | d s | 2 | 1 | Tail flick on frame 2 |
| `loaf` | d s | 2 | 1 | Paws tucked, eyes half closed |
| `sleep` | d | 2 | 0.8 | **Wave 1**: eyes closed (game 1 `shadowSleep` for all); later a curled ball |
| `groom` | d s | 4 | 4 | **Wave 1** for George (game 1 paw lick, down, 2 frames); others later |
| `zoomies` | s | 4 | 10 | Stretched gallop, ears back |
| `knock` | s | 4 | 6 | One-shot: reach, tap, tap, swipe |
| `eat` | u s | 2 | 3 | Head down into the bowl |
| `perch` | d | 2 | 1 | Sitting on a high spot, tail hanging down over the edge |
| `jump` | s | 2 | 6 | One-shot: crouch, leap (the engine moves the sprite between layers) |
| `pet` | d | 2 | 3 | Eyes closed, head pushed up |
| `stretch` | s | 2 | 2 | Front stretch |
| `box` | d | 2 | 1 | Sitting in a delivery box (box front is overhead) |

Personal extras:

| Key | Dirs | Frames | fps | Notes |
| --- | --- | --- | --- | --- |
| `cat.george.inspect` | d s | 2 | 2 | Leaning in, one eyebrow (a stripe) raised |
| `cat.george.approve` / `.disapprove` | d | 2 | 2 | Slow blink / turned head |
| `cat.salem.chatter` | d | 2 | 6 | Mouth open, tail up |
| `cat.salem.laser` | s | 4 | 10 | Pounce at a dot |
| `cat.shadow.eyes` | d | 2 | 0.5 | Only the eyes, for under the bed and the closet (8 × 3) |
| `cat.shadow.lap` | d | 2 | 1 | Loaf on Ellie's lap (drawn over `ellie.read`) |
| `cat.peaches.bop` | d | 4 | 4 | Head bob to music |
| `cat.peaches.sunbeam` | d | 2 | 0.5 | Lying flat on her side in the sun |
| `visitor.bruce.peek` | d | 2 | 1 | Head and paws over the fence or a window sill (12 × 7) |
| `visitor.bruce.wall` | d | 2 | 1 | Loaf on the garden wall |

### Visitors

| Key | Dirs | Frames | Size | fps | Notes |
| --- | --- | --- | --- | --- | --- |
| `visitor.bruce.idle` | d | 2 | 12 × 12 | 1.2 | **Wave 1** |
| `visitor.bruce.walk` | d s | 4 | 16 × 11 | 6 | **Wave 1** down, 2 frames |
| `visitor.bruce.sleep` | d | 2 | 12 × 12 | 0.8 | **Wave 1** eyes closed |
| `visitor.poe.idle` | s | 2 | 12 × 11 | 1.2 | **Wave 1** (game 1 grid mirrored to face right) |
| `visitor.poe.hop` | s | 2 | 12 × 11 | 4 | Small hop on the bird bath |
| `visitor.poe.fly` | s | 4 | 16 × 10 | 8 | Wings up, mid, down, mid |
| `visitor.poe.trade` | s | 2 | 12 × 11 | 2 | Head down, trinket in beak |
| `visitor.pickle.idle` | d | 2 | 12 × 10 | 1.2 | **Wave 1** |
| `visitor.pickle.ribbit` | d | 2 | 12 × 10 | 3 | **Wave 1** (game 1 throat puff) |
| `visitor.pickle.hop` | s | 3 | 14 × 10 | 6 | Hop to the door |
| `visitor.pickle.knock` | d | 2 | 12 × 12 | 3 | Holding the delivery box, knocking |

## 6. Outfits

Outfit overlays are drawn over the wearer after the body, with no outline (as in game 1's `drawOutfit`). An overlay grid is **14 × 20**: one spare column on each side of Ellie's 12 columns and 7 spare rows above her head. Overlay cell `(x + 1, y + 7)` sits on Ellie's grid cell `(x, y)`, which is why the anchor is `(7, 7)`: it lands on her frame's top-centre. Overlays have `down`, `up` and `side` frames; left is side mirrored, like Ellie.

Overlays show on upright poses (idle, walk, sit, carry, use, dance, photo, twirl). Lying, sleeping, bath and training poses hide head and neck overlays.

| Key | Slot | Wave | Notes |
| --- | --- | --- | --- |
| `outfit.crown` | head | **1** | George's crown, gold with a wine gem |
| `outfit.chefhat` | head | **1** | Royal chef's hat |
| `outfit.bucket` | head | **1** | Salem's fishing hat |
| `outfit.headphones` | head | **1** | Peaches' headphones, lavender cups |
| `outfit.catears` | head | **1** | Café cat ears |
| `outfit.scarf` | neck | **1** | Frost scarf, wine |
| `outfit.firefly` | hair | **1** | Firefly clip; the engine adds a small glow (`LightSpec`-like, radius 0.3) |
| `outfit.moon` | hair | **1** | Moon pin |
| `outfit.star` | hair | **1** | Star clip |
| `outfit.feather` | hair | **1** | Poe's feather |
| `outfit.bow` | hair | **1** | Market ribbon |
| `outfit.beanie` | head | later | Dark knit beanie, lavender stripe |
| `outfit.race_kit` | top | later | Race vest with a bib number (no logo) |
| `outfit.jumper` | top | later | Cosy jumper (the one outfit that covers her shoulders; optional) |
| `outfit.band_tee` | top | later | Dark original band-style tee, abstract bat print, no text |
| `outfit.boots` | feet | later | Chunky boots with lavender laces |
| `outfit.sunglasses` | face | later | Small round shades |
| `outfit.choker` | neck | later | Thin choker with a moon charm |
| `outfit.george_crown` | head (George) | later | George's own crown, sized for his head (cat overlay, 14 × 18) |
| `outfit.peaches_headphones` | head (Peaches) | later | Cat-sized headphones |
| `outfit.salem_bow` | neck (Salem) | later | Tiny bow tie |

## 7. Furniture and decor

The item list (every sprite key, size, rotation, state, MVP flag and recolour note) lives in `design/spec/art-checklist.md`, generated from `home.md`; this file's old item ids are void (FROZEN row 21).

## 8. Icons (batch D)

All `outline` default, anchor top-left. Need and thought icons are 10 × 10; toolbar icons are 12 × 12. Only colours from `PAL`. No plumbob-style diamonds, no copied UI glyphs.

**Need icons** (`icon.need.<need>`, 14): `energy` (crescent moon with a small zz), `hunger` (rice ball), `fun` (controller), `fitness` (kettlebell), `calm` (leaf over water ring), `cosy` (lamp), `food` (fish-shaped kibble bowl), `play` (feather wand), `affection` (paw with heart pad), `nap` (curled cat), `royalty` (crown), `chaos` (falling cup), `solitude` (closed door), `vibes` (music note with sun).

**Mood icons** (`icon.mood.<band>`, 5): `mopey`, `low`, `okay`, `good`, `great` (Ellie's face, 10 × 10, black hair with a green streak).

**Thought icons** (`icon.thought.<id>`, 10 × 10, drawn inside the UI's thought bubble): `ham`, `fish`, `bowl`, `box`, `sunbeam`, `music`, `crown`, `zz`, `laser`, `feather`, `lap`, `dark_spot`, `pillow`, `ellie`, `heart_paw`, `question`, `exclaim`, `angry`, `coffee`, `rusk`, `sushi`, `controller`, `kettlebell`, `record`, `bath`, `book`, `star`, `bed`, `plant`, `trinket` (30).

**Toolbar and mode icons** (`icon.ui.<id>`, 12 × 12): `live`, `build`, `photo`, `journal`, `mail`, `catalog`, `settings`, `pause`, `play`, `speed2`, `speed3`, `place`, `move`, `rotate`, `sell`, `duplicate`, `eyedropper`, `undo`, `redo`, `paint_wall`, `paint_floor`, `close`, `hearts` (the currency: a small rounded heart, not a game 1 heart sprite), `queue_cancel`, `fullscreen`, `sound`, `mute`, `skip`, `lock`, `check` (30).

**Catalog category icons** (`icon.cat.<category>`, 12 × 12, one per `ItemCategory`, 16): `seating`, `beds`, `tables`, `storage`, `kitchen`, `bath`, `gym`, `lighting`, `plants`, `catFurniture` (key `icon.cat.cat_furniture`), `wallDecor` (`icon.cat.wall_decor`), `rugs`, `electronics`, `garden`, `decor`, `special`.

**Style tag icons** (`icon.style.<tag>`, 10 × 10, 7): `goth`, `cottage`, `neon`, `gym`, `cat`, `plant`, `retro`.

**Hyrox icons** (`icon.hyrox.<station lower case>`, 10 × 10, 8, plus `icon.hyrox.run` and medals `icon.medal.gold|silver|bronze`).

**Fx** (`fx.<id>`, ≤ 7 × 7): `heart` (pet burst), `note`, `zz`, `sparkle`, `dust`, `sweat`, `steam`, `star_shoot` (shooting star, 9 × 3), `firefly`, `leaf`.

## 9. Batches and ownership

| Batch | Folder | Owner | Content | Contact sheet |
| --- | --- | --- | --- | --- |
| `base` | `src/art/base/` | pixel-artist (lead) | Compiler, palette, every character, outfits | `reports/art/base.png` |
| `b` | `src/art/b/` | pixel-artist B | checklist batch B | `reports/art/b.png` |
| `c` | `src/art/c/` | pixel-artist C | checklist batch C and props | `reports/art/c.png` |
| `d` | `src/art/d/` | pixel-artist D | checklist batch D, patterns, motifs, §8 icons, fx | `reports/art/d.png` |

`src/art/base/sheet.ts` finds every `src/art/*/index.ts` that exports `BATCH` and draws one sheet per batch, so new batches need no wiring. The engine gets the same list from the integrator (`sprites: [BASE.BATCH, B.BATCH, ...]`).

### Registry API for batch authors

```ts
import type { ArtBatch, SpriteDef } from '../../core/types';
import { PAL, def, pad, stamp, mirror } from '../base';

const sofa: SpriteDef = def('item.sofa_small', SOFA_GRID, { w: PAL.plum.hi, p: PAL.plum.base, ... }, { anchor: { x: 15, y: 24 } });
export const BATCH: ArtBatch = { id: 'b', title: 'Bedroom, living, lighting', sprites: [sofa, ...] };
```

- `def(key, grid, palette, opts?)` builds a `SpriteDef`; `opts` takes `anchor` (default bottom centre), `frames`, `dirs`, `outline`, `fps`.
- `pad(grid, { top, right, bottom, left })`, `stamp(grid, x, y, patch)`, `fill`, `lift`, `mirror(grid)`, `recolor(grid, map)`, `seq(frames, counts)` and `rectsToGrids` are pure grid helpers.
- `rasterize(grid, palette, outline)` returns RGBA pixels (works in Node, used by tests); `makeSprite`, `flipped`, `compileSprite` need a canvas.
- `validateBatch(batch)` returns a list of problems (key format, duplicate keys, ragged rows, unknown palette characters, bad colours, mismatched frame sizes). Each batch's unit test calls it and expects `[]`.

## 10. Review checklist (every batch, before reporting)

1. `npm run art:sheet`, then open `reports/art/<batch>.png` with Read.
2. Silhouette reads without the label at 2.5×. Each cat is recognisable by shape alone.
3. Light from the top left; top faces lighter than front faces.
4. Only `PAL` colours; neon only on Neon items; rim outline on black subjects.
5. Anchors: feet or front edge on the ground line (the sheet marks the anchor with a small cross).
6. Footprint fit: the outlined width matches `16 × fw` (check against the 16 px grid the sheet draws behind every sprite).
7. `npm run typecheck`, `npm run lint`, `npm test` pass.
