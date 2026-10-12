# Ellie's Place: game brief

**One line:** Ellie gets her own place, decorates it however she likes, and lives there with her four cats, who all have opinions about it.

**Where it sits:** the sequel to *Every Version of Me* (`reference/every-version-of-me.html`), which Ellie played and loved. It uses the same world, pixel style, cats and voices. The first game was a journey through rooms with letters. This one is a home: an original life sim in the spirit of The Sims.

Personal facts and tone rules live in `design/ELLIE.md`. Technical constraints live in `design/TECH.md`.

---

## 1. Pillars

When two ideas conflict, the pillar higher on this list wins.

1. **Never stuck, never punished.** Nothing fails, burns, dies or gets taken away. Low needs make Ellie slower and mopier, never broken. Every minigame can be skipped after two misses.
2. **The cats are the stars.** Four autonomous characters you can read at a glance and want to watch.
3. **Her place, her rules.** Decorating is a core joy, not a menu chore.
4. **Made for one person.** Her favourite things are everywhere, waiting to be noticed.
5. **Small discoveries.** Something new to find in every session for the first ten hours.

## 2. Platform and feel

- One self-contained HTML file. Double-click it and it plays offline in Safari or Chrome on her MacBook, and in Chrome, Edge or Firefox on Windows.
- Mouse or trackpad first (click to move, click things to interact), with full keyboard shortcuts. Touch is a nice-to-have.
- Pixel art in a top-down three-quarter view, like game 1. Tiles are 16 px on a 480 × 270 logical canvas, scaled up with nearest-neighbour.
- Sessions of 10 to 40 minutes. Ten minutes should already feel satisfying.

## 3. The home

A ground-floor flat with a small back garden. The base lot is 30 × 17 tiles and fits one screen, with the HUD floating over it.

| Area | Starts with |
| --- | --- |
| Bedroom | Bed, small lamp, wardrobe and mirror |
| Living room | Sofa, record player (from game 1), small TV and console |
| Kitchen-diner | Counter, fridge, kettle, small table, cat bowls |
| Bathroom | Bath and sink |
| Spare room | Empty. It becomes the home gym. |
| Back garden | Grass, a tree, a washing line, a bird bath, and the fence where Bruce appears |
| Front step | Mailbox and doormat |

The place starts sparse on purpose, so decorating has a point.

**Stretch:** unlock an attic or balcony room through an aspiration, and a wall-building tool.

## 4. Time

- A clock with day and night lighting, so lamps matter at night.
- One game day lasts about 24 real minutes at normal speed. Speeds are pause, ×1, ×2 and ×3, and sleeping fast-forwards automatically.
- An optional **real time** setting makes the in-game clock follow her Mac's clock, as an ambient mode where days never skip.
- Saturday is race day.

## 5. Live mode

- **Moving and interacting:** click the floor and Ellie walks there. Click an object, a cat or Ellie herself to open the interaction menu, drawn as small bubble petals around the target in this game's own style.
- **Action queue:** a chosen interaction joins the queue. It holds up to 4 actions, shown top-left, and clicking one cancels it.
- **Free will:** on by default. If the queue is empty for 8 seconds, Ellie picks something sensible on her own.
- **Carrying:** Ellie carries things (a mug, a rusk, a plate, a trinket, a delivery box), and some interactions need them.

## 6. Ellie's needs

All needs run from 0 to 100.

| Need | Drops when | Restored by |
| --- | --- | --- |
| Energy | Always, faster when training | Sleep, naps, coffee (a short boost) |
| Hunger | Always | Cooking veggie sushi, toast, a fridge snack, a rusk |
| Fun | Always | The console, records, dancing or headbanging, playing with cats, photos |
| Fitness | Slowly | Hyrox training, runs, race day |
| Calm | Mess, noise, other low needs | Coffee and a rusk in the grass, a bath, reading, stargazing, a cat on her lap |
| Cosy | Never on its own (it is the current room's score) | Decorating, lamps, plants, cats nearby |

**Mood** is a weighted mix of the needs. It drives Ellie's walk and idle animations, a small mood emote, and a Hearts earning multiplier (×0.8 to ×1.5). There is no game over.

## 7. The cats

Each cat is an autonomous agent with:

- **Shared needs:** Food, Play, Affection and Nap.
- **One personality need**, described below.
- **A bond with Ellie** from 0 to 100, in five levels.
- **Likes, dislikes and idle quirks.**
- **Thought bubbles** (icons) and occasional **speech bubbles** (text, in their voice from game 1).

### George: ginger, striped, the King

- **Need: Royalty.** Met by high perches, being served first, being bowed to, and sitting where Ellie wants to sit.
- **Quirks:** claims her pillow at night, sits on whatever she is using, and inspects every new piece of furniture to approve or disapprove of it. Licks his paw when idle.
- **Bond rewards:** a Knighting interaction, after which he calls her "Sir Ellie", and his crown as an outfit.

### Salem: small, black, sweet and goofy

- **Need: Chaos.** Met by zoomies, knocking small things off surfaces, boxes, the laser pointer and the feather wand.
- **Quirks:** follows Ellie from room to room, does zoomies at 3 a.m., sits in every empty box (every delivery box), loves ham, and can't read.
- **Game loop:** things Salem knocks off shelves sometimes turn out to be Shiny Trinkets, which Poe trades for.

### Shadow: big, black, unimpressed

- **Need: Solitude.** Met by dark, quiet spots: under the bed, on top of the wardrobe, in the closet.
- **Slow trust:** at a low bond he won't be picked up. If Ellie sits still near him for a while, the bond rises. At a high bond he sits on her lap while she reads.
- **Secret softness:** when her mood is low, he quietly comes and sits near her.
- **Music:** leaves the room when the Heavy station is on.

### Peaches: average size, dilute calico, laid-back

- **Need: Vibes.** Met by music playing, sunbeams, and a warm laptop or console.
- **Quirks:** follows sunbeams across the floor through the day (sunbeams are real light patches that move with the time), bops to music, and sits on the record player lid as a hint when it's off.

### Visitors (callbacks to game 1)

- **Bruce, a flame point Siamese:** appears at the garden fence or a window at random, and denies being there. After enough visits he lives on the garden wall. He hides in other places too (see Secrets).
- **Poe, the raven:** lands on the bird bath and trades Shiny Trinkets for rare decor.
- **Pickle, the frog:** runs Pickle's Deliveries. Every catalog order arrives with a knock and a box (Salem gets in the box), plus a delivery note in his voice.

## 8. Build mode: the decorating game

- Press **B** to switch between Live and Build. Time pauses in Build.
- **Tools:** place, move, rotate (R), sell (Delete, always a full refund), duplicate, eyedropper, and undo/redo (Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z).
- **Placement:** on the tile grid with footprints. Wall-mounted items include shelves, posters, wall lights and mirrors. Small decor sits in surface slots on tables, counters and shelves.
- **Paint:** walls and floors per room, in plain, stripes, checks, wood, tiles and wallpaper motifs.
- **Styles:** every item has style tags (Goth, Cottage, Neon, Gym, Cat, Plant, Retro). Matching sets give room bonuses, such as Goth Parlour, Cat Palace, Home Gym and Plant Corner.
- **Cosy score** per room, from 0 to 100. It counts item value, variety, lighting at night, plants, set bonuses, the cats' happiness in that room, and a small clutter penalty (Salem's mess). A meter shows it while building, with a hint of what would raise it.
- **Cat reactions:** when you leave Build mode, cats investigate new things, George approves or disapproves, and Salem knocks over the new vase.

## 9. Catalog: Pickle's Deliveries

- **Currency:** Hearts, earned from wishes, aspirations, bonds, races and good moods. No real money and no waiting timers.
- **Items:** about 120 in total, across seating, beds, tables, storage, kitchen, bath, gym (Hyrox stations), lighting, plants, cat furniture (trees, perches, tunnels, beds, scratchers), wall decor, rugs, electronics and garden.
- **Unlocks:** about 40 items at the start. The rest unlock through aspirations, bonds, Poe's trades and secrets, so the full collection takes roughly 8 to 10 hours.
- **Ordering:** from the laptop or the catalog button. Orders arrive after a short in-game wait, or instantly in Build mode, with an empty box left behind in Live mode for Salem.

## 10. Her favourite things, as activities

### 10.1 Hyrox

- **Home gym:** SkiErg, rower, sled with a track along the garden, wall-ball target, sandbag, kettlebell, farmers-carry handles and a treadmill.
- **Training:** each station is a quick one-button minigame (timing bars, rhythm taps, hold and release). Training raises Fitness and that station's skill (0 to 10).
- **Race day:** on Saturdays, or any time from the race board. It simulates a full race of 8 × 1 km runs alternating with the 8 stations in order:
  1. SkiErg, 1000 m
  2. Sled push, 50 m
  3. Sled pull, 50 m
  4. Burpee broad jumps, 80 m
  5. Rowing, 1000 m
  6. Farmers carry, 200 m
  7. Sandbag lunges, 100 m
  8. Wall balls, 100 reps
- Each station is a 15 to 30 second minigame. The finish time comes from skill, Fitness and minigame performance.
- There's a PB board and medals, and the cats cheer from the side (George judges).
- A bad station only costs time.

### 10.2 Vegetarian sushi

A kitchen minigame: rice, nori, fillings (avocado, cucumber, carrot, pickled radish, inari), roll (hold to roll it tight), then slice (timing). Plates are scored on neatness. George asks for fish every time, and is denied.

### 10.3 Coffee and a rusk in the grass (the signature ritual)

Make a coffee with the machine or kettle, grab a rusk, and sit in the garden grass. Then a dunk minigame: hold to dunk, and let go before the rusk collapses. A perfect dunk gives a big Calm boost. Peaches comes and lies in the sun beside her, and Shadow turns up at a polite distance.

### 10.4 Metal on the record player

- **Stations:** Heavy, Lo-fi and Cosy, all procedural and original.
- **Records:** album sleeves on the shelf show real band names as text only (Pierce the Veil, Deftones, Suicideboys). No logos, artwork or lyrics.
- **Interactions:** listen, dance, headbang (Fun plus a little Fitness).
- **Cats:** Peaches vibes along, and Shadow leaves the room for Heavy.

### 10.5 Gaming

- **Console and TV:** *Critterbound* (working title), a tiny original monster-catching RPG played inside the game. Pick one of three starter critters, explore one screen, win three battles, and catch a few critters. There are 6 original critters and a Spark, Splash, Sprout triangle. Every name and design must be original.
- A pixel handheld for quick play in bed.

### 10.6 Stargazing and wishes (a callback)

- At night, lie in the garden grass and watch for shooting stars, then make wishes, with callback lines from game 1. Cat and heart constellations appear once.
- Light the garden lanterns at night for Cosy and Calm.

### 10.7 Photos

Photo mode (P) lets her frame a shot, pick a filter (polaroid, night, warm) and get an automatic caption from one of the cats. Photos go into the album in the journal and can be saved as PNG.

### 10.8 Dress up (mirror or wardrobe)

- **Outfits:** every outfit from game 1 (crown, chef hat, fishing hat, headphones, cat ears, hair clips, scarf), plus new ones: a race kit, a cosy jumper, a dark band-style tee (original design), boots and a beanie.
- **Her look stays fixed** (see `ELLIE.md`), but the streak colour can change.

## 11. Progression

- **Daily wishes:** 3 each morning, from a context-aware pool of about 60. Each pays Hearts and a mood boost. Examples:
  - "Make vegetarian sushi"
  - "Get Shadow to sit near you"
  - "Play something heavy"
  - "Coffee and a rusk in the grass"
  - "Take a photo of all four cats"
  - "Beat a station PB"
  - "Bow to George"
  - "Let Salem win at laser pointer"
- **Aspirations:** each has 4 tiers, rewarding items, outfits and titles.
  - **Hyrox Hero:** training, then a first race, then a target time, then a PB streak.
  - **Cat Royalty:** bonds with all four cats. The final tier has all four sleeping on the bed with her.
  - **Home Maker:** Cosy milestones and set bonuses.
  - **Collector:** Poe's trades, catalog completion and photos.
- **Housewarming:** when the place is cosy enough, she throws a housewarming night with the lanterns lit and all the cats, Bruce, Poe and Pickle there. A short credits roll plays (a callback), and she gets a keepsake polaroid. The game carries on afterwards.

## 12. Journal (J)

Wishes, aspirations, the catalog collection, cat profiles (bond, likes and quirks discovered), photos, stickers and secrets, race PBs, mail and settings.

## 13. Mail (front step)

Letters arrive on some mornings:

- Pickle's delivery notes
- Poe's trade receipts
- Notes "from" the cats
- Race entry confirmations

The **personal mail slot** in `src/content/personal.ts` delivers items on dates the giver chooses. It is empty by default.

## 14. First day (onboarding)

George gives a royal tour, which can be skipped. Each character teaches one thing in their own voice:

- **George:** moving and interacting ("This is your bed. It was mine. You may borrow it.")
- **Salem:** needs and the action queue
- **Peaches:** the record player and mood
- **Shadow:** Build mode ("Move things. Quietly.")
- **Pickle**, at the door: the catalog

The tour ends with Ellie's first set of wishes.

## 15. Secrets and stickers (examples)

- **Bruce:** spotted in all five hiding places (garden fence, under the kitchen table, behind the TV, on top of the fridge, in a delivery box). Eventually he moves onto the garden wall for good.
- **Salem:** sits in 50 boxes.
- **Rusks:** 10 perfect dunks.
- **Peaches:** a headbang together.
- **Shadow:** sits on her lap.
- **George:** knights her.
- **Photos:** a picture of Salem's 3 a.m. zoomies.
- **Framed print:** "Grazie per essere te stessa", optional (see `ELLIE.md`).

## 16. Audio

- **Engine:** reuse game 1's procedural engine and theme.
- **New arrangements:** Home (calm day), Night, Gym (driving), Heavy (a metal remix), Lo-fi, Cosy and Race Day.
- **Ambience:** birds by day, crickets at night, occasional rain.
- **Sound effects:** per-cat meows and purrs from game 1, plus place, rotate and sell sounds in Build mode.
- **No files:** everything is synthesised, with zero audio files.

## 17. Look

- **Palette and fonts:** the same palette family and style as game 1 (plum, lavender and wine UI), Pixelify Sans for the interface, and IM Fell English for the journal and mail.
- **UI:** original, never a copy of any commercial game's UI.

## 18. Content targets

| Content | MVP (must ship) | Full |
| --- | --- | --- |
| Furniture and decor items | 60 | 120 |
| Ellie interactions | 25 | 45 |
| Cat interactions | 12 | 25 |
| Daily wishes | 30 | 60 |
| Aspirations | 3 × 4 tiers | 4 × 4 tiers |
| Outfits and accessories | 15 | 30 |
| Cat thought and speech lines | 120 | 300 |
| Hyrox stations | 8 | 8 |
| Mail items | 10 | 25 |

## 19. Non-goals

No online features, accounts, network calls or real money. No timers that punish absence, no failure states, no 3D, no AI chat and no voice acting.

## 20. IP rules (hard)

- **The Sims:** this is an original game in its spirit. No EA or The Sims names, logos, plumbob-style diamonds over heads, Simlish or invented-language voices, catchphrases, UI layouts or sounds.
- **Pokémon and Nintendo:** no names, creatures, items or designs. Critterbound and its critters are original.
- **Ellie:** keeps her own original sprite from game 1.
- **Hyrox:** named only as her sport, with no logos.
- **Bands:** real band names appear only as text on record sleeves. No lyrics, logos or album art.
