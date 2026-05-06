import { Client, type ClientConfig } from "pg";

import {
  ASSISTANT_STORE_READ_BFF_CHAT_PAGE_DEFAULTS,
  ASSISTANT_STORE_READ_BFF_MARKET_PAGE_DEFAULTS,
  ASSISTANT_STORE_READ_BFF_REFERENCE_PAGE_DEFAULTS,
  ASSISTANT_STORE_READ_BFF_SUPPLIER_SHOWCASE_PAGE_DEFAULTS,
  type AssistantStoreReadBffOperation,
  type AssistantStoreReadBffReadErrorDto,
  type AssistantStoreReadBffReadResultDto,
  type AssistantStoreReadBffRequestDto,
} from "../../src/lib/assistant_store_read.bff.contract";
import type { AssistantStoreReadBffPort } from "../../src/lib/assistant_store_read.bff.handler";

type AssistantStoreReadonlyDbEnv = Partial<NodeJS.ProcessEnv>;
type PgQueryRow = Record<string, unknown>;

export type AssistantStoreReadQueryPlan = {
  operation: AssistantStoreReadBffOperation;
  sql: string;
  values: readonly unknown[];
  maxRows: number | null;
  readOnly: true;
};

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_QUERY_TIMEOUT_MS = 8_000;

const READ_ERROR: AssistantStoreReadBffReadErrorDto = {
  code: "ASSISTANT_STORE_READ_BFF_ERROR",
  message: "Assistant/store read failed",
};

const safeText = (value: unknown): string => String(value ?? "").trim();

const toInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const referenceProbeLimit = (): number => ASSISTANT_STORE_READ_BFF_REFERENCE_PAGE_DEFAULTS.maxRows + 1;

const marketLimit = (value: unknown): number =>
  Math.max(
    1,
    Math.min(
      ASSISTANT_STORE_READ_BFF_MARKET_PAGE_DEFAULTS.maxRows,
      toInt(value, ASSISTANT_STORE_READ_BFF_MARKET_PAGE_DEFAULTS.pageSize),
    ),
  );

const chatLimit = (value: unknown): number =>
  Math.max(
    1,
    Math.min(
      ASSISTANT_STORE_READ_BFF_CHAT_PAGE_DEFAULTS.maxRows,
      toInt(value, ASSISTANT_STORE_READ_BFF_CHAT_PAGE_DEFAULTS.pageSize),
    ),
  );

const supplierShowcaseLimit = (value: unknown): number =>
  Math.max(
    1,
    Math.min(
      ASSISTANT_STORE_READ_BFF_SUPPLIER_SHOWCASE_PAGE_DEFAULTS.maxRows,
      toInt(value, ASSISTANT_STORE_READ_BFF_SUPPLIER_SHOWCASE_PAGE_DEFAULTS.pageSize),
    ),
  );

const dedupeIds = (ids: readonly string[]): string[] =>
  Array.from(new Set(ids.map(safeText).filter(Boolean))).slice(
    0,
    ASSISTANT_STORE_READ_BFF_REFERENCE_PAGE_DEFAULTS.maxPageSize,
  );

const assertReadonlySql = (sql: string): string => {
  const normalized = sql.trim();
  const lower = normalized.toLowerCase();
  if (!lower.startsWith("select ")) {
    throw new Error("ASSISTANT_STORE_READ_BFF_SQL_NOT_SELECT");
  }
  if (/[;]/.test(normalized)) {
    throw new Error("ASSISTANT_STORE_READ_BFF_SQL_MULTISTATEMENT_REJECTED");
  }
  if (/\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|call|copy|merge)\b/i.test(normalized)) {
    throw new Error("ASSISTANT_STORE_READ_BFF_SQL_MUTATION_REJECTED");
  }
  return normalized;
};

const plan = (
  operation: AssistantStoreReadBffOperation,
  sql: string,
  values: readonly unknown[] = [],
  maxRows: number | null = ASSISTANT_STORE_READ_BFF_REFERENCE_PAGE_DEFAULTS.maxRows,
): AssistantStoreReadQueryPlan => ({
  operation,
  sql: assertReadonlySql(sql),
  values,
  maxRows,
  readOnly: true,
});

export function buildAssistantStoreReadQueryPlans(
  input: AssistantStoreReadBffRequestDto,
): AssistantStoreReadQueryPlan[] {
  if (input.operation === "assistant.actor.context") {
    const userId = safeText(input.args.userId);
    return [
      plan(
        input.operation,
        [
          "select",
          "(select full_name from public.user_profiles where user_id::text = $1 limit 1) as profile_full_name,",
          "(select company_id::text from public.company_members where user_id::text = $1 limit 1) as membership_company_id,",
          "(select id::text from public.companies where owner_user_id::text = $1 limit 1) as owned_company_id,",
          "(",
          "select company_id::text from public.market_listings",
          "where user_id::text = $1 and company_id is not null",
          "order by created_at desc",
          "limit 1",
          ") as listing_company_id",
        ].join(" "),
        [userId],
        1,
      ),
    ];
  }

  if (input.operation === "assistant.market.active_listings") {
    return [
      plan(
        input.operation,
        [
          "select id, title, price, city, company_id, user_id, description, kind, items_json, status, created_at",
          "from public.market_listings",
          "where status = 'active'",
          "order by created_at desc, id desc",
          "limit $1",
        ].join(" "),
        [marketLimit(input.args.pageSize)],
        ASSISTANT_STORE_READ_BFF_MARKET_PAGE_DEFAULTS.maxRows,
      ),
    ];
  }

  if (input.operation === "assistant.market.companies_by_ids") {
    return [
      plan(
        input.operation,
        [
          "select id, name",
          "from public.companies",
          "where id::text = any($1::text[])",
        ].join(" "),
        [dedupeIds(input.args.ids)],
      ),
    ];
  }

  if (input.operation === "assistant.market.profiles_by_user_ids") {
    return [
      plan(
        input.operation,
        [
          "select user_id, full_name",
          "from public.user_profiles",
          "where user_id::text = any($1::text[])",
        ].join(" "),
        [dedupeIds(input.args.ids)],
      ),
    ];
  }

  if (input.operation === "profile.current.full_name") {
    return [
      plan(
        input.operation,
        [
          "select full_name",
          "from public.user_profiles",
          "where user_id::text = $1",
          "limit 1",
        ].join(" "),
        [safeText(input.args.userId)],
        1,
      ),
    ];
  }

  if (input.operation === "chat.actor.context") {
    const userId = safeText(input.args.userId);
    return [
      plan(
        input.operation,
        [
          "select",
          "(select full_name from public.user_profiles where user_id::text = $1 limit 1) as profile_full_name,",
          "(select id::text from public.companies where owner_user_id::text = $1 limit 1) as owned_company_id,",
          "(",
          "select company_id::text from public.market_listings",
          "where user_id::text = $1 and company_id is not null",
          "order by created_at desc",
          "limit 1",
          ") as listing_company_id",
        ].join(" "),
        [userId],
        1,
      ),
    ];
  }

  if (input.operation === "chat.listing.messages.list") {
    return [
      plan(
        input.operation,
        [
          "select *",
          "from public.chat_messages",
          "where supplier_id::text = $1",
          "and is_deleted = false",
          "order by created_at asc, id asc",
          "limit $2",
        ].join(" "),
        [safeText(input.args.listingId), chatLimit(input.args.pageSize)],
        ASSISTANT_STORE_READ_BFF_CHAT_PAGE_DEFAULTS.maxRows,
      ),
    ];
  }

  if (input.operation === "chat.profiles_by_user_ids") {
    return [
      plan(
        input.operation,
        [
          "select user_id, full_name",
          "from public.user_profiles",
          "where user_id::text = any($1::text[])",
          "order by user_id asc",
          "limit $2",
        ].join(" "),
        [dedupeIds(input.args.ids), ASSISTANT_STORE_READ_BFF_CHAT_PAGE_DEFAULTS.maxRows],
        ASSISTANT_STORE_READ_BFF_CHAT_PAGE_DEFAULTS.maxRows,
      ),
    ];
  }

  if (input.operation === "supplier_showcase.profile_by_user_id") {
    return [
      plan(
        input.operation,
        [
          "select *",
          "from public.user_profiles",
          "where user_id::text = $1",
          "limit 1",
        ].join(" "),
        [safeText(input.args.userId)],
        1,
      ),
    ];
  }

  if (input.operation === "supplier_showcase.company_by_id") {
    return [
      plan(
        input.operation,
        [
          "select *",
          "from public.companies",
          "where id::text = $1",
          "limit 1",
        ].join(" "),
        [safeText(input.args.companyId)],
        1,
      ),
    ];
  }

  if (input.operation === "supplier_showcase.company_by_owner_user_id") {
    return [
      plan(
        input.operation,
        [
          "select *",
          "from public.companies",
          "where owner_user_id::text = $1",
          "order by created_at desc",
          "limit 1",
        ].join(" "),
        [safeText(input.args.userId)],
        1,
      ),
    ];
  }

  if (input.operation === "supplier_showcase.listings_by_user_id") {
    return [
      plan(
        input.operation,
        [
          "select id, title, user_id, company_id, city, price, kind, side, description, contacts_phone, contacts_whatsapp, contacts_email, items_json, uom, uom_code, rik_code, status, created_at",
          "from public.market_listings",
          "where user_id::text = $1",
          "and ($2::boolean is true or status = 'active')",
          "order by created_at desc, id desc",
          "limit $3",
        ].join(" "),
        [
          safeText(input.args.userId),
          input.args.includeInactive === true,
          supplierShowcaseLimit(input.args.pageSize),
        ],
        ASSISTANT_STORE_READ_BFF_SUPPLIER_SHOWCASE_PAGE_DEFAULTS.maxRows,
      ),
    ];
  }

  if (input.operation === "supplier_showcase.listings_by_company_id") {
    return [
      plan(
        input.operation,
        [
          "select id, title, user_id, company_id, city, price, kind, side, description, contacts_phone, contacts_whatsapp, contacts_email, items_json, uom, uom_code, rik_code, status, created_at",
          "from public.market_listings",
          "where company_id::text = $1",
          "and ($2::boolean is true or status = 'active')",
          "order by created_at desc, id desc",
          "limit $3",
        ].join(" "),
        [
          safeText(input.args.companyId),
          input.args.includeInactive === true,
          supplierShowcaseLimit(input.args.pageSize),
        ],
        ASSISTANT_STORE_READ_BFF_SUPPLIER_SHOWCASE_PAGE_DEFAULTS.maxRows,
      ),
    ];
  }

  if (input.operation === "request.submitted_at.capability") {
    return [
      plan(
        input.operation,
        [
          "select true as supported",
          "from public.requests",
          "where submitted_at is null or submitted_at is not null",
          "limit 1",
        ].join(" "),
        [],
        1,
      ),
    ];
  }

  if (input.operation === "store.request_items.list") {
    return [
      plan(
        input.operation,
        [
          "select id, request_id, name_human, qty, uom, status, created_at",
          "from public.request_items",
          "where request_id::text = $1",
          "and ($2::text is null or status = $2::text)",
          "order by created_at asc, id asc",
          "limit $3",
        ].join(" "),
        [safeText(input.args.requestId), input.args.status ?? null, referenceProbeLimit()],
      ),
    ];
  }

  if (input.operation === "store.director_inbox.list") {
    return [
      plan(
        input.operation,
        [
          "select *",
          "from public.request_items_pending_view",
          "order by created_at desc, request_item_id asc",
          "limit $1",
        ].join(" "),
        [referenceProbeLimit()],
      ),
    ];
  }

  return [
    plan(
      input.operation,
      [
        "select *",
        "from public.v_request_items_display",
        "where request_id::text = $1",
        "order by id asc",
        "limit $2",
      ].join(" "),
      [safeText(input.args.requestId), referenceProbeLimit()],
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
  queryPlan: AssistantStoreReadQueryPlan,
): Promise<AssistantStoreReadBffReadResultDto> => {
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

const runAssistantStoreRead = async (
  connectionString: string,
  input: AssistantStoreReadBffRequestDto,
): Promise<AssistantStoreReadBffReadResultDto> => {
  const plans = buildAssistantStoreReadQueryPlans(input);
  const client = new Client({
    application_name: "rik_staging_bff_assistant_store_readonly",
    connectionString,
    connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS,
    query_timeout: DEFAULT_QUERY_TIMEOUT_MS,
    statement_timeout: DEFAULT_QUERY_TIMEOUT_MS,
    ssl: resolvePgSsl(connectionString),
  });

  try {
    await client.connect();
    return await runPlanRows(client, plans[0]);
  } finally {
    await client.end().catch(() => undefined);
  }
};

export function createAssistantStoreReadBffReadonlyDbPort(
  env: AssistantStoreReadonlyDbEnv = process.env,
): AssistantStoreReadBffPort | undefined {
  const connectionString = env.BFF_DATABASE_READONLY_URL;
  if (typeof connectionString !== "string" || connectionString.trim().length === 0) return undefined;

  const dbUrl = connectionString.trim();
  return {
    runAssistantStoreRead: (input) => runAssistantStoreRead(dbUrl, input),
  };
}
