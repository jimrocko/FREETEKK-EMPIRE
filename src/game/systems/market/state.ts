export interface MarketOffer {
  id: string;
  defId: string;
  condition: number;
  price: number;
  seller: string;
  note: string;
  createdAt: number;
  expiresAt: number;
  /** Price relative to fair value < 0.82 */
  deal?: boolean;
  /** Player already tried to haggle. */
  negotiated?: boolean;
}

export interface MarketState {
  offers: MarketOffer[];
  nextId: number;
  lastRefreshDay: number;
}

export function createMarketState(): MarketState {
  return { offers: [], nextId: 1, lastRefreshDay: 0 };
}
