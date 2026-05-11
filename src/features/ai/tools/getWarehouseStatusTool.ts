import { callWarehouseApiBffRead } from "../../../screens/warehouse/warehouse.api.bff.client";
import type { AiUserRole } from "../policy/aiRolePolicy";
import { planAiToolUse } from "./aiToolPlanPolicy";

export const GET_WAREHOUSE_STATUS_TOOL_NAME = "get_warehouse_status" as const;
export const GET_WAREHOUSE_STATUS_MAX_LIMIT = 20;
export const GET_WAREHOUSE_STATUS_DEFAULT_LIMIT = 10;
export const GET_WAREHOUSE_STATUS_ROUTE_OPERATION = "warehouse.api.stock.scope" as const;

export type GetWarehouseStatusToolInput = {
  material_id?: string;
  material_code?: string;
  project_id?: string;
  warehouse_name?: string;
  object_name?: string;
  limit?: number;
  cursor?: string;
};

export type WarehouseStatusRoleScope =
  | "full_access"
  | "warehouse_access"
  | "foreman_project_material_scope"
  | "buyer_procurement_availability_scope";

export type WarehouseStatusBucketStatus =
  | "reported"
  | "not_available_in_stock_scope"
  | "role_redacted";

export type WarehouseStatusQuantityBucket = {
  total_quantity: number;
  item_count: number;
  status: WarehouseStatusBucketStatus;
  evidence_refs: string[];
};

export type WarehouseStatusMovementSummary = {
  summary: string;
  item_count: number;
  scope: WarehouseStatusRoleScope;
  available_total: number;
  reserved_total: number;
  incoming_total: number;
};

export type WarehouseStatusItem = {
  material_id: string;
  material_code: string | null;
  name: string;
  unit: string | null;
  warehouse_name: string | null;
  object_name: string | null;
  project_id: string | null;
  on_hand_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  incoming_quantity: number;
  updated_at: string | null;
  evidence_ref: string;
};

export type GetWarehouseStatusToolOutput = {
  available: WarehouseStatusQuantityBucket;
  reserved: WarehouseStatusQuantityBucket;
  incoming: WarehouseStatusQuantityBucket;
  low_stock_flags: string[];
  movement_summary: WarehouseStatusMovementSummary;
  source_timestamp: string;
  evidence_refs: string[];
  next_cursor: string | null;
  role_scope: WarehouseStatusRoleScope;
  role_scoped: true;
  bounded: true;
  route_operation: typeof GET_WAREHOUSE_STATUS_ROUTE_OPERATION;
  mutation_count: 0;
  stock_mutation: 0;
  no_stock_mutation: true;
};

export type GetWarehouseStatusToolAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type WarehouseStatusSourceRow = {
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

export type WarehouseStatusReadResult = {
  rows: readonly WarehouseStatusSourceRow[];
  totalRowCount: number | null;
  hasMore: boolean;
};

export type WarehouseStatusReader = (params: {
  offset: number;
  limit: number;
}) => Promise<WarehouseStatusReadResult>;

export type GetWarehouseStatusToolRequest = {
  auth: GetWarehouseStatusToolAuthContext | null;
  input: unknown;
  readWarehouseStatus?: WarehouseStatusReader;
};

export type GetWarehouseStatusToolErrorCode =
  | "GET_WAREHOUSE_STATUS_AUTH_REQUIRED"
  | "GET_WAREHOUSE_STATUS_ROLE_NOT_ALLOWED"
  | "GET_WAREHOUSE_STATUS_INVALID_INPUT"
  | "GET_WAREHOUSE_STATUS_READ_FAILED";

export type GetWarehouseStatusToolEnvelope =
  | {
      ok: true;
      data: GetWarehouseStatusToolOutput;
    }
  | {
      ok: false;
      error: {
        code: GetWarehouseStatusToolErrorCode;
        message: string;
      };
    };

type NormalizedGetWarehouseStatusInput = {
  material_id: string | null;
  material_code: string | null;
  project_id: string | null;
  warehouse_name: string | null;
  object_name: string | null;
  limit: number;
  cursor: string | null;
};

type InputValidationResult =
  | { ok: true; value: NormalizedGetWarehouseStatusInput }
  | { ok: false; message: string };

type RoleScopeDecision =
  | { ok: true; scope: WarehouseStatusRoleScope }
  | { ok: false; message: string };

type WarehouseStockScopePayload = {
  rows?: unknown;
  meta?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return GET_WAREHOUSE_STATUS_DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(GET_WAREHOUSE_STATUS_MAX_LIMIT, Math.floor(value)));
}

function normalizeInput(input: unknown): InputValidationResult {
  if (!isRecord(input)) {
    return { ok: false, message: "get_warehouse_status input must be an object" };
  }

  return {
    ok: true,
    value: {
      material_id: normalizeOptionalText(input.material_id),
      material_code: normalizeOptionalText(input.material_code),
      project_id: normalizeOptionalText(input.project_id),
      warehouse_name: normalizeOptionalText(input.warehouse_name),
      object_name: normalizeOptionalText(input.object_name),
      limit: normalizeLimit(input.limit),
      cursor: normalizeOptionalText(input.cursor),
    },
  };
}

function resolveRoleScope(
  role: AiUserRole,
  input: NormalizedGetWarehouseStatusInput,
): RoleScopeDecision {
  if (role === "director" || role === "control") {
    return { ok: true, scope: "full_access" };
  }
  if (role === "warehouse") {
    return { ok: true, scope: "warehouse_access" };
  }
  if (role === "foreman") {
    if (input.material_id || input.material_code || input.project_id || input.object_name) {
      return { ok: true, scope: "foreman_project_material_scope" };
    }
    return {
      ok: false,
      message: "foreman warehouse status requires project, object, or material scope",
    };
  }
  if (role === "buyer") {
    if (input.material_id || input.material_code) {
      return { ok: true, scope: "buyer_procurement_availability_scope" };
    }
    return {
      ok: false,
      message: "buyer warehouse status is limited to procurement material availability scope",
    };
  }
  return {
    ok: false,
    message: "get_warehouse_status is not visible for this role",
  };
}

function parseCursorOffset(cursor: string | null): number {
  if (!cursor) return 0;
  const match = /^offset:(\d+)$/.exec(cursor);
  if (!match) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeComparable(value: string | null): string {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function rowMatchesInput(row: WarehouseStatusSourceRow, input: NormalizedGetWarehouseStatusInput): boolean {
  if (input.material_id && normalizeComparable(row.material_id ?? null) !== normalizeComparable(input.material_id)) {
    return false;
  }
  if (input.material_code && normalizeComparable(row.code ?? null) !== normalizeComparable(input.material_code)) {
    return false;
  }
  if (input.project_id && normalizeComparable(row.project_id ?? null) !== normalizeComparable(input.project_id)) {
    return false;
  }
  if (input.warehouse_name && normalizeComparable(row.warehouse_name ?? null) !== normalizeComparable(input.warehouse_name)) {
    return false;
  }
  if (input.object_name && normalizeComparable(row.object_name ?? null) !== normalizeComparable(input.object_name)) {
    return false;
  }
  return true;
}

function buildEvidenceRef(index: number): string {
  return `warehouse:stock_scope:item:${index + 1}`;
}

function readIncomingQuantity(row: WarehouseStatusSourceRow): number {
  return toNumber(row.qty_incoming ?? row.incoming_quantity);
}

function hasIncomingSource(rows: readonly WarehouseStatusSourceRow[]): boolean {
  return rows.some(
    (row) =>
      row.qty_incoming !== undefined ||
      row.incoming_quantity !== undefined,
  );
}

function toWarehouseStatusItem(row: WarehouseStatusSourceRow, index: number): WarehouseStatusItem {
  const materialId = toOptionalString(row.material_id) ?? `warehouse-material-${index + 1}`;
  const sourceTimestamp = toOptionalString(row.source_timestamp) ?? toOptionalString(row.updated_at);
  return {
    material_id: materialId,
    material_code: toOptionalString(row.code),
    name: toOptionalString(row.name) ?? materialId,
    unit: toOptionalString(row.uom_id),
    warehouse_name: toOptionalString(row.warehouse_name),
    object_name: toOptionalString(row.object_name),
    project_id: toOptionalString(row.project_id),
    on_hand_quantity: toNumber(row.qty_on_hand),
    reserved_quantity: toNumber(row.qty_reserved),
    available_quantity: toNumber(row.qty_available),
    incoming_quantity: readIncomingQuantity(row),
    updated_at: sourceTimestamp,
    evidence_ref: buildEvidenceRef(index),
  };
}

function sumBy(items: readonly WarehouseStatusItem[], getValue: (item: WarehouseStatusItem) => number): number {
  return items.reduce((sum, item) => sum + getValue(item), 0);
}

function buildReportedBucket(
  items: readonly WarehouseStatusItem[],
  getValue: (item: WarehouseStatusItem) => number,
): WarehouseStatusQuantityBucket {
  const refs = items.filter((item) => getValue(item) > 0).map((item) => item.evidence_ref);
  return {
    total_quantity: sumBy(items, getValue),
    item_count: refs.length,
    status: "reported",
    evidence_refs: refs,
  };
}

function buildIncomingBucket(params: {
  items: readonly WarehouseStatusItem[];
  incomingSourceAvailable: boolean;
  redacted: boolean;
}): WarehouseStatusQuantityBucket {
  if (params.redacted) {
    return {
      total_quantity: 0,
      item_count: 0,
      status: "role_redacted",
      evidence_refs: [],
    };
  }
  if (!params.incomingSourceAvailable) {
    return {
      total_quantity: 0,
      item_count: 0,
      status: "not_available_in_stock_scope",
      evidence_refs: [],
    };
  }
  return buildReportedBucket(params.items, (item) => item.incoming_quantity);
}

function buildLowStockFlags(items: readonly WarehouseStatusItem[]): string[] {
  if (items.length === 0) {
    return ["no_stock_rows_for_scope"];
  }

  const flags = items.flatMap((item) => {
    const label = item.material_code ?? item.material_id;
    if (item.available_quantity <= 0) return [`no_available_stock:${label}`];
    if (item.available_quantity <= item.reserved_quantity) return [`reserved_pressure:${label}`];
    return [];
  });

  return flags.length > 0 ? flags : ["no_low_stock_flags"];
}

function latestSourceTimestamp(items: readonly WarehouseStatusItem[]): string {
  const timestamps = items
    .map((item) => item.updated_at)
    .filter((value): value is string => value !== null)
    .sort();

  return timestamps[timestamps.length - 1] ?? "not_available_in_stock_scope";
}

function buildMovementSummary(params: {
  items: readonly WarehouseStatusItem[];
  scope: WarehouseStatusRoleScope;
  available: WarehouseStatusQuantityBucket;
  reserved: WarehouseStatusQuantityBucket;
  incoming: WarehouseStatusQuantityBucket;
}): WarehouseStatusMovementSummary {
  const limitedBuyerScope = params.scope === "buyer_procurement_availability_scope";
  const summary = limitedBuyerScope
    ? `Procurement availability scope covers ${params.items.length} material stock line(s); reserved and movement details are role-redacted.`
    : `Warehouse stock scope covers ${params.items.length} material stock line(s) with available, reserved, and incoming status boundaries.`;

  return {
    summary,
    item_count: params.items.length,
    scope: params.scope,
    available_total: params.available.total_quantity,
    reserved_total: params.reserved.total_quantity,
    incoming_total: params.incoming.total_quantity,
  };
}

function readMetaNumber(meta: unknown, key: string): number | null {
  if (!isRecord(meta)) return null;
  const parsed = Number(meta[key]);
  return Number.isFinite(parsed) ? parsed : null;
}

function readMetaBoolean(meta: unknown, key: string): boolean | null {
  if (!isRecord(meta)) return null;
  return typeof meta[key] === "boolean" ? meta[key] : null;
}

function parseBffStockPayload(payload: unknown, offset: number, limit: number): WarehouseStatusReadResult {
  const payloadRecord = isRecord(payload) ? payload as WarehouseStockScopePayload : {};
  const rows = Array.isArray(payloadRecord.rows)
    ? (payloadRecord.rows.filter(isRecord) as WarehouseStatusSourceRow[])
    : [];
  const totalRowCount = readMetaNumber(payloadRecord.meta, "total_row_count");
  const hasMore =
    readMetaBoolean(payloadRecord.meta, "has_more") ??
    (totalRowCount === null ? rows.length >= limit : offset + rows.length < totalRowCount);

  return { rows, totalRowCount, hasMore };
}

async function defaultReadWarehouseStatus(params: {
  offset: number;
  limit: number;
}): Promise<WarehouseStatusReadResult> {
  const response = await callWarehouseApiBffRead({
    operation: GET_WAREHOUSE_STATUS_ROUTE_OPERATION,
    args: {
      p_offset: params.offset,
      p_limit: params.limit,
    },
  });

  if (response.status === "unavailable") {
    throw new Error(`warehouse status read unavailable: ${response.reason}`);
  }
  if (response.status === "error") {
    throw new Error(response.error.message);
  }
  if (response.response.payload.kind !== "single") {
    throw new Error("warehouse status read returned invalid payload");
  }
  const firstRow = Array.isArray(response.response.payload.result.data)
    ? response.response.payload.result.data[0]
    : null;
  const payload = isRecord(firstRow) && Object.prototype.hasOwnProperty.call(firstRow, "payload")
    ? firstRow.payload
    : firstRow;

  return parseBffStockPayload(payload, params.offset, params.limit);
}

function isAuthenticated(
  auth: GetWarehouseStatusToolAuthContext | null,
): auth is GetWarehouseStatusToolAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

export async function runGetWarehouseStatusToolSafeRead(
  request: GetWarehouseStatusToolRequest,
): Promise<GetWarehouseStatusToolEnvelope> {
  if (!isAuthenticated(request.auth)) {
    return {
      ok: false,
      error: {
        code: "GET_WAREHOUSE_STATUS_AUTH_REQUIRED",
        message: "get_warehouse_status requires authenticated role context",
      },
    };
  }

  const plan = planAiToolUse({
    toolName: GET_WAREHOUSE_STATUS_TOOL_NAME,
    role: request.auth.role,
  });
  if (!plan.allowed || plan.mode !== "read_contract_plan") {
    return {
      ok: false,
      error: {
        code: "GET_WAREHOUSE_STATUS_ROLE_NOT_ALLOWED",
        message: "get_warehouse_status is not visible for this role",
      },
    };
  }

  const input = normalizeInput(request.input);
  if (!input.ok) {
    return {
      ok: false,
      error: {
        code: "GET_WAREHOUSE_STATUS_INVALID_INPUT",
        message: input.message,
      },
    };
  }

  const roleScope = resolveRoleScope(request.auth.role, input.value);
  if (!roleScope.ok) {
    return {
      ok: false,
      error: {
        code: "GET_WAREHOUSE_STATUS_INVALID_INPUT",
        message: roleScope.message,
      },
    };
  }

  try {
    const offset = parseCursorOffset(input.value.cursor);
    const readWarehouseStatus = request.readWarehouseStatus ?? defaultReadWarehouseStatus;
    const readResult = await readWarehouseStatus({ offset, limit: input.value.limit });
    const filteredRows = readResult.rows.filter((row) => rowMatchesInput(row, input.value));
    const items = filteredRows.slice(0, input.value.limit).map(toWarehouseStatusItem);
    const evidenceRefs = items.map((item) => item.evidence_ref);
    const buyerLimitedScope = roleScope.scope === "buyer_procurement_availability_scope";
    const available = buildReportedBucket(items, (item) => item.available_quantity);
    const reserved = buyerLimitedScope
      ? {
          total_quantity: 0,
          item_count: 0,
          status: "role_redacted" as const,
          evidence_refs: [],
        }
      : buildReportedBucket(items, (item) => item.reserved_quantity);
    const incoming = buildIncomingBucket({
      items,
      incomingSourceAvailable: hasIncomingSource(filteredRows),
      redacted: buyerLimitedScope,
    });

    return {
      ok: true,
      data: {
        available,
        reserved,
        incoming,
        low_stock_flags: buildLowStockFlags(items),
        movement_summary: buildMovementSummary({
          items,
          scope: roleScope.scope,
          available,
          reserved,
          incoming,
        }),
        source_timestamp: latestSourceTimestamp(items),
        evidence_refs: evidenceRefs,
        next_cursor: readResult.hasMore ? `offset:${offset + input.value.limit}` : null,
        role_scope: roleScope.scope,
        role_scoped: true,
        bounded: true,
        route_operation: GET_WAREHOUSE_STATUS_ROUTE_OPERATION,
        mutation_count: 0,
        stock_mutation: 0,
        no_stock_mutation: true,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "GET_WAREHOUSE_STATUS_READ_FAILED",
        message: error instanceof Error ? error.message : "get_warehouse_status read failed",
      },
    };
  }
}
