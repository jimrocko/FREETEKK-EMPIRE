import type { Role } from '../../content/types';

export interface CrewMember {
  personId: string;
  role: Role;
  joinedAt: number;
  /** 0–100; below 30 they stop helping, below 15 they leave. */
  morale: number;
  wagePerDay: number;
}

export interface CrewState {
  founded: boolean;
  name: string;
  foundedAt?: number;
  members: CrewMember[];
}

export function createCrewState(): CrewState {
  return { founded: false, name: '', members: [] };
}
