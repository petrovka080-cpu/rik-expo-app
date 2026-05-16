import type { AiDomain, AiUserRole } from "../../policy/aiRolePolicy";
import type { AiToolName } from "../aiToolTypes";

export type AiToolTransportBoundaryKind =
  | "safe_read_bff_transport"
  | "draft_only_local_transport"
  | "approval_ledger_transport"
  | "status_ledger_transport"
  | "runtime_read_transport"
  | "runtime_preview_transport"
  | "approved_executor_transport";

export type AiRuntimeTransportName =
  | "task_stream"
  | "command_center"
  | "tool_registry"
  | "procurement_copilot"
  | "document_knowledge"
  | "construction_knowhow"
  | "finance_copilot"
  | "warehouse_copilot"
  | "field_work_copilot"
  | "external_intel"
  | "screen_runtime"
  | "approval_inbox"
  | "approved_executor";

export type AiToolTransportContract = {
  toolName: AiToolName;
  boundary: AiToolTransportBoundaryKind;
  routeScope: string;
  boundedRequest: true;
  dtoOnly: true;
  redactionRequired: true;
  uiImportAllowed: false;
  modelProviderImportAllowed: false;
  supabaseImportAllowedInTool: false;
  mutationAllowedFromTool: false;
  idempotencyRequired: boolean;
};

export type AiRuntimeTransportContract = {
  runtimeName: AiRuntimeTransportName;
  boundary: AiToolTransportBoundaryKind;
  routeScope: string;
  boundedRequest: true;
  dtoOnly: true;
  redactionRequired: true;
  evidenceRefsOrBlockedReasonRequired: true;
  uiImportAllowed: false;
  modelProviderImportAllowed: false;
  supabaseImportAllowedInTransport: false;
  mutationAllowedFromUi: false;
  rawRowsExposed: false;
  rawProviderPayloadExposed: false;
};

export type AiToolTransportAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AiCatalogSearchTransportItem = {
  code?: string | null;
  name?: string | null;
  uom?: string | null;
  kind?: string | null;
};

export type AiSupplierTransportItem = {
  id?: string | null;
  name?: string | null;
  specialization?: string | null;
  address?: string | null;
  website?: string | null;
};

export type AiWarehouseStatusTransportRow = {
  material_id?: string | null;
  code?: string | null;
  name?: string | null;
  uom_id?: string | null;
  qty_on_hand?: number | string | null;
  qty_reserved?: number | string | null;
  qty_available?: number | string | null;
  qty_incoming?: number | string | null;
  incoming_quantity?: number | string | null;
  project_id?: string | null;
  object_name?: string | null;
  warehouse_name?: string | null;
  source_timestamp?: string | null;
  updated_at?: string | null;
};

export type AiWarehouseStatusTransportResult = {
  rows: readonly AiWarehouseStatusTransportRow[];
  totalRowCount: number | null;
  hasMore: boolean;
  dtoOnly: true;
  rawRowsExposed: false;
};

export type AiFinanceSummaryTransportInput = {
  scope: "company" | "project" | "supplier";
  entityId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};

export type AiFinanceSummaryTransportResult = {
  payload: Record<string, unknown>;
  dtoOnly: true;
  rawRowsExposed: false;
};

export type AiSubmitForApprovalTransportInput = {
  draft_id: string;
  approval_target:
    | "request"
    | "report"
    | "act"
    | "supplier_selection"
    | "payment_status_change";
  screen_id: string;
  domain: AiDomain;
  summary: string;
  idempotency_key: string;
  evidence_refs: string[];
  approval_reason: string;
};

export type AiActionStatusTransportInput = {
  action_id: string;
};

export type AiTaskStreamTransportInput = {
  screen_id: string;
  cursor?: string | null;
  limit?: number;
  now_iso?: string;
};

export type AiProcurementCopilotTransportInput = {
  request_ref: string;
  screen_id: string;
  organization_ref?: string;
  cursor?: string | null;
  external_requested?: boolean;
  external_source_policy_ids?: readonly string[];
};

export const AI_TOOL_TRANSPORT_CONTRACTS = Object.freeze([
  {
    toolName: "search_catalog",
    boundary: "safe_read_bff_transport",
    routeScope: "marketplace.catalog.search",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTool: false,
    mutationAllowedFromTool: false,
    idempotencyRequired: false,
  },
  {
    toolName: "compare_suppliers",
    boundary: "safe_read_bff_transport",
    routeScope: "ai.tool.compare_suppliers",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTool: false,
    mutationAllowedFromTool: false,
    idempotencyRequired: false,
  },
  {
    toolName: "get_warehouse_status",
    boundary: "safe_read_bff_transport",
    routeScope: "ai.tool.get_warehouse_status",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTool: false,
    mutationAllowedFromTool: false,
    idempotencyRequired: false,
  },
  {
    toolName: "get_finance_summary",
    boundary: "safe_read_bff_transport",
    routeScope: "ai.tool.get_finance_summary",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTool: false,
    mutationAllowedFromTool: false,
    idempotencyRequired: false,
  },
  {
    toolName: "draft_request",
    boundary: "draft_only_local_transport",
    routeScope: "ai.tool.draft_request",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTool: false,
    mutationAllowedFromTool: false,
    idempotencyRequired: false,
  },
  {
    toolName: "draft_report",
    boundary: "draft_only_local_transport",
    routeScope: "ai.tool.draft_report",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTool: false,
    mutationAllowedFromTool: false,
    idempotencyRequired: false,
  },
  {
    toolName: "draft_act",
    boundary: "draft_only_local_transport",
    routeScope: "ai.tool.draft_act",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTool: false,
    mutationAllowedFromTool: false,
    idempotencyRequired: false,
  },
  {
    toolName: "submit_for_approval",
    boundary: "approval_ledger_transport",
    routeScope: "ai.tool.submit_for_approval",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTool: false,
    mutationAllowedFromTool: false,
    idempotencyRequired: true,
  },
  {
    toolName: "get_action_status",
    boundary: "status_ledger_transport",
    routeScope: "ai.tool.get_action_status",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTool: false,
    mutationAllowedFromTool: false,
    idempotencyRequired: false,
  },
] as const satisfies readonly AiToolTransportContract[]);

export const AI_RUNTIME_TRANSPORT_CONTRACTS = Object.freeze([
  {
    runtimeName: "task_stream",
    boundary: "runtime_read_transport",
    routeScope: "agent.task_stream.read",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
  {
    runtimeName: "command_center",
    boundary: "runtime_read_transport",
    routeScope: "agent.command_center.read",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
  {
    runtimeName: "tool_registry",
    boundary: "runtime_read_transport",
    routeScope: "agent.tools",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
  {
    runtimeName: "procurement_copilot",
    boundary: "runtime_preview_transport",
    routeScope: "agent.procurement_copilot.preview",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
  {
    runtimeName: "document_knowledge",
    boundary: "runtime_preview_transport",
    routeScope: "agent.documents.knowledge",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
  {
    runtimeName: "construction_knowhow",
    boundary: "runtime_preview_transport",
    routeScope: "agent.construction_knowhow",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
  {
    runtimeName: "finance_copilot",
    boundary: "runtime_preview_transport",
    routeScope: "agent.finance_copilot",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
  {
    runtimeName: "warehouse_copilot",
    boundary: "runtime_preview_transport",
    routeScope: "agent.warehouse_copilot",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
  {
    runtimeName: "field_work_copilot",
    boundary: "runtime_preview_transport",
    routeScope: "agent.field_work_copilot",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
  {
    runtimeName: "external_intel",
    boundary: "runtime_read_transport",
    routeScope: "agent.external_intel.status",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
  {
    runtimeName: "screen_runtime",
    boundary: "runtime_read_transport",
    routeScope: "agent.screen_runtime.read",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
  {
    runtimeName: "approval_inbox",
    boundary: "approval_ledger_transport",
    routeScope: "agent.approval_inbox.read",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
  {
    runtimeName: "approved_executor",
    boundary: "approved_executor_transport",
    routeScope: "agent.action.execute_approved",
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRefsOrBlockedReasonRequired: true,
    uiImportAllowed: false,
    modelProviderImportAllowed: false,
    supabaseImportAllowedInTransport: false,
    mutationAllowedFromUi: false,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
  },
] as const satisfies readonly AiRuntimeTransportContract[]);

const FORBIDDEN_TRANSPORT_KEYS =
  /raw[_-]?(?:db|row|rows|prompt|provider|context|payload)|authorization|secret|token|service[_-]?role|user_id|organization_id|company_id/i;

export function normalizeAiToolTransportText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

export function clampAiToolTransportLimit(
  value: unknown,
  defaultLimit: number,
  maxLimit: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return defaultLimit;
  return Math.max(1, Math.min(maxLimit, Math.floor(value)));
}

export function hasForbiddenAiToolTransportKeys(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenAiToolTransportKeys);
  if (typeof value !== "object" || value === null) return false;

  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_TRANSPORT_KEYS.test(key)) return true;
    if (hasForbiddenAiToolTransportKeys(nested)) return true;
  }
  return false;
}

export function listAiToolTransportContracts(): AiToolTransportContract[] {
  return [...AI_TOOL_TRANSPORT_CONTRACTS];
}

export function listAiRuntimeTransportContracts(): AiRuntimeTransportContract[] {
  return [...AI_RUNTIME_TRANSPORT_CONTRACTS];
}
