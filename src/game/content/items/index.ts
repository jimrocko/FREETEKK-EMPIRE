import type { ItemDef } from '../types';
import { GADGET_ITEMS } from './gadgets';
import { MUSIC_ITEMS } from './music';

/** All item definitions. New categories are added as separate files. */
export const ALL_ITEMS: readonly ItemDef[] = [...GADGET_ITEMS, ...MUSIC_ITEMS];
