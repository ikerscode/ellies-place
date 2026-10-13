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
- **Orders chip:** shown only while `inventory.orders` is not empty: a box icon, "Pickle: {n} on the way" and the in-game time until the soonest `arriveTick`. Hidden in real-time mode countdowns? No: real time still counts down in game minutes.

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
          | +15 <3   (done by tonight? no timers, just today)
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
- **Badges:** the Journal token shows a small lavender dot with a number for unread mail plus unseen stickers, unlocks and aspiration tiers (counted by the UI as "seen" sets kept in `Settings`? No: kept in a UI-only `localStorage` key `ellies-place:ui:seen`, wrapped in try/catch; losing it only re-shows dots).
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
