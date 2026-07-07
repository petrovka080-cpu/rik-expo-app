import type {
  ProfessionalCostCurrency,
  ProfessionalPriceItemType,
  ProfessionalPriceRecord,
  ProfessionalPriceSourceRecord,
  ProfessionalPriceTrustLevel,
} from "./professionalPricebookContract";

export type ProfessionalCostRowType =
  | "work"
  | "material"
  | "labor"
  | "service"
  | "equipment"
  | "transport"
  | "mobilization"
  | "overhead";

export type ProfessionalCostPriceState =
  | "source_price"
  | "internal_pricebook"
  | "expert_reviewed_price"
  | "preliminary_market_assumption"
  | "missing_price";

export type ProfessionalCostLine = {
  rowId: string;
  templateId: string;
  family: string;
  rowType: ProfessionalCostRowType;
  name: string;
  quantity: number;
  unit: string;
  priceState: ProfessionalCostPriceState;
  unitPrice: number | null;
  currency: ProfessionalCostCurrency;
  priceSourceId: string | null;
  priceSourceLabel: string | null;
  priceRetrievedAt: string | null;
  priceRegion: string | null;
  lineSubtotal: number | null;
  trustedForPreliminaryTotal: boolean;
  trustedForContractTotal: boolean;
  priceLimitations: string[];
};

export type ProfessionalCostSourceTrace = {
  rowId: string;
  priceRecord: ProfessionalPriceRecord | null;
  priceSource: ProfessionalPriceSourceRecord | null;
  priceItemType: ProfessionalPriceItemType;
  priceTrustLevel: ProfessionalPriceTrustLevel | null;
};

export type ProfessionalCostSectionTotals = {
  materialsSubtotal: number;
  laborSubtotal: number;
  servicesSubtotal: number;
  equipmentSubtotal: number;
  transportSubtotal: number;
  overheadMobilizationSubtotal: number;
};

export type ProfessionalCostSummary = ProfessionalCostSectionTotals & {
  currency: ProfessionalCostCurrency;
  costRowsCount: number;
  pricedRowsCount: number;
  missingPriceRowsCount: number;
  pricedRequiredRowsPercent: number;
  preliminaryTotal: number | null;
  preliminaryTotalAllowed: boolean;
  contractTotalAllowed: boolean;
  fakePriceCount: number;
  fakeSubtotalCount: number;
  fakeFinalTotalCount: number;
  priceSourceMissingCount: number;
  priceRegionMissingCount: number;
  priceRetrievedAtMissingCount: number;
  missingPriceRowsVisible: boolean;
};

export type ProfessionalCostingResult = {
  lines: ProfessionalCostLine[];
  sources: ProfessionalCostSourceTrace[];
  summary: ProfessionalCostSummary;
};

export const PROFESSIONAL_COSTING_CONTRACT_ID =
  "professional_costing_contract_2026_07_07_v1" as const;
