import { Client, type ClientConfig } from "pg";

import type { BffReadListPortInput, BffReadPorts } from "../../src/shared/scale/bffReadPorts";

type ReadonlyDbEnv = Partial<NodeJS.ProcessEnv>;

type PgQueryRow = Record<string, unknown>;

type BffReadonlyQueryOperation =
  | "request.proposal.list"
  | "marketplace.catalog.search"
  | "warehouse.ledger.list"
  | "accountant.invoice.list"
  | "director.pending.list";

export type BffReadonlyQueryPlan = {
  operation: BffReadonlyQueryOperation;
  sql: string;
  readOnly: true;
};

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_QUERY_TIMEOUT_MS = 8_000;

const clampPage = (value: number): number => Math.max(0, Math.trunc(value));

const clampPageSize = (value: number): number => Math.max(1, Math.min(100, Math.trunc(value)));

const offsetForInput = (input: BffReadListPortInput): number => clampPage(input.page) * clampPageSize(input.pageSize);

const limitForInput = (input: BffReadListPortInput): number => clampPageSize(input.pageSize);

const safeText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text.length > 0 && text.length <= 120 ? text : null;
};

const safeDatePrefix = (value: unknown): string | null => {
  const text = safeText(value);
  if (!text) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 32) : null;
};

const quoteLiteral = (value: string | null): string =>
  value == null ? "null" : `'${value.replace(/'/g, "''")}'`;

const sqlInt = (value: number): string => String(Math.max(0, Math.trunc(value)));

const assertReadonlySql = (sql: string): string => {
  const normalized = sql.trim();
  const lower = normalized.toLowerCase();
  if (!lower.startsWith("select ") && !lower.startsWith("with ")) {
    throw new Error("BFF_READONLY_SQL_NOT_SELECT");
  }
  if (/[;]/.test(normalized)) {
    throw new Error("BFF_READONLY_SQL_MULTISTATEMENT_REJECTED");
  }
  if (/\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|call|copy|merge)\b/i.test(normalized)) {
    throw new Error("BFF_READONLY_SQL_MUTATION_REJECTED");
  }
  return normalized;
};

export function buildBffReadonlyQueryPlan(
  operation: BffReadonlyQueryOperation,
  input: BffReadListPortInput & { query?: string },
): BffReadonlyQueryPlan {
  const limit = limitForInput(input);
  const offset = offsetForInput(input);
  const filters = input.filters ?? {};
  const from = safeDatePrefix(filters.from);
  const to = safeDatePrefix(filters.to);

  if (operation === "request.proposal.list") {
    return {
      operation,
      readOnly: true,
      sql: assertReadonlySql(
        [
          "select id::text as id, submitted_at",
          "from public.proposals",
          "where submitted_at is not null",
          "and sent_to_accountant_at is null",
          "and (",
          "lower(coalesce(status::text, '')) in ('pending', 'submitted')",
          "or lower(coalesce(status::text, '')) like '%\u043d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d%'",
          ")",
          "order by submitted_at desc nulls last, id desc",
          `limit ${sqlInt(limit)} offset ${sqlInt(offset)}`,
        ].join(" "),
      ),
    };
  }

  if (operation === "marketplace.catalog.search") {
    const side = safeText(filters.side);
    const kind = safeText(filters.kind);
    return {
      operation,
      readOnly: true,
      sql: assertReadonlySql(
        [
          "select *",
          "from public.marketplace_items_scope_page_v1(",
          `${sqlInt(offset)}, ${sqlInt(limit)}, ${quoteLiteral(side)}, ${quoteLiteral(kind)}`,
          ")",
        ].join(" "),
      ),
    };
  }

  if (operation === "warehouse.ledger.list") {
    const clauses = ["direction = 'in'"];
    if (from) clauses.push(`moved_at >= ${quoteLiteral(from)}`);
    if (to) clauses.push(`moved_at <= ${quoteLiteral(to)}`);

    return {
      operation,
      readOnly: true,
      sql: assertReadonlySql(
        [
          "select code, uom_id, qty, moved_at, warehouseman_fio",
          "from public.wh_ledger",
          `where ${clauses.join(" and ")}`,
          "order by moved_at asc, code asc",
          `limit ${sqlInt(limit)} offset ${sqlInt(offset)}`,
        ].join(" "),
      ),
    };
  }

  if (operation === "accountant.invoice.list") {
    const tab = safeText(filters.tab ?? filters.status);
    return {
      operation,
      readOnly: true,
      sql: assertReadonlySql(
        [
          "select row_json as row",
          `from public.list_accountant_inbox_fact(${quoteLiteral(tab)}) as src(row_json)`,
          `limit ${sqlInt(limit)} offset ${sqlInt(offset)}`,
        ].join(" "),
      ),
    };
  }

  return {
    operation,
    readOnly: true,
    sql: assertReadonlySql(
      [
        "select id, request_id::text as request_id, request_item_id::text as request_item_id, name_human, qty, uom",
        "from public.list_pending_foreman_items()",
        `limit ${sqlInt(limit)} offset ${sqlInt(offset)}`,
      ].join(" "),
    ),
  };
}

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

const unwrapJsonRow = (row: PgQueryRow): PgQueryRow => {
  const keys = Object.keys(row);
  if (keys.length === 1 && keys[0] === "row" && row.row && typeof row.row === "object" && !Array.isArray(row.row)) {
    return row.row as PgQueryRow;
  }
  return row;
};

const runReadonlyQuery = async (
  connectionString: string,
  operation: BffReadonlyQueryOperation,
  input: BffReadListPortInput & { query?: string },
): Promise<unknown[]> => {
  const plan = buildBffReadonlyQueryPlan(operation, input);
  let client: Client | null = null;
  let transactionStarted = false;

  try {
    client = new Client({
      application_name: "rik_staging_bff_readonly",
      connectionString,
      connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS,
      query_timeout: DEFAULT_QUERY_TIMEOUT_MS,
      statement_timeout: DEFAULT_QUERY_TIMEOUT_MS,
      ssl: resolvePgSsl(connectionString),
    });
    await client.connect();
    await client.query("begin read only");
    transactionStarted = true;
    const result = await client.query<PgQueryRow>(plan.sql);
    await client.query("commit");
    transactionStarted = false;
    return result.rows.map(unwrapJsonRow);
  } catch (error) {
    if (transactionStarted) {
      try {
        await client?.query("rollback");
      } catch {
        // Keep the externally visible error envelope redacted.
      }
    }
    throw new Error(`BFF_DATABASE_QUERY_FAILED_${pgErrorCode(error)}`);
  } finally {
    await client?.end().catch(() => undefined);
  }
};

export function createBffReadonlyDbReadPorts(env: ReadonlyDbEnv = process.env): BffReadPorts | undefined {
  const connectionString = env.BFF_DATABASE_READONLY_URL;
  if (typeof connectionString !== "string" || connectionString.trim().length === 0) return undefined;

  const dbUrl = connectionString.trim();
  return {
    requestProposal: {
      listRequestProposals: (input) => runReadonlyQuery(dbUrl, "request.proposal.list", input),
    },
    marketplaceCatalog: {
      searchCatalog: (input) => runReadonlyQuery(dbUrl, "marketplace.catalog.search", input),
    },
    warehouseLedger: {
      listWarehouseLedger: (input) => runReadonlyQuery(dbUrl, "warehouse.ledger.list", input),
    },
    accountantInvoice: {
      listAccountantInvoices: (input) => runReadonlyQuery(dbUrl, "accountant.invoice.list", input),
    },
    directorPending: {
      listDirectorPending: (input) => runReadonlyQuery(dbUrl, "director.pending.list", input),
    },
  };
}
