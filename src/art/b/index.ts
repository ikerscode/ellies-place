/** Batch B: bedroom, living room, lighting, electronics (design/spec/art-checklist.md). */
import type { ArtBatch } from '../base';
import { mvpSeating } from './seating';

export const BATCH: ArtBatch = {
  id: 'b',
  title: 'B: bedroom, living room, lighting, electronics',
  sprites: [...mvpSeating()],
};
