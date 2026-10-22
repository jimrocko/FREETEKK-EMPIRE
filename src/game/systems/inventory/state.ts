export interface ItemInstance {
  uid: string;
  defId: string;
  qty: number;
  /** 0–100 */
  condition: number;
  acquiredAt: number;
  /** Total price paid. */
  paid: number;
  /** Set while the item is bound elsewhere (e.g. "listing:a12"); locked items cannot be sold or used. */
  locked?: string;
}

export interface InventoryState {
  items: Record<string, ItemInstance>;
  nextUid: number;
}

export function createInventoryState(): InventoryState {
  return { items: {}, nextUid: 1 };
}
