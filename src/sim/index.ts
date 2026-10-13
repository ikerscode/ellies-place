/**
 * Simulation: entity store, systems, needs, utility AI, smart objects, pathfinding, progression.
 * Owner: sim-dev. Wave 1 typed stub; the owner replaces the body, keeping the signature.
 * Contract: design/spec/contracts.md section "sim".
 */
import { notImplemented, type CreateSim } from '../core';

export type { Sim, SimPlugin, AiHooks, AiContext, CreateSimOptions, System, SystemContext, ActionHandlers } from '../core';

/** Creates a deterministic sim from content, seed and an injected clock. */
export const createSim: CreateSim = () => notImplemented('createSim');
