import type { GlobalExternalSourceConnector } from "./globalExternalSourceTypes";

export const GLOBAL_ESTIMATE_EXTERNAL_SOURCE_FLAGS = {
  GLOBAL_ESTIMATE_EXTERNAL_SOURCES_ENABLED: true,
  GLOBAL_ESTIMATE_SOURCE_REFRESH_ENABLED: true,
  GLOBAL_ESTIMATE_ON_DEMAND_SOURCE_REFRESH_ENABLED: false,
  GLOBAL_ESTIMATE_SOURCE_APPROVAL_REQUIRED: true,
} as const;

export const GLOBAL_EXTERNAL_SOURCE_CONNECTORS: readonly GlobalExternalSourceConnector[] = [
  {
    id: "internal_marketplace.approved_rates",
    sourceType: "internal_marketplace",
    label: "Approved internal marketplace price observations",
    enabled: true,
    approvalRequired: true,
    blocksEstimateRuntime: false,
  },
  {
    id: "supplier_catalog_api.configured",
    sourceType: "supplier_catalog_api",
    label: "Configured supplier catalog API cache",
    enabled: true,
    approvalRequired: true,
    blocksEstimateRuntime: false,
  },
  {
    id: "uploaded_price_list.approved",
    sourceType: "uploaded_price_list",
    label: "Approved uploaded supplier price lists",
    enabled: true,
    approvalRequired: true,
    blocksEstimateRuntime: false,
  },
  {
    id: "official_tax_source.configured",
    sourceType: "official_tax_source",
    label: "Configured official tax source cache",
    enabled: true,
    approvalRequired: true,
    blocksEstimateRuntime: false,
  },
  {
    id: "configured_reference.global",
    sourceType: "configured_reference",
    label: "Configured global construction reference rates",
    enabled: true,
    approvalRequired: true,
    blocksEstimateRuntime: false,
  },
  {
    id: "manual_admin_rate.evidence_required",
    sourceType: "manual_admin_rate",
    label: "Manual admin rate with source evidence note",
    enabled: true,
    approvalRequired: true,
    blocksEstimateRuntime: false,
  },
];

export function getGlobalExternalSourceConnector(id: string): GlobalExternalSourceConnector | null {
  return GLOBAL_EXTERNAL_SOURCE_CONNECTORS.find((connector) => connector.id === id) ?? null;
}

export function listEnabledGlobalExternalSourceConnectors(): GlobalExternalSourceConnector[] {
  return GLOBAL_EXTERNAL_SOURCE_CONNECTORS.filter((connector) => connector.enabled);
}
