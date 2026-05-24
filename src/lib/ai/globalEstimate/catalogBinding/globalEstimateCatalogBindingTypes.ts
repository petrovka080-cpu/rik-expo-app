import type { CatalogItemAvailabilityStatus, CatalogItemConfidence, CatalogItemStockStatus } from "../../../catalog/catalogItemTypes";

export type EstimateCatalogBindingStatus =
  | "matched"
  | "multiple_candidates"
  | "no_catalog_match"
  | "not_material_row";

export type EstimateCatalogBindingCandidate = {
  catalogItemId: string;
  name: string;
  unit: string;
  unitLabel: string;
  unitPrice?: number | null;
  currency?: string;
  sourceId?: string;
  sourceLabel?: string;
  confidence: CatalogItemConfidence;
  availabilityStatus: CatalogItemAvailabilityStatus;
  stockStatus: CatalogItemStockStatus;
  matchReason: string;
};

export type EstimateCatalogBindingResult = {
  estimateId: string;
  rows: {
    rowId: string;
    materialKey?: string;
    rateKey?: string;
    catalogCandidates: EstimateCatalogBindingCandidate[];
    selectedCatalogItemId?: string;
    bindingStatus: EstimateCatalogBindingStatus;
  }[];
  warnings: string[];
};
