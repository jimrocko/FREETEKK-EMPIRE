export interface OwnedLifestyle {
  at: number;
  /** Last time its use action was done. */
  usedAt?: number;
}

export interface LifestyleState {
  /** Things you own right now. */
  owned: Record<string, OwnedLifestyle>;
  /** How often each thing was bought or experienced (first time gives the effects). */
  history: Record<string, number>;
  /** Experience id → last start. */
  lastExperience: Record<string, number>;
  /** Highest style rank reached (rank-ups are celebrated once). */
  bestTier: number;
}

export function createLifestyleState(): LifestyleState {
  return { owned: {}, history: {}, lastExperience: {}, bestTier: 0 };
}
