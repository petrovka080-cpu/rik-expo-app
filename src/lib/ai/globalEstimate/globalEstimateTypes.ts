export type GlobalEstimateConfidence = "high" | "medium" | "low";

export type GlobalAddressPrecision =
  | "country"
  | "state_or_region"
  | "county"
  | "city"
  | "postal_code"
  | "street_address"
  | "unknown";

export type GlobalUnitSystem = "metric" | "imperial" | "mixed";

export type GlobalTaxMode = "sales_tax" | "vat" | "gst" | "nds" | "no_tax" | "unknown";

export type GlobalTaxType = "sales_tax" | "vat" | "gst" | "nds" | "none" | "unknown";

export type GlobalLocaleContext = {
  countryCode: string;
  stateOrRegion?: string;
  county?: string;
  city?: string;
  postalCode?: string;
  addressPrecision: GlobalAddressPrecision;
  language: string;
  locale: string;
  unitSystem: GlobalUnitSystem;
  currency: string;
  taxMode: GlobalTaxMode;
  taxIncludedByDefault: boolean;
  source:
    | "explicit_question"
    | "user_profile"
    | "project_address"
    | "device_locale"
    | "geolocation"
    | "fallback";
  confidence: GlobalEstimateConfidence;
};

export type GlobalUnitInput = {
  rawValue: number;
  rawUnit:
    | "sq_m"
    | "m2"
    | "sqm"
    | "sq_ft"
    | "ft2"
    | "sq_yd"
    | "m"
    | "linear_m"
    | "ft"
    | "linear_ft"
    | "pcs"
    | "set"
    | "kg"
    | "lbs"
    | "m3"
    | "cu_ft"
    | "ton";
  normalizedValue: number;
  normalizedUnit:
    | "sq_m"
    | "sq_ft"
    | "linear_m"
    | "linear_ft"
    | "pcs"
    | "set"
    | "kg"
    | "lbs"
    | "m3"
    | "cu_ft"
    | "ton";
  displayValue: number;
  displayUnit: string;
  conversion?: {
    from: string;
    to: string;
    factor: number;
    formula?: string;
  };
  unitSystem: GlobalUnitSystem;
};

export type GlobalEstimateSectionType = "materials" | "labor" | "equipment" | "delivery" | "tax";

export type GlobalEstimatePriceTier = "budget" | "standard" | "premium";

export type GlobalProjectType = "residential" | "commercial" | "industrial" | "unknown";

export type GlobalCustomerType = "b2c" | "b2b" | "unknown";

export type GlobalSurfaceCondition = "good" | "needs_preparation" | "unknown";

export type GlobalPriceSourceType =
  | "internal_marketplace"
  | "external_marketplace"
  | "supplier_catalog_api"
  | "uploaded_price_list"
  | "configured_reference"
  | "official_tax_source"
  | "tax_provider"
  | "manual_admin_rate";

export type GlobalEstimateSourceFreshness =
  | "fresh"
  | "aging"
  | "stale"
  | "expired"
  | "unknown";

export type EstimateRowSourceEvidence = {
  sourceId: string;
  sourceType:
    | "internal_marketplace"
    | "external_marketplace"
    | "supplier_catalog_api"
    | "uploaded_price_list"
    | "official_tax_source"
    | "configured_reference"
    | "manual_admin_rate";
  label: string;
  url?: string;
  checkedAt: string;
  freshness: GlobalEstimateSourceFreshness;
  confidence: GlobalEstimateConfidence;
};

export type SourceBackedEstimateRow = {
  rowNumber: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  displayQuantity: string;
  unitPrice: number;
  displayUnitPrice: string;
  total: number;
  displayTotal: string;
  currency: string;
  priceStatus: "priced" | "unavailable" | "stale_fallback" | "manual_fallback";
  sourceId: string;
  sourceEvidence: EstimateRowSourceEvidence[];
  confidence: GlobalEstimateConfidence;
};

export type GlobalLocalizedText = Record<string, string>;

export type GlobalWorkCategory =
  | "flooring"
  | "wall_finishing"
  | "ceiling"
  | "drywall"
  | "painting"
  | "plastering"
  | "putty"
  | "tile"
  | "doors_windows"
  | "electrical"
  | "plumbing"
  | "heating_hvac"
  | "roofing"
  | "facade"
  | "foundation"
  | "concrete"
  | "masonry"
  | "waterproofing"
  | "insulation"
  | "demolition"
  | "landscaping"
  | "roadworks"
  | "metalworks"
  | "carpentry"
  | "documents_design"
  | "cleaning"
  | "delivery_equipment"
  | "other";

export type GlobalWorkTypeDefinition = {
  workKey: string;
  category: GlobalWorkCategory;
  names: GlobalLocalizedText;
  defaultMeasureUnit: GlobalUnitInput["normalizedUnit"];
  dangerous?: boolean;
  safetyReviewRequired?: boolean;
};

export type GlobalWorkAlias = {
  workKey: string;
  language: string;
  alias: string;
  normalizedAlias: string;
};

export type GlobalEstimateTemplateRowDefinition = {
  sectionType: GlobalEstimateSectionType;
  sectionNumber: string;
  rowNumber: string;
  code: string;
  names: GlobalLocalizedText;
  quantityFormula: string;
  unitMetric: GlobalUnitInput["normalizedUnit"];
  unitImperial?: GlobalUnitInput["normalizedUnit"];
  rateKey: string;
  required: boolean;
  sortOrder: number;
};

export type GlobalEstimateTemplateSection = {
  type: GlobalEstimateSectionType;
  sectionNumber: string;
  title: GlobalLocalizedText;
  rows: GlobalEstimateTemplateRowDefinition[];
};

export type GlobalEstimateTemplate = {
  workKey: string;
  inputMeasure: "area" | "volume" | "length" | "count" | "set";
  defaultUnitMetric: GlobalUnitInput["normalizedUnit"];
  defaultUnitImperial: GlobalUnitInput["normalizedUnit"];
  sections: GlobalEstimateTemplateSection[];
  assumptions: Record<string, string[]>;
  regionalRiskKeys: string[];
  clarifyingQuestions: Record<string, string[]>;
};

export type GlobalRateRecord = {
  id: string;
  rateKey: string;
  names: GlobalLocalizedText;
  countryCode: string;
  stateOrRegion?: string;
  county?: string;
  city?: string;
  postalCode?: string;
  unit: GlobalUnitInput["normalizedUnit"];
  priceMin: number;
  priceMax: number;
  priceDefault: number;
  currency: string;
  priceTier: GlobalEstimatePriceTier;
  sourceType: Exclude<GlobalPriceSourceType, "official_tax_source" | "tax_provider">;
  sourceLabel: string;
  sourceUrl?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  checkedAt: string;
  active: boolean;
};

export type GlobalTaxRule = {
  id: string;
  countryCode: string;
  stateOrRegion?: string;
  county?: string;
  city?: string;
  postalCode?: string;
  taxType: GlobalTaxType;
  taxLabel: string;
  taxRate: number;
  appliesTo: GlobalEstimateSectionType | "all" | "none";
  customerType: GlobalCustomerType;
  projectType: GlobalProjectType;
  includedInPrice: boolean;
  requiresPreciseAddress: boolean;
  requiredPrecision?: Exclude<GlobalAddressPrecision, "country" | "unknown">;
  sourceType: "official_tax_source" | "tax_provider" | "configured_reference" | "manual_admin_rate";
  sourceLabel: string;
  sourceUrl?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  checkedAt: string;
  active: boolean;
};

export type GlobalEstimateInput = {
  text?: string;
  photoAnalysis?: {
    detectedProblem?: string;
    detectedSurface?: string;
    detectedMaterial?: string;
    detectedWorkType?: string;
    confidence: GlobalEstimateConfidence;
  };
  explicitWorkKey?: string;
  volume?: number;
  unit?: string;
  countryCode?: string;
  stateOrRegion?: string;
  county?: string;
  city?: string;
  postalCode?: string;
  language?: string;
  locale?: string;
  currency?: string;
  priceTier?: GlobalEstimatePriceTier;
  projectType?: GlobalProjectType;
  customerType?: GlobalCustomerType;
  surfaceCondition?: GlobalSurfaceCondition;
  includeMaterials?: boolean;
  includeLabor?: boolean;
  includeDelivery?: boolean;
  includeTax?: boolean;
  taxPreference?: "included" | "added" | "auto";
  confidenceOverride?: GlobalEstimateConfidence;
};

export type GlobalEstimateResult = {
  estimateId: string;
  outputContract: {
    format: "professional_boq";
    hasIntro: boolean;
    hasAssumptions: boolean;
    hasMaterialsSection: boolean;
    hasLaborSection: boolean;
    hasGrandTotal: boolean;
    hasTaxStatus: boolean;
    hasRegionalRisks: boolean;
    hasClarifyingQuestions: boolean;
  };
  locale: GlobalLocaleContext;
  work: {
    workKey: string;
    title: string;
    category: string;
  };
  input: {
    volume: number;
    unit: string;
    originalText?: string;
    photoBased?: boolean;
  };
  assumptions: string[];
  sections: {
    sectionNumber: string;
    title: string;
    type: GlobalEstimateSectionType;
    rows: SourceBackedEstimateRow[];
  }[];
  tax: {
    taxType: GlobalTaxType;
    taxLabel: string;
    taxRate?: number;
    taxableBase: number;
    taxAmount: number;
    included: boolean;
    requiresLocationPrecision: boolean;
    requiredPrecision?: "state_or_region" | "county" | "city" | "postal_code" | "street_address";
    warning?: string;
  };
  totals: {
    materialsTotal: number;
    laborTotal: number;
    equipmentTotal: number;
    deliveryTotal: number;
    taxTotal: number;
    grandTotal: number;
    currency: string;
    displayMaterialsTotal: string;
    displayLaborTotal: string;
    displayTaxTotal: string;
    displayGrandTotal: string;
  };
  regionalRisks: {
    title: string;
    text: string;
  }[];
  costIncreaseFactors: string[];
  clarifyingQuestions: string[];
  sources: {
    id: string;
    type: GlobalPriceSourceType;
    label: string;
    checkedAt: string;
    url?: string;
  }[];
  confidence: GlobalEstimateConfidence;
  requiresReview: boolean;
};

export type GlobalRateResolution = {
  rate: GlobalRateRecord;
  source: GlobalEstimateResult["sources"][number];
  confidence: GlobalEstimateConfidence;
  fallbackLevel: "postal_code" | "city" | "county" | "state_or_region" | "country" | "global";
};

export type GlobalTaxResolution = {
  rule?: GlobalTaxRule;
  source?: GlobalEstimateResult["sources"][number];
  confidence: GlobalEstimateConfidence;
  warning?: string;
  requiresLocationPrecision: boolean;
  requiredPrecision?: "state_or_region" | "county" | "city" | "postal_code" | "street_address";
};

export type GlobalEstimateProofTranscript = {
  prompt: string;
  locale: string;
  workKey: string;
  currency: string;
  languagePreserved: boolean;
  professionalBoq: boolean;
  materialsRows: number;
  laborRows: number;
  taxStatusPresent: boolean;
  dangerousSafe: boolean;
  durationMs: number;
};
