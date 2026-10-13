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
