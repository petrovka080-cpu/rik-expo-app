export type ExternalSourceCategory =
  | "supplier_public_catalog"
  | "market_price_reference"
  | "construction_norm_reference"
  | "real_estate_listing_reference"
  | "company_public_profile"
  | "regulatory_reference"
  | "currency_or_macro_reference";

export type ExternalSourcePolicy = {
  sourceId: string;
  category: ExternalSourceCategory;
  allowedDomains: readonly string[];
  domainAllowlistRequired: true;
  requiresCitation: true;
  requiresCheckedAt: true;
  redactionRequired: true;
  maxResults: number;
  freshnessWindowDays: number;
  allowedForDecision: boolean;
  allowedForDraft: boolean;
  forbiddenForFinalAction: true;
};

export type ExternalIntelCitation = {
  sourceId: string;
  title: string;
  urlHash: string;
  checkedAt: string;
};

export type ExternalIntelResolveInput = {
  query: string;
  domain: string;
  sourcePolicyIds: readonly string[];
  internalEvidenceRefs: readonly string[];
};

export type ExternalIntelResolveOutput = {
  status: "disabled" | "blocked" | "ready";
  externalLiveFetchEnabled: false;
  externalUsed: false;
  policies: readonly ExternalSourcePolicy[];
  citations: readonly ExternalIntelCitation[];
  evidenceRefs: readonly string[];
  reason: string;
  mutationCount: 0;
  providerCalled: false;
};
