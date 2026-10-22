import { PEOPLE } from '../../content/people';

export interface PersonState {
  met: boolean;
  metAt?: number;
  via?: string;
  /** 0–100: how much they trust you. */
  trust: number;
  /** −100…100: how they feel about you right now. */
  relation: number;
  lastContactAt?: number;
  /** Game day of the last meeting / introduction (one per day). */
  lastMeetDay?: number;
  lastIntroDay?: number;
  lastWriteDay?: number;
  meetings: number;
  /** Their contacts you know about. */
  revealed: string[];
  /** Spots/places they told you about. */
  told: string[];
  /** > 0: they owe you favors; < 0: you owe them. */
  favor: number;
}

export interface PeopleState {
  people: Record<string, PersonState>;
}

export function createPersonState(): PersonState {
  return { met: false, trust: 0, relation: 0, meetings: 0, revealed: [], told: [], favor: 0 };
}

export function createPeopleState(now: number): PeopleState {
  const people: Record<string, PersonState> = {};
  for (const p of PEOPLE) {
    const st = createPersonState();
    const start = p.meet.find((m) => 'start' in m);
    if (start && 'start' in start) {
      st.met = true;
      st.metAt = now;
      st.via = 'start';
      st.trust = start.trust;
      st.relation = 25;
      st.lastContactAt = now;
    }
    people[p.id] = st;
  }
  return { people };
}
