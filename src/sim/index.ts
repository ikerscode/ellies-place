/**
 * Simulation: entity store, systems, needs, utility AI, smart objects, pathfinding, progression.
 * Owner: sim-dev. Wave 1 typed stub; the owner replaces the body, keeping the signature.
 * Contract: design/spec/contracts.md section "sim".
 */
import { notImplemented, type CreateSim, type SimToolkit } from '../core';

export type {
  Sim,
  SimPlugin,
  SimToolkit,
  AiHooks,
  AiContext,
  CreateSimOptions,
  System,
  SystemContext,
  ActionHandlers,
  EvalScope,
  StartActionRequest,
  StartActionResult,
} from '../core';

/** Creates a deterministic sim from content, seed and an injected clock. */
export const createSim: CreateSim = () => notImplemented('createSim');

// The plugin toolkit (F30): the same code paths the player and free will use. sim-dev implements these;
// src/world and src/sim/cats import them from here and never fork the sim.
export const evalCondition: SimToolkit['evalCondition'] = () => notImplemented('evalCondition');
export const applyEffects: SimToolkit['applyEffects'] = () => notImplemented('applyEffects');
export const startAction: SimToolkit['startAction'] = () => notImplemented('startAction');
export const cancelAction: SimToolkit['cancelAction'] = () => notImplemented('cancelAction');
export const reserveSlot: SimToolkit['reserveSlot'] = () => notImplemented('reserveSlot');
export const releaseSlot: SimToolkit['releaseSlot'] = () => notImplemented('releaseSlot');
