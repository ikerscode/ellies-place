/**
 * UI: DOM overlays (HUD, petals menu, toasts, bubbles, journal, panels) and the component kit.
 * Owner: ui-dev. Wave 1 typed stub; the owner replaces the body, keeping the signature.
 * Contract: design/spec/contracts.md section "ui".
 */
import { notImplemented, type CreateUi } from '../core';

export type { Ui, UiDeps, UiKit, UiComponent, InteractionMenuSpec, PanelId, JournalTab, ToastSpec } from '../core';

/** Mounts the overlay UI under deps.root. All text comes from deps.strings. */
export const createUi: CreateUi = () => notImplemented('createUi');
