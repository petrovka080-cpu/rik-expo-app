import { Client, type ClientConfig } from "pg";

import type {
  DirectorFinanceBffOperation,
  DirectorFinanceBffRequestDto,
} from "../../src/screens/director/director.finance.bff.contract";
import type { DirectorFinanceBffRpcPort } from "../../src/screens/director/director.finance.bff.handler";

type DirectorFinanceRpcReadonlyDbEnv = Partial<NodeJS.ProcessEnv>;
type PgQueryRow = Record<string, unknown>;

export type DirectorFinanceRpcReadonlyQueryPlan = {
  operation: DirectorFinanceBffOperation;
  sql: string;
  values: readonly unknown[];
  readOnly: true;
};

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_QUERY_TIMEOUT_MS = 8_000;

const intOrNull = (value: unknown): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const valueOrNull = (value: unknown): unknown => value ?? null;

const assertReadonlyRpcSql = (sql: string): string => {
  const normalized = sql.trim();
  const lower = normalized.toLowerCase();
  if (!lower.startsWith("select ")) {
    throw new Error("BFF_DIRECTOR_FINANCE_RPC_SQL_NOT_SELECT");
  }
  if (/[;]/.test(normalized)) {
    throw new Error("BFF_DIRECTOR_FINANCE_RPC_SQL_MULTISTATEMENT_REJECTED");
  }
  if (/\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|call|copy|merge)\b/i.test(normalized)) {
    throw new Error("BFF_DIRECTOR_FINANCE_RPC_SQL_MUTATION_REJECTED");
  }
  return normalized;
};

const sql = (source: string): string => assertReadonlyRpcSql(source);

export function buildDirectorFinanceRpcReadonlyQueryPlan(
  request: DirectorFinanceBffRequestDto,
): DirectorFinanceRpcReadonlyQueryPlan {
  const args = request.args as Record<string, unknown>;

  switch (request.operation) {
    case "director.finance.summary.v1":
      return {
        operation: request.operation,
        readOnly: true,
        sql: sql(
          "select public.director_finance_fetch_summary_v1($1::date, $2::date, $3::integer, $4::integer) as row",
        ),
        values: [
          valueOrNull(args.p_from),
          valueOrNull(args.p_to),
          intOrNull(args.p_due_days),
          intOrNull(args.p_critical_days),
        ],
      };
    case "director.finance.summary.v2":
      return {
        operation: request.operation,
        readOnly: true,
        sql: sql(
          "select public.director_finance_summary_v2($1::uuid, $2::date, $3::date) as row",
        ),
        values: [
          valueOrNull(args.p_object_id),
          valueOrNull(args.p_date_from),
          valueOrNull(args.p_date_to),
        ],
      };
    case "director.finance.panel_scope.v1":
      return {
        operation: request.operation,
        readOnly: true,
        sql: sql(
          "select public.director_finance_panel_scope_v1($1::date, $2::date, $3::integer, $4::integer) as row",
        ),
        values: [
          valueOrNull(args.p_from),
          valueOrNull(args.p_to),
          intOrNull(args.p_due_days),
          intOrNull(args.p_critical_days),
        ],
      };
    case "director.finance.panel_scope.v2":
      return {
        operation: request.operation,
        readOnly: true,
        sql: sql(
          "select public.director_finance_panel_scope_v2($1::uuid, $2::date, $3::date, $4::integer, $5::integer) as row",
        ),
        values: [
          valueOrNull(args.p_object_id),
          valueOrNull(args.p_date_from),
          valueOrNull(args.p_date_to),
          intOrNull(args.p_limit),
          intOrNull(args.p_offset),
        ],
      };
    case "director.finance.panel_scope.v3":
      return {
        operation: request.operation,
        readOnly: true,
        sql: sql(
          "select public.director_finance_panel_scope_v3($1::uuid, $2::date, $3::date, $4::integer, $5::integer, $6::integer, $7::integer) as row",
        ),
        values: [
          valueOrNull(args.p_object_id),
          valueOrNull(args.p_date_from),
          valueOrNull(args.p_date_to),
          intOrNull(args.p_due_days),
          intOrNull(args.p_critical_days),
          intOrNull(args.p_limit),
          intOrNull(args.p_offset),
        ],
      };
    case "director.finance.panel_scope.v4":
      return {
        operation: request.operation,
        readOnly: true,
        sql: sql(
          "select public.director_finance_panel_scope_v4($1::uuid, $2::date, $3::date, $4::integer, $5::integer, $6::integer, $7::integer) as row",
        ),
        values: [
          valueOrNull(args.p_object_id),
          valueOrNull(args.p_date_from),
          valueOrNull(args.p_date_to),
          intOrNull(args.p_due_days),
          intOrNull(args.p_critical_days),
          intOrNull(args.p_limit),
          intOrNull(args.p_offset),
        ],
      };
    case "director.finance.supplier_scope.v1":
      return {
        operation: request.operation,
        readOnly: true,
        sql: sql(
          "select public.director_finance_supplier_scope_v1($1::text, $2::text, $3::date, $4::date, $5::integer, $6::integer) as row",
        ),
        values: [
          valueOrNull(args.p_supplier),
          valueOrNull(args.p_kind_name),
          valueOrNull(args.p_from),
          valueOrNull(args.p_to),
          intOrNull(args.p_due_days),
          intOrNull(args.p_critical_days),
        ],
      };
    case "director.finance.supplier_scope.v2":
      return {
        operation: request.operation,
        readOnly: true,
        sql: sql(
          "select public.director_finance_supplier_scope_v2($1::text, $2::text, $3::uuid, $4::date, $5::date, $6::integer, $7::integer) as row",
        ),
        values: [
          valueOrNull(args.p_supplier),
          valueOrNull(args.p_kind_name),
          valueOrNull(args.p_object_id),
          valueOrNull(args.p_from),
          valueOrNull(args.p_to),
          intOrNull(args.p_due_days),
          intOrNull(args.p_critical_days),
        ],
      };
  }
};

const resolvePgSsl = (connectionString: string): ClientConfig["ssl"] => {
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode") ?? "require";
  if (sslmode === "disable") return false;
  return { rejectUnauthorized: sslmode === "verify-full" };
};

const pgErrorCode = (error: unknown): string => {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  return /^[A-Z0-9]{5}$/.test(code) ? code : "ERROR";
};

const unwrapRpcRow = (row: PgQueryRow): Record<string, unknown> => {
  const value = row.row;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error("BFF_DIRECTOR_FINANCE_RPC_INVALID_ROW");
};

const runDirectorFinanceRpcReadonlyQuery = async (
  connectionString: string,
  request: DirectorFinanceBffRequestDto,
): Promise<Record<string, unknown>> => {
  const plan = buildDirectorFinanceRpcReadonlyQueryPlan(request);
  let client: Client | null = null;
  let transactionStarted = false;

  try {
    client = new Client({
      application_name: "rik_staging_bff_director_finance_rpc_readonly",
      connectionString,
      connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS,
      query_timeout: DEFAULT_QUERY_TIMEOUT_MS,
      statement_timeout: DEFAULT_QUERY_TIMEOUT_MS,
      ssl: resolvePgSsl(connectionString),
    });
    await client.connect();
    await client.query("begin read only");
    transactionStarted = true;
    const result = await client.query<PgQueryRow>(plan.sql, [...plan.values]);
    await client.query("commit");
    transactionStarted = false;
    return unwrapRpcRow(result.rows[0] ?? {});
  } catch (error) {
    if (transactionStarted) {
      try {
        await client?.query("rollback");
      } catch {
        // Keep the externally visible error envelope redacted.
      }
    }
    throw new Error(`BFF_DIRECTOR_FINANCE_RPC_QUERY_FAILED_${pgErrorCode(error)}`);
  } finally {
    await client?.end().catch(() => undefined);
  }
};

export function createDirectorFinanceRpcReadonlyDbPort(
  env: DirectorFinanceRpcReadonlyDbEnv = process.env,
): DirectorFinanceBffRpcPort | undefined {
  const connectionString = env.BFF_DATABASE_READONLY_URL;
  if (typeof connectionString !== "string" || connectionString.trim().length === 0) return undefined;

  const dbUrl = connectionString.trim();
  return {
    runDirectorFinanceRpc: (input) => runDirectorFinanceRpcReadonlyQuery(dbUrl, input),
  };
}
