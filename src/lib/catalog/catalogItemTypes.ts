export type CatalogItemAvailabilityStatus = "available" | "unavailable" | "unknown";
export type CatalogItemStockStatus = "in_stock" | "out_of_stock" | "unknown";
export type CatalogItemConfidence = "high" | "medium" | "low";

export type CatalogItemForEstimate = {
  catalogItemId: string;
  name: string;
  normalizedName: string;
  category?: string;
  materialKey?: string;
  rateKey?: string;
  unit: string;
  unitLabel: string;
  currency?: string;
  unitPrice?: number | null;
  sourceId?: string;
  sourceLabel?: string;
  checkedAt?: string;
  confidence: CatalogItemConfidence;
  availabilityStatus: CatalogItemAvailabilityStatus;
  stockStatus: CatalogItemStockStatus;
};
