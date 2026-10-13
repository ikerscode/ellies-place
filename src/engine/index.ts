/**
 * Engine: fixed-step loop, layered renderer, sprite atlas, lighting, camera, input, particles.
 * Owner: engine-dev. Wave 1 typed stub; the owner replaces the body, keeping the signature.
 * Contract: design/spec/contracts.md section "engine".
 */
import { notImplemented, type CreateEngine } from '../core';

export type { Engine, EngineOptions, Camera, ParticleApi, RenderFrame, RenderHook, RenderLayer, SpriteAtlas, AtlasFrame } from '../core';

/** Boots the renderer and loop. The loop calls sim.step(sim.stepsPerTick()) at 20 Hz. */
export const createEngine: CreateEngine = () => notImplemented('createEngine');
