import { describe, expect, it } from 'vitest';
import { createManualClock } from '../../../src/core/clock';
import { migrationChainProblems } from '../../../src/core/validate';
import { createEmptySimState, emptyLot } from '../../../src/core/state';
import {
  DEFAULT_SETTINGS,
  LIMITS,
  PHOTO_KEY_PREFIX,
  SAVE_BACKUP_KEY,
  SAVE_KEY,
  SAVE_VERSION,
  SETTINGS_KEY,
  type PhotoId,
  type SimEvent,
  type SimState,
  type StorageLike,
} from '../../../src/core/types';
import { FIXTURE_START } from '../core/fixtures';
import { makeFakeBus, makeMemoryStorage } from '../core/fakes';
import { MIGRATIONS, createSave, safeLocalStorage, shouldAutosave, type SaveDepsEx } from '../../../src/save';

const PNG = 'data:image/png;base64,AAAA';
const mkState = (seed = 1): SimState => createEmptySimState(seed, FIXTURE_START, { lot: emptyLot(30, 17) });
function setup(extra: Partial<SaveDepsEx> = {}, storage: StorageLike | null = makeMemoryStorage()) {
  const fb = makeFakeBus();
  const clock = createManualClock(0, Date.UTC(2026, 9, 14, 12));
  const save = createSave({ storage, clock, bus: fb.bus, build: 't', ...extra } as SaveDepsEx);
  return { save, fb, storage, clock };
}
const file = (s: ReturnType<typeof setup>['save'], seed = 1) => s.makeFile(mkState(seed), DEFAULT_SETTINGS)!;

describe('save', () => {
  it('reports none, then round-trips equal', () => {
    const { save } = setup();
    expect(save.load()).toEqual({ kind: 'none' });
    const f = file(save);
    expect(save.save(f)).toEqual({ ok: true });
    const r = save.load();
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.file).toEqual(f);
  });

  it('rotates the previous good save into the backup slot', () => {
    const { save, storage } = setup();
    save.save(file(save, 1));
    expect(storage!.getItem(SAVE_BACKUP_KEY)).toBeNull();
    save.save(file(save, 2));
    const backup = JSON.parse(storage!.getItem(SAVE_BACKUP_KEY)!);
    expect(backup.state.rng).toEqual(mkState(1).rng);
  });

  it('recovers from backup when main is corrupt, and falls to corrupt when both are', () => {
    const { save, storage } = setup();
    save.save(file(save, 1));
    save.save(file(save, 2));
    storage!.setItem(SAVE_KEY, '{nope');
    const r = save.load();
    expect(r.kind).toBe('recovered');
    storage!.setItem(SAVE_BACKUP_KEY, '[]');
    expect(save.load()).toEqual({ kind: 'corrupt' });
  });

  it('does not overwrite a corrupt main into the backup', () => {
    const { save, storage } = setup();
    save.save(file(save, 1));
    save.save(file(save, 2));
    const good = storage!.getItem(SAVE_BACKUP_KEY);
    storage!.setItem(SAVE_KEY, 'garbage');
    save.save(file(save, 3));
    expect(storage!.getItem(SAVE_BACKUP_KEY)).toBe(good);
  });

  it('reports quota failure with an error event and keeps working', () => {
    const mem = makeMemoryStorage();
    const { save, fb } = setup({}, mem);
    mem.failWrites = true;
    expect(save.save(file(save))).toEqual({ ok: false, reason: 'quota' });
    expect(fb.of('save.result').some((e) => !e.ok && e.reason === 'quota')).toBe(true);
    mem.failWrites = false;
    expect(save.save(file(save)).ok).toBe(true);
  });

  it('survives a throwing storage and null storage', () => {
    const boom = (): never => {
      throw new Error('SecurityError');
    };
    const bad: StorageLike = { getItem: boom, setItem: boom, removeItem: boom, key: boom, get length(): number { return boom(); } };
    const { save, fb } = setup({}, bad);
    expect(save.available).toBe(false);
    expect(save.hasSave()).toBe(false);
    expect(save.save(file(save)).ok).toBe(false);
    expect(fb.of('save.result').length).toBeGreaterThan(0);
    expect(save.load().kind).toBe('none');
    expect(save.loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(save.saveSettings(DEFAULT_SETTINGS).ok).toBe(false);
    const none = setup({}, null).save;
    expect(none.load()).toEqual({ kind: 'unavailable' });
    expect(none.save(file(none))).toEqual({ ok: false, reason: 'unavailable' });
    expect(safeLocalStorage(null)).toBeNull();
  });

  it('never loads or overwrites a save from a newer build', () => {
    const newer = JSON.stringify({ ...file(setup().save), version: SAVE_VERSION + 1 });
    const { save, storage } = setup({}, makeMemoryStorage({ [SAVE_KEY]: newer }));
    expect(save.load()).toEqual({ kind: 'tooNew', version: SAVE_VERSION + 1 });
    expect(save.save(file(save))).toEqual({ ok: false, reason: 'tooNew' });
    expect(storage!.getItem(SAVE_KEY)).toBe(newer);
    expect(save.importText(newer)).toEqual({ ok: false, reason: 'tooNew' });
  });

  it('refuses to make a file from a state with NaN', () => {
    const { save, fb } = setup();
    const s = mkState();
    s.time.tick = NaN;
    expect(save.makeFile(s, DEFAULT_SETTINGS)).toBeNull();
    expect(fb.of('save.result')[0]).toMatchObject({ ok: false, reason: 'nonJson' });
  });

  it('exports and imports with photos, never touching storage', () => {
    const { save, storage } = setup();
    const f = file(save);
    const id = 'p1' as PhotoId;
    f.state.album.photos.push({ id } as never);
    save.savePhoto(id, PNG);
    const photos = save.collectPhotos(f);
    expect(photos).toEqual({ [id]: PNG });
    const out = save.exportFile(f, photos);
    expect(out.filename).toBe('ellies-place-2026-10-14.json');
    const fresh = setup({}, makeMemoryStorage());
    const r = fresh.save.importText(out.json);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.photos).toEqual({ [id]: PNG });
      expect(r.file.state).toEqual(f.state);
    }
    expect(fresh.storage!.length).toBe(0);
    expect(storage!.getItem(PHOTO_KEY_PREFIX + id)).toBe(PNG);
  });

  it('rejects bad imports', () => {
    const { save } = setup();
    const f = file(save);
    expect(save.importText('{x')).toEqual({ ok: false, reason: 'parse' });
    expect(save.importText('[]')).toEqual({ ok: false, reason: 'format' });
    expect(save.importText(JSON.stringify({ ...f, format: 'x' }))).toEqual({ ok: false, reason: 'format' });
    expect(save.importText(JSON.stringify({ ...f, version: 'a' }))).toEqual({ ok: false, reason: 'version' });
    expect(save.importText(JSON.stringify({ ...f, state: 5 }))).toEqual({ ok: false, reason: 'invalid' });
    const many: Record<string, string> = {};
    for (let i = 0; i <= LIMITS.photos; i++) many[`p${i}`] = PNG;
    expect(save.importText(JSON.stringify({ ...f, photos: many }))).toEqual({ ok: false, reason: 'invalid' });
    expect(save.importText(JSON.stringify({ ...f, photos: { a: 'javascript:1' } }))).toEqual({ ok: false, reason: 'invalid' });
  });

  it('migration chain is unbroken and migrates step by step', () => {
    expect(migrationChainProblems(MIGRATIONS)).toEqual([]);
    const steps = [
      { from: 1, to: 2, migrate: (r: Record<string, unknown>) => ({ ...r, version: 2, a: 1 }) },
      { from: 2, to: 3, migrate: (r: Record<string, unknown>) => ({ ...r, version: 3, b: (r.a as number) + 1 }) },
    ] as never;
    expect(migrationChainProblems(steps, 3)).toEqual([]);
    const { save } = setup({ migrations: steps, version: 3 });
    const old = { ...file(save), version: 1 };
    const out = save.migrate(old);
    expect(out.version).toBe(3);
    expect((out as unknown as { b: number }).b).toBeUndefined(); // only SaveFile fields are kept
    expect(() => setup({ migrations: [], version: 2 }).save.migrate(old)).toThrow();
  });

  it('keeps settings under their own key', () => {
    const { save, storage } = setup();
    expect(save.saveSettings({ ...DEFAULT_SETTINGS, musicVolume: 0.1 }).ok).toBe(true);
    expect(storage!.getItem(SETTINGS_KEY)).not.toBeNull();
    expect(storage!.getItem(SAVE_KEY)).toBeNull();
    expect(save.loadSettings().musicVolume).toBe(0.1);
    storage!.setItem(SETTINGS_KEY, '{"musicVolume":"loud"}');
    expect(save.loadSettings()).toEqual(DEFAULT_SETTINGS);
    storage!.setItem(SETTINGS_KEY, 'zzz');
    expect(save.loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('caps stored photos', () => {
    const { save } = setup();
    for (let i = 0; i < LIMITS.photos; i++) expect(save.savePhoto(`p${i}` as PhotoId, PNG).ok).toBe(true);
    expect(save.savePhoto('extra' as PhotoId, PNG).ok).toBe(false);
    save.deletePhoto('p0' as PhotoId);
    expect(save.savePhoto('extra' as PhotoId, PNG).ok).toBe(true);
  });
});

describe('autosave', () => {
  const hour: SimEvent = { type: 'time.hour', day: 1, hour: 9 };
  it('policy is pure', () => {
    expect(shouldAutosave({ kind: 'sim.event', event: hour })).toBe(true);
    expect(shouldAutosave({ kind: 'sim.event', event: { type: 'mode', mode: 'live' } })).toBe(false);
    expect(shouldAutosave({ kind: 'build.closed' })).toBe(true);
    expect(shouldAutosave({ kind: 'mode.changed', mode: 'build', prev: 'live' })).toBe(true);
    expect(shouldAutosave({ kind: 'visibility', state: 'visible' })).toBe(false);
    expect(shouldAutosave({ kind: 'visibility', state: 'hidden' })).toBe(true);
    expect(shouldAutosave({ kind: 'beforeunload' })).toBe(true);
  });

  it('writes on triggers, skips activities, and stops', () => {
    const listeners = new Map<string, () => void>();
    const doc = {
      visibilityState: 'visible',
      addEventListener: (t: string, f: () => void) => void listeners.set(t, f),
      removeEventListener: (t: string) => void listeners.delete(t),
    };
    const win = { addEventListener: doc.addEventListener, removeEventListener: doc.removeEventListener };
    const { save, fb, storage } = setup({ doc, win });
    let f: ReturnType<typeof file> | null = file(save);
    const stop = save.startAutosave(() => f);
    const writes = (): number => (storage!.getItem(SAVE_KEY) ? 1 : 0);
    fb.bus.emit('sim.event', hour);
    expect(writes()).toBe(1);
    storage!.removeItem(SAVE_KEY);
    fb.bus.emit('mode.changed', { mode: 'build', prev: 'live' });
    expect(writes()).toBe(1);
    storage!.removeItem(SAVE_KEY);
    fb.bus.emit('build.closed', { added: [], moved: [], removed: [], painted: [] } as never);
    expect(writes()).toBe(1);
    storage!.removeItem(SAVE_KEY);
    listeners.get('visibilitychange')!();
    expect(writes()).toBe(0);
    doc.visibilityState = 'hidden';
    listeners.get('visibilitychange')!();
    expect(writes()).toBe(1);
    storage!.removeItem(SAVE_KEY);
    listeners.get('beforeunload')!();
    expect(writes()).toBe(1);
    storage!.removeItem(SAVE_KEY);
    const inAct = file(save);
    inAct.state.activity = {} as never;
    f = inAct;
    fb.bus.emit('sim.event', hour);
    expect(writes()).toBe(0);
    f = null;
    fb.bus.emit('sim.event', hour);
    expect(writes()).toBe(0);
    stop();
    f = file(save);
    fb.bus.emit('sim.event', hour);
    expect(writes()).toBe(0);
    expect(listeners.size).toBe(0);
  });
});
