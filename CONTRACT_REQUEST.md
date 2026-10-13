# Contract request from ui-dev#1 (Wave 1)

Context: `design/spec/ui.md` section 23.3. All changes are additive to `src/core/types.ts`; nothing existing changes shape.

## R1. New KeyActions

```diff
 export type KeyAction =
   | 'toggleBuild'
   ...
   | 'left'
-  | 'right';
+  | 'right'
+  /** Activity secondary input (X, Shift). */
+  | 'secondary'
+  /** Toggle the cat panel (K). */
+  | 'cats'
+  /** Hide or show the live HUD (H). */
+  | 'toggleHud'
+  /** Keyboard help card (Shift + /). */
+  | 'help'
+  /** Build: put the selected item into storage (S). */
+  | 'store';
```

## R2. UI regions for build-mode-dev

```diff
 export interface Ui {
   ...
   readonly kit: UiKit;
+  /** UI-owned frames other modules fill: the build top chip, the build tools bar, the catalog body. */
+  region(id: UiRegionId): HTMLElement;
   destroy(): void;
 }
+export type UiRegionId = 'buildTop' | 'buildBar' | 'catalog';
```

## R3. App requests and photo capture (bus)

```diff
 export interface EpEvents {
   ...
   'photo.captured': { readonly photo: PhotoMeta; readonly dataUrl: string };
+  /** UI asks the app to do save and session work it cannot reach. */
+  'app.request':
+    | { readonly kind: 'continue' }
+    | { readonly kind: 'newGame' }
+    | { readonly kind: 'import'; readonly text: string }
+    | { readonly kind: 'export' }
+    | { readonly kind: 'quitToTitle' };
+  /** Photo mode: preview a filter (snap: false) or capture (snap: true). Frame in logical canvas pixels. */
+  'photo.request': { readonly filter: PhotoFilter; readonly frame: Rect; readonly snap: boolean };
 }
```

(`Rect` = `{ x, y, w, h }` in logical pixels; reuse an existing rect type if core has one.)

## R4. Photo images for the album

```diff
 export interface UiDeps {
   ...
   readonly worldToScreen: (world: Vec2) => { x: number; y: number };
+  /** PNG data URL for an album photo, or null if missing (wraps save.loadPhoto). */
+  readonly loadPhoto: (meta: PhotoMeta) => string | null;
 }
```

## R5. Minigame Skip and Leave (bus)

```diff
 export interface EpEvents {
   ...
+  /** App: the running activity's canSkip() turned true. */
+  'activity.skippable': { readonly activity: ActivityId };
+  /** UI: the player pressed Skip (app calls activity.skip()). */
+  'activity.skip': { readonly activity: ActivityId };
+  /** UI: the player chose Leave in the pause menu (app finishes with a no-reward result). */
+  'activity.leave': { readonly activity: ActivityId };
 }
```
