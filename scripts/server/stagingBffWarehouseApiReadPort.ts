import { Client, type ClientConfig } from "pg";

import {
  WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS,
  type WarehouseApiBffOperation,
  type WarehouseApiBffReadErrorDto,
  type WarehouseApiBffReadResultDto,
  type WarehouseApiBffRequestDto,
  type WarehouseApiBffPayloadDto,
} from "../../src/screens/warehouse/warehouse.api.bff.contract";
import type { WarehouseApiBffReadPort } from "../../src/screens/warehouse/warehouse.api.bff.handler";

type WarehouseApiReadonlyDbEnv = Partial<NodeJS.ProcessEnv>;
type PgQueryRow = Record<string, unknown>;

export type WarehouseApiBffReadonlyQueryPlan = {
  operation: WarehouseApiBffOperation | "warehouse.api.reports.stock" | "warehouse.api.reports.movement" | "warehouse.api.reports.issues";
  sql: string;
  values: readonly unknown[];
  readOnly: true;
};

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_QUERY_TIMEOUT_MS = 8_000;

const READ_ERROR: WarehouseApiBffReadErrorDto = {
  code: "WAREHOUSE_API_BFF_READ_ERROR",
  message: "Warehouse API read failed",
};

const toInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const clampPage = (value: unknown): number => Math.max(0, toInt(value, 0));

const clampPageSize = (value: unknown): number =>
  Math.max(
    1,
    Math.min(
      WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS.maxPageSize,
      toInt(value, WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS.pageSize),
    ),
  );

const offsetForInput = (input: WarehouseApiBffRequestDto): number =>
  clampPage(("page" in input ? input.page?.page : undefined)) *
  clampPageSize("page" in input ? input.page?.pageSize : undefined);

const limitForInput = (input: WarehouseApiBffRequestDto): number =>
  clampPageSize("page" in input ? input.page?.pageSize : undefined);

const safeText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text.length > 0 && text.length <= 120 ? text : null;
};

const safeNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const assertReadonlySql = (sql: string): string => {
  const normalized = sql.trim();
  const lower = normalized.toLowerCase();
  if (!lower.startsWith("select ")) {
    throw new Error("WAREHOUSE_API_BFF_SQL_NOT_SELECT");
  }
  if (/[;]/.test(normalized)) {
    throw new Error("WAREHOUSE_API_BFF_SQL_MULTISTATEMENT_REJECTED");
  }
  if (/\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|call|copy|merge)\b/i.test(normalized)) {
    throw new Error("WAREHOUSE_API_BFF_SQL_MUTATION_REJECTED");
  }
  return normalized;
};

const plan = (
  operation: WarehouseApiBffReadonlyQueryPlan["operation"],
  sql: string,
  values: readonly unknown[] = [],
): WarehouseApiBffReadonlyQueryPlan => ({
  operation,
  sql: assertReadonlySql(sql),
  values,
  readOnly: true,
});

const buildWarehouseApiReportsBundlePlans = (
  input: Extract<WarehouseApiBffRequestDto, { operation: "warehouse.api.reports.bundle" }>,
): WarehouseApiBffReadonlyQueryPlan[] => {
  const from = safeText(input.args.p_from);
  const to = safeText(input.args.p_to);
  return [
    plan("warehouse.api.reports.stock", "select * from public.acc_report_stock()"),
    plan(
      "warehouse.api.reports.movement",
      "select * from public.acc_report_movement(p_from => $1, p_to => $2)",
      [from, to],
    ),
    plan(
      "warehouse.api.reports.issues",
      "select * from public.acc_report_issues_v2(p_from => $1, p_to => $2)",
      [from, to],
    ),
  ];
};

export function buildWarehouseApiReadQueryPlans(
  input: WarehouseApiBffRequestDto,
): WarehouseApiBffReadonlyQueryPlan[] {
  if (input.operation === "warehouse.api.reports.bundle") {
    return buildWarehouseApiReportsBundlePlans(input);
  }

  if (input.operation === "warehouse.api.report.issue_lines") {
    return [
      plan(
        input.operation,
        "select * from public.acc_report_issue_lines(p_issue_id => $1)",
        [safeNumber(input.args.p_issue_id)],
      ),
    ];
  }

  if (input.operation === "warehouse.api.report.issued_materials_fast") {
    return [
      plan(
        input.operation,
        [
          "select * from public.wh_report_issued_materials_fast(",
          "p_from => nullif($1::text, '')::timestamptz,",
          "p_to => nullif($2::text, '')::timestamptz,",
          "p_object_id => nullif($3::text, '')::uuid",
          ")",
        ].join(" "),
        [safeText(input.args.p_from), safeText(input.args.p_to), safeText(input.args.p_object_id)],
      ),
    ];
  }

  if (input.operation === "warehouse.api.report.issued_by_object_fast") {
    return [
      plan(
        input.operation,
        [
          "select * from public.wh_report_issued_by_object_fast(",
          "p_from => nullif($1::text, '')::timestamptz,",
          "p_to => nullif($2::text, '')::timestamptz,",
          "p_object_id => nullif($3::text, '')::uuid",
          ")",
        ].join(" "),
        [safeText(input.args.p_from), safeText(input.args.p_to), safeText(input.args.p_object_id)],
      ),
    ];
  }

  if (input.operation === "warehouse.api.report.incoming_v2") {
    return [
      plan(
        input.operation,
        "select * from public.acc_report_incoming_v2(p_from => $1, p_to => $2)",
        [safeText(input.args.p_from), safeText(input.args.p_to)],
      ),
    ];
  }

  if (input.operation === "warehouse.api.uom.material_unit") {
    return [
      plan(
        input.operation,
        [
          "select unit_id",
          "from public.rik_materials",
          "where mat_code = $1",
          "limit 1",
        ].join(" "),
        [safeText(input.args.matCode)],
      ),
    ];
  }

  if (input.operation === "warehouse.api.uom.code") {
    return [
      plan(
        input.operation,
        [
          "select uom_code",
          "from public.rik_uoms",
          "where id = nullif($1::text, '')::uuid",
          "limit 1",
        ].join(" "),
        [safeText(input.args.unitId)],
      ),
    ];
  }

  if (input.operation === "warehouse.api.ledger.incoming") {
    return [
      plan(
        input.operation,
        [
          "select code, uom_id, qty, moved_at, warehouseman_fio",
          "from public.wh_ledger",
          "where direction = 'in'",
          "and (nullif($1::text, '') is null or moved_at >= nullif($1::text, '')::timestamptz)",
          "and (nullif($2::text, '') is null or moved_at <= nullif($2::text, '')::timestamptz)",
          "order by moved_at asc, code asc",
          "limit $3 offset $4",
        ].join(" "),
        [safeText(input.args.p_from), safeText(input.args.p_to), limitForInput(input), offsetForInput(input)],
      ),
    ];
  }

  return [
    plan(
      input.operation,
      [
        "select code, uom_id, qty",
        "from public.wh_ledger",
        "where incoming_id = $1::uuid",
        "and direction = 'in'",
        "order by code asc",
        "limit $2 offset $3",
      ].join(" "),
      [safeText(input.args.incomingId), limitForInput(input), offsetForInput(input)],
    ),
  ];
}

const resolvePgSsl = (connectionString: string): ClientConfig["ssl"] => {
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode") ?? "require";
  if (sslmode === "disable") return false;
  return { rejectUnauthorized: sslmode === "verify-full" };
};

const runPlanRows = async (
  client: Client,
  queryPlan: WarehouseApiBffReadonlyQueryPlan,
): Promise<WarehouseApiBffReadResultDto> => {
  let transactionStarted = false;
  try {
    await client.query("begin read only");
    transactionStarted = true;
    const result = await client.query<PgQueryRow>(queryPlan.sql, [...queryPlan.values]);
    await client.query("commit");
    transactionStarted = false;
    return { data: result.rows, error: null };
  } catch {
    if (transactionStarted) {
      try {
        await client.query("rollback");
      } catch {
        // Keep the externally visible error payload redacted.
      }
    }
    return { data: null, error: READ_ERROR };
  }
};

const buildPayload = (
  input: WarehouseApiBffRequestDto,
  results: WarehouseApiBffReadResultDto[],
): WarehouseApiBffPayloadDto => {
  if (input.operation === "warehouse.api.reports.bundle") {
    return {
      kind: "reports_bundle",
      result: {
        stock: results[0] ?? { data: null, error: READ_ERROR },
        movement: results[1] ?? { data: null, error: READ_ERROR },
        issues: results[2] ?? { data: null, error: READ_ERROR },
      },
    };
  }

  return {
    kind: "single",
    result: results[0] ?? { data: null, error: READ_ERROR },
  };
};

const runWarehouseApiRead = async (
  connectionString: string,
  input: WarehouseApiBffRequestDto,
): Promise<WarehouseApiBffPayloadDto> => {
  const plans = buildWarehouseApiReadQueryPlans(input);
  const client = new Client({
    application_name: "rik_staging_bff_warehouse_api_readonly",
    connectionString,
    connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS,
    query_timeout: DEFAULT_QUERY_TIMEOUT_MS,
    statement_timeout: DEFAULT_QUERY_TIMEOUT_MS,
    ssl: resolvePgSsl(connectionString),
  });

  try {
    await client.connect();
    const results: WarehouseApiBffReadResultDto[] = [];
    for (const queryPlan of plans) {
      results.push(await runPlanRows(client, queryPlan));
    }
    return buildPayload(input, results);
  } finally {
    await client.end().catch(() => undefined);
  }
};

export function createWarehouseApiBffReadonlyDbPort(
  env: WarehouseApiReadonlyDbEnv = process.env,
): WarehouseApiBffReadPort | undefined {
  const connectionString = env.BFF_DATABASE_READONLY_URL;
  if (typeof connectionString !== "string" || connectionString.trim().length === 0) return undefined;

  const dbUrl = connectionString.trim();
  return {
    runWarehouseApiRead: (input) => runWarehouseApiRead(dbUrl, input),
  };
}
