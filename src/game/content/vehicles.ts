import type { Condition } from '../core/types';

export interface RentalOption {
  id: string;
  /** Vehicle item it behaves like. */
  defId: string;
  label: string;
  perDay: number;
  requires?: Condition[];
}

/** Rental vans, bookable by phone for one game day. */
export const RENTAL_OPTIONS: readonly RentalOption[] = [
  { id: 'rent.kombi', defId: 'item.car-kombi', label: 'Kombi mieten', perDay: 45 },
  { id: 'rent.sprinter', defId: 'item.van-sprinter', label: 'Sprinter mieten', perDay: 110 },
  { id: 'rent.truck', defId: 'item.truck-75', label: '7,5-Tonner mieten', perDay: 260, requires: [{ t: 'skill', skill: 'organisation', gte: 4 }] },
];
