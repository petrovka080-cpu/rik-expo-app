import { randomUUID } from "node:crypto";
import { Client, type ClientConfig } from "pg";

import {
  RLS_ACTORS,
  RLS_DYNAMIC_WAVE,
  buildRlsDynamicCrossTenantReport,
  writeRlsDynamicArtifacts,
  writeRlsJson,
} from "./rlsDynamicCrossTenant.shared";

type AttemptResult = {
  name: string;
  actor: string;
  target: string;
  relation: string;
  operation: "select" | "update" | "delete";
  expected: "blocked" | "allowed_safe_fields_only";
  blocked: boolean;
  detail: string;
};

const REQUIRED_ENV = ["SUPABASE_RLS_PROOF_DATABASE_URL", "ALLOW_RLS_DYNAMIC_MUTATION_PROOF"] as const;
const DATABASE_URL_ENV_KEYS = [
  "SUPABASE_RLS_PROOF_DATABASE_URL",
  "WHOLE_APP_50K_DATABASE_URL",
  "SUPABASE_WHOLE_APP_50K_DATABASE_URL",
] as const;
const LIVE_PROOF_ENV_KEYS = new Set([
  ...REQUIRED_ENV,
  ...DATABASE_URL_ENV_KEYS,
  "ALLOW_WHOLE_APP_50K_LIVE_PROOF",
]);

function loadEnvFile(relativePath: string, options: { overrideLiveProofKeys?: boolean } = {}): void {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const fullPath = path.join(process.cwd(), relativePath);
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
    const { execFileSync } = require("node:child_process") as typeof import("node:child_process");
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
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

function writeTypedParamsArtifacts(reachedPolicyAssertions: boolean): void {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const artifactDir = path.join(process.cwd(), "artifacts");
  const matrix = {
    final_status: "GREEN_RLS_RUNNER_TYPED_PARAMS_READY",
    requests_created_by_type: "uuid",
    requests_submitted_by_type: "uuid",
    requests_requested_by_type: "text",
    mixed_placeholder_bug_fixed: true,
    same_placeholder_used_for_uuid_and_text: false,
    rls_live_runner_reached_policy_assertions: reachedPolicyAssertions,
    fake_green_claimed: false,
  };
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, "S_RLS_RUNNER_TYPED_PARAMS_matrix.json"),
    `${JSON.stringify(matrix, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactDir, "S_RLS_RUNNER_TYPED_PARAMS_proof.md"),
    [
      "# S_RLS_RUNNER_TYPED_PARAMS",
      "",
      `Status: ${matrix.final_status}`,
      "",
      `- requests.created_by type: ${matrix.requests_created_by_type}`,
      `- requests.submitted_by type: ${matrix.requests_submitted_by_type}`,
      `- requests.requested_by type: ${matrix.requests_requested_by_type}`,
      `- Mixed placeholder bug fixed: ${matrix.mixed_placeholder_bug_fixed}`,
      `- Same placeholder used for uuid and text: ${matrix.same_placeholder_used_for_uuid_and_text}`,
      `- RLS live runner reached policy assertions: ${matrix.rls_live_runner_reached_policy_assertions}`,
      `- Fake green claimed: ${matrix.fake_green_claimed}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

function connectionTerminatedBeforeSql(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const phaseStarted = typeof error === "object" && error !== null
    ? Boolean((error as { mutationPhaseStarted?: unknown }).mutationPhaseStarted)
    : false;
  return !phaseStarted && /terminated|ECONN|timeout|timedout|EHOST|ENOTFOUND|EAI_AGAIN/i.test(message);
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

async function asRole(client: Client, role: "authenticated" | "anon", userId: string | null, fn: () => Promise<AttemptResult>): Promise<AttemptResult> {
  await client.query(`set local role ${role}`);
  const claims = userId ? { sub: userId, role } : { role };
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
  await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
  try {
    return await fn();
  } finally {
    await client.query("reset role");
  }
}

async function blockedByZeroOrError(
  fn: () => Promise<number>,
  name: string,
  meta: Pick<AttemptResult, "actor" | "target" | "relation" | "expected">,
  operation: AttemptResult["operation"],
): Promise<AttemptResult> {
  try {
    const count = await fn();
    return {
      name,
      ...meta,
      operation,
      blocked: count === 0,
      detail: count === 0 ? "zero_rows_visible_or_mutated" : `unexpected_rows_${count}`,
    };
  } catch (error) {
    return {
      name,
      ...meta,
      operation,
      blocked: true,
      detail: `blocked_by_error:${safeError(error)}`,
    };
  }
}

async function firstValue(client: Client, sql: string): Promise<unknown> {
  const result = await client.query(sql);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? Object.values(row)[0] : null;
}

async function executeDynamicProof(databaseUrl: string): Promise<{
  attempts: AttemptResult[];
  crossTenantReadBlocked: boolean;
  crossTenantWriteBlocked: boolean;
  crossTenantDeleteBlocked: boolean;
  consumerOfficeLeakFound: boolean;
  privatePdfLeakFound: boolean;
  marketplaceDraftLeakFound: boolean;
  publishedSafeVisible: boolean;
}> {
  const client = new Client(pgConfig(databaseUrl, "rik_rls_dynamic_live_proof"));
  let mutationPhaseStarted = false;
  const consumerA = randomUUID();
  const consumerB = randomUUID();
  const officeUserB = randomUUID();
  const companyA = randomUUID();
  const companyB = randomUUID();
  const draftA = randomUUID();
  const draftB = randomUUID();
  const pdfB = randomUUID();
  const officeRequestB = randomUUID();
  const companyRequestB = randomUUID();
  const draftListing = randomUUID();
  const publishedListing = randomUUID();
  const attempts: AttemptResult[] = [];

  try {
    await client.connect();
    await client.query("select 1 as ok");
    await client.query("begin");
    mutationPhaseStarted = true;
    await client.query("set local statement_timeout = '5000ms'");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [""]);
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: "service_role" })]);
    await client.query(
      `insert into public.consumer_repair_request_drafts
        (id, consumer_user_id, title, problem_text, repair_type, status)
       values
        ($1, $2, 'RLS proof A', 'proof', 'unknown', 'draft'),
        ($3, $4, 'RLS proof B', 'proof', 'unknown', 'draft')`,
      [draftA, consumerA, draftB, consumerB],
    );
    await client.query(
      `insert into public.consumer_repair_request_pdfs
        (id, request_draft_id, storage_bucket, storage_key, title_ru, pdf_status)
       values ($1, $2, 'private-media', $3, 'RLS proof PDF', 'generated')`,
      [pdfB, draftB, `rls-proof/${pdfB}.pdf`],
    );
    await client.query(
      `insert into public.requests (id, created_by, submitted_by, requested_by, name, status)
       values ($1::uuid, $2::uuid, $3::uuid, $4::text, 'RLS proof office request', 'pending')`,
      [officeRequestB, officeUserB, officeUserB, officeUserB],
    );
    const companyUsers = await client.query("select id from auth.users order by created_at desc limit 2");
    if (companyUsers.rows.length < 2) {
      throw new Error("RLS live proof requires at least two auth.users rows for rollback-only company membership FK seed");
    }
    const companyAUser = String(companyUsers.rows[0]?.id ?? "");
    const companyBUser = String(companyUsers.rows[1]?.id ?? "");
    await client.query(
      `insert into public.companies (id, owner_user_id, name)
       values
        ($1::uuid, $2::uuid, 'RLS proof company A'),
        ($3::uuid, $4::uuid, 'RLS proof company B')`,
      [companyA, companyAUser, companyB, companyBUser],
    );
    await client.query(
      `insert into public.company_members (company_id, user_id, role)
       values
        ($1::uuid, $2::uuid, 'director'),
        ($3::uuid, $4::uuid, 'director')`,
      [companyA, companyAUser, companyB, companyBUser],
    );
    await client.query(
      `insert into public.requests (id, created_by, submitted_by, requested_by, name, status)
       values ($1::uuid, $2::uuid, $3::uuid, $4::text, 'RLS proof company B request', 'pending')`,
      [companyRequestB, companyBUser, companyBUser, companyBUser],
    );
    const marketplaceOwnerUserId = await firstValue(client, "select id from auth.users order by created_at desc limit 1");
    if (!marketplaceOwnerUserId) {
      throw new Error("RLS live proof requires at least one auth.users row for rollback-only market_listings FK seed");
    }
    await client.query(
      `insert into public.market_listings
        (id, user_id, company_id, title, kind, side, status, description, lat, lng)
       values
        ($1, $2, null, 'RLS proof draft listing', 'material', 'offer', 'draft', 'private draft', 42.8746, 74.5698),
        ($3, $2, null, 'RLS proof public listing', 'material', 'offer', 'active', 'public listing', 42.8746, 74.5698)`,
      [draftListing, marketplaceOwnerUserId, publishedListing],
    );

    attempts.push(await asRole(client, "authenticated", consumerA, () =>
      blockedByZeroOrError(async () => {
        const result = await client.query("select count(*)::int as count from public.consumer_repair_request_drafts where id = $1", [draftB]);
        return Number(result.rows[0]?.count ?? 0);
      }, "consumer_a_cannot_read_consumer_b", {
        actor: "consumer_a",
        target: "consumer_b",
        relation: "consumer_repair_request_drafts",
        expected: "blocked",
      }, "select")));
    attempts.push(await asRole(client, "authenticated", consumerA, () =>
      blockedByZeroOrError(async () => {
        const result = await client.query("update public.consumer_repair_request_drafts set title = title where id = $1", [draftB]);
        return result.rowCount ?? 0;
      }, "consumer_a_cannot_update_consumer_b", {
        actor: "consumer_a",
        target: "consumer_b",
        relation: "consumer_repair_request_drafts",
        expected: "blocked",
      }, "update")));
    attempts.push(await asRole(client, "authenticated", consumerA, () =>
      blockedByZeroOrError(async () => {
        const result = await client.query("select count(*)::int as count from public.consumer_repair_request_pdfs where id = $1", [pdfB]);
        return Number(result.rows[0]?.count ?? 0);
      }, "wrong_user_pdf_blocked", {
        actor: "consumer_a",
        target: "consumer_b",
        relation: "consumer_repair_request_pdfs",
        expected: "blocked",
      }, "select")));
    attempts.push(await asRole(client, "authenticated", consumerA, () =>
      blockedByZeroOrError(async () => {
        const result = await client.query("delete from public.consumer_repair_request_pdfs where id = $1", [pdfB]);
        return result.rowCount ?? 0;
      }, "wrong_user_pdf_delete_blocked", {
        actor: "consumer_a",
        target: "consumer_b",
        relation: "consumer_repair_request_pdfs",
        expected: "blocked",
      }, "delete")));
    attempts.push(await asRole(client, "authenticated", consumerA, () =>
      blockedByZeroOrError(async () => {
        const result = await client.query("select count(*)::int as count from public.requests where id = $1", [officeRequestB]);
        return Number(result.rows[0]?.count ?? 0);
      }, "consumer_cannot_read_office", {
        actor: "consumer_a",
        target: "office",
        relation: "requests",
        expected: "blocked",
      }, "select")));
    attempts.push(await asRole(client, "authenticated", companyAUser, () =>
      blockedByZeroOrError(async () => {
        const result = await client.query("select count(*)::int as count from public.requests where id = $1", [companyRequestB]);
        return Number(result.rows[0]?.count ?? 0);
      }, "company_a_cannot_read_company_b_request", {
        actor: "company_a_director",
        target: "company_b_director",
        relation: "requests",
        expected: "blocked",
      }, "select")));
    attempts.push(await asRole(client, "authenticated", companyAUser, () =>
      blockedByZeroOrError(async () => {
        const result = await client.query("update public.requests set name = name where id = $1", [companyRequestB]);
        return result.rowCount ?? 0;
      }, "company_a_cannot_update_company_b_request", {
        actor: "company_a_director",
        target: "company_b_director",
        relation: "requests",
        expected: "blocked",
      }, "update")));
    attempts.push(await asRole(client, "anon", null, () =>
      blockedByZeroOrError(async () => {
        const result = await client.query("select count(*)::int as count from public.market_listings where id = $1", [draftListing]);
        return Number(result.rows[0]?.count ?? 0);
      }, "anonymous_cannot_read_draft_marketplace_listing", {
        actor: "anonymous_public",
        target: "marketplace_owner",
        relation: "market_listings:draft",
        expected: "blocked",
      }, "select")));
    const publicListingAttempt = await asRole(client, "anon", null, async () => {
      const result = await client.query("select count(*)::int as count from public.market_listings where id = $1", [publishedListing]);
      const count = Number(result.rows[0]?.count ?? 0);
      return {
        name: "anonymous_can_read_published_marketplace_listing",
        actor: "anonymous_public",
        target: "marketplace",
        relation: "market_listings:published_safe",
        operation: "select",
        expected: "allowed_safe_fields_only",
        blocked: count !== 1,
        detail: count === 1 ? "published_row_visible" : `unexpected_rows_${count}`,
      };
    });
    attempts.push(publicListingAttempt);
  } catch (error) {
    if (typeof error === "object" && error !== null) {
      (error as { mutationPhaseStarted?: boolean }).mutationPhaseStarted = mutationPhaseStarted;
    }
    throw error;
  } finally {
    try {
      if (mutationPhaseStarted) await client.query("rollback");
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  const crossTenantReadBlocked = attempts
    .filter((attempt) => attempt.operation === "select" && attempt.name !== "anonymous_can_read_published_marketplace_listing")
    .every((attempt) => attempt.blocked);
  const crossTenantWriteBlocked = attempts
    .filter((attempt) => attempt.operation === "update")
    .every((attempt) => attempt.blocked);
  const crossTenantDeleteBlocked = attempts
    .filter((attempt) => attempt.operation === "delete")
    .every((attempt) => attempt.blocked);
  const consumerOfficeLeakFound = attempts.find((attempt) => attempt.name === "consumer_cannot_read_office")?.blocked !== true;
  const privatePdfLeakFound = attempts.find((attempt) => attempt.name === "wrong_user_pdf_blocked")?.blocked !== true;
  const marketplaceDraftLeakFound = attempts.find((attempt) => attempt.name === "anonymous_cannot_read_draft_marketplace_listing")?.blocked !== true;
  const publishedSafeVisible = attempts.find((attempt) => attempt.name === "anonymous_can_read_published_marketplace_listing")?.blocked === false;

  return {
    attempts,
    crossTenantReadBlocked,
    crossTenantWriteBlocked,
    crossTenantDeleteBlocked,
    consumerOfficeLeakFound,
    privatePdfLeakFound,
    marketplaceDraftLeakFound,
    publishedSafeVisible,
  };
}

async function runLiveProof(): Promise<void> {
  loadEnvFile(".env.local", { overrideLiveProofKeys: true });
  loadEnvFile(".env");

  const databaseUrl = String(process.env.SUPABASE_RLS_PROOF_DATABASE_URL ?? "").trim();
  const mutationOptIn = process.env.ALLOW_RLS_DYNAMIC_MUTATION_PROOF === "1";
  if (!databaseUrl || !mutationOptIn) {
    const report = buildRlsDynamicCrossTenantReport();
    writeRlsDynamicArtifacts(report);
    console.log(JSON.stringify(report.matrix, null, 2));
    process.exitCode = 1;
    return;
  }

  const preflight = await preflightDatabaseKeys();
  let result: Awaited<ReturnType<typeof executeDynamicProof>> | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      result = await executeDynamicProof(databaseUrl);
      break;
    } catch (error) {
      if (attempt === 1 && connectionTerminatedBeforeSql(error)) continue;
      throw error;
    }
  }
  if (!result) throw new Error("RLS dynamic live proof did not produce a result");
  writeTypedParamsArtifacts(true);

  const liveAttempts = {
    wave: RLS_DYNAMIC_WAVE,
    proof_kind: "live_rls_dynamic_cross_tenant",
    baseline_commit: currentGitHead(),
    mode: "live_dynamic_executed",
    actors: RLS_ACTORS,
    live_runner_ready: true,
    live_runner: "scripts/audit/runRlsDynamicCrossTenantLiveProof.ts",
    required_env_present: REQUIRED_ENV.every((name) => Boolean(process.env[name])),
    selected_database_env_key: "SUPABASE_RLS_PROOF_DATABASE_URL",
    database_preflight: preflight,
    executed: true,
    attempts: result.attempts,
    cross_tenant_read_blocked: result.crossTenantReadBlocked,
    cross_tenant_write_blocked: result.crossTenantWriteBlocked,
    cross_tenant_delete_blocked: result.crossTenantDeleteBlocked,
    consumer_office_leak_found: result.consumerOfficeLeakFound,
    private_pdf_leak_found: result.privatePdfLeakFound,
    marketplace_draft_leak_found: result.marketplaceDraftLeakFound,
    public_marketplace_published_safe_visible: result.publishedSafeVisible,
    external_blocker: null,
  };
  writeRlsJson("cross_tenant_attempts_live", liveAttempts);
  const report = buildRlsDynamicCrossTenantReport();
  writeRlsDynamicArtifacts(report);
  console.log(JSON.stringify(report.matrix, null, 2));
  if (report.matrix.final_status !== "GREEN_RLS_DYNAMIC_CROSS_TENANT_READY") process.exitCode = 1;
}

runLiveProof().catch((error) => {
  writeRlsJson("cross_tenant_attempts_live", {
    wave: RLS_DYNAMIC_WAVE,
    proof_kind: "live_rls_dynamic_cross_tenant",
    baseline_commit: currentGitHead(),
    executed: false,
    error: safeError(error),
    fake_green_claimed: false,
  });
  console.error(safeError(error));
  process.exit(1);
});
