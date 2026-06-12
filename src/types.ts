export interface InventoryItem {
  barcode: string;
  name: string;
  quantity: number;
  imageUrl?: string;
  brand?: string;
  category?: string;
  lastUpdated: number;
}
