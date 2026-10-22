export interface SoundSystem {
  id: string;
  name: string;
  /** Item uids. */
  components: string[];
  createdAt: number;
}

export interface SoundState {
  systems: SoundSystem[];
  nextId: number;
}

export function createSoundState(): SoundState {
  return { systems: [], nextId: 1 };
}
