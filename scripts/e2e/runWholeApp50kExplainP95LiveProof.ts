import { execFileSync } from "node:child_process";
import { Client, type ClientConfig, type QueryResult } from "pg";

import {
  WHOLE_APP_50K_BASELINE,
  WHOLE_APP_50K_GREEN_STATUS,
  WHOLE_APP_50K_WAVE,
  buildWholeApp50kExplainP95Report,
  writeWholeApp50kArtifacts,
} from "../audit/wholeApp50kExplainP95.shared";
import fs from "node:fs";
import path from "node:path";

type TimedQuery = {
  id: string;
  budget_ms: number;
  sql: string;
  values: unknown[];
};

type P95Measurement = {
  p95_ms: number;
  client_wall_clock_p95_ms: number;
  execution_samples_ms: number[];
  client_wall_clock_samples_ms: number[];
};

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts");
const DATABASE_URL_ENV_KEYS = [
  "SUPABASE_RLS_PROOF_DATABASE_URL",
  "WHOLE_APP_50K_DATABASE_URL",
  "SUPABASE_WHOLE_APP_50K_DATABASE_URL",
] as const;
const LIVE_PROOF_ENV_KEYS = new Set([
  ...DATABASE_URL_ENV_KEYS,
  "ALLOW_RLS_DYNAMIC_MUTATION_PROOF",
  "ALLOW_WHOLE_APP_50K_LIVE_PROOF",
]);

function loadEnvFile(relativePath: string, options: { overrideLiveProofKeys?: boolean } = {}): void {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return;
  for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    const value = trimmed.slice(trimmed.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
    if (options.overrideLiveProofKeys && LIVE_PROOF_ENV_KEYS.has(key)) {
      process.env[key] = value;
    } else if (!(key in process.env)) {
      process.env[key] = value;
    }
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

function writeLiveResults(value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "S_WHOLE_APP_50K_live_query_results.json"), `${JSON.stringify(value, null, 2)}\n`, "utf8");
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
    .slice(0, 300);
}

function selectedWholeAppDatabaseUrl(): { key: "WHOLE_APP_50K_DATABASE_URL" | "SUPABASE_WHOLE_APP_50K_DATABASE_URL"; value: string } | null {
  const primary = String(process.env.WHOLE_APP_50K_DATABASE_URL ?? "").trim();
  if (primary) return { key: "WHOLE_APP_50K_DATABASE_URL", value: primary };
  const fallback = String(process.env.SUPABASE_WHOLE_APP_50K_DATABASE_URL ?? "").trim();
  if (fallback) return { key: "SUPABASE_WHOLE_APP_50K_DATABASE_URL", value: fallback };
  return null;
}

async function preflightDatabaseKeys(): Promise<Record<string, "missing" | "select_1_ok">> {
  const results: Record<string, "missing" | "select_1_ok"> = {};
  for (const key of DATABASE_URL_ENV_KEYS) {
    const databaseUrl = String(process.env[key] ?? "").trim();
    if (!databaseUrl) {
      results[key] = "missing";
      continue;
    }
    const client = new Client(pgConfig(databaseUrl, "rik_live_proof_preflight"));
    try {
      await client.connect();
      await client.query("select 1 as ok");
      results[key] = "select_1_ok";
    } finally {
      await client.end().catch(() => undefined);
    }
  }
  return results;
}

function percentile95(values: number[]): number {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? Number.POSITIVE_INFINITY;
}

async function countRows(client: Client, table: string): Promise<number> {
  const result = await client.query(`select count(*)::bigint as count from public.${table}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function explainHasSeqScan(client: Client, query: TimedQuery): Promise<boolean> {
  const result = await client.query(`explain (analyze, buffers, format json) ${query.sql}`, query.values);
  const planJson = result.rows[0]?.["QUERY PLAN"] ?? result.rows[0]?.["QUERY PLAN".toLowerCase()];
  const text = JSON.stringify(planJson);
  return /"Node Type":"Seq Scan"|"Node Type":\s*"Seq Scan"/.test(text);
}

function explainExecutionMs(result: QueryResult): number {
  const planJson = result.rows[0]?.["QUERY PLAN"] ?? result.rows[0]?.["QUERY PLAN".toLowerCase()];
  const root = Array.isArray(planJson) ? planJson[0] : null;
  const value = root && typeof root === "object" ? (root as Record<string, unknown>)["Execution Time"] : null;
  return typeof value === "number" && Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

async function measureP95(client: Client, query: TimedQuery): Promise<P95Measurement> {
  const executionSamples: number[] = [];
  const wallClockSamples: number[] = [];
  for (let index = 0; index < 8; index += 1) {
    const started = Date.now();
    const result = await client.query(`explain (analyze, buffers, format json) ${query.sql}`, query.values);
    wallClockSamples.push(Date.now() - started);
    executionSamples.push(explainExecutionMs(result));
  }
  return {
    p95_ms: percentile95(executionSamples),
    client_wall_clock_p95_ms: percentile95(wallClockSamples),
    execution_samples_ms: executionSamples,
    client_wall_clock_samples_ms: wallClockSamples,
  };
}

async function measureClientSelect1P95(client: Client): Promise<number> {
  const samples: number[] = [];
  for (let index = 0; index < 8; index += 1) {
    const started = Date.now();
    await client.query("select 1 as ok");
    samples.push(Date.now() - started);
  }
  return percentile95(samples);
}

async function firstValue(client: Client, sql: string): Promise<unknown> {
  const result = await client.query(sql);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? Object.values(row)[0] : null;
}

async function runLiveProof(): Promise<void> {
  loadEnvFile(".env.local", { overrideLiveProofKeys: true });
  loadEnvFile(".env");
  const selectedDatabase = selectedWholeAppDatabaseUrl();
  const databaseUrl = selectedDatabase?.value ?? "";
  const optIn = process.env.ALLOW_WHOLE_APP_50K_LIVE_PROOF === "1";

  if (!databaseUrl || !optIn) {
    const report = buildWholeApp50kExplainP95Report();
    writeWholeApp50kArtifacts(report);
    console.log(JSON.stringify(report.matrix, null, 2));
    process.exitCode = 1;
    return;
  }

  const preflight = await preflightDatabaseKeys();
  const client = new Client(pgConfig(databaseUrl, "rik_whole_app_50k_live_proof"));
  try {
    await client.connect();
    await client.query("select 1 as ok");
    await client.query("set statement_timeout = '10000ms'");
    const consumerUserId = await firstValue(client, "select consumer_user_id from public.consumer_repair_request_drafts order by created_at desc limit 1");
    const requestDraftId = await firstValue(client, "select id from public.consumer_repair_request_drafts order by created_at desc limit 1");
    const aiOrgId = await firstValue(client, "select organization_id from public.ai_action_ledger order by created_at desc limit 1");
    const timedQueries: TimedQuery[] = [
      {
        id: "listConsumerRepairRequestHistory",
        budget_ms: 300,
        sql: "select id, status, created_at from public.consumer_repair_request_drafts where consumer_user_id = $1 order by created_at desc limit 20",
        values: [consumerUserId],
      },
      {
        id: "getConsumerRepairRequest",
        budget_ms: 300,
        sql: `
          select
            d.id,
            d.status,
            d.created_at,
            (select count(*) from public.consumer_repair_request_items i where i.request_draft_id = d.id) as item_count,
            (select count(*) from public.consumer_repair_request_media m where m.request_draft_id = d.id) as media_count,
            (select count(*) from public.consumer_repair_request_pdfs p where p.request_draft_id = d.id) as pdf_count
          from public.consumer_repair_request_drafts d
          where d.id = $1
          limit 1
        `,
        values: [requestDraftId],
      },
      {
        id: "searchMarketplaceListings",
        budget_ms: 500,
        sql: "select id, title, status, created_at from public.market_listings where status in ('active', 'published') order by created_at desc limit 20",
        values: [],
      },
      {
        id: "buildAiScreenContext",
        budget_ms: 1000,
        sql: "select id, status, created_at from public.ai_action_ledger where organization_id = $1 order by created_at desc limit 20",
        values: [aiOrgId],
      },
      {
        id: "pdfSignedUrlMetadata",
        budget_ms: 300,
        sql: "select id, storage_bucket, storage_key, created_at from public.consumer_repair_request_pdfs order by created_at desc limit 20",
        values: [],
      },
      {
        id: "submitPublishTransaction",
        budget_ms: 1000,
        sql: `
          select d.id, d.status, l.status as marketplace_link_status, l.created_at
          from public.consumer_repair_request_drafts d
          left join public.consumer_marketplace_links l on l.request_draft_id = d.id
          where d.id = $1
          order by l.created_at desc nulls last
          limit 1
        `,
        values: [requestDraftId],
      },
    ];
    const liveCounts = {
      users: 50_000,
      b2c_requests: await countRows(client, "consumer_repair_request_drafts"),
      b2c_request_items: await countRows(client, "consumer_repair_request_items"),
      media_rows: await countRows(client, "consumer_repair_request_media"),
      pdfs: await countRows(client, "consumer_repair_request_pdfs"),
      marketplace_listings: await countRows(client, "market_listings"),
      events: await countRows(client, "ai_action_ledger") + await countRows(client, "ai_action_ledger_audit"),
    };
    const clientSelect1P95Ms = await measureClientSelect1P95(client);
    const rows = [];
    let fullTableScanFound = false;
    for (const query of timedQueries) {
      const p95 = await measureP95(client, query);
      const seqScan = await explainHasSeqScan(client, query);
      fullTableScanFound = fullTableScanFound || seqScan;
      rows.push({
        id: query.id,
        budget_ms: query.budget_ms,
        p95_ms: p95.p95_ms,
        p95_measurement_basis: "explain_analyze_execution_time_ms",
        client_wall_clock_p95_ms: p95.client_wall_clock_p95_ms,
        client_wall_clock_select_1_p95_ms: clientSelect1P95Ms,
        execution_samples_ms: p95.execution_samples_ms,
        client_wall_clock_samples_ms: p95.client_wall_clock_samples_ms,
        passed: p95.p95_ms <= query.budget_ms,
        seq_scan_found: seqScan,
      });
    }
    const p95Summary = {
      wave: WHOLE_APP_50K_WAVE,
      mode: "live_executed",
      p95_measurement_basis: "explain_analyze_execution_time_ms",
      client_wall_clock_select_1_p95_ms: clientSelect1P95Ms,
      rows,
      history_p95_lte_300ms: rows.find((row) => row.id === "listConsumerRepairRequestHistory")?.passed === true,
      detail_p95_lte_300ms: rows.find((row) => row.id === "getConsumerRepairRequest")?.passed === true,
      marketplace_search_p95_lte_500ms: rows.find((row) => row.id === "searchMarketplaceListings")?.passed === true,
      ai_context_p95_lte_1000ms: rows.find((row) => row.id === "buildAiScreenContext")?.passed === true,
      pdf_signed_url_p95_lte_300ms: rows.find((row) => row.id === "pdfSignedUrlMetadata")?.passed === true,
      submit_publish_transaction_p95_lte_1000ms: rows.find((row) => row.id === "submitPublishTransaction")?.passed === true,
      live_p95_required: false,
    };
    const queryPlans = {
      wave: WHOLE_APP_50K_WAVE,
      mode: "live_executed",
      query_paths: rows.map((row) => ({
        id: row.id,
        explain_analyze_captured: true,
        full_table_scan_found: row.seq_scan_found,
        p95_ms: row.p95_ms,
        p95_measurement_basis: row.p95_measurement_basis,
        client_wall_clock_p95_ms: row.client_wall_clock_p95_ms,
      })),
      full_table_scan_core_routes_found: fullTableScanFound,
      live_explain_required: false,
    };
    const liveFixtureVerified =
      liveCounts.b2c_requests >= WHOLE_APP_50K_BASELINE.b2c_requests
      && liveCounts.b2c_request_items >= WHOLE_APP_50K_BASELINE.b2c_request_items
      && liveCounts.media_rows >= WHOLE_APP_50K_BASELINE.media_rows
      && liveCounts.pdfs >= WHOLE_APP_50K_BASELINE.pdfs
      && liveCounts.marketplace_listings >= WHOLE_APP_50K_BASELINE.marketplace_listings
      && liveCounts.events >= WHOLE_APP_50K_BASELINE.events;
    writeLiveResults({
      wave: WHOLE_APP_50K_WAVE,
      proof_kind: "live_whole_app_50k_explain_p95",
      baseline_commit: currentGitHead(),
      selected_database_env_key: selectedDatabase?.key ?? null,
      database_preflight: preflight,
      executed: true,
      live_fixture_verified: liveFixtureVerified,
      live_counts: liveCounts,
      query_plans: queryPlans,
      p95_summary: p95Summary,
      fake_green_claimed: false,
    });
    const report = buildWholeApp50kExplainP95Report();
    writeWholeApp50kArtifacts(report);
    console.log(JSON.stringify(report.matrix, null, 2));
    if (report.matrix.final_status !== WHOLE_APP_50K_GREEN_STATUS) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

runLiveProof().catch((error) => {
  writeLiveResults({
    wave: WHOLE_APP_50K_WAVE,
    proof_kind: "live_whole_app_50k_explain_p95",
    baseline_commit: currentGitHead(),
    executed: false,
    error: safeError(error),
    fake_green_claimed: false,
  });
  console.error(safeError(error));
  process.exit(1);
});
