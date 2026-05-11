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
  warehouse_name?: string;
  object_name?: string;
  limit?: number;
  cursor?: string;
};

export type WarehouseStatusItem = {
  material_id: string;
  material_code: string | null;
  name: string;
  unit: string | null;
  warehouse_name: string | null;
  object_name: string | null;
  on_hand_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  updated_at: string | null;
  evidence_ref: string;
};

export type WarehouseStatusAvailabilitySummary = {
  item_count: number;
  total_available_quantity: number;
  has_available_stock: boolean;
};

export type GetWarehouseStatusToolOutput = {
  stock_items: WarehouseStatusItem[];
  summary: string;
  availability_summary: WarehouseStatusAvailabilitySummary;
  next_cursor: string | null;
  evidence_refs: string[];
  bounded: true;
  route_operation: typeof GET_WAREHOUSE_STATUS_ROUTE_OPERATION;
  mutation_count: 0;
  no_stock_mutation: true;
  no_issue_created: true;
  no_reservation_created: true;
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
  object_name?: string | null;
  warehouse_name?: string | null;
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
  warehouse_name: string | null;
  object_name: string | null;
  limit: number;
  cursor: string | null;
};

type InputValidationResult =
  | { ok: true; value: NormalizedGetWarehouseStatusInput }
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
      warehouse_name: normalizeOptionalText(input.warehouse_name),
      object_name: normalizeOptionalText(input.object_name),
      limit: normalizeLimit(input.limit),
      cursor: normalizeOptionalText(input.cursor),
    },
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
  return Number.isFinite(parsed) ? parsed : 0;
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

function toWarehouseStatusItem(row: WarehouseStatusSourceRow, index: number): WarehouseStatusItem {
  const materialId = toOptionalString(row.material_id) ?? `warehouse-material-${index + 1}`;
  return {
    material_id: materialId,
    material_code: toOptionalString(row.code),
    name: toOptionalString(row.name) ?? materialId,
    unit: toOptionalString(row.uom_id),
    warehouse_name: toOptionalString(row.warehouse_name),
    object_name: toOptionalString(row.object_name),
    on_hand_quantity: toNumber(row.qty_on_hand),
    reserved_quantity: toNumber(row.qty_reserved),
    available_quantity: toNumber(row.qty_available),
    updated_at: toOptionalString(row.updated_at),
    evidence_ref: buildEvidenceRef(index),
  };
}

function buildAvailabilitySummary(items: readonly WarehouseStatusItem[]): WarehouseStatusAvailabilitySummary {
  const totalAvailable = items.reduce((sum, item) => sum + item.available_quantity, 0);
  return {
    item_count: items.length,
    total_available_quantity: totalAvailable,
    has_available_stock: totalAvailable > 0,
  };
}

function buildSummary(params: {
  itemCount: number;
  totalAvailable: number;
  filtersApplied: boolean;
}): string {
  const filterText = params.filtersApplied ? " for the requested filter" : "";
  return `Found ${params.itemCount} warehouse stock item(s)${filterText}; total available quantity is ${params.totalAvailable}.`;
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

  try {
    const offset = parseCursorOffset(input.value.cursor);
    const readWarehouseStatus = request.readWarehouseStatus ?? defaultReadWarehouseStatus;
    const readResult = await readWarehouseStatus({ offset, limit: input.value.limit });
    const filteredRows = readResult.rows.filter((row) => rowMatchesInput(row, input.value));
    const items = filteredRows.slice(0, input.value.limit).map(toWarehouseStatusItem);
    const evidenceRefs = items.map((item) => item.evidence_ref);
    const availabilitySummary = buildAvailabilitySummary(items);
    const filtersApplied = Boolean(
      input.value.material_id ||
        input.value.material_code ||
        input.value.warehouse_name ||
        input.value.object_name,
    );

    return {
      ok: true,
      data: {
        stock_items: items,
        summary: buildSummary({
          itemCount: items.length,
          totalAvailable: availabilitySummary.total_available_quantity,
          filtersApplied,
        }),
        availability_summary: availabilitySummary,
        next_cursor: readResult.hasMore ? `offset:${offset + input.value.limit}` : null,
        evidence_refs: evidenceRefs,
        bounded: true,
        route_operation: GET_WAREHOUSE_STATUS_ROUTE_OPERATION,
        mutation_count: 0,
        no_stock_mutation: true,
        no_issue_created: true,
        no_reservation_created: true,
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
