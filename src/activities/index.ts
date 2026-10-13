/**
 * Activities registry: minigames implementing the Activity contract.
 * Owner: activities-dev (each instance owns src/activities/<family>/ and registers here
 * through registerActivity, called from its own register<Family>() function).
 * Contract: design/spec/contracts.md section "activities".
 */
import type { ActivityDef, ActivityId, RegisterActivity } from '../core';

export type { Activity, ActivityDef, ActivityContext, ActivityInput, ActivityResult, ActivityParams } from '../core';

const registry = new Map<ActivityId, ActivityDef>();

/** Adds an activity. Throws on a duplicate id. */
export const registerActivity: RegisterActivity = (def) => {
  if (registry.has(def.id)) throw new Error(`activity already registered: ${def.id}`);
  registry.set(def.id, def);
};

export function getActivity(id: ActivityId): ActivityDef | undefined {
  return registry.get(id);
}

export function listActivities(): readonly ActivityDef[] {
  return [...registry.values()];
}

/** For tests. */
export function clearActivities(): void {
  registry.clear();
}
