export type ProfessionalCostCurrency = "KGS" | "USD" | "EUR" | "RUB";

export type ProfessionalPriceItemType =
  | "material"
  | "labor"
  | "service"
  | "equipment"
  | "transport";

export type ProfessionalPriceSourceType =
  | "supplier_quote"
  | "public_catalog"
  | "internal_pricebook"
  | "expert_review"
  | "market_assumption";

export type ProfessionalPriceTrustLevel =
  | "trusted_contract"
  | "trusted_preliminary"
  | "expert_reviewed"
  | "preliminary_only"
  | "untrusted";

export type ProfessionalPriceRecord = {
  priceId: string;
  nomenclatureId: string;
  itemType: ProfessionalPriceItemType;
  name: string;
  unit: string;
  unitPrice: number;
  currency: ProfessionalCostCurrency;
  region: string;
  sourceId: string;
  sourceType: ProfessionalPriceSourceType;
  sourceUrl?: string;
  sourceLabel: string;
  retrievedAt: string;
  validFrom?: string;
  validTo?: string;
  trustLevel: ProfessionalPriceTrustLevel;
  notes?: string;
};

export type ProfessionalPriceSourceRecord = {
  sourceId: string;
  sourceType: ProfessionalPriceSourceType;
  sourceLabel: string;
  region: string;
  currency: ProfessionalCostCurrency;
  retrievedAt: string;
  sourceUrl?: string;
  expectedDomain?: string;
  allowContentHash?: boolean;
  notes?: string;
};

export type ProfessionalPricebookDataFile = {
  records: ProfessionalPriceRecord[];
};

export type ProfessionalPriceSourceDataFile = {
  sources: ProfessionalPriceSourceRecord[];
};

export const PROFESSIONAL_PRICEBOOK_VERSION = "professional_pricebook_2026_07_07_v1" as const;
