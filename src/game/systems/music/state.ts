import type { Arrangement, ElementId, MixEffort, TrackStat } from '../../content/music';

export interface Track {
  id: string;
  name: string;
  genreId: string;
  bpm: number;
  /** Element → item definition used. */
  elements: Partial<Record<ElementId, string>>;
  arrangement: Arrangement;
  effort: MixEffort;
  stats: Record<TrackStat, number>;
  /** 0–100 */
  score: number;
  createdAt: number;
  status: 'producing' | 'done';
  uploadedAt?: number;
  /** Released on your label (EP). */
  releasedAt?: number;
  /** Stream multiplier for uploaded tracks (decays daily). */
  hype: number;
  givenTo: string[];
  playedBy: string[];
}

export interface MusicState {
  tracks: Track[];
  nextId: number;
}

export function createMusicState(): MusicState {
  return { tracks: [], nextId: 1 };
}
