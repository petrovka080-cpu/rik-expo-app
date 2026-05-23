import { GLOBAL_EXTERNAL_SOURCE_CONNECTORS, GLOBAL_ESTIMATE_EXTERNAL_SOURCE_FLAGS } from "../globalEstimate";

export const BUILT_IN_AI_SOURCE_TYPES = [
  "internal_marketplace",
  "supplier_catalog_api",
  "external_marketplace_cache",
  "uploaded_price_list",
  "configured_reference",
  "official_tax_source",
  "manual_admin_rate_with_evidence",
] as const;

export function listBuiltInAiSourceRegistry() {
  return {
    flags: GLOBAL_ESTIMATE_EXTERNAL_SOURCE_FLAGS,
    connectors: GLOBAL_EXTERNAL_SOURCE_CONNECTORS,
    sourceTypes: BUILT_IN_AI_SOURCE_TYPES,
  };
}
