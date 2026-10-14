/**
 * Save: versioned localStorage, backup slot, migrations, autosave, export and import, photos.
 * Owner: save-dev. Contract: design/spec/contracts.md section 19.
 */
import {
  DEFAULT_SETTINGS,
  LIMITS,
  PHOTO_KEY_PREFIX,
  SAVE_BACKUP_KEY,
  SAVE_KEY,
  SAVE_VERSION,
  SETTINGS_KEY,
  fillMissing,
  findNonJson,
  localDate,
  reconcileState,
  validateSimState,
  type ContentIndex,
  type CreateSave,
  type ImportResult,
  type JsonObject,
  type LoadResult,
  type Migration,
  type PhotoBundle,
  type PhotoId,
  type SaveApi,
  type SaveDeps,
  type SaveFile,
  type SaveResult,
  type Settings,
  type SimEvent,
  type SimState,
  type StorageLike,
} from '../core';

export type { SaveApi, SaveDeps, SaveFile, LoadResult, SaveResult, ImportResult, StorageLike } from '../core';

/** Upgrade steps, from each version to the next. Empty while SAVE_VERSION is 1. */
export const MIGRATIONS: readonly Migration[] = [];

/**
 * Optional extras beyond the frozen `SaveDeps` (see reports/contract-requests/save-dev.md).
 * Without `content`, structural validation and reconcile are skipped (shallow checks only).
 */
export interface SaveDepsEx extends SaveDeps {
  readonly content?: ContentIndex;
  /** Test seam: replaces MIGRATIONS and SAVE_VERSION. */
  readonly migrations?: readonly Migration[];
  readonly version?: number;
  /** Where visibilitychange and beforeunload live; defaults to globalThis. */
  readonly doc?: EventTargetLike | null;
  readonly win?: EventTargetLike | null;
}

export interface EventTargetLike {
  addEventListener(type: string, fn: () => void): void;
  removeEventListener(type: string, fn: () => void): void;
  readonly visibilityState?: string;
}

// ---- autosave policy (pure) -----------------------------------------------------

export type AutosaveTrigger =
  | { readonly kind: 'sim.event'; readonly event: SimEvent }
  | { readonly kind: 'build.closed' }
  | { readonly kind: 'mode.changed'; readonly mode: string; readonly prev: string }
  | { readonly kind: 'visibility'; readonly state: string }
  | { readonly kind: 'beforeunload' };

/** Whether a trigger should write an autosave: hourly game time, Build close, mode change, hidden tab, unload. */
export function shouldAutosave(t: AutosaveTrigger): boolean {
  switch (t.kind) {
    case 'sim.event':
      return t.event.type === 'time.hour';
    case 'build.closed':
    case 'beforeunload':
      return true;
    case 'mode.changed':
      return t.mode !== t.prev;
    case 'visibility':
      return t.state === 'hidden';
  }
}

// ---- helpers -----------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function errReason(e: unknown): 'quota' | 'error' {
  const text = `${(e as { name?: string })?.name ?? ''} ${(e as { message?: string })?.message ?? ''}`;
  return /quota/i.test(text) ? 'quota' : 'error';
}

/** Wraps a storage so no call can throw. Null in, null out. */
export function safeLocalStorage(storage: StorageLike | null): StorageLike | null {
  if (!storage) return null;
  return {
    getItem: (k) => {
      try {
        return storage.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => storage.setItem(k, v), // callers report failures
    removeItem: (k) => {
      try {
        storage.removeItem(k);
      } catch {
        /* ignore */
      }
    },
    key: (i) => {
      try {
        return storage.key(i);
      } catch {
        return null;
      }
    },
    get length() {
      try {
        return storage.length;
      } catch {
        return 0;
      }
    },
  };
}

class Bad extends Error {
  constructor(
    readonly why: 'format' | 'version' | 'tooNew' | 'invalid',
    msg: string,
    readonly version = 0,
  ) {
    super(msg);
  }
}

export const createSave: CreateSave = (deps: SaveDeps): SaveApi => {
  const ex = deps as SaveDepsEx;
  const migrations = ex.migrations ?? MIGRATIONS;
  const current = ex.version ?? SAVE_VERSION;
  const build = deps.build ?? 'dev';
  const store = safeLocalStorage(deps.storage);

  const emit = (kind: 'auto' | 'manual' | 'export' | 'import', ok: boolean, reason: string | null): void => {
    try {
      deps.bus?.emit('save.result', { kind, ok, reason });
    } catch {
      /* a listener must not break saving */
    }
  };

  /** Raw JSON object -> current SaveFile. Throws Bad. */
  function migrateRaw(raw: unknown): SaveFile {
    if (!isObj(raw) || raw.format !== 'ellies-place') throw new Bad('format', 'not an Ellie\'s Place save');
    const v = raw.version;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) throw new Bad('version', 'bad version');
    if (v > current) throw new Bad('tooNew', 'written by a newer build', v);
    if (!isObj(raw.state)) throw new Bad('invalid', 'state missing');
    let root = JSON.parse(JSON.stringify(raw)) as JsonObject;
    let ver = v;
    while (ver < current) {
      const step = migrations.find((m) => m.from === ver);
      if (!step) throw new Bad('version', `no migration from ${ver}`);
      root = step.migrate(root);
      ver = step.to;
    }
    const state = root.state as unknown as SimState;
    if (ex.content) {
      fillMissing(state, ex.content.db);
      const problems = validateSimState(state, ex.content.db);
      if (problems.length > 0) throw new Bad('invalid', problems.slice(0, 3).join('; '));
      reconcileState(state, ex.content);
    }
    const bad = findNonJson(state);
    if (bad.length > 0) throw new Bad('invalid', `non-JSON at ${bad[0]}`);
    const settings = mergeSettings(root.settings);
    return {
      format: 'ellies-place',
      version: ver,
      savedAtWallMs: typeof root.savedAtWallMs === 'number' ? root.savedAtWallMs : 0,
      build: typeof root.build === 'string' ? root.build : 'unknown',
      state,
      settings,
    };
  }

  function mergeSettings(raw: unknown): Settings {
    const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    if (isObj(raw)) {
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        const d = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[key];
        if (typeof raw[key] === typeof d && raw[key] !== null) out[key] = raw[key];
      }
    }
    return out as unknown as Settings;
  }

  type Slot = { kind: 'empty' } | { kind: 'ok'; file: SaveFile } | { kind: 'tooNew'; version: number } | { kind: 'bad' };

  function readSlot(key: string): Slot {
    const text = store!.getItem(key);
    if (text === null) return { kind: 'empty' };
    try {
      return { kind: 'ok', file: migrateRaw(JSON.parse(text)) };
    } catch (e) {
      if (e instanceof Bad && e.why === 'tooNew') return { kind: 'tooNew', version: e.version };
      return { kind: 'bad' };
    }
  }

  function write(file: SaveFile, kind: 'auto' | 'manual'): SaveResult {
    if (!store) {
      emit(kind, false, 'unavailable');
      return { ok: false, reason: 'unavailable' };
    }
    const bad = findNonJson(file.state);
    if (bad.length > 0) {
      emit(kind, false, 'nonJson');
      return { ok: false, reason: 'nonJson' };
    }
    try {
      const prev = store.getItem(SAVE_KEY);
      if (prev !== null) {
        const slot = readSlot(SAVE_KEY);
        if (slot.kind === 'tooNew') {
          emit(kind, false, 'tooNew');
          return { ok: false, reason: 'tooNew' };
        }
        if (slot.kind === 'ok') {
          try {
            store.setItem(SAVE_BACKUP_KEY, prev);
          } catch {
            /* backup is best effort; the main write below reports the real failure */
          }
        }
      }
      store.setItem(SAVE_KEY, JSON.stringify(file));
    } catch (e) {
      const reason = errReason(e);
      emit(kind, false, reason);
      return { ok: false, reason };
    }
    emit(kind, true, null);
    return { ok: true };
  }

  const api: SaveApi = {
    get available() {
      if (!store) return false;
      try {
        const probe = 'ellies-place:probe';
        store.setItem(probe, '1');
        store.removeItem(probe);
        return true;
      } catch {
        return false;
      }
    },
    hasSave() {
      if (!store) return false;
      return store.getItem(SAVE_KEY) !== null || store.getItem(SAVE_BACKUP_KEY) !== null;
    },
    load(): LoadResult {
      if (!store) return { kind: 'unavailable' };
      const main = readSlot(SAVE_KEY);
      if (main.kind === 'ok') return { kind: 'ok', file: main.file };
      if (main.kind === 'tooNew') return { kind: 'tooNew', version: main.version };
      const backup = readSlot(SAVE_BACKUP_KEY);
      if (backup.kind === 'ok') return { kind: 'recovered', file: backup.file, from: 'backup' };
      if (main.kind === 'empty' && backup.kind === 'empty') return { kind: 'none' };
      return { kind: 'corrupt' };
    },
    save: (file) => write(file, 'manual'),
    makeFile(state, settings) {
      const bad = findNonJson(state);
      if (bad.length > 0) {
        emit('auto', false, 'nonJson');
        return null;
      }
      return {
        format: 'ellies-place',
        version: current,
        savedAtWallMs: deps.clock.wallNow(),
        build,
        state: JSON.parse(JSON.stringify(state)) as SimState,
        settings: { ...settings },
      };
    },
    collectPhotos(file) {
      const out: Record<PhotoId, string> = {};
      if (!store) return out;
      for (const p of file.state.album.photos.slice(0, LIMITS.photos)) {
        const url = api.loadPhoto(p.id);
        if (url !== null) out[p.id] = url;
      }
      return out;
    },
    exportFile(file, photos) {
      const ids = Object.keys(photos).slice(0, LIMITS.photos);
      const bundle: Record<string, string> = {};
      for (const id of ids) bundle[id] = photos[id as PhotoId]!;
      const json = JSON.stringify({ ...file, photos: bundle }, null, 1);
      emit('export', true, null);
      return { filename: `ellies-place-${localDate(deps.clock.wallNow())}.json`, json };
    },
    importText(text): ImportResult {
      const fail = (reason: Extract<ImportResult, { ok: false }>['reason']): ImportResult => {
        emit('import', false, reason);
        return { ok: false, reason };
      };
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        return fail('parse');
      }
      try {
        const file = migrateRaw(raw);
        const photos: Record<PhotoId, string> = {};
        const rawPhotos = (raw as Record<string, unknown>).photos;
        if (rawPhotos !== undefined) {
          if (!isObj(rawPhotos)) return fail('invalid');
          const entries = Object.entries(rawPhotos);
          if (entries.length > LIMITS.photos) return fail('invalid');
          for (const [id, url] of entries) {
            if (typeof url !== 'string' || !url.startsWith('data:image/')) return fail('invalid');
            photos[id as PhotoId] = url;
          }
        }
        emit('import', true, null);
        return { ok: true, file, photos };
      } catch (e) {
        if (e instanceof Bad) return fail(e.why);
        return fail('invalid');
      }
    },
    saveSettings(settings) {
      if (!store) return { ok: false, reason: 'unavailable' };
      try {
        store.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: errReason(e) };
      }
    },
    loadSettings() {
      try {
        const text = store?.getItem(SETTINGS_KEY);
        if (text) return mergeSettings(JSON.parse(text));
      } catch {
        /* fall through */
      }
      return { ...DEFAULT_SETTINGS };
    },
    migrate(raw) {
      try {
        return migrateRaw(raw);
      } catch (e) {
        throw e instanceof Bad ? new Error(`${e.why}: ${e.message}`) : e;
      }
    },
    savePhoto(id, dataUrl) {
      if (!store) return { ok: false, reason: 'unavailable' };
      try {
        const key = PHOTO_KEY_PREFIX + id;
        if (store.getItem(key) === null) {
          let n = 0;
          for (let i = 0; i < store.length; i++) if (store.key(i)?.startsWith(PHOTO_KEY_PREFIX)) n++;
          if (n >= LIMITS.photos) return { ok: false, reason: 'quota' };
        }
        store.setItem(key, dataUrl);
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: errReason(e) };
      }
    },
    loadPhoto: (id) => store?.getItem(PHOTO_KEY_PREFIX + id) ?? null,
    deletePhoto(id) {
      store?.removeItem(PHOTO_KEY_PREFIX + id);
    },
    startAutosave(getFile) {
      const fire = (t: AutosaveTrigger): void => {
        if (!shouldAutosave(t)) return;
        const file = getFile();
        // F34: never snapshot a running activity.
        if (!file || file.state.activity !== null) return;
        write(file, 'auto');
      };
      const stops: (() => void)[] = [];
      const bus = deps.bus;
      if (bus) {
        stops.push(bus.on('sim.event', (event) => fire({ kind: 'sim.event', event })));
        stops.push(bus.on('build.closed', () => fire({ kind: 'build.closed' })));
        stops.push(bus.on('mode.changed', (p) => fire({ kind: 'mode.changed', mode: p.mode, prev: p.prev })));
      }
      const g = globalThis as unknown as { document?: EventTargetLike; window?: EventTargetLike };
      const doc = ex.doc !== undefined ? ex.doc : (g.document ?? null);
      const win = ex.win !== undefined ? ex.win : (g.window ?? null);
      if (doc) {
        const onVis = (): void => fire({ kind: 'visibility', state: doc.visibilityState ?? 'visible' });
        doc.addEventListener('visibilitychange', onVis);
        stops.push(() => doc.removeEventListener('visibilitychange', onVis));
      }
      if (win) {
        const onUnload = (): void => fire({ kind: 'beforeunload' });
        win.addEventListener('beforeunload', onUnload);
        stops.push(() => win.removeEventListener('beforeunload', onUnload));
      }
      return () => stops.splice(0).forEach((s) => s());
    },
  };
  return api;
};
