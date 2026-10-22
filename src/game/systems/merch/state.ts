export interface MerchDesign {
  id: string;
  name: string;
  motif: string;
  /** 0–100 */
  quality: number;
  createdAt: number;
  /** 'self' or the designer's person id. */
  by: string;
}

export interface MerchOrder {
  id: string;
  designId: string;
  productId: string;
  manufacturerId: string;
  qty: number;
  unitCost: number;
  quality: number;
  readyAt: number;
}

export interface MerchStock {
  designId: string;
  productId: string;
  qty: number;
  /** Average cost per piece. */
  unitCost: number;
  quality: number;
}

export interface MerchState {
  designs: MerchDesign[];
  orders: MerchOrder[];
  /** Key: `${designId}|${productId}`. */
  stock: Record<string, MerchStock>;
  /** Selling price per product id. */
  prices: Record<string, number>;
  /** Markenwert 0–100+. */
  brand: number;
  shopOpen: boolean;
  nextId: number;
}

export function createMerchState(): MerchState {
  return { designs: [], orders: [], stock: {}, prices: {}, brand: 0, shopOpen: false, nextId: 1 };
}
