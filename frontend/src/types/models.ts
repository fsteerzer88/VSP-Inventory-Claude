export type Role = "admin" | "user";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parentLocationId: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  filePath: string;
  isPrimary: boolean;
  uploadedBy: string | null;
  uploadedAt: string;
}

export interface Product {
  id: string;
  barcode: string | null;
  barcodeType: string | null;
  name: string;
  description: string | null;
  manufacturer: string | null;
  category: string | null;
  sku: string | null;
  reorderThreshold: number | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  images?: ProductImage[];
  inventoryItems?: (InventoryItem & { location: Location })[];
}

export interface InventoryItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  product?: Product;
  location?: Location;
  transactions?: Transaction[];
}

export type TransactionType = "intake" | "checkout" | "adjustment" | "move";

export interface Transaction {
  id: string;
  type: TransactionType;
  inventoryItemId: string | null;
  productId: string;
  locationId: string;
  quantityDelta: number;
  quantityAfter: number;
  performedBy: string;
  performedAt: string;
  notes: string | null;
  product?: Product;
  location?: Location;
  performedByUser?: Pick<User, "id" | "username" | "displayName" | "role">;
}
