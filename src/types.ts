export interface ProductLookupData {
  name: string;
  imageUrl?: string;
  brand?: string;
  category?: string;
  purchasePrice?: number;
  salesPrice?: number;
  lastMovement?: number;
  /** Contenance/format renvoyé par OpenFoodFacts (ex : « 330 ml »). Transitoire, non persisté. */
  format?: string;
  /** Nutri-Score a–e renvoyé par OpenFoodFacts. Transitoire, non persisté. */
  nutriScore?: string;
}

export interface InventoryItem extends ProductLookupData {
  barcode: string;
  name: string;
  quantity: number;
  imageUrl?: string;
  brand?: string;
  category?: string;
  lastUpdated: number;
  purchasePrice?: number;
  salesPrice?: number;
  lastMovement?: number;
}

export interface CategoryItem {
  id?: string;
  name: string;
  icon?: string;
}

