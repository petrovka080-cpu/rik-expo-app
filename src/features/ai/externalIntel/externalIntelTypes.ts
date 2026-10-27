export type ExternalSourceCategory =
  | "supplier_public_catalog"
  | "market_price_reference"
  | "construction_norm_reference"
  | "real_estate_listing_reference"
  | "company_public_profile"
  | "regulatory_reference"
  | "currency_or_macro_reference";

export type ExternalIntelDomain =
  | "procurement"
  | "marketplace"
  | "warehouse"
  | "finance"
  | "real_estate"
  | "documents";

export type ExternalIntelSearchDomain = Exclude<ExternalIntelDomain, "documents">;

export type ExternalSourcePolicy = {
  sourceId: string;
  category: ExternalSourceCategory;
  allowedDomains: readonly ExternalIntelDomain[];
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

export type ExternalIntelFreshness = "fresh" | "stale" | "unknown";

export type ExternalIntelSearchStatus =
  | "loaded"
  | "empty"
  | "blocked"
  | "external_policy_not_enabled"
  | "external_provider_not_configured";

export type ExternalIntelSearchResult = {
  title: string;
  sourceId: string;
  sourceCategory: ExternalSourceCategory;
  summary: string;
  urlHash: string;
  checkedAt: string;
  freshness: ExternalIntelFreshness;
  evidenceRef: string;
};

export type ExternalIntelSearchPreviewInput = {
  domain: ExternalIntelSearchDomain;
  query: string;
  location?: string;
  internalEvidenceRefs: string[];
  marketplaceChecked?: boolean;
  sourcePolicyIds: string[];
  limit?: number;
};

export type ExternalIntelSearchPreviewOutput = {
  status: ExternalIntelSearchStatus;
  internalFirst: true;
  externalChecked: boolean;
  externalStatus: ExternalIntelSearchStatus;
  results: ExternalIntelSearchResult[];
  citations: ExternalIntelCitation[];
  nextAction: "explain" | "draft" | "submit_for_approval" | "blocked";
  forbiddenForFinalAction: true;
  mutationCount: 0;
  providerCalled: boolean;
  rawHtmlReturned: false;
};

export type ExternalIntelSourcesResponse = {
  liveEnabled: boolean;
  provider: "disabled" | "approved_search_api";
  sources: ExternalSourcePolicy[];
};

export type ExternalIntelProviderName = "disabled" | "approved_search_api";

export type ExternalIntelProviderFlags = {
  externalLiveFetchEnabled: boolean;
  provider: ExternalIntelProviderName;
  liveFetchRequested: boolean;
  requireInternalEvidence: boolean;
  requireMarketplaceCheck: boolean;
  requireCitations: boolean;
  maxResults: number;
  timeoutMs: number;
  cacheTtlMs: number;
  approvedProviderConfigured: boolean;
};

export type ExternalIntelProviderSearchInput = {
  domain: ExternalIntelSearchDomain;
  query: string;
  location?: string;
  policies: readonly ExternalSourcePolicy[];
  limit: number;
};

export type ExternalIntelProviderSearchOutput = {
  status: Extract<ExternalIntelSearchStatus, "loaded" | "empty" | "external_policy_not_enabled">;
  results: ExternalIntelSearchResult[];
  citations: ExternalIntelCitation[];
  providerCalled: boolean;
  mutationCount: 0;
  rawHtmlReturned: false;
};

export type ExternalIntelProvider = {
  provider: ExternalIntelProviderName;
  searchPreview(input: ExternalIntelProviderSearchInput): Promise<ExternalIntelProviderSearchOutput>;
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
