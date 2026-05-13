import type { AiDomain, AiUserRole } from "../../policy/aiRolePolicy";
import type { AiToolName } from "../aiToolTypes";

export type AiToolTransportBoundaryKind =
  | "safe_read_bff_transport"
  | "draft_only_local_transport"
  | "approval_ledger_transport"
  | "status_ledger_transport";

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
