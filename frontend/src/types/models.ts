export type Role = "admin" | "user";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  isActive?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  fullCode?: string;
  description: string | null;
  parentLocationId: string | null;
  // Present (nested, up to 5 levels) on responses from GET /locations, /locations/:id,
  // and /locations/lookup - absent elsewhere (e.g. embedded in an InventoryItem/Product).
  parentLocation?: Location | null;
  isActive?: boolean;
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

export interface ProductSource {
  id: string;
  productId: string;
  label: string;
  url: string;
  notes: string | null;
  createdBy: string | null;
  createdByUser?: Pick<User, "id" | "username" | "displayName" | "role">;
  createdAt: string;
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
  partNumber: string | null;
  reorderThreshold: number | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  images?: ProductImage[];
  inventoryItems?: (InventoryItem & { location: Location })[];
  sources?: ProductSource[];
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
