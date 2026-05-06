import { Client, type ClientConfig } from "pg";

import {
  CATALOG_TRANSPORT_BFF_CATALOG_ITEMS_PREVIEW_DEFAULTS,
  CATALOG_TRANSPORT_BFF_REFERENCE_PAGE_DEFAULTS,
  CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS,
  type CatalogTransportBffOperation,
  type CatalogTransportBffReadErrorDto,
  type CatalogTransportBffReadResultDto,
  type CatalogTransportBffRequestDto,
} from "../../src/lib/catalog/catalog.bff.contract";
import type { CatalogTransportBffReadPort } from "../../src/lib/catalog/catalog.bff.handler";

type CatalogTransportReadonlyDbEnv = Partial<NodeJS.ProcessEnv>;
type PgQueryRow = Record<string, unknown>;

export type CatalogTransportBffReadonlyQueryPlan = {
  operation: CatalogTransportBffOperation;
  sql: string;
  values: readonly unknown[];
  maxRows: number | null;
  readOnly: true;
};

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_QUERY_TIMEOUT_MS = 8_000;

const READ_ERROR: CatalogTransportBffReadErrorDto = {
  code: "CATALOG_TRANSPORT_BFF_READ_ERROR",
  message: "Catalog transport read failed",
};

const toInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const clampPreviewLimit = (value: unknown): number =>
  Math.max(
    1,
    Math.min(
      CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS.maxRows,
      toInt(value, CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS.pageSize),
    ),
  );

const clampCatalogItemsPreviewLimit = (value: unknown): number =>
  Math.max(
    1,
    Math.min(
      CATALOG_TRANSPORT_BFF_CATALOG_ITEMS_PREVIEW_DEFAULTS.maxRows,
      toInt(value, CATALOG_TRANSPORT_BFF_CATALOG_ITEMS_PREVIEW_DEFAULTS.pageSize),
    ),
  );

const referenceProbeLimit = (): number => CATALOG_TRANSPORT_BFF_REFERENCE_PAGE_DEFAULTS.maxRows + 1;

const safeText = (value: unknown): string => String(value ?? "").trim();

const likeValue = (value: unknown): string => `%${safeText(value)}%`;

const assertReadonlySql = (sql: string): string => {
  const normalized = sql.trim();
  const lower = normalized.toLowerCase();
  if (!lower.startsWith("select ")) {
    throw new Error("CATALOG_TRANSPORT_BFF_SQL_NOT_SELECT");
  }
  if (/[;]/.test(normalized)) {
    throw new Error("CATALOG_TRANSPORT_BFF_SQL_MULTISTATEMENT_REJECTED");
  }
  if (/\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|call|copy|merge)\b/i.test(normalized)) {
    throw new Error("CATALOG_TRANSPORT_BFF_SQL_MUTATION_REJECTED");
  }
  return normalized;
};

const plan = (
  operation: CatalogTransportBffOperation,
  sql: string,
  values: readonly unknown[] = [],
  maxRows: number | null = CATALOG_TRANSPORT_BFF_REFERENCE_PAGE_DEFAULTS.maxRows,
): CatalogTransportBffReadonlyQueryPlan => ({
  operation,
  sql: assertReadonlySql(sql),
  values,
  maxRows,
  readOnly: true,
});

const buildTokenAndFilters = (
  columnA: string,
  columnB: string,
  tokens: string[],
  startParam: number,
): { sql: string; values: string[] } => {
  const values = tokens.map(likeValue);
  const clauses = values.map((_, index) => {
    const param = startParam + index;
    return `(${columnA} ilike $${param} or ${columnB} ilike $${param})`;
  });
  return {
    sql: clauses.length ? `and ${clauses.join(" and ")}` : "",
    values,
  };
};

const buildTokenOrFilters = (
  columnA: string,
  columnB: string,
  tokens: string[],
  startParam: number,
): { sql: string; values: string[] } => {
  const values = tokens.map(likeValue);
  const clauses = values.flatMap((_, index) => {
    const param = startParam + index;
    return [`${columnA} ilike $${param}`, `${columnB} ilike $${param}`];
  });
  return {
    sql: clauses.length ? `and (${clauses.join(" or ")})` : "",
    values,
  };
};

export function buildCatalogTransportReadQueryPlan(
  input: CatalogTransportBffRequestDto,
): CatalogTransportBffReadonlyQueryPlan {
  if (input.operation === "catalog.supplier_counterparty.list") {
    const searchTerm = safeText(input.args.searchTerm);
    return plan(
      input.operation,
      [
        "select id, name, inn, phone",
        "from public.suppliers",
        searchTerm ? "where name ilike $1 or inn ilike $1" : "",
        "order by name asc, id asc",
        "limit $" + (searchTerm ? "2" : "1"),
      ].filter(Boolean).join(" "),
      searchTerm ? [likeValue(searchTerm), referenceProbeLimit()] : [referenceProbeLimit()],
    );
  }

  if (input.operation === "catalog.subcontract_counterparty.list") {
    return plan(
      input.operation,
      [
        "select id, status, contractor_org, contractor_inn, contractor_phone",
        "from public.subcontracts",
        "where status <> 'draft'",
        "order by contractor_org asc, id asc",
        "limit $1",
      ].join(" "),
      [referenceProbeLimit()],
    );
  }

  if (input.operation === "catalog.contractor_counterparty.list") {
    return plan(
      input.operation,
      [
        "select id, company_name, phone, inn",
        "from public.contractors",
        "order by company_name asc, id asc",
        "limit $1",
      ].join(" "),
      [referenceProbeLimit()],
    );
  }

  if (input.operation === "catalog.contractor_profile.list") {
    return plan(
      input.operation,
      [
        "select *",
        "from public.user_profiles",
        input.args.withFilter ? "where is_contractor = true" : "",
        "order by user_id asc",
        "limit $" + (input.args.withFilter ? "1" : "1"),
      ].filter(Boolean).join(" "),
      [referenceProbeLimit()],
    );
  }

  if (input.operation === "catalog.search.rpc") {
    const args = input.args.args;
    const limit = clampPreviewLimit(args.p_limit);
    if (input.args.fn === "rik_quick_ru") {
      return plan(
        input.operation,
        "select * from public.rik_quick_ru(p_q => $1, p_limit => $2)",
        [safeText(args.p_q), limit],
        CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS.maxRows,
      );
    }
    if (Array.isArray(args.p_apps)) {
      return plan(
        input.operation,
        `select * from public.${input.args.fn}(p_q => $1, p_limit => $2, p_apps => $3::text[])`,
        [safeText(args.p_q), limit, args.p_apps],
        CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS.maxRows,
      );
    }
    return plan(
      input.operation,
      `select * from public.${input.args.fn}(p_q => $1, p_limit => $2)`,
      [safeText(args.p_q), limit],
      CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS.maxRows,
    );
  }

  if (input.operation === "catalog.search.fallback") {
    const limit = clampPreviewLimit(input.args.limit);
    if (input.args.tokens.length > 0) {
      const tokenFilters = buildTokenAndFilters("name_human", "rik_code", input.args.tokens, 1);
      return plan(
        input.operation,
        [
          "select rik_code, name_human, uom_code, sector_code, spec, kind, group_code",
          "from public.rik_items",
          "where true",
          tokenFilters.sql,
          "order by rik_code asc, name_human asc, id asc",
          `limit $${tokenFilters.values.length + 1}`,
        ].join(" "),
        [...tokenFilters.values, limit],
        CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS.maxRows,
      );
    }
    return plan(
      input.operation,
      [
        "select rik_code, name_human, uom_code, sector_code, spec, kind, group_code",
        "from public.rik_items",
        "where name_human ilike $1 or rik_code ilike $1",
        "order by rik_code asc, name_human asc, id asc",
        "limit $2",
      ].join(" "),
      [likeValue(input.args.searchTerm), limit],
      CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS.maxRows,
    );
  }

  if (input.operation === "catalog.groups.list") {
    return plan(
      input.operation,
      [
        "select code, name, parent_code",
        "from public.catalog_groups_clean",
        "order by code asc",
        "limit $1",
      ].join(" "),
      [referenceProbeLimit()],
    );
  }

  if (input.operation === "catalog.uoms.list") {
    return plan(
      input.operation,
      [
        "select id, code, name",
        "from public.ref_uoms_clean",
        "order by code asc, id asc",
        "limit $1",
      ].join(" "),
      [referenceProbeLimit()],
    );
  }

  if (input.operation === "catalog.incoming_items.list") {
    return plan(
      input.operation,
      [
        "select incoming_id, incoming_item_id, purchase_item_id, code, name, uom, qty_expected, qty_received",
        "from public.wh_incoming_items_clean",
        "where incoming_id = $1",
        "order by incoming_item_id asc",
        "limit $2",
      ].join(" "),
      [safeText(input.args.incomingId), referenceProbeLimit()],
    );
  }

  if (input.operation === "catalog.suppliers.rpc") {
    if (input.args.searchTerm === null) {
      return plan(
        input.operation,
        "select * from public.suppliers_list() limit $1",
        [referenceProbeLimit()],
      );
    }
    return plan(
      input.operation,
      "select * from public.suppliers_list(p_search => $1) limit $2",
      [safeText(input.args.searchTerm), referenceProbeLimit()],
    );
  }

  if (input.operation === "catalog.suppliers.table") {
    const searchTerm = safeText(input.args.searchTerm);
    return plan(
      input.operation,
      [
        "select id, name, inn, bank_account, specialization, phone, email, website, address, contact_name, notes",
        "from public.suppliers",
        searchTerm
          ? "where name ilike $1 or inn ilike $1 or specialization ilike $1"
          : "",
        "order by name asc, id asc",
        "limit $" + (searchTerm ? "2" : "1"),
      ].filter(Boolean).join(" "),
      searchTerm ? [likeValue(searchTerm), referenceProbeLimit()] : [referenceProbeLimit()],
    );
  }

  if (input.operation === "catalog.items.search.preview") {
    const searchTerm = safeText(input.args.searchTerm).toLowerCase();
    const values: unknown[] = [];
    const filters: string[] = [];
    if (searchTerm) {
      values.push(likeValue(searchTerm));
      filters.push(
        "(search_blob ilike $1 or name_search ilike $1 or name_human ilike $1 or rik_code ilike $1)",
      );
    }
    if (input.args.kind !== "all") {
      values.push(input.args.kind);
      filters.push(`kind = $${values.length}`);
    }
    values.push(clampCatalogItemsPreviewLimit(input.args.pageSize));

    return plan(
      input.operation,
      [
        "select id, rik_code, kind, name_human, uom_code, tags, sector_code",
        "from public.catalog_items",
        filters.length ? `where ${filters.join(" and ")}` : "",
        "order by rik_code asc, id asc",
        `limit $${values.length}`,
      ].filter(Boolean).join(" "),
      values,
      CATALOG_TRANSPORT_BFF_CATALOG_ITEMS_PREVIEW_DEFAULTS.maxRows,
    );
  }

  const limit = clampPreviewLimit(input.args.limit);
  if (input.args.tokens.length > 0) {
    const tokenFilters = buildTokenOrFilters("name_human", "rik_code", input.args.tokens, 1);
    return plan(
      input.operation,
      [
        "select rik_code, name_human, uom_code, kind, name_human_ru",
        "from public.rik_items",
        "where true",
        tokenFilters.sql,
        "order by rik_code asc, name_human asc, id asc",
        `limit $${tokenFilters.values.length + 1}`,
      ].join(" "),
      [...tokenFilters.values, limit],
      CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS.maxRows,
    );
  }
  return plan(
    input.operation,
    [
      "select rik_code, name_human, uom_code, kind, name_human_ru",
      "from public.rik_items",
      "where name_human ilike $1 or rik_code ilike $1",
      "order by rik_code asc, name_human asc, id asc",
      "limit $2",
    ].join(" "),
    [likeValue(input.args.searchTerm), limit],
    CATALOG_TRANSPORT_BFF_RIK_ITEMS_PREVIEW_DEFAULTS.maxRows,
  );
}

const resolvePgSsl = (connectionString: string): ClientConfig["ssl"] => {
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode") ?? "require";
  if (sslmode === "disable") return false;
  return { rejectUnauthorized: sslmode === "verify-full" };
};

const runPlanRows = async (
  client: Client,
  queryPlan: CatalogTransportBffReadonlyQueryPlan,
): Promise<CatalogTransportBffReadResultDto> => {
  let transactionStarted = false;
  try {
    await client.query("begin read only");
    transactionStarted = true;
    const result = await client.query<PgQueryRow>(queryPlan.sql, [...queryPlan.values]);
    await client.query("commit");
    transactionStarted = false;
    if (queryPlan.maxRows !== null && result.rows.length > queryPlan.maxRows) {
      return { data: null, error: READ_ERROR };
    }
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

const runCatalogTransportRead = async (
  connectionString: string,
  input: CatalogTransportBffRequestDto,
): Promise<CatalogTransportBffReadResultDto> => {
  const queryPlan = buildCatalogTransportReadQueryPlan(input);
  const client = new Client({
    application_name: "rik_staging_bff_catalog_transport_readonly",
    connectionString,
    connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS,
    query_timeout: DEFAULT_QUERY_TIMEOUT_MS,
    statement_timeout: DEFAULT_QUERY_TIMEOUT_MS,
    ssl: resolvePgSsl(connectionString),
  });

  try {
    await client.connect();
    return await runPlanRows(client, queryPlan);
  } finally {
    await client.end().catch(() => undefined);
  }
};

export function createCatalogTransportBffReadonlyDbPort(
  env: CatalogTransportReadonlyDbEnv = process.env,
): CatalogTransportBffReadPort | undefined {
  const connectionString = env.BFF_DATABASE_READONLY_URL;
  if (typeof connectionString !== "string" || connectionString.trim().length === 0) return undefined;

  const dbUrl = connectionString.trim();
  return {
    runCatalogTransportRead: (input) => runCatalogTransportRead(dbUrl, input),
  };
}
