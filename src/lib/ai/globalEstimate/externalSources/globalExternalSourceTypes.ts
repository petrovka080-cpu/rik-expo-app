import type {
  EstimateRowSourceEvidence,
  GlobalEstimateConfidence,
  GlobalEstimateSourceFreshness,
  GlobalPriceSourceType,
  GlobalUnitInput,
} from "../globalEstimateTypes";

export type GlobalExternalSourceType = Extract<
  GlobalPriceSourceType,
  | "internal_marketplace"
  | "external_marketplace"
  | "supplier_catalog_api"
  | "uploaded_price_list"
  | "official_tax_source"
  | "configured_reference"
  | "manual_admin_rate"
>;

export type GlobalExternalSourceConnector = {
  id: string;
  sourceType: GlobalExternalSourceType;
  label: string;
  enabled: boolean;
  approvalRequired: boolean;
  blocksEstimateRuntime: false;
  url?: string;
};

export type GlobalExternalSourceRun = {
  id: string;
  connectorId: string;
  startedAt: string;
  finishedAt: string;
  status: "success" | "queued" | "failed";
  observationsCount: number;
};

export type GlobalExternalPriceObservation = {
  id: string;
  sourceRunId: string;
  connectorId: string;
  observedKind: "material" | "labor" | "tax" | "equipment" | "delivery";
  rawName: string;
  normalizedKey: string;
  countryCode: string;
  stateOrRegion?: string;
  city?: string;
  rawUnit: string;
  normalizedUnit: GlobalUnitInput["normalizedUnit"];
  currency: string;
  priceValue: number;
  priceMin: number;
  priceMax: number;
  sourceUrl?: string;
  sourceLabel: string;
  observedAt: string;
  confidence: GlobalEstimateConfidence;
  payload: Record<string, unknown>;
};

export type GlobalExternalRateCandidate = {
  id: string;
  observationId: string;
  rateKind: "material" | "labor" | "tax" | "equipment" | "delivery";
  rateKey: string;
  countryCode: string;
  stateOrRegion?: string;
  city?: string;
  unit: GlobalUnitInput["normalizedUnit"];
  currency: string;
  priceMin: number;
  priceMax: number;
  priceDefault: number;
  matchConfidence: GlobalEstimateConfidence;
  sourceQuality: GlobalEstimateConfidence;
  status: "pending" | "approved" | "rejected" | "archived";
};

export type GlobalSourceBackedRateLink = EstimateRowSourceEvidence & {
  rateTable: "global_material_rates" | "global_labor_rates" | "global_tax_rules";
  rateId: string;
  sourceObservationId: string;
  sourceRunId: string;
  connectorId: string;
};

export type GlobalSourceRefreshQueueItem = {
  id: string;
  normalizedKey: string;
  detectedCategory: string;
  originalText: string;
  reason: "missing_rate" | "stale_source" | "template_gap";
  status: "queued" | "done";
  createdAt: string;
};

export type GlobalSourceQualityScore = {
  sourceId: string;
  freshness: GlobalEstimateSourceFreshness;
  confidence: GlobalEstimateConfidence;
  approvedForPricing: boolean;
  fakeLabel: boolean;
};
