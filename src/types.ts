export interface ProductLookupData {
  name: string;
  imageUrl?: string;
  brand?: string;
  category?: string;
}

export interface InventoryItem extends ProductLookupData {
  barcode: string;
  name: string;
  quantity: number;
  imageUrl?: string;
  brand?: string;
  category?: string;
  lastUpdated: number;
}
