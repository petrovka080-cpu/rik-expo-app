import {
  ASSISTANT_STORE_READ_BFF_CONTRACT,
  type AssistantStoreReadBffOperation,
} from "../../../lib/assistant_store_read.bff.contract";
import {
  CATALOG_TRANSPORT_BFF_CONTRACT,
  type CatalogTransportBffOperation,
} from "../../../lib/catalog/catalog.bff.contract";
import {
  DIRECTOR_FINANCE_BFF_CONTRACT,
  type DirectorFinanceBffOperation,
} from "../../../screens/director/director.finance.bff.contract";
import {
  WAREHOUSE_API_BFF_CONTRACT,
  type WarehouseApiBffOperation,
} from "../../../screens/warehouse/warehouse.api.bff.contract";
import { AI_TOOL_REGISTRY } from "./aiToolRegistry";
import type { AiToolName } from "./aiToolTypes";

export type AiSafeReadToolName = Extract<
  AiToolName,
  | "search_catalog"
  | "compare_suppliers"
  | "get_warehouse_status"
  | "get_finance_summary"
  | "get_action_status"
>;

export const AI_SAFE_READ_TOOL_NAMES = [
  "search_catalog",
  "compare_suppliers",
  "get_warehouse_status",
  "get_finance_summary",
  "get_action_status",
] as const satisfies readonly AiSafeReadToolName[];

export type AiToolReadContractSource =
  | "bff:catalog_transport_read_scope_v1"
  | "bff:assistant_store_read_scope_v1"
  | "bff:warehouse_api_read_scope_v1"
  | "bff:director_finance_rpc_scope_v1"
  | "local:aiApprovalAction";

export type AiToolReadOperation =
  | CatalogTransportBffOperation
  | AssistantStoreReadBffOperation
  | WarehouseApiBffOperation
  | DirectorFinanceBffOperation
  | "approval.action.status.read";

export type AiToolReadContractRef = {
  contractId: string;
  routeOperation: string;
  source: AiToolReadContractSource;
  operations: readonly AiToolReadOperation[];
  readOnly: true;
  trafficEnabledByDefault: false;
  productionTrafficEnabled: false;
};

export type AiSafeReadToolBinding = {
  toolName: AiSafeReadToolName;
  executionBoundary: "read_contract_binding_only";
  directExecutionEnabled: false;
  mutationAllowed: false;
  rawRowsAllowed: false;
  rawPromptStorageAllowed: false;
  evidenceRequired: true;
  contracts: readonly AiToolReadContractRef[];
};

const localApprovalActionStatusContract = Object.freeze({
  contractId: "ai_approval_action_status_local_v1",
  routeOperation: "ai.approval.action.status.local",
  source: "local:aiApprovalAction",
  operations: ["approval.action.status.read"],
  readOnly: true,
  trafficEnabledByDefault: false,
  productionTrafficEnabled: false,
} as const satisfies AiToolReadContractRef);

export const AI_SAFE_READ_TOOL_BINDINGS = Object.freeze([
  {
    toolName: "search_catalog",
    executionBoundary: "read_contract_binding_only",
    directExecutionEnabled: false,
    mutationAllowed: false,
    rawRowsAllowed: false,
    rawPromptStorageAllowed: false,
    evidenceRequired: true,
    contracts: [
      {
        contractId: CATALOG_TRANSPORT_BFF_CONTRACT.contractId,
        routeOperation: CATALOG_TRANSPORT_BFF_CONTRACT.routeOperation,
        source: CATALOG_TRANSPORT_BFF_CONTRACT.source,
        operations: [
          "catalog.search.rpc",
          "catalog.search.fallback",
          "catalog.rik_quick_search.fallback",
          "catalog.items.search.preview",
        ],
        readOnly: true,
        trafficEnabledByDefault: false,
        productionTrafficEnabled: false,
      },
    ],
  },
  {
    toolName: "compare_suppliers",
    executionBoundary: "read_contract_binding_only",
    directExecutionEnabled: false,
    mutationAllowed: false,
    rawRowsAllowed: false,
    rawPromptStorageAllowed: false,
    evidenceRequired: true,
    contracts: [
      {
        contractId: CATALOG_TRANSPORT_BFF_CONTRACT.contractId,
        routeOperation: CATALOG_TRANSPORT_BFF_CONTRACT.routeOperation,
        source: CATALOG_TRANSPORT_BFF_CONTRACT.source,
        operations: ["catalog.suppliers.rpc", "catalog.suppliers.table"],
        readOnly: true,
        trafficEnabledByDefault: false,
        productionTrafficEnabled: false,
      },
      {
        contractId: ASSISTANT_STORE_READ_BFF_CONTRACT.contractId,
        routeOperation: ASSISTANT_STORE_READ_BFF_CONTRACT.routeOperation,
        source: ASSISTANT_STORE_READ_BFF_CONTRACT.source,
        operations: [
          "supplier_showcase.company_by_id",
          "supplier_showcase.listings_by_company_id",
        ],
        readOnly: true,
        trafficEnabledByDefault: false,
        productionTrafficEnabled: false,
      },
    ],
  },
  {
    toolName: "get_warehouse_status",
    executionBoundary: "read_contract_binding_only",
    directExecutionEnabled: false,
    mutationAllowed: false,
    rawRowsAllowed: false,
    rawPromptStorageAllowed: false,
    evidenceRequired: true,
    contracts: [
      {
        contractId: WAREHOUSE_API_BFF_CONTRACT.contractId,
        routeOperation: WAREHOUSE_API_BFF_CONTRACT.routeOperation,
        source: WAREHOUSE_API_BFF_CONTRACT.source,
        operations: ["warehouse.api.stock.scope", "warehouse.api.reports.bundle"],
        readOnly: true,
        trafficEnabledByDefault: false,
        productionTrafficEnabled: false,
      },
    ],
  },
  {
    toolName: "get_finance_summary",
    executionBoundary: "read_contract_binding_only",
    directExecutionEnabled: false,
    mutationAllowed: false,
    rawRowsAllowed: false,
    rawPromptStorageAllowed: false,
    evidenceRequired: true,
    contracts: [
      {
        contractId: DIRECTOR_FINANCE_BFF_CONTRACT.contractId,
        routeOperation: DIRECTOR_FINANCE_BFF_CONTRACT.routeOperation,
        source: DIRECTOR_FINANCE_BFF_CONTRACT.source,
        operations: ["director.finance.summary.v2", "director.finance.panel_scope.v4"],
        readOnly: true,
        trafficEnabledByDefault: false,
        productionTrafficEnabled: false,
      },
    ],
  },
  {
    toolName: "get_action_status",
    executionBoundary: "read_contract_binding_only",
    directExecutionEnabled: false,
    mutationAllowed: false,
    rawRowsAllowed: false,
    rawPromptStorageAllowed: false,
    evidenceRequired: true,
    contracts: [localApprovalActionStatusContract],
  },
] as const satisfies readonly AiSafeReadToolBinding[]);

export function listAiSafeReadToolBindings(): AiSafeReadToolBinding[] {
  return [...AI_SAFE_READ_TOOL_BINDINGS];
}

export function getAiSafeReadToolBinding(
  toolName: AiSafeReadToolName,
): AiSafeReadToolBinding | null {
  return AI_SAFE_READ_TOOL_BINDINGS.find((binding) => binding.toolName === toolName) ?? null;
}

function isAiSafeReadToolName(toolName: AiToolName): toolName is AiSafeReadToolName {
  return AI_SAFE_READ_TOOL_NAMES.some((safeReadToolName) => safeReadToolName === toolName);
}

export function listAiRegistrySafeReadToolNames(): AiSafeReadToolName[] {
  return AI_TOOL_REGISTRY
    .filter((tool) => tool.riskLevel === "safe_read")
    .map((tool) => tool.name)
    .filter(isAiSafeReadToolName);
}
