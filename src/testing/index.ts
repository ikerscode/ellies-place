/**
 * Test hooks: window.__EP__, only with ?test=1.
 * Owner: qa-engineer. Wave 1 typed stub; the owner replaces the body, keeping the signature.
 * Contract: design/spec/contracts.md section "test hooks".
 */
import { notImplemented, type InstallTestHooks } from '../core';

export type { TestHooks, TestHookDeps, FrameStats } from '../core';

/** True only when the query string has test=1. */
export function isTestMode(search: string): boolean {
  return new URLSearchParams(search).get('test') === '1';
}

/** Installs hooks on target (window) in test mode; returns null otherwise. */
export const installTestHooks: InstallTestHooks = (_deps, search) => {
  if (!isTestMode(search)) return null;
  return notImplemented('installTestHooks');
};
