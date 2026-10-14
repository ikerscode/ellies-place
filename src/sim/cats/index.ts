/**
 * Cat agents and visitors: personality multipliers, quirks, bonds, bubbles, Bruce, Poe, Pickle.
 * Owner: cat-ai-dev. Wave 1 typed stub; the owner replaces the body, keeping the signature.
 * Contract: design/spec/contracts.md section "cats". Pass the plugin to createSim({ plugins }) so the game
 * starts (or loads) only after it is registered.
 */
import { notImplemented, type CreateCatsPlugin } from '../../core';

/** The cat and visitor SimPlugin; goes after `world.plugin()` in `CreateSimOptions.plugins`. */
export const createCatsPlugin: CreateCatsPlugin = () => notImplemented('createCatsPlugin');
