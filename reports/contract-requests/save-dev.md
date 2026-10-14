# Contract requests from save-dev#1

1. `SaveDeps` needs `content?: ContentIndex` so `load`, `importText` and `migrate` can run `validateSimState`, `fillMissing` and `reconcileState`. Implemented as `SaveDepsEx` in src/save/index.ts (the app passes `content`; without it only shallow checks run).
2. Autosave wiring: `startAutosave` listens on the bus (`sim.event` time.hour, `build.closed`, `mode.changed`) and on globalThis document `visibilitychange` and window `beforeunload`. The app must pass `bus` in `SaveDeps` and call `startAutosave`. The comment in `SaveApi` says `pagehide`; implemented as `beforeunload` per the task.
3. `getFile` should return null in an activity; save also skips any file whose `state.activity` is non-null.
