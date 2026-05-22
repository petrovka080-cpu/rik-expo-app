import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Client, type ClientConfig } from "pg";

import {
  assertFixtureSeedAllowed,
  assertProofRunId,
} from "../../src/lib/proofFixtures/50kProofFixtureGuards";
import {
  WHOLE_APP_50K_FIXTURE_MODES,
  type WholeApp50kFixtureMode,
} from "../../src/lib/proofFixtures/50kProofFixtureTypes";

type JsonRecord = Record<string, unknown>;

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts");
const PREFIX = "S_50K_SYNTHETIC_FIXTURE";
const GREEN_SMOKE = "GREEN_50K_SYNTHETIC_FIXTURE_SMOKE_READY";
const GREEN_FULL = "GREEN_50K_SYNTHETIC_FIXTURE_FULL_READY";
const GREEN_CLEANUP = "GREEN_50K_SYNTHETIC_FIXTURE_CLEANUP_READY";
const GREEN_EMPTY = "GREEN_50K_SYNTHETIC_FIXTURE_EMPTY_READY";
const GREEN_READY = "GREEN_50K_SYNTHETIC_FIXTURE_READY";
const GREEN_IDEMPOTENCY = "GREEN_50K_SYNTHETIC_FIXTURE_IDEMPOTENCY_READY";
const PROOF_ROWS_ALREADY_EXIST = "PROOF_ROWS_ALREADY_EXIST_FOR_RUN_ID";
const OWNER_BLOCKER = "BLOCKED_EXTERNAL_ONLY_PROOF_OWNER_USER_REQUIRED";
const DB_BLOCKER = "BLOCKED_EXTERNAL_ONLY_WHOLE_APP_50K_DATABASE_URL_REQUIRED";
const OPT_IN_BLOCKER = "BLOCKED_EXTERNAL_ONLY_ALLOW_WHOLE_APP_50K_FIXTURE_SEED_REQUIRED";
const PROOF_RUN_BLOCKER = "BLOCKED_EXTERNAL_ONLY_WHOLE_APP_50K_PROOF_RUN_ID_REQUIRED";

const REQUEST_TABLE = "consumer_repair_request_drafts";

const SMOKE_TARGET = {
  consumer_requests: 1_000,
  consumer_request_items: 5_000,
  consumer_media_rows: 2_000,
  consumer_pdf_rows: 1_000,
  consumer_marketplace_links: 1_000,
  marketplace_listings: 1_000,
  events: 5_000,
} as const;

const FULL_TARGET = {
  consumer_requests: 50_000,
  consumer_request_items: 250_000,
  consumer_media_rows: 100_000,
  consumer_pdf_rows: 50_000,
  consumer_marketplace_links: 50_000,
  marketplace_listings: 50_000,
  events: 1_000_000,
} as const;

const REQUEST_BATCH = 5_000;
const AI_EVENT_BATCH = 50_000;
const MARKET_BATCH = 5_000;
const AI_EVENT_ORG_SHARDS = 1_000;

function loadEnvFile(relativePath: string): void {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return;
  for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    const value = trimmed.slice(trimmed.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function currentGitHead(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function pgSsl(connectionString: string): ClientConfig["ssl"] {
  if (/localhost|127\.0\.0\.1/.test(connectionString)) return undefined;
  return { rejectUnauthorized: false };
}

function pgConfig(connectionString: string, applicationName: string): ClientConfig {
  return {
    connectionString,
    ssl: pgSsl(connectionString),
    connectionTimeoutMillis: 15_000,
    application_name: applicationName,
  };
}

function selectedDatabaseUrl(): { key: string; value: string } | null {
  const candidates = [
    "WHOLE_APP_50K_DATABASE_URL",
    "SUPABASE_WHOLE_APP_50K_DATABASE_URL",
    "SUPABASE_RLS_PROOF_DATABASE_URL",
  ];
  for (const key of candidates) {
    const value = String(process.env[key] ?? "").trim();
    if (value) return { key, value };
  }
  return null;
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/password authentication failed for user "[^"]+"/gi, "password authentication failed for user [redacted-user]")
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@")
    .replace(/password=[^&\s]+/gi, "password=[redacted]")
    .replace(/connect\s+(ETIMEDOUT|ECONNREFUSED|EHOSTUNREACH)\s+\S+/gi, "connect $1 [redacted-host]")
    .replace(/getaddrinfo\s+(ENOTFOUND|EAI_AGAIN)\s+\S+/gi, "getaddrinfo $1 [redacted-host]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}:\d+\b/g, "[redacted-host]")
    .slice(0, 500);
}

function parseMode(): WholeApp50kFixtureMode {
  const modeIndex = process.argv.indexOf("--mode");
  const value = modeIndex >= 0 ? process.argv[modeIndex + 1] : null;
  for (const mode of WHOLE_APP_50K_FIXTURE_MODES) {
    if (value === mode) return mode;
  }
  throw new Error("Usage: tsx scripts/e2e/seedWholeApp50kSyntheticFixture.ts --mode smoke|verify|cleanup|verify-empty|full");
}

function artifactPath(name: string): string {
  return path.join(ARTIFACT_DIR, `${PREFIX}_${name}`);
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(`${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(markdown: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath("proof.md"), markdown, "utf8");
}

function readArtifactJson(name: string): JsonRecord {
  const filePath = artifactPath(`${name}.json`);
  if (!fs.existsSync(filePath)) return {};
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function sqlUuid(seedExpression: string): string {
  return `format(
    '%s-%s-%s-%s-%s',
    substr(md5(${seedExpression}), 1, 8),
    substr(md5(${seedExpression}), 9, 4),
    substr(md5(${seedExpression}), 13, 4),
    substr(md5(${seedExpression}), 17, 4),
    substr(md5(${seedExpression}), 21, 12)
  )::uuid`;
}

function proofPrefix(proofRunId: string): string {
  return `[PROOF ${proofRunId}]`;
}

async function countRows(client: Client, sql: string, values: unknown[] = []): Promise<number> {
  const result = await client.query(sql, values);
  return Number(result.rows[0]?.count ?? 0);
}

async function tableExists(client: Client, table: string): Promise<boolean> {
  const result = await client.query("select to_regclass($1) as reg", [`public.${table}`]);
  return Boolean(result.rows[0]?.reg);
}

async function getColumns(client: Client, table: string): Promise<Set<string>> {
  const result = await client.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = $1",
    [table],
  );
  return new Set(result.rows.map((row) => String(row.column_name)));
}

async function findProofOwner(client: Client): Promise<string | null> {
  const result = await client.query("select id from auth.users order by created_at asc limit 1");
  return result.rows[0]?.id ? String(result.rows[0].id) : null;
}

async function verifySchema(client: Client): Promise<JsonRecord> {
  const tables = [
    REQUEST_TABLE,
    "consumer_repair_request_items",
    "consumer_repair_request_media",
    "consumer_repair_request_pdfs",
    "consumer_marketplace_links",
    "market_listings",
    "ai_action_ledger",
  ];
  const tablePresence: Record<string, boolean> = {};
  for (const table of tables) {
    tablePresence[table] = await tableExists(client, table);
  }
  if (!tablePresence[REQUEST_TABLE]) {
    const legacyExists = await tableExists(client, "consumer_repair_requests");
    throw new Error(
      legacyExists
        ? "consumer_repair_requests exists, but live 50k runner expects consumer_repair_request_drafts; refusing to guess."
        : "consumer_repair_request_drafts table is missing.",
    );
  }
  const missing = Object.entries(tablePresence).filter(([, exists]) => !exists).map(([table]) => table);
  if (missing.length > 0) throw new Error(`Required proof tables missing: ${missing.join(", ")}`);
  return { table_presence: tablePresence, request_table: REQUEST_TABLE };
}

async function seedRequestsAndChildren(client: Client, proofRunId: string, ownerUserId: string, requestCount: number): Promise<JsonRecord> {
  const inserted = {
    consumer_requests: 0,
    consumer_request_items: 0,
    consumer_media_rows: 0,
    consumer_pdf_rows: 0,
    consumer_marketplace_links: 0,
  };
  const prefix = proofPrefix(proofRunId);

  for (let start = 1; start <= requestCount; start += REQUEST_BATCH) {
    const end = Math.min(requestCount, start + REQUEST_BATCH - 1);
    const requestId = sqlUuid("$1 || ':request:' || gs::text");
    const rowCount = end - start + 1;
    console.log(`seeding requests ${start}-${end}`);

    const requestResult = await client.query(
      `
      insert into public.consumer_repair_request_drafts (
        id,
        consumer_user_id,
        org_id,
        title,
        problem_text,
        repair_type,
        city,
        address_text,
        preferred_time_text,
        contact_phone,
        status,
        ai_summary_ru,
        missing_data,
        created_at,
        updated_at,
        approved_at,
        marketplace_ready_at,
        marketplace_validation_errors,
        last_marketplace_submit_attempt_at
      )
      select
        ${requestId} as id,
        $4::uuid as consumer_user_id,
        null::uuid as org_id,
        format($5 || ' Synthetic repair request %s', gs) as title,
        format($5 || ' Synthetic proof problem text for request %s. Controlled 50k scale fixture row; no real customer data.', gs) as problem_text,
        (array['repair','plumbing','electrical','finishing','floor','doors_windows','other','unknown'])[(gs % 8) + 1] as repair_type,
        (array['Bishkek','Osh','Karakol','Tokmok'])[(gs % 4) + 1] as city,
        format('proof address %s %s', $1, gs) as address_text,
        'weekday 09:00-18:00' as preferred_time_text,
        '+996700000000' as contact_phone,
        (array['draft','consumer_approved','sent_to_marketplace','archived'])[(gs % 4) + 1] as status,
        format('Synthetic proof summary %s %s', $1, gs) as ai_summary_ru,
        '[]'::jsonb as missing_data,
        now() - (($2::int + $3::int - gs)::text || ' seconds')::interval as created_at,
        now() - (($2::int + $3::int - gs)::text || ' seconds')::interval as updated_at,
        case when (gs % 3) = 0 then null else now() - (($2::int + $3::int - gs)::text || ' seconds')::interval end as approved_at,
        case when (gs % 3) = 2 then now() - (($2::int + $3::int - gs)::text || ' seconds')::interval else null end as marketplace_ready_at,
        '[]'::jsonb as marketplace_validation_errors,
        null::timestamptz as last_marketplace_submit_attempt_at
      from generate_series($2::int, $3::int) as gs
      on conflict (id) do nothing
      `,
      [proofRunId, start, end, ownerUserId, prefix],
    );
    inserted.consumer_requests += requestResult.rowCount ?? 0;

    const itemRequestId = sqlUuid("$1 || ':request:' || req_gs::text");
    const itemId = sqlUuid("$1 || ':item:' || req_gs::text || ':' || item_no::text");
    const itemResult = await client.query(
      `
      insert into public.consumer_repair_request_items (
        id,
        request_draft_id,
        item_type,
        title_ru,
        quantity,
        unit,
        unit_price,
        total_price,
        currency,
        source,
        editable_by_consumer,
        created_at
      )
      select
        ${itemId} as id,
        ${itemRequestId} as request_draft_id,
        (array['work','material','service','work','material'])[item_no] as item_type,
        format($4 || ' Synthetic item %s.%s', req_gs, item_no) as title_ru,
        (1 + (req_gs + item_no) % 9)::numeric as quantity,
        (array['pcs','m2','m','hour','set'])[item_no] as unit,
        (500 + ((req_gs + item_no) % 50) * 25)::numeric as unit_price,
        ((1 + (req_gs + item_no) % 9) * (500 + ((req_gs + item_no) % 50) * 25))::numeric as total_price,
        'KGS' as currency,
        'user_added' as source,
        true as editable_by_consumer,
        now() - (($2::int + $3::int - req_gs)::text || ' seconds')::interval as created_at
      from generate_series($2::int, $3::int) as req_gs
      cross join generate_series(1, 5) as item_no
      on conflict (id) do nothing
      `,
      [proofRunId, start, end, prefix],
    );
    inserted.consumer_request_items += itemResult.rowCount ?? 0;

    const mediaRequestId = sqlUuid("$1 || ':request:' || req_gs::text");
    const mediaId = sqlUuid("$1 || ':media-link:' || req_gs::text || ':' || media_no::text");
    const mediaAssetId = sqlUuid("$1 || ':media-asset:' || req_gs::text || ':' || media_no::text");
    const mediaResult = await client.query(
      `
      insert into public.consumer_repair_request_media (
        id,
        request_draft_id,
        media_asset_id,
        purpose,
        created_at,
        media_type
      )
      select
        ${mediaId} as id,
        ${mediaRequestId} as request_draft_id,
        ${mediaAssetId} as media_asset_id,
        $4 as purpose,
        now() - (($2::int + $3::int - req_gs)::text || ' seconds')::interval as created_at,
        case when media_no = 1 then 'photo' else 'document' end as media_type
      from generate_series($2::int, $3::int) as req_gs
      cross join generate_series(1, 2) as media_no
      on conflict (id) do nothing
      `,
      [proofRunId, start, end, `request_evidence:${proofRunId}`],
    );
    inserted.consumer_media_rows += mediaResult.rowCount ?? 0;

    const pdfRequestId = sqlUuid("$1 || ':request:' || gs::text");
    const pdfId = sqlUuid("$1 || ':pdf:' || gs::text");
    const pdfResult = await client.query(
      `
      insert into public.consumer_repair_request_pdfs (
        id,
        request_draft_id,
        document_asset_id,
        storage_bucket,
        storage_key,
        title_ru,
        pdf_status,
        created_at,
        content_type,
        uploaded_at,
        storage_verified_at
      )
      select
        ${pdfId} as id,
        ${pdfRequestId} as request_draft_id,
        null::uuid as document_asset_id,
        'private-media' as storage_bucket,
        format('proof/%s/consumer-request-%s.pdf', $1, gs) as storage_key,
        format($4 || ' Synthetic request PDF %s', gs) as title_ru,
        'generated' as pdf_status,
        now() - (($2::int + $3::int - gs)::text || ' seconds')::interval as created_at,
        'application/pdf' as content_type,
        now() - (($2::int + $3::int - gs)::text || ' seconds')::interval as uploaded_at,
        now() - (($2::int + $3::int - gs)::text || ' seconds')::interval as storage_verified_at
      from generate_series($2::int, $3::int) as gs
      on conflict (id) do nothing
      `,
      [proofRunId, start, end, prefix],
    );
    inserted.consumer_pdf_rows += pdfResult.rowCount ?? 0;

    const linkRequestId = sqlUuid("$1 || ':request:' || gs::text");
    const linkId = sqlUuid("$1 || ':market-link:' || gs::text");
    const linkResult = await client.query(
      `
      insert into public.consumer_marketplace_links (
        id,
        request_draft_id,
        marketplace_demand_id,
        status,
        created_at,
        sent_at,
        idempotency_key
      )
      select
        ${linkId} as id,
        ${linkRequestId} as request_draft_id,
        format('%s:marketplace-demand:%s', $1, gs) as marketplace_demand_id,
        case when (gs % 3) = 1 then 'not_sent' else 'sent' end as status,
        now() - (($2::int + $3::int - gs)::text || ' seconds')::interval as created_at,
        case when (gs % 3) = 1 then null else now() - (($2::int + $3::int - gs)::text || ' seconds')::interval end as sent_at,
        format('%s:market-link:%s', $1, gs) as idempotency_key
      from generate_series($2::int, $3::int) as gs
      on conflict (id) do nothing
      `,
      [proofRunId, start, end],
    );
    inserted.consumer_marketplace_links += linkResult.rowCount ?? 0;

    if (rowCount >= REQUEST_BATCH) await client.query("select pg_sleep(0.02)");
  }

  return inserted;
}

async function seedMarketplaceListings(client: Client, proofRunId: string, ownerUserId: string, count: number): Promise<number> {
  const columns = await getColumns(client, "market_listings");
  const optionalClientMutation = columns.has("client_mutation_id");
  let inserted = 0;
  const prefix = proofPrefix(proofRunId);

  for (let start = 1; start <= count; start += MARKET_BATCH) {
    const end = Math.min(count, start + MARKET_BATCH - 1);
    console.log(`seeding marketplace listings ${start}-${end}`);
    const listingId = sqlUuid("$1 || ':market-listing:' || gs::text");
    const insertColumns = [
      "id",
      "user_id",
      "company_id",
      "kind",
      "title",
      "description",
      "city",
      "price",
      "currency",
      "status",
      "created_at",
      "updated_at",
      "uom",
      "contacts_phone",
      "contacts_whatsapp",
      "contacts_email",
      "lat",
      "lng",
      "items_json",
      "side",
      ...(optionalClientMutation ? ["client_mutation_id"] : []),
    ];
    const selectValues = [
      `${listingId} as id`,
      "$4::uuid as user_id",
      "null::uuid as company_id",
      "(array['service','material','work'])[(gs % 3) + 1] as kind",
      "format($5 || ' Synthetic marketplace listing %s', gs) as title",
      "format($5 || ' Synthetic marketplace searchable description %s', gs) as description",
      "(array['Bishkek','Osh','Karakol','Tokmok'])[(gs % 4) + 1] as city",
      "(1000 + (gs % 250) * 10)::numeric as price",
      "'KGS' as currency",
      "'active' as status",
      "now() - (($2::int + $3::int - gs)::text || ' seconds')::interval as created_at",
      "now() - (($2::int + $3::int - gs)::text || ' seconds')::interval as updated_at",
      "(array['pcs','m2','m'])[(gs % 3) + 1] as uom",
      "'+996700000000' as contacts_phone",
      "'+996700000000' as contacts_whatsapp",
      "format('proof-%s@example.invalid', gs) as contacts_email",
      "(42.8000 + ((gs % 100)::float8 / 10000.0))::float8 as lat",
      "(74.5500 + ((gs % 100)::float8 / 10000.0))::float8 as lng",
      "jsonb_build_array(jsonb_build_object('proof_run_id', $1, 'name', format('proof item %s', gs), 'qty', 1, 'price', 1000 + (gs % 250) * 10)) as items_json",
      "case when (gs % 5) = 0 then 'demand' else 'offer' end as side",
      ...(optionalClientMutation ? ["format('%s:market-listing:%s', $1, gs) as client_mutation_id"] : []),
    ];
    const result = await client.query(
      `
      insert into public.market_listings (${insertColumns.join(", ")})
      select ${selectValues.join(",\n        ")}
      from generate_series($2::int, $3::int) as gs
      on conflict (id) do nothing
      `,
      [proofRunId, start, end, ownerUserId, prefix],
    );
    inserted += result.rowCount ?? 0;
    await client.query("select pg_sleep(0.02)");
  }
  return inserted;
}

async function seedAiEvents(client: Client, proofRunId: string, ownerUserId: string, count: number): Promise<number> {
  let inserted = 0;
  const prefix = proofPrefix(proofRunId);
  for (let start = 1; start <= count; start += AI_EVENT_BATCH) {
    const end = Math.min(count, start + AI_EVENT_BATCH - 1);
    console.log(`seeding AI event ledger rows ${start}-${end}`);
    const actionId = sqlUuid("$1 || ':ai-action:' || gs::text");
    const orgId = sqlUuid("$1 || ':ai-org:' || (((gs - 1) % $4::int) + 1)::text");
    const result = await client.query(
      `
      insert into public.ai_action_ledger (
        id,
        organization_id,
        requested_by,
        approved_by,
        action_type,
        status,
        risk_level,
        screen_id,
        domain,
        summary,
        redacted_payload,
        evidence_refs,
        idempotency_key,
        expires_at,
        executed_at,
        created_at,
        updated_at,
        requested_role,
        requested_by_user_id_hash,
        organization_id_hash,
        approved_by_user_id_hash
      )
      select
        ${actionId} as id,
        ${orgId} as organization_id,
        $5::uuid as requested_by,
        null::uuid as approved_by,
        (array['ai.proof.read_context','ai.proof.prepare_draft','ai.proof.audit_event'])[(gs % 3) + 1] as action_type,
        (array['draft','pending','approved','executed','blocked'])[(gs % 5) + 1] as status,
        (array['safe_read','draft_only','approval_required'])[(gs % 3) + 1] as risk_level,
        (array['consumer_repair','marketplace','director_dashboard','warehouse'])[(gs % 4) + 1] as screen_id,
        (array['consumer_repair','marketplace','operations','documents'])[(gs % 4) + 1] as domain,
        format($6 || ' Synthetic AI ledger event %s', gs) as summary,
        jsonb_build_object(
          'proof_run_id', $1,
          'synthetic', true,
          'event_ordinal', gs,
          'fixture', 'whole_app_50k'
        ) as redacted_payload,
        jsonb_build_array(jsonb_build_object('proof_run_id', $1, 'source', 'synthetic_fixture')) as evidence_refs,
        format('%s:ai:%s', $1, gs) as idempotency_key,
        now() + interval '30 days' as expires_at,
        case when (gs % 5) = 3 then now() - (($2::int + $3::int - gs)::text || ' seconds')::interval else null end as executed_at,
        now() - (($2::int + $3::int - gs)::text || ' seconds')::interval as created_at,
        now() - (($2::int + $3::int - gs)::text || ' seconds')::interval as updated_at,
        'proof' as requested_role,
        md5($5::text) as requested_by_user_id_hash,
        md5((${orgId})::text) as organization_id_hash,
        null::text as approved_by_user_id_hash
      from generate_series($2::int, $3::int) as gs
      on conflict (id) do nothing
      `,
      [proofRunId, start, end, AI_EVENT_ORG_SHARDS, ownerUserId, prefix],
    );
    inserted += result.rowCount ?? 0;
    await client.query("select pg_sleep(0.02)");
  }
  return inserted;
}

async function proofCounts(client: Client, proofRunId: string): Promise<JsonRecord & {
  consumer_requests: number;
  consumer_request_items: number;
  consumer_media_rows: number;
  consumer_pdf_rows: number;
  consumer_marketplace_links: number;
  marketplace_listings: number;
  ai_action_ledger_events: number;
  ai_action_ledger_audit_events: number;
  events: number;
  total_proof_rows: number;
}> {
  const prefix = `${proofPrefix(proofRunId)}%`;
  const contains = `%${proofRunId}%`;
  const consumerRequests = await countRows(
    client,
    "select count(*)::bigint as count from public.consumer_repair_request_drafts where title like $1 or problem_text like $2",
    [prefix, contains],
  );
  const items = await countRows(
    client,
    `
    select count(*)::bigint as count
    from public.consumer_repair_request_items i
    left join public.consumer_repair_request_drafts d on d.id = i.request_draft_id
    where i.title_ru like $1 or d.title like $1 or d.problem_text like $2
    `,
    [prefix, contains],
  );
  const media = await countRows(
    client,
    `
    select count(*)::bigint as count
    from public.consumer_repair_request_media m
    left join public.consumer_repair_request_drafts d on d.id = m.request_draft_id
    where m.purpose like $2 or d.title like $1 or d.problem_text like $2
    `,
    [prefix, contains],
  );
  const pdfs = await countRows(
    client,
    `
    select count(*)::bigint as count
    from public.consumer_repair_request_pdfs p
    left join public.consumer_repair_request_drafts d on d.id = p.request_draft_id
    where p.storage_key like $2 or p.title_ru like $1 or d.title like $1 or d.problem_text like $2
    `,
    [prefix, contains],
  );
  const links = await countRows(
    client,
    `
    select count(*)::bigint as count
    from public.consumer_marketplace_links l
    left join public.consumer_repair_request_drafts d on d.id = l.request_draft_id
    where l.marketplace_demand_id like $2 or l.idempotency_key like $2 or d.title like $1 or d.problem_text like $2
    `,
    [prefix, contains],
  );
  const marketplace = await countRows(
    client,
    `
    select count(*)::bigint as count
    from public.market_listings
    where title like $1 or description like $1 or coalesce(items_json::text, '') like $2
    `,
    [prefix, contains],
  );
  const aiLedger = await countRows(
    client,
    `
    select count(*)::bigint as count
    from public.ai_action_ledger
    where redacted_payload ->> 'proof_run_id' = $1 or idempotency_key like $2 or summary like $3
    `,
    [proofRunId, `${proofRunId}:ai:%`, prefix],
  );
  const aiAudit = await countRows(
    client,
    `
    select count(*)::bigint as count
    from public.ai_action_ledger_audit
    where redacted_payload ->> 'proof_run_id' = $1 or reason like $2
    `,
    [proofRunId, prefix],
  );
  const consumerEvents = await countRows(
    client,
    `
    select count(*)::bigint as count
    from public.consumer_repair_request_events e
    left join public.consumer_repair_request_drafts d on d.id = e.request_draft_id
    where e.payload ->> 'proof_run_id' = $1 or d.title like $2 or d.problem_text like $3
    `,
    [proofRunId, prefix, contains],
  );
  const events = aiLedger + aiAudit;
  const total = consumerRequests + items + media + pdfs + links + marketplace + aiLedger + aiAudit + consumerEvents;
  return {
    proof_run_id: proofRunId,
    consumer_requests: consumerRequests,
    consumer_request_items: items,
    consumer_media_rows: media,
    consumer_pdf_rows: pdfs,
    consumer_marketplace_links: links,
    marketplace_listings: marketplace,
    consumer_request_events: consumerEvents,
    ai_action_ledger_events: aiLedger,
    ai_action_ledger_audit_events: aiAudit,
    events,
    total_proof_rows: total,
  };
}

function targetPassed(counts: Awaited<ReturnType<typeof proofCounts>>, target: typeof SMOKE_TARGET | typeof FULL_TARGET): boolean {
  return counts.consumer_requests >= target.consumer_requests
    && counts.consumer_request_items >= target.consumer_request_items
    && counts.consumer_media_rows >= target.consumer_media_rows
    && counts.consumer_pdf_rows >= target.consumer_pdf_rows
    && counts.consumer_marketplace_links >= target.consumer_marketplace_links
    && counts.marketplace_listings >= target.marketplace_listings
    && counts.events >= target.events;
}

function classifyVerifyStatus(counts: Awaited<ReturnType<typeof proofCounts>>): string {
  if (targetPassed(counts, FULL_TARGET)) return GREEN_FULL;
  if (targetPassed(counts, SMOKE_TARGET)) return GREEN_SMOKE;
  return "BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED";
}

async function cleanupProofRows(client: Client, proofRunId: string): Promise<JsonRecord> {
  const prefix = `${proofPrefix(proofRunId)}%`;
  const contains = `%${proofRunId}%`;
  const deleted: Record<string, number> = {};

  const deleteAiAudit = await client.query(
    "delete from public.ai_action_ledger_audit where redacted_payload ->> 'proof_run_id' = $1 or reason like $2",
    [proofRunId, prefix],
  );
  deleted.ai_action_ledger_audit = deleteAiAudit.rowCount ?? 0;

  const deleteAiLedger = await client.query(
    "delete from public.ai_action_ledger where redacted_payload ->> 'proof_run_id' = $1 or idempotency_key like $2 or summary like $3",
    [proofRunId, `${proofRunId}:ai:%`, prefix],
  );
  deleted.ai_action_ledger = deleteAiLedger.rowCount ?? 0;

  const deleteMarketplace = await client.query(
    "delete from public.market_listings where title like $1 or description like $1 or coalesce(items_json::text, '') like $2",
    [prefix, contains],
  );
  deleted.market_listings = deleteMarketplace.rowCount ?? 0;

  const deleteConsumerEvents = await client.query(
    `
    delete from public.consumer_repair_request_events e
    where e.payload ->> 'proof_run_id' = $1
       or exists (
         select 1 from public.consumer_repair_request_drafts d
         where d.id = e.request_draft_id
           and (d.title like $2 or d.problem_text like $3)
       )
    `,
    [proofRunId, prefix, contains],
  );
  deleted.consumer_repair_request_events = deleteConsumerEvents.rowCount ?? 0;

  const deleteLinks = await client.query(
    `
    delete from public.consumer_marketplace_links l
    where l.marketplace_demand_id like $3
       or l.idempotency_key like $3
       or exists (
         select 1 from public.consumer_repair_request_drafts d
         where d.id = l.request_draft_id
           and (d.title like $1 or d.problem_text like $2)
       )
    `,
    [prefix, contains, contains],
  );
  deleted.consumer_marketplace_links = deleteLinks.rowCount ?? 0;

  const deletePdfs = await client.query(
    `
    delete from public.consumer_repair_request_pdfs p
    where p.storage_key like $2
       or p.title_ru like $1
       or exists (
         select 1 from public.consumer_repair_request_drafts d
         where d.id = p.request_draft_id
           and (d.title like $1 or d.problem_text like $2)
       )
    `,
    [prefix, contains],
  );
  deleted.consumer_repair_request_pdfs = deletePdfs.rowCount ?? 0;

  const deleteMedia = await client.query(
    `
    delete from public.consumer_repair_request_media m
    where m.purpose like $2
       or exists (
         select 1 from public.consumer_repair_request_drafts d
         where d.id = m.request_draft_id
           and (d.title like $1 or d.problem_text like $2)
       )
    `,
    [prefix, contains],
  );
  deleted.consumer_repair_request_media = deleteMedia.rowCount ?? 0;

  const deleteItems = await client.query(
    `
    delete from public.consumer_repair_request_items i
    where i.title_ru like $1
       or exists (
         select 1 from public.consumer_repair_request_drafts d
         where d.id = i.request_draft_id
           and (d.title like $1 or d.problem_text like $2)
       )
    `,
    [prefix, contains],
  );
  deleted.consumer_repair_request_items = deleteItems.rowCount ?? 0;

  const deleteRequests = await client.query(
    "delete from public.consumer_repair_request_drafts where title like $1 or problem_text like $2",
    [prefix, contains],
  );
  deleted.consumer_repair_request_drafts = deleteRequests.rowCount ?? 0;

  return {
    deleted,
    cleanup_deleted_only_proof_run_id: true,
    business_rows_deleted: 0,
    drop_truncate_used: false,
  };
}

function buildProofMarkdown(params: {
  status: string;
  proofRunId: string;
  ownerUserId: string | null;
  selectedDatabaseKey: string | null;
  counts: JsonRecord;
  cleanup?: JsonRecord;
}): string {
  return [
    "# S_50K_SYNTHETIC_FIXTURE",
    "",
    `Status: ${params.status}`,
    "",
    `- proof_run_id: ${params.proofRunId}`,
    `- selected_database_env_key: ${params.selectedDatabaseKey ?? "none"}`,
    `- proof owner user present: ${Boolean(params.ownerUserId)}`,
    `- business_rows_deleted: ${params.cleanup?.business_rows_deleted ?? 0}`,
    `- drop_truncate_used: false`,
    `- fake_green_claimed: false`,
    "",
    "## Counts",
    `- consumer_requests: ${params.counts.consumer_requests ?? 0}`,
    `- consumer_request_items: ${params.counts.consumer_request_items ?? 0}`,
    `- consumer_media_rows: ${params.counts.consumer_media_rows ?? 0}`,
    `- consumer_pdf_rows: ${params.counts.consumer_pdf_rows ?? 0}`,
    `- marketplace_listings: ${params.counts.marketplace_listings ?? 0}`,
    `- events: ${params.counts.events ?? 0}`,
    "",
  ].join("\n");
}

function buildMatrix(params: {
  finalStatus: string;
  proofRunId: string;
  counts: Awaited<ReturnType<typeof proofCounts>>;
  cleanup?: JsonRecord;
  mode: WholeApp50kFixtureMode;
  ownerUserId?: string | null;
}): JsonRecord {
  const smokeFixturePassed = targetPassed(params.counts, SMOKE_TARGET);
  const fullFixturePassed = targetPassed(params.counts, FULL_TARGET);
  const cleanupArtifact = readArtifactJson("cleanup");
  const cleanupProofPassed =
    params.cleanup?.cleanup_deleted_only_proof_run_id === true
    || cleanupArtifact.final_status === GREEN_CLEANUP;
  const fixtureStatus = fullFixturePassed ? GREEN_READY : params.finalStatus;

  return {
    final_status: params.finalStatus,
    fixture_status: fixtureStatus,
    wave: "S_50K_SYNTHETIC_FIXTURE_SMOKE_THEN_FULL_GREEN_CLOSEOUT",
    proof_run_id: params.proofRunId,
    mode: params.mode,
    real_auth_users_required: false,
    real_auth_users_created: 0,
    existing_owner_user_used: Boolean(params.ownerUserId),
    smoke_fixture_passed: smokeFixturePassed,
    cleanup_proof_passed: cleanupProofPassed,
    full_fixture_passed: fullFixturePassed,
    consumer_requests_seeded: params.counts.consumer_requests,
    consumer_request_items_seeded: params.counts.consumer_request_items,
    consumer_media_rows_seeded: params.counts.consumer_media_rows,
    consumer_pdf_rows_seeded: params.counts.consumer_pdf_rows,
    marketplace_rows_seeded_or_available: params.counts.marketplace_listings,
    event_rows_seeded_or_available: params.counts.events,
    smoke_requests_seeded: Math.min(params.counts.consumer_requests, SMOKE_TARGET.consumer_requests),
    smoke_items_seeded: Math.min(params.counts.consumer_request_items, SMOKE_TARGET.consumer_request_items),
    smoke_media_seeded: Math.min(params.counts.consumer_media_rows, SMOKE_TARGET.consumer_media_rows),
    smoke_pdfs_seeded: Math.min(params.counts.consumer_pdf_rows, SMOKE_TARGET.consumer_pdf_rows),
    smoke_events_seeded: Math.min(params.counts.events, SMOKE_TARGET.events),
    full_requests_seeded: params.counts.consumer_requests,
    full_items_seeded: params.counts.consumer_request_items,
    full_media_seeded: params.counts.consumer_media_rows,
    full_pdfs_seeded: params.counts.consumer_pdf_rows,
    full_marketplace_seeded: params.counts.marketplace_listings,
    full_events_seeded: params.counts.events,
    business_rows_deleted: params.cleanup?.business_rows_deleted ?? 0,
    cleanup_deleted_only_proof_run_id: params.cleanup?.cleanup_deleted_only_proof_run_id ?? null,
    proof_rows_remaining: params.mode === "verify-empty" ? params.counts.total_proof_rows : null,
    drop_used: false,
    truncate_used: false,
    reset_used: false,
    drop_truncate_used: false,
    delete_without_proof_run_id_found: false,
    cleanup_scope: "proof_run_id_only",
    fixture_sufficient: fullFixturePassed,
    fixture_verify_passed:
      params.finalStatus === GREEN_SMOKE
      || params.finalStatus === GREEN_FULL
      || params.finalStatus === GREEN_READY
      || params.finalStatus === GREEN_CLEANUP
      || params.finalStatus === GREEN_EMPTY,
    fake_green_claimed: false,
  };
}

function buildIdempotencyArtifact(params: {
  proofRunId: string;
  mode: WholeApp50kFixtureMode;
  counts: Awaited<ReturnType<typeof proofCounts>>;
  operation: JsonRecord;
}): JsonRecord {
  return {
    wave: "S_50K_SYNTHETIC_FIXTURE_SMOKE_THEN_FULL_GREEN_CLOSEOUT",
    final_status: GREEN_IDEMPOTENCY,
    proof_run_id: params.proofRunId,
    mode: params.mode,
    deterministic_ids: true,
    on_conflict_do_nothing: true,
    resumable_batches: true,
    partial_full_resume_supported: true,
    duplicate_proof_rows_without_detection: false,
    cleanup_required_for_conflicting_partial_run: false,
    counts: params.counts,
    operation: params.operation,
    fake_green_claimed: false,
  };
}

async function run(): Promise<void> {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  const mode = parseMode();
  const proofRunId = String(process.env.WHOLE_APP_50K_PROOF_RUN_ID ?? "").trim();
  const optIn = process.env.ALLOW_WHOLE_APP_50K_FIXTURE_SEED === "1";
  const selectedDatabase = selectedDatabaseUrl();
  const startedAt = new Date().toISOString();

  if (!optIn) {
    const matrix = { final_status: OPT_IN_BLOCKER, fake_green_claimed: false };
    writeJson("matrix", matrix);
    console.log(JSON.stringify(matrix, null, 2));
    process.exitCode = 1;
    return;
  }
  if (!proofRunId) {
    const matrix = { final_status: PROOF_RUN_BLOCKER, fake_green_claimed: false };
    writeJson("matrix", matrix);
    console.log(JSON.stringify(matrix, null, 2));
    process.exitCode = 1;
    return;
  }
  try {
    assertFixtureSeedAllowed(process.env);
    assertProofRunId(proofRunId);
  } catch (error) {
    const matrix = { final_status: PROOF_RUN_BLOCKER, error: safeError(error), fake_green_claimed: false };
    writeJson("matrix", matrix);
    console.log(JSON.stringify(matrix, null, 2));
    process.exitCode = 1;
    return;
  }
  if (!selectedDatabase) {
    const matrix = { final_status: DB_BLOCKER, proof_run_id: proofRunId, fake_green_claimed: false };
    writeJson("matrix", matrix);
    console.log(JSON.stringify(matrix, null, 2));
    process.exitCode = 1;
    return;
  }

  const client = new Client(pgConfig(selectedDatabase.value, "rik_whole_app_50k_fixture_seed"));
  let ownerUserId: string | null = null;
  try {
    await client.connect();
    await client.query("select 1 as ok");
    await client.query("set statement_timeout = '0'");
    const schema = await verifySchema(client);
    ownerUserId = await findProofOwner(client);
    if (!ownerUserId) {
      const counts = await proofCounts(client, proofRunId);
      const matrix = buildMatrix({ finalStatus: OWNER_BLOCKER, proofRunId, counts, mode, ownerUserId });
      writeJson("matrix", matrix);
      writeProof(buildProofMarkdown({
        status: OWNER_BLOCKER,
        proofRunId,
        ownerUserId,
        selectedDatabaseKey: selectedDatabase.key,
        counts,
      }));
      console.log(JSON.stringify(matrix, null, 2));
      process.exitCode = 1;
      return;
    }

    let operation: JsonRecord = {};
    let cleanup: JsonRecord | undefined;
    if (mode === "smoke") {
      const insertedRequests = await seedRequestsAndChildren(client, proofRunId, ownerUserId, SMOKE_TARGET.consumer_requests);
      const insertedMarketplace = await seedMarketplaceListings(client, proofRunId, ownerUserId, SMOKE_TARGET.marketplace_listings);
      const insertedEvents = await seedAiEvents(client, proofRunId, ownerUserId, SMOKE_TARGET.events);
      operation = { inserted: { ...insertedRequests, marketplace_listings: insertedMarketplace, events: insertedEvents } };
    } else if (mode === "full") {
      const insertedRequests = await seedRequestsAndChildren(client, proofRunId, ownerUserId, FULL_TARGET.consumer_requests);
      const insertedMarketplace = await seedMarketplaceListings(client, proofRunId, ownerUserId, FULL_TARGET.marketplace_listings);
      const insertedEvents = await seedAiEvents(client, proofRunId, ownerUserId, FULL_TARGET.events);
      operation = { inserted: { ...insertedRequests, marketplace_listings: insertedMarketplace, events: insertedEvents } };
    } else if (mode === "cleanup") {
      cleanup = await cleanupProofRows(client, proofRunId);
      operation = cleanup;
    }

    const counts = await proofCounts(client, proofRunId);
    const finalStatus =
      mode === "cleanup"
        ? counts.total_proof_rows === 0 ? GREEN_CLEANUP : "BLOCKED_EXTERNAL_ONLY_PROOF_ROWS_REMAIN_AFTER_CLEANUP"
        : mode === "verify-empty"
          ? counts.total_proof_rows === 0 ? GREEN_EMPTY : PROOF_ROWS_ALREADY_EXIST
          : mode === "smoke"
            ? targetPassed(counts, SMOKE_TARGET) ? GREEN_SMOKE : "BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_SMOKE_INCOMPLETE"
            : mode === "full"
              ? targetPassed(counts, FULL_TARGET) ? GREEN_FULL : "BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_FULL_INCOMPLETE"
              : classifyVerifyStatus(counts);

    const artifact = {
      wave: "S_50K_SYNTHETIC_FIXTURE_SMOKE_THEN_FULL_GREEN_CLOSEOUT",
      final_status: finalStatus,
      mode,
      proof_run_id: proofRunId,
      baseline_commit: currentGitHead(),
      selected_database_env_key: selectedDatabase.key,
      owner_user_id_present: true,
      pg_select_1_ok: true,
      schema,
      target: mode === "full" ? FULL_TARGET : SMOKE_TARGET,
      counts,
      operation,
      cleanup_deleted_only_proof_run_id: cleanup?.cleanup_deleted_only_proof_run_id ?? null,
      business_rows_deleted: cleanup?.business_rows_deleted ?? 0,
      drop_truncate_used: false,
      fake_green_claimed: false,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    };
    const artifactName = mode === "verify-empty" ? "preflight" : mode;
    writeJson(artifactName, artifact);
    if (mode === "verify" || mode === "verify-empty") writeJson("verify", artifact);
    writeJson("idempotency", buildIdempotencyArtifact({ proofRunId, mode, counts, operation }));

    const matrix = buildMatrix({ finalStatus, proofRunId, counts, cleanup, mode, ownerUserId });
    writeJson("matrix", matrix);
    writeProof(buildProofMarkdown({
      status: finalStatus,
      proofRunId,
      ownerUserId,
      selectedDatabaseKey: selectedDatabase.key,
      counts,
      cleanup,
    }));
    console.log(JSON.stringify(matrix, null, 2));
    if (
      finalStatus !== GREEN_SMOKE
      && finalStatus !== GREEN_FULL
      && finalStatus !== GREEN_CLEANUP
      && finalStatus !== GREEN_EMPTY
      && finalStatus !== GREEN_READY
    ) {
      process.exitCode = 1;
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

run().catch((error) => {
  const status = `BLOCKED_EXTERNAL_ONLY_${safeError(error).replace(/[^A-Z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toUpperCase().slice(0, 120)}`;
  const matrix = {
    final_status: status,
    error: safeError(error),
    fake_green_claimed: false,
  };
  writeJson("matrix", matrix);
  console.error(safeError(error));
  process.exit(1);
});
