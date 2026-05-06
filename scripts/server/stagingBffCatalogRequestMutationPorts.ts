import { Client, type ClientConfig } from "pg";

import type {
  BffMutationPorts,
  CatalogRequestItemCancelPayload,
  CatalogRequestItemQtyUpdatePayload,
  CatalogRequestMetaPatch,
  CatalogRequestMetaUpdatePayload,
} from "../../src/shared/scale/bffMutationPorts";

type CatalogRequestMutationEnv = Partial<NodeJS.ProcessEnv>;

type PgQueryRow = Record<string, unknown>;

export type CatalogRequestMutationExecutor = {
  updateRequestMeta(payload: CatalogRequestMetaUpdatePayload): Promise<unknown>;
  updateRequestItemQty(payload: CatalogRequestItemQtyUpdatePayload): Promise<unknown>;
  cancelRequestItem(payload: CatalogRequestItemCancelPayload): Promise<unknown>;
};

export const CATALOG_REQUEST_SERVER_MUTATION_PORTING_CONTRACT = Object.freeze({
  serverHandlersAdded: ["catalog.request.meta.update", "request.item.update", "catalog.request.item.cancel"],
  mutationRoutesEnabledByDefault: false,
  productionTrafficEnabled: false,
  payloadLogging: "payload_keys_only",
  dbRowsLogged: false,
  envValuesLogged: false,
  rawSqlLogged: false,
});

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_QUERY_TIMEOUT_MS = 8_000;

const TEXT_META_COLUMNS = Object.freeze([
  "need_by",
  "comment",
  "object_type_code",
  "level_code",
  "system_code",
  "zone_code",
  "foreman_name",
  "contractor_job_id",
  "subcontract_id",
  "contractor_org",
  "subcontractor_org",
  "contractor_phone",
  "subcontractor_phone",
  "object_name",
  "level_name",
  "system_name",
  "zone_name",
] as const);

const NUMBER_META_COLUMNS = Object.freeze(["planned_volume", "qty_plan", "volume"] as const);

const BASE_REQUEST_COLUMNS = new Set([
  "need_by",
  "comment",
  "object_type_code",
  "level_code",
  "system_code",
  "zone_code",
  "foreman_name",
]);

const ALL_REQUEST_META_COLUMNS = new Set<string>([
  ...TEXT_META_COLUMNS,
  ...NUMBER_META_COLUMNS,
]);

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

const normalizePatchForSql = (patch: CatalogRequestMetaPatch): Record<string, string | number | null> => {
  const normalized: Record<string, string | number | null> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!ALL_REQUEST_META_COLUMNS.has(key)) {
      throw new Error("BFF_CATALOG_REQUEST_META_PATCH_INVALID");
    }
    if (value === null) {
      normalized[key] = null;
      continue;
    }
    if ((TEXT_META_COLUMNS as readonly string[]).includes(key)) {
      if (typeof value !== "string") throw new Error("BFF_CATALOG_REQUEST_META_PATCH_INVALID");
      normalized[key] = value.trim() || null;
      continue;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("BFF_CATALOG_REQUEST_META_PATCH_INVALID");
    }
    normalized[key] = value;
  }
  return normalized;
};

const buildRequestMetaUpdateStatement = (
  requestId: string,
  patch: Record<string, string | number | null>,
  baseOnly: boolean,
): {
  text: string;
  values: unknown[];
  patchKeys: string[];
} => {
  const entries = Object.entries(patch).filter(([key]) => !baseOnly || BASE_REQUEST_COLUMNS.has(key));
  if (entries.length === 0) {
    return {
      text: "select $1::text as id",
      values: [requestId],
      patchKeys: [],
    };
  }

  const assignments = entries.map(([key], index) => `"${key}" = $${index + 2}`);
  return {
    text: [
      "update public.requests",
      `set ${assignments.join(", ")}`,
      "where id = $1",
      "returning id::text as id",
    ].join(" "),
    values: [requestId, ...entries.map(([, value]) => value)],
    patchKeys: entries.map(([key]) => key).sort(),
  };
};

const createClient = (connectionString: string): Client =>
  new Client({
    application_name: "rik_staging_bff_catalog_mutations",
    connectionString,
    connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS,
    query_timeout: DEFAULT_QUERY_TIMEOUT_MS,
    statement_timeout: DEFAULT_QUERY_TIMEOUT_MS,
    ssl: resolvePgSsl(connectionString),
  });

const runInTransaction = async <T>(
  connectionString: string,
  work: (client: Client) => Promise<T>,
): Promise<T> => {
  let client: Client | null = null;
  let transactionStarted = false;

  try {
    client = createClient(connectionString);
    await client.connect();
    await client.query("begin");
    transactionStarted = true;
    const result = await work(client);
    await client.query("commit");
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      await client?.query("rollback").catch(() => undefined);
    }
    throw error;
  } finally {
    await client?.end().catch(() => undefined);
  }
};

const rowTouched = (rows: readonly PgQueryRow[]): boolean => rows.length > 0;

const createPgExecutor = (connectionString: string): CatalogRequestMutationExecutor => ({
  async updateRequestMeta(payload) {
    const patch = normalizePatchForSql(payload.patch);
    const primary = buildRequestMetaUpdateStatement(payload.requestId, patch, false);

    if (primary.patchKeys.length === 0) {
      return {
        id: payload.requestId,
        status: "noop",
        payloadKeys: [],
        rawRowsReturned: false,
      };
    }

    try {
      return await runInTransaction(connectionString, async (client) => {
        const result = await client.query<PgQueryRow>(primary.text, primary.values);
        return {
          id: payload.requestId,
          status: rowTouched(result.rows) ? "updated" : "not_found",
          payloadKeys: primary.patchKeys,
          fallbackUsed: false,
          rawRowsReturned: false,
        };
      });
    } catch (error) {
      if (pgErrorCode(error) !== "42703") {
        throw new Error(`BFF_CATALOG_REQUEST_META_UPDATE_FAILED_${pgErrorCode(error)}`);
      }
      const fallback = buildRequestMetaUpdateStatement(payload.requestId, patch, true);
      if (fallback.patchKeys.length === 0) {
        throw new Error("BFF_CATALOG_REQUEST_META_UPDATE_UNSUPPORTED_COLUMNS");
      }
      return await runInTransaction(connectionString, async (client) => {
        const result = await client.query<PgQueryRow>(fallback.text, fallback.values);
        return {
          id: payload.requestId,
          status: rowTouched(result.rows) ? "updated" : "not_found",
          payloadKeys: fallback.patchKeys,
          fallbackUsed: true,
          rawRowsReturned: false,
        };
      });
    }
  },

  async updateRequestItemQty(payload) {
    try {
      return await runInTransaction(connectionString, async (client) => {
        const result = await client.query<PgQueryRow>(
          "select * from public.request_item_update_qty($1, $2)",
          [payload.requestItemId, payload.qty],
        );
        return {
          id: payload.requestItemId,
          status: rowTouched(result.rows) ? "updated" : "not_found",
          requestScope: payload.requestIdHint ? "present_redacted" : "missing",
          fallbackUsed: false,
          rawRowsReturned: false,
        };
      });
    } catch (error) {
      return await runInTransaction(connectionString, async (client) => {
        const result = await client.query<PgQueryRow>(
          [
            "update public.request_items",
            "set qty = $2",
            "where id = $1",
            "returning id::text as id, request_id::text as request_id",
          ].join(" "),
          [payload.requestItemId, payload.qty],
        );
        if (!rowTouched(result.rows) && pgErrorCode(error) !== "ERROR") {
          throw new Error(`BFF_CATALOG_REQUEST_ITEM_QTY_UPDATE_FAILED_${pgErrorCode(error)}`);
        }
        return {
          id: payload.requestItemId,
          status: rowTouched(result.rows) ? "updated" : "not_found",
          requestScope: "present_redacted",
          fallbackUsed: true,
          rawRowsReturned: false,
        };
      });
    }
  },

  async cancelRequestItem(payload) {
    return await runInTransaction(connectionString, async (client) => {
      const result = await client.query<PgQueryRow>(
        [
          "update public.request_items",
          "set status = 'cancelled', cancelled_at = now()",
          "where id = $1",
          "returning id::text as id",
        ].join(" "),
        [payload.requestItemId],
      );
      return {
        id: payload.requestItemId,
        status: rowTouched(result.rows) ? "cancelled" : "not_found",
        rawRowsReturned: false,
      };
    });
  },
});

const disabledPort = async (): Promise<never> => {
  throw new Error("BFF_MUTATION_PORT_NOT_CONFIGURED_FOR_OPERATION");
};

export function createBffCatalogRequestMutationPorts(
  executor: CatalogRequestMutationExecutor,
): BffMutationPorts {
  return {
    proposalSubmit: {
      submitProposal: disabledPort,
    },
    warehouseReceive: {
      applyReceive: disabledPort,
    },
    accountantPayment: {
      applyPayment: disabledPort,
    },
    directorApproval: {
      approve: disabledPort,
    },
    requestItemUpdate: {
      updateRequestItem: (input) => executor.updateRequestItemQty(input.payload),
    },
    catalogRequest: {
      updateRequestMeta: (input) => executor.updateRequestMeta(input.payload),
      cancelRequestItem: (input) => executor.cancelRequestItem(input.payload),
    },
  };
}

export function createBffCatalogRequestMutationPortsFromEnv(
  env: CatalogRequestMutationEnv = process.env,
): BffMutationPorts | undefined {
  const connectionString = env.BFF_DATABASE_WRITE_URL;
  if (typeof connectionString !== "string" || connectionString.trim().length === 0) return undefined;
  return createBffCatalogRequestMutationPorts(createPgExecutor(connectionString.trim()));
}
