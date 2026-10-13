/**
 * Build mode UX: ghost preview, tools, undo and redo, catalog, deliveries, cosy meter.
 * Owner: build-mode-dev. Wave 1 typed stub; the owner replaces the body, keeping the signature.
 * Contract: design/spec/contracts.md section "build".
 */
import { notImplemented, type CreateBuild } from '../core';

export type { BuildMode, BuildDeps } from '../core';

/** Build mode controller; emits build.opened and build.closed on the bus. */
export const createBuild: CreateBuild = () => notImplemented('createBuild');
