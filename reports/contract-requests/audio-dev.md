# Contract request: audio-dev#1 (wave 1)

Not blocking. `src/audio` already plays these through its local `Cue` union. Adding them to core lets other modules emit them.

## 1. Three more simple cues

Build mode wants different sounds for walls and floors than for furniture, and the race wants a start horn.

```diff
--- a/src/core/types.ts
+++ b/src/core/types.ts
@@ export type SimpleCueName =
   | 'build.duplicate'
   | 'build.eyedropper'
+  | 'build.wall'
+  | 'build.floor'
@@
   | 'race.pb'
   | 'race.medal'
+  | 'race.horn'
   | 'cat.land'
```

## 2. Note on API names (no change needed)

The task brief says `setVolumes` and `setMusicState`, but the contract uses `applySettings` and `setMusic`. `createAudio` implements the contract names. It also exposes `setVolumes` and `setMusicState` as extra members of `LocalAudioApi`, which extends `AudioApi`.
