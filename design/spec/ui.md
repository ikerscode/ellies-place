# UI design

Owner: ui-dev. Status: Wave 1 spec. Implements `createUi(deps: UiDeps): Ui` in `src/ui/` and the stylesheet in `src/styles/`.

This page is the complete UI design: every screen, the HUD, the interaction bloom, bubbles, panels, the keyboard map, the component kit, theme tokens, accessibility, and the events the UI sends and hears. Build-mode-dev builds the build tools bar and the catalog body with `ui.kit`, following sections 9 and 10 here.

Sources: `design/BRIEF.md` (sections 2, 5, 8, 9, 12, 14, 17, 20), `design/ELLIE.md`, `design/TECH.md` (Display), `design/spec/contracts.md`, `src/core/types.ts`, and the CSS of game 1 in `reference/every-version-of-me.html`.

Facts this spec relies on (decided elsewhere): the action queue holds 4 including the running action (`LIMITS.queue`); Skip appears after 2 misses in any minigame; bond levels run 0 to 4; a new game starts with 150 Hearts; there are four aspirations (Hyrox Hero, Cat Royalty, Home Maker, Collector) with 4 tiers each; there are 3 wish cards a day; at most 2 speech bubbles show at once (`LIMITS.speechOnScreen`).

---

## 1. Principles

1. **Original.** The layout, shapes and motion are this game's own. No diamond or gem over anyone's head, no radial text pie menu, no bottom-bar copy of any commercial life sim, no Pokémon or Nintendo styling. The look continues game 1: plum boxes, lavender accents, wine buttons, paper cards.
2. **The world comes first.** The 480 × 270 lot fills the canvas, so the HUD is small floating clusters in the corners, never a full-width bar. Clusters fade when Ellie walks behind them (section 5.9).
3. **Mouse first, keyboard complete.** Every control works with a click and with the keyboard, has a hover state, and has a visible focus ring. Needs, Hearts, wishes, queue items and petals have tooltips.
4. **Strings only by key.** Every visible word comes from `deps.strings(key, vars)`. The UI code holds no text. Section 24 lists the keys the writer must supply.
5. **Never punishing.** Nothing in the UI uses alarm red, error buzzers, countdowns or "failed". A rejected action gets a soft wiggle and a gentle line.
6. **Cats everywhere.** Captions, empty states, tooltips and toasts are voiced by the cats where it fits (the writer picks the lines; the UI gives each slot a speaker).

---

## 2. Stage, layers and the scaling rule

### 2.1 DOM structure

The integrator passes `deps.root`, the stage element that wraps the canvas. `createUi` builds this inside it:

```
body (letterbox, background var(--page))
└─ #stage                      sized by the engine: 480*scale x 270*scale CSS px, centred
   ├─ canvas                   the world (engine)
   └─ #ep-ui                   = deps.root content, position:absolute, inset:0, --u set here
      ├─ .ep-world-proxies     focusable buttons over entities (keyboard targeting, 20.6)
      ├─ .ep-bubbles           speech and thought bubbles (pointer-events:none)
      ├─ .ep-bloom             the interaction bloom (petals)
      ├─ .ep-hud               live HUD clusters / build HUD / photo HUD / activity HUD
      ├─ .ep-toasts            role=status, aria-live=polite
      ├─ .ep-dialog            onboarding dialogue box
      └─ .ep-tooltip           one shared tooltip element
#ep-modal                      position:fixed, inset:0, z-index above stage; panels, scrims
#ep-sr                         visually hidden live regions (polite and assertive)
```

`#ep-modal` and `#ep-sr` are appended to `document.body` by `createUi`, and removed by `destroy()`. Panels sit in `#ep-modal` so a journal can be larger than a small stage, but they still use `--u` (copied onto `#ep-modal` by `setScale`).

### 2.2 Layers (z order, low to high)

| z | Layer | Pointer events |
| --- | --- | --- |
| 0 | canvas | engine |
| 10 | world proxies (invisible until focused) | yes |
| 20 | thought and speech bubbles | none |
| 30 | HUD clusters | yes |
| 40 | bloom (petals) | yes |
| 50 | toasts | hover and click only |
| 60 | dialogue box (onboarding) | yes |
| 70 | tooltip | none |
| 100 | `#ep-modal` scrim and panels | yes |
| 110 | confirm dialog | yes |
| 120 | credits roll | yes |

### 2.3 Scaling rule

- The engine owns the canvas scale (TECH Display: the largest integer that fits; on a viewport where that is under 3, a fractional scale of 2.5 or more in quarter steps). The UI does not compute it. The engine (through the integrator) calls `ui.setScale(scale)` on boot and on every resize.
- **`--u` equals one logical canvas pixel in CSS px.** `setScale(s)` sets on `#ep-ui` and `#ep-modal`:
  - `--u: {s}px`
  - `--b1: {max(1, round(s * 0.8))}px` (thin border, integer so edges stay crisp)
  - `--b2: {max(2, round(s * 1.2))}px` (thick border, focus ring)
  - `--ts: 0.9 | 1 | 1.2` from `settings.textSize` (`small`, `normal`, `large`)
- Every size in the stylesheet is `calc(var(--u) * n)`, so HUD positions match canvas pixels exactly. Wireframes in this page are in **u** (logical pixels, the canvas is 480u × 270u).
- Text uses the floor formula in 3.2, so it never drops below the minimum size whatever the scale.
- Expected scales: 1280 × 720 → 2.5; 1440 × 800 → 2.75; 1920 × 1080 → 4. All three must be checked.
- When `scale` changes, the UI re-places bubbles, the bloom and the tooltip in the same frame.

### 2.4 Positions and anchoring

- World-anchored things (bubbles, bloom, name tags, focus proxies, find rings) are placed with `deps.worldToScreen(world)`, which returns CSS px relative to the stage. The UI updates them in `ui.update(state, dtMs)` every rendered frame, using the entity's `position.pos` (render interpolation is not needed; bubbles may lag by one tick).
- The head point of an actor is its screen position minus the sprite's frame height (`atlas().frame(key, facing, 0).h`, or 24u when the atlas is not ready) minus 2u.
- Every anchored box is clamped inside the stage with a 4u margin (section 7.3).

---

## 3. Theme tokens

All tokens are CSS custom properties on `:root` in `src/styles/tokens.css`. Values continue game 1's palette.

### 3.1 Colours

| Token | Value | Use | Contrast |
| --- | --- | --- | --- |
| `--page` | `#15121c` | letterbox around the stage | n/a |
| `--box` | `#221c2d` | panels, chips, HUD clusters | base |
| `--box-edge` | `#0f0b14` | outer borders, button shadows | n/a |
| `--box-inner` | `#3d3452` | inner bevel, secondary buttons, track | n/a |
| `--plum` | `#2d2640` | list rows, inputs, card backs | n/a |
| `--ink` | `#efe6f5` | text on dark | 13.6 on box |
| `--muted` | `#9d90b3` | secondary text, hints | 5.6 on box |
| `--lav` | `#c9a2ff` | accents, headings, focus ring, selection | 7.9 on box |
| `--wine` | `#7a2c4a` | primary buttons, active mode, ribbons | ink 7.6 on it |
| `--wine-hi` | `#9a3a60` | primary hover | ink 5.5 on it |
| `--paper` | `#efe4d0` | journal pages, mail card, polaroids | base |
| `--paper-ink` | `#2a2030` | text on paper | 12.4 on paper |
| `--paper-muted` | `#6b5a74` | secondary text on paper | 5.0 on paper |
| `--bubble` | `#fbf6ee` | speech bubbles | paper-ink 14.5 |
| `--hearts` | `#ff8fb1` | Hearts icon and numbers | 7.7 on box |
| `--need-ok` | `#c9a2ff` | candle wax 50 and up (same as lav) | |
| `--need-mid` | `#e8b25c` | candle wax 25 to 49 | 8.6 on box |
| `--need-low` | `#e07a8a` | candle wax under 25 (soft rose, never alarm red) | 5.8 on box |
| `--locked` | `#6f6488` | padlocks, silhouettes, disabled borders only, never text | 3.0 |
| `--scrim` | `rgba(12, 9, 18, 0.84)` | behind modal panels | |
| `--night-tint` | `rgba(40, 30, 80, 0.25)` | optional HUD tint at night | |

Text always uses `--ink`, `--muted`, `--lav`, `--paper-ink` or `--paper-muted`, which all pass 4.5:1 on their backgrounds. Colour never carries meaning alone (see 22.4).

### 3.2 Type

- `--font-ui: "Pixelify Sans", ui-rounded, "Trebuchet MS", system-ui, sans-serif` for all interface text.
- `--font-paper: "IM Fell English", Georgia, "Times New Roman", serif` for the journal headings and page text, mail, the title screen subtitle, captions on polaroids, and the credits' big lines.
- Both fonts are inlined (TECH stack). The UI waits for `document.fonts.ready` before measuring bubbles.

Sizes (the `max()` floor keeps the minimum; `--ts` applies to both terms):

| Token | Formula | At u = 2.5 / 2.75 / 4 (normal) | Use |
| --- | --- | --- | --- |
| `--fs-xs` | `max(calc(var(--u)*4.5*var(--ts)), 11px)` | 11 / 12.4 / 18 | numeric badges and counters only |
| `--fs-s` | `max(calc(var(--u)*5*var(--ts)), calc(12px*var(--ts)), 12px)` | 12.5 / 13.8 / 20 | tooltips, captions, hints, key labels |
| `--fs-m` | `max(calc(var(--u)*5.6*var(--ts)), calc(13px*var(--ts)), 12px)` | 14 / 15.4 / 22.4 | body, chips, petals, bubbles, buttons |
| `--fs-l` | `max(calc(var(--u)*7*var(--ts)), calc(16px*var(--ts)))` | 17.5 / 19.3 / 28 | panel titles, dialogue text |
| `--fs-xl` | `max(calc(var(--u)*10*var(--ts)), calc(22px*var(--ts)))` | 25 / 27.5 / 40 | journal page headings (IM Fell) |
| `--fs-title` | `max(calc(var(--u)*17), 30px)` | 42.5 / 46.8 / 68 | title screen logo only |

**Minimum text size:** 12 CSS px for any word, 11 CSS px for bare numbers in badges. Prose (mail, journal pages, dialogue) never goes under 15 px. The large text setting raises every floor by 20%.

Line height 1.3 for UI, 1.55 for paper text. Letter spacing 0.02em for Pixelify; headings in caps (section labels) use 0.14em, as in game 1's journal `h3`.

### 3.3 Spacing, borders, radii, shadows

| Token | Value |
| --- | --- |
| `--sp-1` / `--sp-2` / `--sp-3` / `--sp-4` / `--sp-6` | `calc(var(--u) * 1 / 2 / 3 / 4 / 6)` |
| `--r-s` / `--r-m` / `--r-l` | `calc(var(--u) * 2 / 3 / 5)` |
| `--edge` | `var(--b2) solid var(--box-edge)` (outer border, as game 1's `1.2u`) |
| `--bevel` | `inset 0 0 0 var(--b1) var(--box-inner)` |
| `--lift` | `0 calc(var(--u)*1.5) 0 var(--box-edge)` (button drop shadow, as game 1's `.btn`) |
| `--float` | `0 calc(var(--u)*4) calc(var(--u)*10) rgba(10, 6, 16, 0.45)` (panels) |
| `--glow` | `0 0 calc(var(--u)*6) rgba(201, 162, 255, 0.55)` (headings, highlight) |

### 3.4 Motion

| Token | Value | Reduced motion |
| --- | --- | --- |
| `--t-fast` | 120 ms | 0 ms |
| `--t-med` | 220 ms | 120 ms, opacity only |
| `--t-slow` | 420 ms | 120 ms, opacity only |
| `--ease-pop` | `cubic-bezier(0.3, 1.4, 0.5, 1)` | `linear` |
| `--steps` | `steps(2)` for pixel bobbing (game 1 `bob`) | no animation |

Keyframes reused from game 1: `pop` (bubbles, petals), `bob` (dialogue "next" arrow). New: `wilt` (disabled petal droops 8°), `wiggle` (soft no, 2 × 3u), `flicker` (candle flame, steps(3)), `peg-drop` (cancelled queue card falls 10u and fades), `deal` (wish cards slide up in turn), `flip` (wish done).

---

## 4. Screen map

### 4.1 Screens and overlays

| Screen | Kind | `PanelId` / mode | Opened by | Pauses time | Closes with |
| --- | --- | --- | --- | --- | --- |
| Title | full screen | `title` | boot; Settings > Quit to title | n/a (no sim running) | Continue, New game, Load from file |
| Live HUD | HUD | mode `live` | default | no | n/a |
| Interaction bloom | anchored popover | `ui.menu` event | click an entity or Ellie; Enter on a focused target | no | choose, Esc, right click, click elsewhere |
| Build HUD | HUD | mode `build` | B, Build token | yes (mode) | B, Done, Esc with nothing selected |
| Catalog (build) | docked drawer | `catalog` | C or Catalog in build | yes (mode) | C, close, Esc |
| Catalog (live order) | modal | `catalog` | C, Catalog token, laptop "Order" | yes (soft) | close, Esc, Order |
| Journal | modal book, 9 tabs | `journal` + `JournalTab` | J, Journal token | yes (soft) | J, close, Esc |
| Photo mode | HUD | mode `photo`, `photo` | P, Photo token, camera petal | yes (mode) | P, Esc |
| Photo preview | modal card | `photo` | after Snap | yes (mode) | Keep, Retake, Esc |
| Minigame overlay | HUD over activity canvas | mode `activity` | sim `activity.request` | the activity runs its own clock | result card Continue; Leave from pause menu |
| Mail reader | modal paper card | `mail` | read mail in journal; collecting letters | yes (soft) | close, Esc |
| Wardrobe | modal | `wardrobe` | mirror or wardrobe petal "Get dressed" | yes (soft) | Done, Esc |
| Cat panel | non-modal popover | `cats` | K, a cat tab on the right edge | no | K, close, Esc, click elsewhere |
| Poe's trades | modal | `trade` | Poe's "Trade" petal at the bird bath | yes (soft) | close, Esc |
| Race board | modal | `raceBoard` | race board petal; Race day badge | yes (soft) | close, Esc, Start race |
| Settings | modal | `settings` | Esc with nothing open; title Settings; journal tab | yes (soft) | close, Esc |
| Credits roll | full screen | `credits` | housewarming done; Settings > Credits (after the first time) | yes (soft) | Skip, end buttons |
| Confirm dialog | modal over modal | `confirm` | risky choices (new game over a save, import, delete photo) | inherits | the two buttons, Esc = the safe one |
| Onboarding dialogue | docked box | n/a (`onboarding.step`) | sim onboarding steps | sim mode `cutscene` or live | lines advance; Skip tour |
| Keyboard help | modal | `confirm` styled as help (no new id needed) | ? (Shift + /) | yes (soft) | Esc, ? |

**Soft pause:** when a modal that pauses opens in live mode, the UI remembers `time.speed`, dispatches `time.setSpeed 0`, and on the last modal closing dispatches the remembered speed. These are ordinary `PlayerAction`s, so replays stay exact. Real-time mode skips the soft pause (the clock follows the Mac; nothing to pause).

### 4.2 Flow

```
           +---------+  Continue / New game / Load from file
 boot ---> |  Title  | -------------------------------------+
           +---------+                                      v
                ^                                    +-------------+
                | Settings > Quit to title           |  Live HUD   |<-----------------------------+
                |                                    +-------------+                              |
                |      B / Done      J / Esc        P / Esc      K           click entity        |
     +----------+----+-------+--------+----+-------+------+-------+-------+----------+--------+   |
     v               v               v             v              v                  v        |   |
 +--------+    +-----------+   +----------+  +-----------+   +-----------+     +---------+    |   |
 |Settings|    | Build HUD |   | Journal  |  |Photo mode |   | Cat panel |     |  Bloom  |----+   |
 +--------+    |  + drawer |   | 9 tabs   |  | > preview |   +-----------+     +---------+        |
               | (catalog) |   | > mail   |  +-----------+                       | petal          |
               +-----------+   |   reader |                                      v                |
                               +----------+                    interact -> queue -> maybe          |
                                                               activity.request -> Minigame ------+
 sim events: onboarding.step -> dialogue box;  housewarming done -> Credits -> Live
 petals: Get dressed -> Wardrobe;  Trade -> Poe's trades;  Race board -> Race board;  Order -> Catalog
```

### 4.3 Which HUD shows in which mode

| Element | live | build | photo | activity | cutscene | title |
| --- | --- | --- | --- | --- | --- | --- |
| Action queue | yes | no | no | no | no | no |
| Clock and speeds | yes | clock only, "Paused while you build" | no | no | clock only | no |
| Hearts | yes | yes | no | no | no | no |
| Ellie card (portrait, mood, candles) | yes | no | no | no | no | no |
| Wish cards | yes | no | no | no | no | no |
| Mode tokens | yes | Done only | no | no | no | no |
| Cat tabs | yes | no | no | no | no | no |
| Build bar, cosy chip | no | yes | no | no | no | no |
| Speech bubbles | yes | no | toggle (default on) | docked cheers (16.4) | yes | no |
| Thought bubbles | yes | no | toggle (default off) | no | no | no |
| Toasts | yes | yes | yes | queued until the result card | yes | yes |

---

## 5. Live HUD

### 5.1 Layout

The canvas is 480u × 270u. One character below is about 5u across; one row is about 10u. Margins are 4u from every stage edge.

```
 0u                                                                                          480u
+------------------------------------------------------------------------------------------------+
| (1) QUEUE (peg line)                       (8) toast lane              (2) CLOCK      (2b) <3  |
|  o-------o-------o-------o-------o                                  [sun Tue 10:42am D3][<3 150]|
|  |[@@]   |[@]    |[@]    |[ ]    |       [ toast: Wish done! +15 ]  [ || | > | >> | >>> ]     |
|  |coffee |rusk   |bath   |       |                                  [box Pickle: 1 order 0:25]  |
|                                                                                          (3)   |
|                                                                                         [Geo]  |
|                                                                                         [Sal]  |
|                                     the lot (world canvas)                              [Sha]  |
|                                                                                         [Pea]  |
|                                                                                        (+Bruce)|
|                                                                                                |
| (4) ELLIE CARD          (5) CANDLES             (6) WISH CARDS              (7) MODE TOKENS    |
|  .---------.     , , , , , ,                  .-----. .-----. .-----.                          |
|  | portrait|     | | | | | |                  | *   | | *   | | *   |     (Hm)(Bd)(Ct)(Jn)(Ph)  |
|  | (mood   |     | | | | | |                  | icon| | icon| | icon|                           |
|  '-sticker-'     E H F Fi Ca Co               '-----' '-----' '-----'                          |
|    "good"                                       (peek up from the bottom edge)                 |
+------------------------------------------------------------------------------------------------+
```

| # | Cluster | Anchor | Size (u) |
| --- | --- | --- | --- |
| 1 | Action queue | top-left, (4, 4) | up to 112 × 30 |
| 2 | Clock and speed control | top-right, right 4, top 4 | 120 × 26 |
| 2b | Hearts chip | right of the clock row | 40 × 12 |
| 2c | Orders chip (only while orders are pending) | under the speed control | 100 × 10 |
| 3 | Cat tabs | right edge, vertically centred | 18 × 80 (+18 for a visitor) |
| 4 | Ellie card | bottom-left, (4, bottom 4) | 34 × 44 |
| 5 | Six candles | right of the Ellie card | 72 × 34 |
| 6 | Wish cards | bottom centre | 3 × 28 wide, peeking 24 |
| 7 | Mode tokens | bottom-right | 5 × 18 + gaps = 104 × 18 |
| 8 | Toast lane | top centre, top 6 | max 180 wide |

Clusters are `--box` chips with `--edge` borders and `--bevel`, at 92% opacity, like game 1's `.chip`. Nothing spans the full width; the world shows between clusters.

### 5.2 Action queue (top-left): the peg line

- A thin lavender line runs from the top-left corner, and each queued action hangs from it as a small card on a peg (a nod to the garden washing line).
- **Slot 1 is the running action** (`agent.current`): a 22u card with the interaction icon and a progress ring drawn as the card's border filling clockwise. Progress is `elapsedMinutes / fixed minutes` for `fixed` durations; `untilNeed` uses the need's distance to its target; `pathing` and `approach` show a slow dotted shimmer; `activity` shows a small gamepad pip.
- **Slots 2 to 4** are the queued actions (`agent.queue`), 16u cards. The queue never shows more than `LIMITS.queue` (4) cards in total. Empty slots show nothing; the line simply ends.
- **Free will picks** (`source: 'freeWill'`) have a dashed border and a tiny sparkle badge. Tooltip adds "Ellie chose this herself".
- **Cancel:** hovering or focusing a card shows a small × over it and the tooltip "{interaction}. Click to cancel." Clicking (or Enter, Space, Delete or Backspace on the focused card) dispatches `{ type: 'queue.cancel', actionId }`. The card plays `peg-drop` and the cue `ui.queueCancel`. If the sim rejects it, the card wiggles.
- **Adding:** a new card swings in from the left on its peg (`ui.queueAdd`). When the queue is full and the player picks a petal, the sim rejects with its reason; the UI shows it as a gentle toast and wiggles the line.
- Accessibility: the cluster is `role="list"` labelled "Ellie's plans"; each card is a `button` with `aria-label` "{label}, {n} of {total}. Cancel."

### 5.3 Clock, speed control, Hearts, orders (top-right)

```
 .-----------------------------------.  .---------.
 | (sun) Tue  10:42 am       Day 3   |  | <3  150 |
 '-----------------------------------'  '---------'
 [ || ][ >  ][ >> ][ >>> ]   (race day ribbon on Saturdays)
 [ box  Pickle: 1 order, 0:25 ]
```

- **Clock:** phase icon (dawn, day, dusk, night sprites `icon.phase.*`), weekday short name, `clockText(minuteOfDay)` in 12-hour form with am/pm, and "Day n". Tooltip: the full weekday and how long until morning wishes.
- **Speed control:** a segmented radio group of 4 buttons: pause, ×1, ×2, ×3, with `aria-pressed`. Clicking dispatches `time.setSpeed` (pause dispatches `time.togglePause` so the last speed is kept). Cue `ui.speed` or `ui.pause`. While Ellie sleeps and `time.fastForward > 1`, the control shows a small "Zz" pip and the ×3 arrows glow; the buttons still work.
- **Real time on:** the speed control is replaced by a lavender "Real time" pill; clicking it opens Settings at the Play section.
- **Race day:** on Saturdays a small wine ribbon reading "Race day" hangs under the clock; clicking opens the race board.
- **Paused look:** when speed is 0, the clock text blinks once per second (`steps(2)`, off in reduced motion) and the chip gets a lavender border.
- **Hearts chip:** heart icon and the balance. On `hearts` sim events a "+n" or "-n" floats up 10u from the chip and fades (cue `ui.hearts`; spending floats in `--muted`). Tooltip: balance, earned and spent totals, and "Mood bonus ×{n}" from the current mood multiplier. Clicking opens the catalog.
- **Orders chip:** shown only while `inventory.orders` is not empty: a box icon, "Pickle: {n} on the way" and the in-game time until the soonest `arriveTick`. In real-time mode the countdown still reads in game minutes.

### 5.4 Ellie card (bottom-left)

```
  .-----------.
  |  .-----.  |   polaroid frame (--paper), tilted -2 degrees
  |  |Ellie|  |   portrait sprite at 2x: `portrait.ellie.<band>`, fallback `ellie.idle` down frame
  |  '-----'  |
  |      (:)  |   mood sticker on the corner: emote icon for the band
  '-----------'
     "good"       mood word in Pixelify, --lav, with a 5-pip mood dot row under it
```

- The portrait changes with the mood band (`mopey`, `low`, `okay`, `good`, `great`). On a `mood.band` event the sticker pops (`pop`) and the word changes.
- Tooltip: the mood word, the mood value as five pips (never a raw percentage), and the list of active `Feeling`s with icon, label and time left in game hours ("Perfect dunk, 3 h"). Ends with "Hearts ×{n}".
- Clicking the portrait opens Ellie's own bloom (the same petals as clicking her sprite). This is how she reaches self interactions when Ellie is behind furniture.
- While Ellie carries something (`agent.carrying`), a small item icon sits in the polaroid's bottom-left corner with the tooltip "Carrying: {item}".

### 5.5 The six candles (needs)

Each need is a short candle: a wax column whose height is the need value, a flame on top, and the need icon under it. Order: Energy, Hunger, Fun, Fitness, Calm, Cosy.

```
   ,    ,    ,    ,    ,    ,      flame: tall and flickering at 50+, small at 25-49, a tiny ember under 25
  | |  | |  | |  | |  |.|  | |     wax height = value / 100 * 24u
  | |  | |  |.|  | |  |.|  | |     wax colour: --need-ok / --need-mid / --need-low
  |_|  |_|  |_|  |_|  |_|  |_|
   E    H    F    Fi   Ca   Co      icons `icon.need.<key>`, 8u
```

- Size: each candle 6u wide, 24u tall, 12u apart. The kit `meter` renders it with the class `ep-meter--candle` (the default meter is horizontal).
- Low states use three cues at once, never colour alone: the wax colour, the flame size, and a small droop of the icon (`wilt`, 6°) under 25.
- **Cosy** is the room score, not a decaying need: its icon is a little house, and its tooltip names the room ("Living room: cosy 58"). It never shows the low droop, only a lower flame.
- Tooltip on hover or focus: "{Need} {value}" and one line on what helps, from `ui.need.<key>.help` (for example "A nap, bed, or a coffee for a quick lift."). Values are shown rounded.
- When a need rises by 10 or more at once, its flame gives one bright flicker. Reduced motion: a 1-frame brightness change.
- Accessibility: each candle is `role="meter"` with `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow`, and `aria-label` from the need name. The group is labelled "Ellie's needs".

### 5.6 Wish cards (bottom centre)

```
          .------.  .------.  .------.        cards 28u x 36u, rest position: 24u visible
          |*     |  |*     |  |  /*  |        top-left: a small shooting-star mark
          | icon |  | icon |  | DONE |        centre: the wish icon at 2x
          |      |  |      |  |stamp |        done: flipped, gold star stamp
   hover: card rises 10u and a caption appears above it:
          .----------------------------------.
          | Coffee and a rusk in the grass   |
          | +15 <3                           |
          '----------------------------------'
```

- Three cards from `wishes.active`, in order. On `wish.rolled` (each morning, and at the end of onboarding) they `deal` in from below one after another with cue `ui.wish`.
- Hover or focus raises the card and shows its caption: the wish title, the Hearts reward, and any extra reward icon. Clicking pins the caption until the next click elsewhere.
- **Done:** on `wish.completed` the card flips to the stamp side (`flip`), a star particle arcs to the Hearts chip, a toast says "Wish done: {title}", and the Hearts "+n" floats. The done card stays until the next roll, so she can see what she did today.
- **All three done:** the cards tilt into a little fan and the caption reads a cat line (`ui.wish.allDone.<cat>`).
- **None yet** (before the first roll, or day 1 during the tour): a single dashed outline card with "Wishes arrive in the morning".
- Accessibility: `role="list"` labelled "Today's wishes"; each card is a `button` with the full title, reward and done state in its label.

### 5.7 Mode tokens (bottom-right)

Five round tokens, 18u, with sprite icons and key hints in their tooltips:

| Token | Icon | Action | Key |
| --- | --- | --- | --- |
| Home | house | `mode.set live` (only shown active; it is the current mode in live) | Esc returns here |
| Build | hammer | `mode.set build` | B |
| Catalog | Pickle's box | open `catalog` | C |
| Journal | book | open `journal` (last tab, or `wishes`) | J |
| Photo | camera | `mode.set photo` | P |

- The active mode token is wine with a lavender rim. Others are `--box`. Hover lifts by 1u.
- **Badges:** the Journal token shows a small lavender dot with a number for unread mail plus unseen stickers, unlocks and aspiration tiers (the UI keeps "seen" ids in its own `localStorage` key `ellies-place:ui:seen`, inside try/catch; losing it only re-shows dots).
- The Build token is disabled (with a tooltip from George) during the onboarding steps before Shadow's build lesson, when the sim says so through a failing `mode.set` (the UI does not hard-code the rule).

### 5.8 Cat tabs (right edge)

```
   .--.
   |Ge|  head sprite `portrait.cat.george`, 16u
   |..|  4 bond pips under the head (filled = bond level 0..4)
   '--'  a thought pip on the left edge when a need is under 25 (that need's icon)
   .--.
   |Sa|  ...
```

- Four tabs, one per cat, hanging from a short ribbon. A fifth, smaller tab appears while a visitor is on the lot (Bruce, Poe, Pickle), with a playful label ("Bruce is not here").
- Clicking a tab opens the cat panel focused on that cat (section 12). Shift + click shows the **find ring**: a lavender dashed circle that pulses around the cat in the world for 2 s, drawn as a DOM ring at `worldToScreen` (useful when a cat is under the bed).
- Asleep cats show a tiny "z" on the tab. A cat inside a box shows a box corner.
- On `bond.level` the tab's new pip fills with a heart pop and cue `ui.unlock` (level up) and a toast in the cat's voice.

### 5.9 Auto-fade, hide, night tint

- **Auto-fade:** every frame, the UI checks each HUD cluster's rectangle against Ellie's screen bounds and the hovered entity's bounds (from `input.hover`). An overlapping cluster fades to 30% opacity over `--t-med`. It stays clickable; hovering the cluster itself restores full opacity.
- **Hide HUD:** H toggles the whole live HUD (not toasts or bubbles). A small "H" pip stays in the top-left corner so she knows how to bring it back.
- **Night tint:** at night the chips take a slight blue tint (`--night-tint`), so the HUD sits in the scene.

### 5.10 Name tags on hover

Hovering an entity in live mode for 350 ms shows a small name tag 4u above its head: item name, cat name with bond pips, or visitor name. It disappears on pointer move away. Tags never show while the bloom is open.

---

## 6. Interaction bloom (petals)

The interaction menu is a **bloom**: small round petal bubbles that grow out of the target on a short stem and fan into an arc above it. Each petal is an icon bubble with its label on a ribbon beside it. It is not a ring around the cursor, it never surrounds the target in a full circle, and there is no shape over anyone's head.

### 6.1 Anatomy

```
                 (cup) Make coffee        (book) Read
                        \                  /
       (zz) Nap ------   \     .---.     /   ------ (note) Listen
                          `----| * |----'
                               '-+-'         bud: target name tag, e.g. "Sofa" or "George ..."
                                 |  stem
                              [target]
```

- **Bud:** a small chip at the anchor (the target's head point, or the tile centre for a tile target) with the target's name; cats add their bond pips. The bud is not clickable.
- **Stem:** a 1u lavender line from the target to the bud.
- **Petals:** each petal is a 16u round bubble (`--bubble` fill, `--edge`, `--lift`) holding the interaction icon (`MenuOption.icon`, fallback `icon.int.default`), and a label ribbon (`--box` chip, `--fs-m`) on its outer side. Labels are short (22 characters or fewer, per `InteractionDef.label`).
- **Arrangement:** petals sit on an upper arc around the bud, angles spread evenly from 200° to 340° (screen degrees, 270° is straight up), radius `22u + 4u × count`. Petals on the left half put their ribbon on the left, right half on the right, the top petal above. Order follows `MenuOption[]` order, with enabled petals first.
- **Up to 6 petals.** With 7 or more options, 5 show plus a "More" petal (three dots) that swaps to the next page with a "Back" petal in the first spot.

### 6.2 States

| State | Look |
| --- | --- |
| default | `--bubble` petal, icon in colour, ribbon `--box` with `--ink` text |
| hover / focus | petal grows to 18u, lavender ring (`--b2`), ribbon turns wine, cue `ui.hover` |
| pressed | petal squashes 1u for `--t-fast`, cue `ui.confirm` |
| disabled (`enabled: false`) | petal droops 8° (`wilt`), icon desaturated, dashed `--locked` border, ribbon text `--muted`. Hover or focus shows the `reason` string in a second ribbon line. Still focusable. Clicking wiggles it, plays `ui.nope` and toasts the reason gently. |

### 6.3 Opening and closing

- **Opens** on `input.click` with button 0 in live mode when `pointer.entity` is not null: the UI calls `deps.sim.menuFor(entity, tile)` and shows the bloom with those options. Clicking Ellie gives her self petals; clicking the portrait does too. With the keyboard, Enter or Space on a focused world target (20.6) opens it.
- **Empty floor click:** no bloom. The UI dispatches `{ type: 'walkTo', tile }` and draws a small 6u lavender ring at the tile that fades in 400 ms.
- **No options:** the bud alone shows for 1.2 s with a cat line such as "George has no notes on this." (`ui.bloom.empty`).
- **Bloom animation:** the stem grows (`--t-fast`), then petals `pop` out one by one, 30 ms apart, cue `ui.petals`. Reduced motion: everything appears at once.
- **Choosing** a petal dispatches `{ type: 'interact', interaction, target, tile }` and closes the bloom. **Shift + click** (or Shift + Enter) queues it and keeps the bloom open, so she can queue several things from one object.
- **Closes** on: a choice; Esc; a right click anywhere; any click outside the bloom (that click is swallowed and does not walk Ellie); the target being removed or hidden; the mode leaving live; or a modal opening.
- **Following:** the bloom tracks the target's screen position every frame. If the target moves more than 3 tiles from where it opened (a cat walking off), the bloom closes softly.
- The UI emits `ui.menu { target, open }` on open and close.

### 6.4 Placement and clamping

1. Lay out the bud, the arc and the ribbons; compute the bounding box.
2. If the box crosses the top margin (4u), flip the arc below the target (angles 20° to 160°) and put the bud below the feet.
3. If it crosses the left or right margin, shift the whole bloom sideways and bend the stem so it still reaches the target.
4. If it overlaps the Ellie card, candles, wishes or mode tokens, those clusters fade (5.9); the bloom is never moved under the HUD.

### 6.5 Keyboard in the bloom

- Focus lands on the first enabled petal.
- Left and Right (or Up and Down) move around the arc; Tab and Shift + Tab do the same and stay inside the bloom.
- Enter or Space chooses. Shift + Enter queues and keeps it open.
- Esc closes and returns focus to the world target or HUD control that opened it.
- Number keys keep their normal meaning (game speed); they do not choose petals.

---

## 7. Speech bubbles, thought bubbles and the dialogue box

### 7.1 Speech bubbles

- Shown for `say` sim events, text from `strings(line, vars)`. The look is game 1's `.bubble`: `--bubble` fill, `--paper-ink` text, `--edge`, `--r-m`, a rotated-square tail, `pop` on show.
- **Anchored** to the speaker's head point (2.4). The tail's x follows the speaker (`--tail`), as in game 1's `placeBubble`.
- **Max width** 110u; text wraps; at most 3 lines (the writer keeps lines short; the UI adds an ellipsis after 3 lines and logs a warning in dev).
- **Max 2 on screen** (`LIMITS.speechOnScreen`). A third line waits in a queue of at most 3. Priority, high to low: onboarding and story lines; a line from the entity Ellie is interacting with; a cat within 4 tiles of Ellie; others. Waiting ambient lines older than 4 s are dropped. A new line from a speaker who already has a bubble replaces it.
- **One per speaker.** While a speaker has a speech bubble, its thought bubble hides.
- **Duration** (hold time): `clamp(1800 + 55 ms × characters, 2200, 7000)` × the text speed factor: slow 1.5, normal 1, fast 0.75, instant 0.75. Fade out `--t-med`. Hover over the speaker does not extend it (bubbles have no pointer events).
- **Sound:** the UI does not play meows; the sim's `cue` events do that.
- **Accessibility:** each new speech line is copied into the polite live region as "{Speaker}: {line}", at most one announcement every 3 s (later lines in that window are joined). Bubbles themselves are `aria-hidden`.

### 7.2 Thought bubbles

- Shown for `thought` sim events and `bubble.thought` in state: a small round cloud (14u) with two trailing dots toward the head, holding one icon sprite.
- At most one per entity; not counted against the speech limit; at most 5 on screen (nearest to Ellie win).
- Hidden in build mode, during activities, while its entity speaks, and in photo mode unless "Show thoughts" is on.
- Expire with `bubble.thought.untilTick` (the sim's clock), checked in `ui.update`.

### 7.3 Clamping and collisions (both kinds)

1. Default place: centred above the head, tail down.
2. If the top would be under 14u from the stage top, place it below the feet with the tail up (`.below`, as in game 1).
3. Clamp left and right to 4u margins; the tail stays pointing at the speaker, limited to the bubble's inner 6u.
4. If the speaker is off screen or `sprite.hidden` (Bruce hiding), clamp the bubble to the nearest edge and hide the tail.
5. If two speech bubbles overlap, the newer one moves up above the older one by the overlap plus 2u; if that leaves the stage, it moves sideways instead.
6. Bubbles never cover the toast lane: if one would, it is placed below the speaker.

### 7.4 Emotes

`emote` sim events (happy, mopey, love, surprised, annoyed, sleepy, music) are small pixel icons the **engine** draws on the canvas hints layer. The UI only mirrors Ellie's mood emote on the polaroid sticker. This keeps the UI free of anything that floats permanently over a head.

### 7.5 Dialogue box (onboarding and story)

```
 .-----------------------------------------------------------------------------.
 | .-------.  George                                                  [Skip tour]
 | |portrait| This is your bed. It was mine. You may borrow it.                 |
 | '-------'                                                                  v |
 '-----------------------------------------------------------------------------'
```

- Game 1's `#dialog`: `--box`, `--edge`, `--bevel`, portrait well 30u, name in `--lav` bold, text `--fs-l`, a bobbing "next" arrow.
- Width 300u, centred. Docked at the bottom (above the bottom HUD row, `bottom: 50u`) unless the step's highlight is in the bottom half of the stage, then docked at the top (`top: 34u`).
- **Typewriter:** characters per second by text speed: slow 30, normal 55, fast 110, instant shows all. A click, Enter or Space while typing completes the line; again advances.
- Advancing past the last line of a step dispatches `onboarding.next` (unless the step has `waitFor`, in which case the box shrinks to a one-line hint chip and waits for the sim's next `onboarding.step`).
- "Skip tour" asks for confirmation ("George will sulk. Skip anyway?") then dispatches `onboarding.skip`.
- Each character speaks with its blip voice: the UI emits `audio.cue { cue: 'blip', voice }` every 3rd character while typing (silent in instant mode).

---

## 8. Toasts and reward feedback

### 8.1 Toasts

- Shown for `ui.toast` (the app re-emits sim `toast` as `ui.toast`; the UI ignores the raw sim `toast` to avoid doubles) and for `ui.toast(spec)` calls.
- Placement: the toast lane, top centre, `top: 6u`, stacking downward, max 3 visible. Older ones slide up and out.
- Look: a chip with an optional icon. Tones:

| Tone | Look | Hold |
| --- | --- | --- |
| `info` | `--box`, `--ink` | 4 s |
| `hearts` | wine left edge, heart icon, Hearts amount in `--hearts` | 3.5 s |
| `unlock` | lavender border, sparkle on the icon, cue `ui.unlock` | 5 s |
| `gentle` | `--box` with `--muted` text, used for "can't do that yet" reasons | 3.5 s |

- Hold time × text speed factor (7.1). Hover pauses the timer; a click dismisses.
- The toasts container is `role="status" aria-live="polite"`. Save failures use the assertive region (`role="alert"`).
- **Merging:** two toasts with the same key within 2 s merge into one with "×2".
- **Queued while busy:** during an activity or the credits, toasts wait and play after (max 5 waiting; older drop).

### 8.2 Which events make a toast

| Sim event | Toast | Other feedback |
| --- | --- | --- |
| `wish.completed` | `hearts`: "Wish done: {title}" | card flips, star to the Hearts chip |
| `aspiration.tier` | `unlock`: "{aspiration}, tier {n}: {tier title}" | Journal dot, cue `ui.aspiration` |
| `sticker` | `unlock`: "New sticker: {name}" (secret: "Secret found: {name}") | Journal dot, cue `ui.sticker` |
| `unlock` | `unlock`: "New in Pickle's catalog: {item}" (outfits, paints, titles likewise) | Catalog token sparkles once |
| `mail.arrived` | `info`: "Post's here." (with the sender icon) | Journal dot |
| `delivery` | `info`: "Knock knock. Pickle's here with {n} boxes." | orders chip updates |
| `bond.level` | `hearts`: in the cat's voice | cat tab pip fills |
| `housewarming` `ready` | `unlock`: "The place is ready for a housewarming." | |
| `time.day` | none | a day card slides across the top centre for 2.5 s: "Day {n}, {weekday}" |
| `hearts` | none (the "+n" float is enough) | float at the Hearts chip |
| `mood.band` | none | portrait sticker pops |
| `action.dispatched` rejected, player source | `gentle`: the reason, if it is a known string key; otherwise nothing (dev: console warning) | the control wiggles |
| `save.result` failed | assertive: "Couldn't save just now. Your game is still running." | |
| `save.result` export ok | `info`: "Saved a copy to your downloads." | |

---

## 9. Build mode UI

Build-mode-dev implements this section with `ui.kit` inside the regions the UI provides (see 23.3, request R2). The UI hides the live HUD and shows the Hearts chip and the clock (paused) while `mode === 'build'`.

### 9.1 Layout

```
+------------------------------------------------------------------------------------------------+
| [Living room  v]  Cosy 58 [=====-----]  Try: a lamp for the evening (+6)    Paused  [<3 150]   |
|                                                                                                 |
|                                                          .-----------------------------.       |
|                                                          | CATALOG DRAWER (10.1)       |       |
|                      the lot, with the grid shown        | docks on the side away from |       |
|                                                          | the room being decorated    |       |
|           .----------------------------------.          |                             |       |
|           | Small sofa      40 <3   Cosy +4  |          |                             |       |
|           | [Goth][Cat]                      |          |                             |       |
|           | [Rotate R][Move][Store S][Sell]  |  <- selection card, beside the item           |
|           '----------------------------------'          '-----------------------------'       |
|  .------------------------------------------------------------------------------------------.  |
|  | [Move] [Rotate R] [Copy D] [Pick E] [Sell Del] [Store S] | [Undo] [Redo] | [Walls] [Floors] | [Catalog C] [Done B] |
|  '------------------------------------------------------------------------------------------'  |
+------------------------------------------------------------------------------------------------+
```

### 9.2 Top-left: room and cosy chip

- Room picker (a small dropdown of the lot's rooms; defaults to the room under the pointer or the last edited one). Choosing a room flashes its outline on the canvas (engine hint layer).
- Cosy meter for that room: a horizontal kit `meter` 0..100 with the number, from `world.cosy(state, room)`.
- The best hint from `CosyReport.hints[0]` ("Try: a lamp for the evening (+6)"); hover shows both hints and the active set bonuses with their names ("Goth Parlour").
- When a set bonus becomes active, the chip glows once and a toast names it.
- "Paused" pill: time is stopped in build (the sim does not step).

### 9.3 Tools bar (bottom centre)

| Tool | Key | Behaviour | Cue |
| --- | --- | --- | --- |
| Move (default) | none (click an item) | click a placed item to pick it up; the ghost follows the pointer; click to drop | `build.pickUp`, `build.place` |
| Rotate | R | rotates the held ghost or the selected item through its allowed `rotations` | `build.rotate` |
| Copy | D | starts placing another of the selected item (from storage if any, otherwise buy) | `build.duplicate` |
| Pick | E | eyedropper: next click on an item selects that item type for placing | `build.eyedropper` |
| Sell | Delete or Backspace | sells the selected item for its full price, no confirm (it can be undone) | `build.sell` |
| Store | S | puts the selected item into storage (`build.store`) | `build.pickUp` |
| Undo / Redo | Ctrl/Cmd + Z, Shift + Ctrl/Cmd + Z (also Ctrl + Y) | build history (`LIMITS.buildUndo`) | `build.undo`, `build.redo` |
| Walls / Floors | none | opens the paint strip (9.5) | `ui.open` |
| Catalog | C | toggles the drawer | `ui.open` / `ui.close` |
| Done | B or Esc (with nothing selected) | closes build: dispatches `mode.set live` | `mode.live` |

- Buttons are kit `button`s with `variant: 'secondary'`; the active tool is wine. Undo and Redo are disabled (with `setDisabled`) when `canUndo()` or `canRedo()` is false.
- Each tool tooltip shows its key. The bar is `role="toolbar"` with arrow-key movement between tools.

### 9.4 Selection card and placement feedback

- A small card next to the selected or held item (placed beside the item's screen box, clamped like bubbles): name, price (or "Stored" when it came from storage), cosy value, style tag chips, and buttons Rotate, Move, Store, Sell ("Sell for {n} <3").
- **Ghost colours:** a valid spot tints the ghost with a lavender outline; an invalid spot tints it rose (`--need-low` at 40%) with a dashed outline, and a chip by the pointer reads the `PlacementError` reason from `build.err.<reason>` ("That would block the door."). No buzzer: cue `build.blocked` is a soft thud.
- **Can't afford:** the ghost shows the price in `--muted` and the chip reads "{n} more Hearts needed".

### 9.5 Paint strip

```
 .------------------------------------------------------------------------------------.
 | Walls:  [plain][stripes][checks][wood][tiles][paper]   [sw][sw][sw][sw][sw][sw] >  |
 '------------------------------------------------------------------------------------'
```

- Appears above the tools bar. Pattern tabs filter the swatches. Each swatch (14u) previews the `PaintDef` pattern, shows its price on hover, and locked paints show a padlock with the unlock hint.
- Hovering a room with a swatch selected previews it on the canvas; a click dispatches `build.paint`. Cue `build.paint`.

### 9.6 Leaving build

On close, build emits `build.closed`; the UI restores the live HUD with a `--t-med` fade and plays `mode.live`. Cat reactions are the cats' job (speech bubbles).

---

## 10. Catalog: Pickle's Deliveries

Build-mode-dev owns the catalog body (contracts section 15), built with `ui.kit` inside the `catalog` region. The UI owns the frame, scrim, focus trap and the open and close behaviour. One body, two frames:

- **Build:** a docked drawer, 170u wide and the stage height minus the top chip and the tools bar, on the right side; it moves to the left side when the selected room's centre is in the right half of the stage. No scrim; the lot stays clickable. Picking a card calls `build.select(item)` and the ghost appears.
- **Live (ordering):** a centred modal 360u × 220u with a scrim, plus a basket column. "Order" dispatches `{ type: 'catalog.order', items }`. Orders arrive later with Pickle's knock.

### 10.1 Layout (live modal; the drawer is the same without the basket and with the rail on top)

```
 .------------------------------------------------------------------------------------------.
 | Pickle's Deliveries                     "Ribbit. Everything ships. Ribbit."         [x]  |
 |------------------------------------------------------------------------------------------|
 | CATEGORIES | Styles: (Goth)(Cottage)(Neon)(Gym)(Cat)(Plant)(Retro)   Room: [Any room  v] |
 | > Seating  | Sort: [Newest v]   [x] Show locked   [ ] Stored only                         |
 |   Beds     |-----------------------------------------------------------| BASKET         |
 |   Tables   | .--------. .--------. .--------. .--------.               | Small sofa  40 |
 |   Storage  | | sprite | | sprite | | (lock) | | sprite |               | Fern pot    12 |
 |   Kitchen  | |        | |        | | ?????? | |        |               |                |
 |   Bath     | |Sofa    | |Armchair| |Throne  | |Beanbag |               | Total   52 <3  |
 |   Gym      | |40 <3   | |35 <3   | |Cat Roy.| |22 <3   |               | You have 150   |
 |   Lighting | |G C     | |R       | |tier 2  | |N       |               |                |
 |   Plants   | '--------' '--------' '--------' '--------'               | [Order]        |
 |   Cats     |  ...  (grid scrolls vertically)                           |                |
 |   Walls    |                                                           |                |
 |   ...      |                                                           |                |
 '------------------------------------------------------------------------------------------'
```

### 10.2 Parts

- **Category rail:** one entry per `CatalogCategoryDef` (icon and label), plus "All" first and "Stored" last (items in `inventory.stored`). Arrow keys move; Enter selects.
- **Style chips:** seven toggle chips for `StyleTag`, each with a colour dot and a letter so colour is not the only cue (Goth G, Cottage C, Neon N, Gym Y, Cat K, Plant P, Retro R). Several can be on (items matching any).
- **Room filter:** "Any room" or one of the lot's rooms. It filters by item tags `room.<roomKind>` (game-designer adds these tags to items; an item with no `room.*` tag shows for every room).
- **Sort:** Newest unlocked, Price low to high, Price high to low, Cosy value.
- **Show locked** (default on) and **Stored only** toggles.
- **Card** (kit `card`, 44u × 56u): the item sprite from `atlas.toDataUrl(sprite, 2)`, the name, the price with a heart, and style letters. Badges: "Stored ×n" (lavender), "New" (until first viewed), "Owned ×n placed".
  - **Locked** (`locked: true`): a dark silhouette of the sprite, a padlock, the name shown as "?????" only if the item is a secret, and the `unlockHint` text ("Reach Cat Royalty tier 2."). Locked cards are focusable and explain themselves; clicking does nothing but a gentle wiggle.
  - **Can't afford:** the price turns `--muted` with "Need {n} more" on hover; the card can still be added to the basket (the Order button then explains).
  - Hover: card lifts 1u; a detail tooltip shows the description, footprint size, cosy value and the styles in words.
- **Basket (live only):** a list with remove buttons, the total, and the balance. "Order" is disabled with the reason if the total is above the balance. Maximum 8 items per order (more waits for the next order; `LIMITS.pendingOrders` caps orders).
- **Empty results:** Pickle line "Nothing in that crate. Ribbit." with a "Clear filters" button.

---

## 11. Journal (J)

A book opened over a scrim: a dark plum cover frame (`--box`, `--edge`, `--float`) holding a paper page (`--paper`), with ribbon bookmark tabs down the right edge. Headings are IM Fell English; controls are Pixelify Sans. Size: `min(400u, 100vw - 32px)` × `min(240u, 100vh - 32px)`, centred.

```
 .------------------------------------------------------------------------------.
 | Ellie's journal                                    Sir Ellie, Cat Royalty [x] |   cover band: title + chosen title
 |  .------------------------------------------------------------------------. W |
 |  |  Wishes                                                       (IM Fell) | A |   ribbons (tabs), each with an icon
 |  |  --------                                                               | C |   and a short label on hover/focus:
 |  |                                                                         | Ca|   Wishes, Aspirations, Collection,
 |  |                  page content (scrolls inside the page)                 | Ph|   Cats, Photos, Stickers, Records,
 |  |                                                                         | St|   Mail, Settings
 |  |                                                                         | R |
 |  |                                                                         | M |   active ribbon: wine, sticks out 4u
 |  '------------------------------------------------------------------------' S |   dots on ribbons with unseen things
 '------------------------------------------------------------------------------'
```

- Tabs are the kit `tabs` with `JournalTab` ids, vertical. Up and Down move between ribbons; Enter or click selects; `ui.tab` cue and a page-turn (`ui.page`, a 120 ms slide; fade in reduced motion).
- `ui.open('journal', { tab })` opens on that tab; J alone reopens the last tab used (default `wishes`).
- The journal soft-pauses (4.1).

### 11.1 Wishes

- Today's three wishes as large cards: icon, title, Hearts reward, done stamp or "Not yet". No timers.
- "Done today: {n}", "Wishes granted: {completedTotal}".
- A short history: the 5 most done wishes with counts ("Bow to George ×12").
- Empty (day 1 before the roll): Salem: "Wishes come in the morning. I checked. Twice."

### 11.2 Aspirations

```
  Hyrox Hero         o----o----o----o      tier 2 of 4: "First race"
  [icon]             *    *    .    .      Next: finish a race under 1:45:00
                                           Reward: race kit outfit, title "Racer"
  Cat Royalty        o----o----o----o
  Home Maker         ...
  Collector          ...
                                           Title shown: [Sir Ellie  v]
```

- Four rows (Hyrox Hero, Cat Royalty, Home Maker, Collector), each a vine with 4 buds (done buds bloom, using the aspiration icon). Focusing a bud shows that tier's title, goal and rewards.
- Goal text comes from tier string keys (`asp.<id>.tier<n>.goal`), written by the writer from the designer's goals; the UI does not render `Condition`s.
- Title picker: the unlocked titles; choosing dispatches `title.set`.

### 11.3 Collection

- Completion bar ("68 of 120 found") and per-category rows of small item icons. Unlocked items in colour, owned items with a tiny check, locked ones as silhouettes with the unlock hint on hover. Secret items show "?" until unlocked.
- Clicking an unlocked item opens the catalog on it.

### 11.4 Cats

- Four sub-pages via portrait buttons across the top (George, Salem, Shadow, Peaches), plus Bruce, Poe and Pickle once met.
- Each page: a large portrait, the name, a one-line description in their voice, bond hearts (4 heart slots, filled = bond level 0..4) and a slim bond bar for progress inside the level, the personality need with its meter, and three lists: **Likes**, **Dislikes**, **Quirks spotted**. Undiscovered entries show as "???" with a hint line ("Watch him at night."). Discovery reads flags (section 25).
- Visitors' pages show counts instead (Bruce: "Spotted 3 of 5 hiding places. He denies all of them.").

### 11.5 Photos

- An album grid of polaroids (paper frame, IM Fell caption under each, with "said {cat}"). Images load through `deps.loadPhoto(meta)` (request R4); a missing image shows an empty frame with "This photo got lost." Most recent first; the cap is `LIMITS.photos` and the page says so ("{n} of 60").
- Clicking opens a viewer: the photo at 2×, caption, day and time, the cats in it, and buttons "Save as PNG" (a download link built from the data URL, file name `ellies-place-day-{day}-{no}.png`), "Delete" (confirm), and arrows to step through.
- Empty: Peaches: "No photos yet. I'm very photogenic. Just saying."

### 11.6 Stickers and secrets

- A sticker book: a grid of round stickers. Earned ones in colour with the name and day earned on hover; locked ordinary ones as grey outlines with their name and description; secrets as "???" until earned, with no hint.
- Counter: "{n} stickers, {m} secrets".

### 11.7 Records

- Race PB at the top in big IM Fell numerals, medals row, then the last races (up to 10 shown) with total time and a PB mark; clicking a race shows its 16 splits (run, station, run, station...) in a two-column table.
- Station table: each Hyrox station with its name, skill 0..10 as 10 pips, and training PB.
- Other bests from `records.best` that have a string key (perfect dunks in a row, neatest sushi, Critterbound wins).
- Empty: "No races yet. George has prepared a judging face anyway."

### 11.8 Mail

- Two columns: an inbox list (sender icon, subject, the day it arrived, an unread dot) and the reader (section 14.1) in the right column. On narrow pages the list replaces the reader and the reader opens on top.
- Opening an unread letter dispatches `mail.read { index }`; attachments are claimed by the sim on read and show as a "Came with: ..." line plus a toast.
- If `mail.waiting > 0`: a note at the top: "{n} letters waiting at the front step." The letters are collected in the world (the mailbox petal), not from the journal.
- Empty: "No post yet. Pickle says the van is coming. The van is a frog."

### 11.9 Settings

The settings form (17.4) embedded in the page.

---

## 12. Cat panel (K, or a cat tab)

A non-modal popover attached to the cat tabs on the right edge (time keeps running). 150u × 190u.

```
 .--------------------------------------------.
 | The cats                               [x] |
 | .------. George              <3 <3 <3 . .  |   bond hearts: level 3 of 4
 | | face | Inspecting the new lamp.          |   current action, from interaction.start
 | '------' [food][play][love][nap][crown]    |   5 mini meters with icons (shared needs + personality)
 |          [Find]                            |
 |--------------------------------------------|
 | .------. Salem               <3 . . . .    |
 | | face | In a box. Lives there now.        |
 | '------' [food][play][love][nap][chaos]    |
 |          [Find]                            |
 |  ... Shadow, Peaches                       |
 '--------------------------------------------'
```

- Four rows; the row of the tab she clicked is expanded and focused, the others compact (face, name, hearts). Up and Down move between cats; Enter expands.
- **Need icons:** five small meters (kit `meter`, horizontal, 22u) for Food, Play, Affection, Nap and the personality need (`PERSONALITY_NEED`). A need under 25 shows its icon with a soft pulse and is listed first.
- **Bond hearts:** 4 heart slots; filled count = `bond.level` (0..4). A slim bar under them shows progress to the next level. Tooltip: "Bond level {n}. {cat line}".
- **Doing now:** the current interaction label (from `agent.current`), or "Asleep", "In a box", "Following you".
- **Find:** shows the find ring (5.8) and closes nothing.
- Clicking the face opens the cat's journal page. Esc or K closes; focus returns to the tab.

---

## 13. Wardrobe

Opened by the "Get dressed" petal at the mirror or the wardrobe (`ui.open('wardrobe')`). Modal, soft pause. 360u × 210u.

```
 .------------------------------------------------------------------------------.
 | Wardrobe          [Ellie] [George] [Salem] [Shadow] [Peaches]           [x]   |
 |------------------------------------------------------------------------------|
 |  .---------------.   Head       [none][crown][beanie][fishing hat][(lock)]    |
 |  |               |   Hair       [none][firefly clip][hair clips]              |
 |  |   preview     |   Face       [none]...                                     |
 |  |   sprite 4x   |   Neck       [none][frost scarf]                           |
 |  |   (turns with |   Top        [default][cosy jumper][band-style tee][race kit]
 |  |   < >)        |   Feet       [default][boots]                              |
 |  '---------------'   Extra      [none][headphones][cat ears]                  |
 |   [<] turn [>]       Streaks    (o)(o)(o)(o)(o)(o)(o)(o)   (Ellie only)        |
 |                                                                    [Done]     |
 '------------------------------------------------------------------------------'
```

- Wearer tabs: Ellie and the four cats (each cat shows only slots that have outfits for it).
- Slot rows list unlocked outfits for that wearer and slot as swatch buttons with a tiny sprite icon, plus "None". Locked outfits show a padlock and their unlock hint on hover.
- Choosing dispatches `wardrobe.wear { who, slot, outfit }` immediately; the preview redraws (the atlas draws the base sprite plus overlay sprites on a small canvas in the panel). The current pick has a lavender ring.
- **Streak colour** (Ellie only): 8 preset swatches, the green from game 1 first; choosing dispatches `wardrobe.streak`. No free colour picker (keeps her look as designed).
- The preview turns with the arrow buttons or Left and Right (down, side, up, side flipped).
- Her look stays fixed (`ELLIE.md`): no hair style, face or body options exist.

---

## 14. Mail reader, Poe's trades, race board

### 14.1 Mail reader

- Game 1's `#note .paper`: `--paper` card, `--paper-ink`, IM Fell English at `max(--fs-l, 17px)`, line height 1.62, a slight -0.4° tilt (none in reduced motion), soft inner shadow.
- Header in Pixelify, `--wine`: sender icon and name, the day it arrived. Body: the mail text (`MailDef.body` via strings, or literal text for personal mail, rendered with `textContent` so no markup ever runs). Footer: attachments line, and buttons "Back to the post" and "Close".
- Width `min(300u, 100vw - 32px)`. Opens with cue `mail.open`, closes with `mail.close`.
- Personal mail gets a small wax-seal mark in the corner and nothing else different.

### 14.2 Poe's trades (`trade`)

- Poe's portrait and a line, the trinket count ("Shiny things: 3"), and up to 3 offer cards (Poe's offers from `visitors`): the item, what it costs in trinkets, and "Trade". Choosing dispatches `trade.accept`. Offers she can't afford show the gap.
- Empty: "Poe looks at your empty hands. Poe looks at you."

### 14.3 Race board (`raceBoard`)

- A cork-board panel: next race day ("Saturday"), the race PB, station skills as pips, the last 3 results, and two buttons: "Race now" (dispatches the race interaction through `interact` with the board as target) and "Close".
- Lists the 8 stations in order with their distances, so she knows what is coming.

---

## 15. Photo mode (P)

```
+------------------------------------------------------------------------------------------------+
| [x Leave (Esc)]                         4 cats in frame                                         |
|  +---                                                                                    ---+  |
|  |                                                                                          |  |
|                                    viewfinder corners (lavender)                                |
|                                                                                                 |
|  |                                                                                          |  |
|  +---                                                                                    ---+  |
|  Filter: [None][Polaroid][Night][Warm]   [ ] Bubbles  [ ] Thoughts         ( SNAP  Space )    |
+------------------------------------------------------------------------------------------------+
```

- `mode.set photo` stops time (the sim does not step). The HUD hides; the photo bar shows.
- **Filters:** a radio group of `PhotoFilter`; the engine previews the filter live (it reads the chosen filter from the `photo.request` preview event, request R3).
- **Frame:** the whole stage by default. Dragging on the canvas draws a smaller frame (min 120u × 68u, kept 16:9); Enter or Snap takes it.
- **Cats in frame:** a live count with their faces, so she can line up "all four cats".
- **Snap** (Space, Enter, or the button): the UI emits `photo.request { filter, frame }`; the shutter flash is a white overlay fading in 150 ms (a 2-frame dim in reduced motion), cue `photo.shutter`. The app captures and emits `photo.captured { photo, dataUrl }`.
- **Preview card:** the polaroid drops in (game 1 polaroid style) with the caption in IM Fell and "said {cat}". Buttons: "Keep" (dispatches `photo.save`; the app stores the PNG), "Save as PNG" (download, also keeps), "Retake" (discards). Esc = Retake.
- Leaving (P, Esc with no preview, or Leave) dispatches `mode.set live`.

---

## 16. Minigame overlay

The engine hands the canvas to the activity (`engine.setActivity`); the activity draws itself. The UI shows a thin overlay on top.

```
+------------------------------------------------------------------------------------------------+
| [Skip >]  (after 2 misses)          [ SkiErg  .  0:42  .  420 m ]                  [|| Pause]  |
|                                                                                                 |
|                                activity canvas                                                  |
|                                                                                                 |
|                                                                                                 |
| (cheer bubbles dock here)                                                                       |
|                        Hold Space and let go on the beat.     (hint line, fades after 3 s)      |
+------------------------------------------------------------------------------------------------+
```

### 16.1 Start card

On `activity.started`, a card shows the title and instructions from `getActivity(id)` (`ActivityDef.title`, `instructions`), with the key hint (Space, click or tap), and a "Start" button. It starts on click, Space or Enter, or by itself after 4 s (8 s in slow text speed). Cue `ui.confirm`.

### 16.2 During

- Top centre chip: the title and live info. The activity has no info API, so the chip shows only the title plus a real-time timer; races add the station number ("Station 3 of 8"). (If activities need more, they draw it on their canvas.)
- **Skip:** appears top-left once the app signals the activity is skippable (`activity.skippable`, request R5). Pressing it emits `activity.skip`; the app calls `activity.skip()`. Skip counts as a pass (contracts 12). It is never hidden again once shown.
- **Pause** (Esc or the button): a small menu: Resume, "How to play" (the instructions again), Leave. Leave emits `activity.leave` (request R5) after no confirm (nothing is lost except this run's reward).
- **Input:** the engine maps keys and pointer to `ActivityInput`; the UI's overlay buttons sit outside the canvas hit area and stop propagation.

### 16.3 Result card

On `activity.ended`: a card with the grade (big, IM Fell), time (`timeMs` formatted m:ss.t), a PB ribbon if a `record` effect is in the result and beat the old one, the main rewards as icons (needs up, skill up, Hearts), and a line from a watching cat. "Continue" (Enter) closes it. Skipped results say "Skipped. No harm done." and still list the pass reward.

### 16.4 Cheers during activities

`say` events during an activity show as **docked cheer bubbles** in the bottom-left corner of the stage: the speaker's small portrait plus the line, max 2 stacked, same durations as 7.1. They are not anchored, because the activity canvas does not show the lot.

---

## 17. Title screen, confirm, settings

### 17.1 Title screen

```
+------------------------------------------------------------------------------------------------+
|                                                                                                 |
|                                   Ellie's Place                    (--fs-title, glow as game 1) |
|                         a home, four cats, and a lot of opinions    (IM Fell, --lav)            |
|                                                                                                 |
|                              [ Continue ]      Day 12, Tuesday. 214 <3                          |
|                              [ New game ]                                                       |
|                              [ Load from file ]                                                 |
|                                                                                                 |
|                         [Settings]                  [Credits]  (after the first housewarming)   |
|      (the four cats idle on a rug along the bottom edge, drawn by the engine's title scene)    |
|  small: Saves stay in this browser. Export a copy now and then from Settings.                   |
+------------------------------------------------------------------------------------------------+
```

- Background: the engine draws the cats idling (or a still of the flat) under a `--scrim` at 55%.
- **Continue:** shown only when a save loaded (`LoadResult` `ok` or `recovered`), with day, weekday and Hearts from it. Focused by default. Emits `app.request { kind: 'continue' }`.
- **New game:** if a save exists, a confirm: "Start fresh? Your current place will be replaced." with "Export first", "Start fresh" and "Back" (Back is the default and Esc). Then `app.request { kind: 'newGame' }`.
- **Load from file:** opens a hidden `<input type="file" accept=".json,application/json">`; the UI reads the text with `FileReader` and emits `app.request { kind: 'import', text }`. On `save.result { kind: 'import' }` failure it shows a friendly reason ("That file isn't an Ellie's Place save."); success shows a confirm "Load Day {n}? It replaces your current place." when a save exists.
- **Notices** under the buttons: `recovered` ("Your last save had a hiccup. We loaded the one before it."), `corrupt` ("We couldn't read your save. You can load a file or start fresh."), `unavailable` ("This window can't save. Playing anyway is fine; export to keep progress.").
- **Export reminder:** when `settings.sessions - settings.lastExportSession >= 5`, the small line becomes a lavender chip with "Export a copy" (Safari can clear website data).
- Music `title`; the first click or key anywhere also unlocks audio (the app calls `audio.unlock()` on the first gesture).

### 17.2 Confirm dialog (`confirm`)

- A small `--box` card over a darker scrim, a title line, one or two lines of body, and two buttons: the safe one (secondary, default focus, Esc) and the action (primary). Destructive actions are still wine, never red.
- Used for: New game over a save, import over a save, delete photo, skip the tour, quit to title.

### 17.3 Keyboard help (? key)

A two-column card listing the keyboard map of section 20 for the current mode, opened with Shift + / (`?`) or from Settings. Uses the `confirm` panel frame.

### 17.4 Settings (`settings`, also the journal's Settings tab)

```
 Sound        Music     [------o---]  70
              Effects   [-------o--]  80
              Ambience  [-----o----]  60
 Text         Size      (Small)(Normal)(Large)
              Speed     (Slow)(Normal)(Fast)(Instant)      sample: "Salem: BEST. DAY. EVER."
 Motion       Reduce motion  (Match my Mac)(On)(Off)
 Play         Game speed     (||)(>)(>>)(>>>)
              Real time      [ off ]   "The clock follows your Mac. Days never skip."
              Free will      [ on  ]   "Ellie does things on her own when idle."
              Hints          [ on  ]
 Display      [Full screen (F)]   [Keyboard keys (?)]
 Save         [Export save]  [Import save]     Last export: session 3 of 9
              "Safari can clear website data. Export a copy now and then."
 More         [Credits] (after the first housewarming)   [Quit to title]
```

- Sliders and toggles are kit components. Changing any `Settings` field emits `settings.changed` with the whole new `Settings` object (the UI is the only editor; the app stores it and audio applies volumes). Volumes 0..100 in the UI, stored as 0..1.
- Game speed dispatches `time.setSpeed`; Real time and Free will dispatch `options.set { realTime }` and `options.set { freeWill }`.
- Export emits `app.request { kind: 'export' }` (the app calls `save.exportFile` and records `lastExportSession`); Import works like Load from file with the confirm.
- Quit to title confirms, then emits `app.request { kind: 'quitToTitle' }` (the app saves first).
- The text sample under Speed types itself at the chosen speed so the choice is felt.

---

## 18. Credits roll

Plays when the sim emits `housewarming` with status `done` (after the party scene), and again from Settings > Credits.

- Game 1's `#credits`: background `#0c0911`, a roll moving up at 22u per second, lines centred:
  - big lines in IM Fell (`--fs-xl`), roles in small caps `--muted` with 0.14em spacing, names in `--lav` bold, and italic IM Fell lines.
  - Cast section with each character's sprite beside their name (George "The King", Salem, Shadow, Peaches, Bruce "was never here", Poe, Pickle). All text from `credits.*` keys, written by the writer. The giver is not a character and is not named as one.
- Music `housewarming`.
- **Skip** (top-right, after 2 s, or Esc) jumps to the end.
- **End:** the keepsake polaroid drops in with its caption, then two buttons: "Keep living here" (closes, back to live) and "Look at the photo" (opens the journal on Photos). If the `framedPrint` flag is on, the print is mentioned as a new catalog unlock via the normal unlock toast afterward; the credits do not show its text.
- **Reduced motion:** no scrolling; the credits show as pages that fade every 4 s, with Next and Back buttons.
- Toasts wait until the credits close.

---

## 19. Onboarding highlights

`OnboardingStepDef.highlight` with `kind: 'ui'` names one of these ids. Every highlightable element carries `data-hl="<id>"`. The UI draws a lavender rounded ring around it that breathes (static ring in reduced motion), and dims the rest of the HUD to 60%.

| Id | Element |
| --- | --- |
| `hud.queue` | action queue |
| `hud.clock` | clock |
| `hud.speed` | speed control |
| `hud.hearts` | Hearts chip |
| `hud.ellie` | Ellie card (portrait and mood) |
| `hud.mood` | the mood sticker and word |
| `hud.needs` | the six candles |
| `hud.need.<key>` | one candle (`energy`, `hunger`, `fun`, `fitness`, `calm`, `cosy`) |
| `hud.wishes` | wish cards |
| `hud.mode.build` / `hud.mode.catalog` / `hud.mode.journal` / `hud.mode.photo` | mode tokens |
| `hud.cats` | cat tabs |
| `build.tools` / `build.cosy` / `build.catalog` | build bar, cosy chip, catalog drawer (build-mode-dev adds `data-hl`) |

`kind: 'item'` and `kind: 'spot'` highlights are drawn by the engine on the hints layer; the UI only points the dialogue box away from them (7.5).

---

## 20. Keyboard

The engine maps raw keys to `KeyAction`s and emits `input.key { action, down, repeat }` (contracts 14). The table below is the binding the engine must use. Mac users get Cmd where Windows users get Ctrl.

### 20.1 Bindings

| KeyAction | Keys | Live | Build | Photo | Activity | Panels open |
| --- | --- | --- | --- | --- | --- | --- |
| `toggleBuild` | B | enter build | leave build | no | no | no |
| `catalog` | C | open order catalog | toggle drawer | no | no | closes catalog if it is the top panel |
| `journal` | J | open journal | no | no | no | closes journal if it is the top panel |
| `photo` | P | enter photo mode | no | leave photo mode | no | no |
| `fullscreen` | F | toggle | toggle | toggle | toggle | toggle |
| `pause` | Space | toggle pause | no | snap | (Space is `primary`) | no |
| `speed1` / `speed2` / `speed3` | 1 / 2 / 3 | set speed | no | no | no | no |
| `rotate` | R | no | rotate | no | no | no |
| `sell` | Delete, Backspace | cancels a focused queue card only | sell selected | no | no | no |
| `duplicate` | D | no | copy | no | no | no |
| `eyedropper` | E | no | pick | no | no | no |
| `undo` | Ctrl/Cmd + Z | no | undo | no | no | no |
| `redo` | Shift + Ctrl/Cmd + Z, Ctrl + Y | no | redo | no | no | no |
| `cancel` | Esc | Esc stack (20.3) | deselect, then leave build | leave (or Retake on preview) | pause menu | close top panel |
| `confirm` | Enter | open the bloom on a focused target | place held item | snap | `primary` | activate focused control |
| `primary` | Space, Enter, left click | n/a | n/a | n/a | `primary` | n/a |
| `up` / `down` / `left` / `right` | Arrows (and W A S D in activities only) | walk Ellie one tile | nudge held item one tile | move the frame | directions | move within the focused group |
| new: `secondary` (R1) | X, Shift | no | no | no | `secondary` | no |
| new: `cats` (R1) | K | toggle cat panel | no | no | no | closes cat panel |
| new: `toggleHud` (R1) | H | hide or show HUD | no | no | no | no |
| new: `help` (R1) | ? (Shift + /) | keyboard help | keyboard help | no | no | toggles help |
| new: `store` (R1) | S | no | store selected | no | no | no |

Notes:

- Arrow walking dispatches `walkTo` to the neighbouring walkable tile in that direction (the sim rejects blocked tiles quietly). Holding an arrow repeats at the key repeat rate.
- Space after a mouse click on a HUD button must still pause: HUD buttons call `blur()` after a pointer click (keyboard focus stays, mouse focus does not), so Space reaches the game.
- `1`, `2`, `3` are speeds everywhere in live, including while the bloom is open.

### 20.2 When shortcuts are ignored (typing and focus guard)

The engine skips mapping a keydown when any of these is true:

1. `event.isComposing` (IME input).
2. The target is an `input`, `textarea`, `select` or `[contenteditable]` (only Esc still maps, to `cancel`). There are no text fields in the game today, but the file input and any future field are covered.
3. `event.defaultPrevented` is true. UI controls that use keys themselves (sliders, tabs, toolbars, grids, the bloom, the queue cards) handle the key on the focused element first and call `preventDefault()`. The engine listens on `window` in the bubble phase, so it sees that.
4. Ctrl, Cmd or Alt is held, except for `undo` and `redo`. So Cmd + R reloads, Cmd + P prints, Cmd + C copies, as the browser expects.
5. The focused element is a button or has `role` button, tab, slider, switch, checkbox, option, radio or menuitem, and the key is Space, Enter or an arrow (the control gets it natively).
6. A modal panel is open and the action is not `cancel`, `confirm`, an arrow, `fullscreen`, `help`, or the key that toggles that same panel.
7. `repeat` is true and the action is a toggle (`toggleBuild`, `journal`, `catalog`, `photo`, `fullscreen`, `pause`, `cats`, `toggleHud`, `help`). Repeats are allowed for arrows, `rotate`, `undo` and `redo`.

### 20.3 The Esc stack

Esc closes the topmost thing and stops:

1. a pinned tooltip or wish caption;
2. the confirm dialog (choosing its safe option);
3. the bloom;
4. the top modal panel (mail reader over journal closes first);
5. the cat panel;
6. in build: the held ghost or selection, then build itself;
7. in photo: the preview (Retake), then photo mode;
8. in an activity: the pause menu opens (Esc again resumes);
9. in live with nothing open: the Settings panel opens.

### 20.4 Focus order (Tab) in live mode

Queue cards, clock, speed control, Hearts, orders chip, cat tabs, wish cards, mode tokens, Ellie card, candles, then the world targets (20.6). Shift + Tab goes back. Modal panels trap focus and return it to the opener on close.

### 20.5 Focus visibility

- `:focus-visible` only: `outline: var(--b2) solid var(--lav); outline-offset: var(--b1)`, plus `--glow`. On paper surfaces the ring is `--wine`.
- Never `outline: none` without a replacement.

### 20.6 World targets for the keyboard

- `.ep-world-proxies` holds one transparent `button` per target: Ellie, the four cats, any visitor, and every smart object in Ellie's current room (max 24, sorted left to right, top to bottom). Each is sized and placed over the entity's sprite bounds each frame, and rebuilt when the room or the entity list changes.
- A proxy shows nothing until it gets keyboard focus; then a dashed lavender rounded ring outlines the sprite and the name tag shows.
- Enter or Space opens the bloom for it. Its `aria-label` is the item or character name plus a short state ("Record player, playing Lo-fi").
- Proxies have `pointer-events: none` so mouse clicks still reach the canvas.

---

## 21. Component kit

`ui.kit` implements `UiKit` from `src/core/types.ts`. Every component takes `StringKey`s, never raw text, builds plain DOM with `ep-` classes, and returns `{ el, destroy }`. `destroy()` removes listeners and the element. Every component has these states unless noted: default, hover, focus-visible, active (pressed), disabled.

### 21.1 Panel

- `panel({ title, closable, paper, onClose })` returns `{ el, body, destroy }`.
- Dark: `--box`, `--edge`, `--bevel`, `--float`, `--r-l`, padding `--sp-4`. Title bar: `--fs-l` Pixelify (IM Fell when `paper`), close button (×, 14u, ghost) top-right when `closable`.
- Paper: `--paper` fill, `--paper-ink` text, `--r-s`, IM Fell body.
- `role="dialog"`, `aria-modal` when shown in `#ep-modal`, `aria-labelledby` the title. Focus moves to the first focusable child on open.
- States: opening (`pop` scale 0.96 to 1 plus fade, `--t-med`), closing (fade `--t-fast`). Reduced motion: fade only.

### 21.2 Button

- `button({ label, icon, variant, tooltip, disabled, onClick })`, with `setDisabled`.
- Variants:

| Variant | Default | Hover | Active | Disabled |
| --- | --- | --- | --- | --- |
| `primary` | `--wine`, `--ink`, `--edge`, `--lift` (game 1 `.btn`) | `--wine-hi` | moves down 1u, shadow 0.5u | `#5a4a5e` fill, `--muted` text, no lift, `cursor: default` |
| `secondary` | `--box-inner`, `--ink`, `--b1` edge | `--wine` | moves down 1u | 45% opacity |
| `ghost` | transparent, `--lav` text | `--plum` fill | moves down 1u | 45% opacity |
| `petal` | the bloom petal (6.2) | grows | squash | wilted |

- Min hit size 12u × 12u and never under 24 CSS px. Icons from `atlas.toDataUrl(icon, 2)` as `<img>` with `image-rendering: pixelated`, `alt=""`.
- Clicks play `ui.click` through `audio.cue`; disabled clicks play `ui.nope` and do not call `onClick`.

### 21.3 Tabs

- `tabs({ tabs, selected, onSelect })`, with `select(id)`. `role="tablist"`, each tab `role="tab"` with `aria-selected`; roving tabindex; arrows move (Left and Right when horizontal, Up and Down when the `vertical` class is set); Home and End jump.
- States: idle (`--plum`), hover (`--box-inner`), selected (wine ribbon, sticks out 4u), focus ring, with an optional unseen dot.

### 21.4 Slider

- `slider({ label, min, max, step, value, onChange })`, with `set(value)`. A native `input[type=range]` styled: track `--box-inner` 3u tall, fill `--lav`, thumb a 9u square with `--edge` (pixel look). Label and the current value beside it.
- Arrows change by `step`, Page Up and Page Down by 10 steps. `onChange` fires on input (live) for volumes.
- Disabled: 45% opacity.

### 21.5 Toggle

- `toggle({ label, value, onChange })`, with `set(value)`. `role="switch"`, `aria-checked`. A 20u × 10u pill with a 8u knob: off `--box-inner` with the knob left, on `--wine` with the knob right and a tiny check icon on the knob (state not by colour alone). Space or Enter flips it. Cue `ui.toggle`.

### 21.6 Card

- `card({ title, body, icon, vars, locked, onClick })`. `--plum` fill, `--b1` edge, `--r-m`, icon at the top, title `--fs-m`, body `--fs-s` `--muted`.
- Clickable cards are `button`s; static cards are `div`s.
- Locked: silhouette icon (CSS `filter: brightness(0)` at 60% opacity), padlock badge, body text is the unlock hint, `aria-disabled="true"` but still focusable.
- States: hover lifts 1u with lavender edge; selected (class) has a wine edge.

### 21.7 Meter

- `meter({ label, icon, value, max })`, with `set(value)`. Default: horizontal bar 3u tall in a `--box-inner` track with the icon on the left. Colour by fraction: `--need-ok` at 50% and up, `--need-mid` at 25 to 49%, `--need-low` under 25%, and under 25% the icon droops (`wilt`).
- Variant classes: `ep-meter--candle` (5.5), `ep-meter--hearts` (bond: `max` 4, drawn as heart slots).
- `role="meter"` with min, max, now and label. `set()` animates the fill over `--t-med` (instant in reduced motion).

### 21.8 Tooltip

- `tooltip(target, text, vars)`: one shared tooltip element. Shows after 350 ms hover or immediately on keyboard focus; hides on leave, blur, Esc or scroll.
- `--box`, `--b1` edge, `--fs-s`, max width 120u, a small tail toward the target, placed above the target and clamped like bubbles (flips below at the top edge).
- `aria-describedby` links target and tooltip. Touch: a long press of 500 ms shows it.

### 21.9 Extra pieces (internal, not in `UiKit`)

Chip, segmented control (speed, text size), list row, swatch, badge dot, polaroid frame, ribbon tab, scrim. They follow the same tokens and states.

---

## 22. Accessibility

### 22.1 Text size

`settings.textSize` sets `--ts` (0.9, 1, 1.2). All `--fs-*` tokens multiply by it and the floors scale too (3.2). Layouts use wrapping and `min-width: 0` so nothing clips at large size; HUD clusters may grow (the candles' labels are icons, so they do not grow).

### 22.2 Text speed

`settings.textSpeed` sets the dialogue typewriter rate (7.5), the bubble and toast hold factor (7.1), and the minigame start card's auto-start delay (16.1).

### 22.3 Reduced motion

- Active when `settings.reducedMotion === 'on'`, or `'system'` and `matchMedia('(prefers-reduced-motion: reduce)')` matches (watched for changes). The UI sets `data-motion="reduce"` on `#ep-ui` and `#ep-modal`.
- Then: no `pop`, `bob`, `wilt`, `wiggle`, `flicker`, `deal` or `flip`; transitions become opacity fades of 120 ms or less; the bloom appears at once; the credits page instead of rolling; the mail card has no tilt; the shutter flash is a short dim; the "+n" Hearts float fades in place.
- The UI tells the engine nothing; the engine reads the same setting for camera shake and particles.

### 22.4 Not by colour alone

Needs use wax height, flame size and a droop; locked items use a padlock and silhouette; style tags have letters; toggles have a knob position and a check; the active mode token has a rim.

### 22.5 Live regions

- `#ep-sr` has a polite region (`role="status"`) and an assertive one (`role="alert"`).
- Toasts are read politely; save failures assertively; speech lines politely and throttled (7.1); wish completion and bond level-ups politely.
- Panel opens move focus into the panel, which is announced by its `aria-labelledby` title.

### 22.6 Pointer and touch

All targets at least 24 CSS px. Hover-only information is also available on focus and long press. Touch is a nice-to-have: taps act as clicks, long press as hover.

### 22.7 Contrast

Text pairs listed in 3.1 all pass WCAG AA (4.5:1). `--locked` is decoration only.

---

## 23. Events

### 23.1 The UI listens to (bus `EpEvents`)

| Event | What the UI does |
| --- | --- |
| `sim.event` `say` | speech bubble (7.1), or a docked cheer during activities (16.4) |
| `sim.event` `thought` | thought bubble (7.2) |
| `sim.event` `hearts` | "+n" float at the Hearts chip |
| `sim.event` `wish.rolled` | deal the wish cards |
| `sim.event` `wish.completed` | flip the card, toast |
| `sim.event` `aspiration.tier` | toast, journal dot |
| `sim.event` `sticker` | toast, journal dot |
| `sim.event` `unlock` | toast, catalog sparkle |
| `sim.event` `mail.arrived` | toast, journal dot |
| `sim.event` `delivery` | toast, orders chip |
| `sim.event` `mood.band` | portrait and sticker change |
| `sim.event` `bond.level` | cat tab pip, toast |
| `sim.event` `interaction.start` / `interaction.end` | queue animation; cat panel "doing now" |
| `sim.event` `time.day` | day card, race-day ribbon |
| `sim.event` `mode` | switch HUD layout (4.3) |
| `sim.event` `onboarding.step` | dialogue box and highlight (7.5, 19) |
| `sim.event` `housewarming` | `ready`: toast; `done`: credits (18) |
| `ui.toast` | show the toast (the raw sim `toast` is ignored to avoid doubles) |
| `mode.changed` | HUD layout, including `title` |
| `build.opened` / `build.closed` | build HUD on and off |
| `input.click` | live mode: open the bloom or walk (6.3); close the bloom on outside clicks |
| `input.hover` | name tags (5.10), auto-fade (5.9) |
| `input.key` | the UI-owned actions: `toggleBuild`, `catalog`, `journal`, `photo`, `fullscreen`, `pause`, `speed1..3`, `cancel`, `confirm` (outside activities), arrows in live, and new `cats`, `toggleHud`, `help` |
| `action.dispatched` | gentle toast for rejected player actions (8.2) |
| `activity.started` / `activity.ended` | start card, result card |
| `settings.changed` | re-apply text size, speed and motion (when the app changes settings, for example after an import) |
| `save.result` | toasts and title notices |
| `app.visibility` | pause the typewriter and bubble timers while hidden |
| `photo.captured` | the photo preview card |
| new: `activity.skippable` (R5) | show Skip |

Build-mode-dev handles `rotate`, `sell`, `duplicate`, `eyedropper`, `undo`, `redo`, new `store`, arrows and `confirm` in build. The engine maps keys to `ActivityInput` in activities.

### 23.2 The UI emits

| Event | When |
| --- | --- |
| `ui.panel { panel, open }` | every panel open and close |
| `ui.menu { target, open }` | bloom open and close |
| `audio.cue` | UI sounds: `ui.click`, `ui.hover` (petals and tokens only, throttled 80 ms), `ui.open`, `ui.close`, `ui.confirm`, `ui.back`, `ui.nope`, `ui.toggle`, `ui.tab`, `ui.page`, `ui.toast`, `ui.petals`, `ui.queueAdd`, `ui.queueCancel`, `ui.speed`, `ui.pause`, `ui.hearts`, `ui.wish`, `ui.sticker`, `ui.unlock`, `ui.aspiration`, `mail.open`, `mail.close`, `photo.shutter`, `mode.build`, `mode.live`, `mode.photo`, and `blip` while typing |
| `settings.changed` | the player changed a setting (the UI is the only settings editor) |
| new: `app.request` (R3) | Continue, New game, Load from file, Export, Quit to title |
| new: `photo.request` (R3) | Snap, and filter previews |
| new: `activity.skip`, `activity.leave` (R5) | Skip and Leave in the minigame overlay |

Everything that changes the game goes through `deps.dispatch`: `walkTo`, `interact`, `queue.cancel`, `time.setSpeed`, `time.togglePause`, `mode.set`, `options.set`, `catalog.order` (live), `wardrobe.wear`, `wardrobe.streak`, `mail.read`, `photo.save`, `photo.delete`, `title.set`, `trade.accept`, `onboarding.next`, `onboarding.skip`.

### 23.3 Gaps (requested in `CONTRACT_REQUEST.md`)

| Id | Need | Proposed change |
| --- | --- | --- |
| R1 | Keys with no `KeyAction` | add `'secondary' \| 'cats' \| 'toggleHud' \| 'help' \| 'store'` |
| R2 | Build must place its tools bar and catalog body inside UI-owned frames | add `Ui.region(id: 'buildTop' \| 'buildBar' \| 'catalog'): HTMLElement` |
| R3 | The UI cannot reach save or capture without the app | add bus events `'app.request'` and `'photo.request'` |
| R4 | The photo album needs the PNGs | add `UiDeps.loadPhoto: (meta: PhotoMeta) => string \| null` |
| R5 | Minigame Skip and Leave need the app | add bus events `'activity.skippable'`, `'activity.skip'`, `'activity.leave'` |

Until these land, the UI works around them: R1 keys are read by a small UI keydown listener with the same guard (20.2); R2 falls back to build appending its own `kit.panel` elements to `deps.root`; R3 to R5 features show disabled with a tooltip.

---

## 24. String keys the UI needs

All in a `ui` domain file (`src/content/strings/ui.ts`), owned by the writer. No dashes, short lines, cats' voices where marked. The UI never builds sentences from pieces except with `{name}`, `{cat}` and `{n}`.

| Prefix | Examples |
| --- | --- |
| `ui.hud.*` | `ui.hud.queue.label`, `ui.hud.queue.cancel`, `ui.hud.queue.freeWill`, `ui.hud.day`, `ui.hud.speed.pause`, `ui.hud.speed.n`, `ui.hud.realTime`, `ui.hud.raceDay`, `ui.hud.hearts.tip`, `ui.hud.orders`, `ui.hud.carrying`, `ui.hud.hidden` |
| `ui.need.<key>.name`, `ui.need.<key>.help` | for the six needs and the five cat needs |
| `ui.mood.<band>` | `mopey` to `great` words |
| `ui.wish.*` | `ui.wish.none`, `ui.wish.done`, `ui.wish.allDone.<cat>`, `ui.wish.reward` |
| `ui.mode.*` | token names and tooltips with keys |
| `ui.bloom.*` | `ui.bloom.more`, `ui.bloom.back`, `ui.bloom.empty.<cat>` |
| `ui.toast.*` | one per row of 8.2 |
| `ui.build.*` | tool names and tips, `ui.build.paused`, `ui.build.cosy`, `ui.build.try` |
| `build.err.<PlacementError>` | thirteen reasons, gently worded |
| `ui.catalog.*` | title, Pickle lines, filters, sorts, badges, basket, order button, empty |
| `ui.journal.*` | tab names, page titles, every empty state (in cat voices) |
| `ui.cats.*` | panel title, doing-now phrases, bond tooltip |
| `ui.wardrobe.*` | slot names, tabs |
| `ui.mail.*`, `ui.trade.*`, `ui.race.*` | headers, buttons, empty states |
| `ui.photo.*` | filter names, snap, keep, retake, save PNG, said-by line |
| `ui.activity.*` | start, skip, pause menu, result card lines |
| `ui.title.*` | logo text, subtitle, buttons, notices, export reminder |
| `ui.confirm.*` | each confirm title and body |
| `ui.settings.*` | every label, option and help line |
| `ui.keys.*` | help card lines |
| `credits.*` | the roll |
| `ui.sr.*` | screen reader phrasing ("{cat} says: {n}") |

---

## 25. What other specs and modules must match

- **Engine:** emits the `KeyAction` bindings in 20.1 with the guard in 20.2; calls `ui.setScale` on boot and resize; uses the scale rule in 2.3 (2.5 at 1280 × 720, 2.75 at 1440 × 800, 4 at 1920 × 1080); `pointer.entity` includes Ellie, cats, visitors and smart objects; draws emotes and item or spot highlights on the hints layer; previews photo filters.
- **Sim:** `menuFor` returns petals in display order with a `reason` key for every disabled one; rejected `PlayerAction`s return a `StringKey` reason in the `ui.*` or `build.err.*` space; Ellie's `agent.current` progress fields are filled for the queue ring.
- **Cat AI and sim:** cat discoveries are flags, so the journal can show them: `known.<cat>.like.<tag>`, `known.<cat>.dislike.<tag>`, `known.<cat>.quirk.<quirkId>`.
- **Game designer:** items carry `room.<roomKind>` tags for the catalog room filter (untagged items show everywhere); every aspiration tier has goal and reward string keys `asp.<id>.tier<n>.goal` and `.reward`; every `InteractionDef` has an `icon` (petals and queue cards need one); wishes keep titles to 40 characters and petal labels to 22.
- **Writer:** the keys in section 24; cat-voiced empty states; no dashes.
- **Build-mode-dev:** builds sections 9 and 10 with `ui.kit`, adds `data-hl` ids from 19, and handles the build key actions.
- **Integrator:** wires `app.request`, `photo.request`, `activity.skip`/`leave`/`skippable`, `loadPhoto`, the stage DOM in 2.1, `audio.unlock()` on first gesture, and soft pause relies on `time.setSpeed` being accepted in live.
- **Audio:** the cue names in 23.2 exist in `SimpleCueName` today.

---

## 26. Checks before the UI is done

- Screenshots at 1440 × 800, 1280 × 720 and 1920 × 1080 for: title, live HUD by day and night, bloom near each edge, two bubbles plus a toast, build with the drawer on each side, live catalog, each journal tab with content and empty, cat panel, wardrobe, mail reader, photo mode and preview, minigame start, skip and result, settings at large text, credits.
- Every text at the smallest scale is 12 px or larger (a unit test over the computed `--fs-*` values at u = 2.5 and `--ts` 0.9).
- Keyboard-only run: start a game, queue two actions, cancel one, open and close every panel, place an item in build, take a photo, all without the mouse.
- Reduced motion on: no running animations except opacity fades.
- Unit tests: bloom layout and clamping, bubble placement and the 2-bubble limit with its priority queue, the key guard, the Esc stack, soft pause bookkeeping, toast merging, text size and speed maths.
