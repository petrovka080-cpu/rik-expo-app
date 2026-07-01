import crypto from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { scheduler } from "node:timers/promises";

import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

type SummaryStatus =
  | "GREEN_MARKET_MEDIA_LIVE_ACCEPTANCE_AND_SOURCE_CLOSEOUT_NO_BUILDS"
  | "STOP_MARKET_MEDIA_LIVE_ACCEPTANCE_NOT_FINISHED"
  | "STOP_STAGING_SCHEMA_NOT_READY_FOR_MARKET_MEDIA"
  | "STOP_MARKET_MEDIA_LIVE_ACCEPTANCE_FAILED"
  | "STOP_MARKET_UI_FILE_PICKER_NOT_AUTOMATABLE"
  | "STOP_MARKET_MEDIA_SOURCE_STATE_NOT_READY";

type Summary = {
  final_status: SummaryStatus;
  source_sha: string;
  branch: string;
  target_environment: string;
  project_ref: string;
  run_started_at: string;
  artifact_dir: string;
  error_step: string | null;
  error_message: string | null;

  staging_schema_ready: boolean;
  has_client_mutation_id: boolean;
  storage_insert_helper: boolean;
  marketplace_image_helper: boolean;
  confirm_link_rpc: boolean;
  storage_insert_policy_present: boolean;

  storage_upload_passed: boolean;
  media_asset_created: boolean;
  listing_inserted: boolean;
  media_link_confirmed: boolean;
  detail_image_url_present: boolean;
  page_image_url_present: boolean;
  public_image_fetch_ok: boolean;

  market_ui_add_opened: boolean;
  market_ui_real_photo_selected: boolean;
  market_ui_preview_visible: boolean;
  market_ui_counter_real_assets_length: boolean;
  market_ui_listing_published: boolean;
  market_ui_card_photo_visible: boolean;
  market_ui_card_photo_visible_after_refresh: boolean;
  market_ui_detail_photo_visible: boolean;
  market_ui_image_url_not_blob: boolean;
  market_ui_image_url_not_data: boolean;
  market_ui_image_url_not_local: boolean;

  image_url_not_blob: boolean;
  image_url_not_data: boolean;
  image_url_not_file: boolean;
  image_url_not_local: boolean;
  fake_ids_rejected: boolean;
  blob_data_file_urls_rejected: boolean;

  focused_tests_passed: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  diff_check_passed: boolean;
  no_test_weakening_passed: boolean;
  web_public_smoke_passed: boolean;
  ci_office_market_passed: boolean;
  secret_scan_passed: boolean;

  production_db_touched: false;
  seed_reset_run: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  full_jest_started: false;
  fake_green_claimed: false;

  source_commit_pushed: boolean;
  upstream_sync: string;
  worktree_clean: boolean;
};

type RoleSession = {
  client: SupabaseClient;
  userId: string;
  accessToken: string;
  role: string;
  companyId: string;
};

type CatalogSeed = {
  id: string | null;
  rikCode: string;
  name: string;
  uom: string | null;
  kind: string;
};

type PublicResult = Pick<
  Summary,
  | "final_status"
  | "source_sha"
  | "branch"
  | "target_environment"
  | "project_ref"
  | "artifact_dir"
  | "staging_schema_ready"
  | "storage_upload_passed"
  | "media_asset_created"
  | "listing_inserted"
  | "media_link_confirmed"
  | "detail_image_url_present"
  | "page_image_url_present"
  | "public_image_fetch_ok"
  | "market_ui_add_opened"
  | "market_ui_real_photo_selected"
  | "market_ui_preview_visible"
  | "market_ui_counter_real_assets_length"
  | "market_ui_listing_published"
  | "market_ui_card_photo_visible"
  | "market_ui_card_photo_visible_after_refresh"
  | "market_ui_detail_photo_visible"
  | "fake_ids_rejected"
  | "blob_data_file_urls_rejected"
  | "source_commit_pushed"
  | "upstream_sync"
  | "worktree_clean"
  | "error_step"
  | "error_message"
>;

const projectRoot = process.cwd();
const runStartedAt = new Date().toISOString();
const runId = runStartedAt.replace(/[:.]/g, "-");
const artifactDir = path.join(projectRoot, ".release-runtime", "live-market-media-acceptance", runId);
const summaryPath = path.join(artifactDir, "summary.json");
const expectedProjectRef = "nxrnjywzxxfdpqmzjorh";
const webPort = Number(process.env.MARKET_MEDIA_WEB_PORT || "8081");
const baseUrl = `http://127.0.0.1:${webPort}`;
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

dotenv.config({ path: path.join(projectRoot, ".env.staging.local"), override: false });
dotenv.config({ path: path.join(projectRoot, ".env.office-e2e.local"), override: false });

const supabaseUrl = String(process.env.STAGING_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = String(process.env.STAGING_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();
const expectedCompanyId = String(process.env.OFFICE_E2E_COMPANY_ID || "").trim();
const targetEnvironment = String(process.env.OFFICE_E2E_TARGET_ENV || process.env.APP_ENV || "staging").trim().toLowerCase();

fs.mkdirSync(artifactDir, { recursive: true });

function runGit(args: string[]): string {
  const result = spawnSync("git", args, { cwd: projectRoot, encoding: "utf8" });
  if (result.status !== 0) return "";
  return String(result.stdout || "").trim();
}

const summary: Summary = {
  final_status: "STOP_MARKET_MEDIA_LIVE_ACCEPTANCE_NOT_FINISHED",
  source_sha: runGit(["rev-parse", "HEAD"]),
  branch: runGit(["branch", "--show-current"]),
  target_environment: targetEnvironment,
  project_ref: expectedProjectRef,
  run_started_at: runStartedAt,
  artifact_dir: path.relative(projectRoot, artifactDir).replace(/\\/g, "/"),
  error_step: null,
  error_message: null,

  staging_schema_ready: false,
  has_client_mutation_id: false,
  storage_insert_helper: false,
  marketplace_image_helper: false,
  confirm_link_rpc: false,
  storage_insert_policy_present: false,

  storage_upload_passed: false,
  media_asset_created: false,
  listing_inserted: false,
  media_link_confirmed: false,
  detail_image_url_present: false,
  page_image_url_present: false,
  public_image_fetch_ok: false,

  market_ui_add_opened: false,
  market_ui_real_photo_selected: false,
  market_ui_preview_visible: false,
  market_ui_counter_real_assets_length: false,
  market_ui_listing_published: false,
  market_ui_card_photo_visible: false,
  market_ui_card_photo_visible_after_refresh: false,
  market_ui_detail_photo_visible: false,
  market_ui_image_url_not_blob: false,
  market_ui_image_url_not_data: false,
  market_ui_image_url_not_local: false,

  image_url_not_blob: false,
  image_url_not_data: false,
  image_url_not_file: false,
  image_url_not_local: false,
  fake_ids_rejected: false,
  blob_data_file_urls_rejected: false,

  focused_tests_passed: false,
  typecheck_passed: false,
  lint_passed: false,
  diff_check_passed: false,
  no_test_weakening_passed: false,
  web_public_smoke_passed: false,
  ci_office_market_passed: false,
  secret_scan_passed: false,

  production_db_touched: false,
  seed_reset_run: false,
  destructive_migration_run: false,
  native_build_started: false,
  eas_started: false,
  release_started: false,
  full_jest_started: false,
  fake_green_claimed: false,

  source_commit_pushed: false,
  upstream_sync: "",
  worktree_clean: false,
};

function writeSummary(): void {
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

function redactMessage(value: unknown): string {
  const normalized = (() => {
    if (value instanceof Error) return value.message;
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      return JSON.stringify({
        name: record.name,
        code: record.code,
        message: record.message,
        details: record.details,
        hint: record.hint,
        status: record.status,
      });
    }
    return String(value ?? "");
  })();
  return normalized
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer <redacted>")
    .replace(/([?&](?:apikey|access_token|refresh_token|token|password)=)[^&\s]+/gi, "$1<redacted>")
    .slice(0, 800);
}

function mark(step: string): void {
  summary.error_step = step;
  writeSummary();
}

function assertSafeEnvironment(): void {
  if (summary.branch !== "release/ios-after-build48-integration") {
    throw new Error("STOP_MARKET_MEDIA_SOURCE_STATE_NOT_READY: unexpected branch");
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("STOP_MARKET_MEDIA_LIVE_ACCEPTANCE_FAILED: staging Supabase env is missing");
  }
  if (!supabaseUrl.includes(expectedProjectRef)) {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED: staging project ref mismatch");
  }
  if (!expectedCompanyId || !uuidRe.test(expectedCompanyId)) {
    throw new Error("STOP_MARKET_MEDIA_LIVE_ACCEPTANCE_FAILED: OFFICE_E2E_COMPANY_ID is missing or invalid");
  }
  if (targetEnvironment === "production" || String(process.env.APP_ENV || "").toLowerCase() === "production") {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED: production target is not allowed");
  }
  if (/^(1|true|yes)$/i.test(String(process.env.ALLOW_PRODUCTION || ""))) {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED: ALLOW_PRODUCTION is enabled");
  }
}

function updateGitState(): void {
  summary.upstream_sync = runGit(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " ");
  summary.worktree_clean = runGit(["status", "--porcelain=v1", "--untracked-files=all"]) === "";
  const upstream = runGit(["rev-parse", "@{u}"]);
  summary.source_commit_pushed = Boolean(upstream) && upstream === summary.source_sha && summary.upstream_sync === "0 0";
  writeSummary();
}

function commandBin(command: string): string {
  return process.platform === "win32" ? `${command}.cmd` : command;
}

function runGate(
  label: string,
  command: string,
  args: string[],
  markPassed: keyof Pick<
    Summary,
    | "focused_tests_passed"
    | "typecheck_passed"
    | "lint_passed"
    | "diff_check_passed"
    | "no_test_weakening_passed"
    | "web_public_smoke_passed"
    | "ci_office_market_passed"
    | "secret_scan_passed"
  >,
): void {
  mark(`gate_${label}`);
  console.info(`[market-media-closeout] ${label}`);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      EXPO_PUBLIC_OFFICE_LOCAL_DEVELOPER_FULL_ACCESS: "false",
    },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const output = redactMessage(`${result.stdout || ""}\n${result.stderr || ""}`);
    throw new Error(`STOP_MARKET_MEDIA_SOURCE_GATES_FAILED:${label}:${output}`);
  }
  summary[markPassed] = true;
  writeSummary();
}

function runSourceAndEvidenceGates(): void {
  runGate("focused_market_media_tests", process.execPath, [
    path.join(projectRoot, "node_modules", "jest", "bin", "jest.js"),
    "src/screens/profile/profile.services.test.ts",
    "src/screens/profile/AddListingScreen.contract.test.ts",
    "tests/ui/marketplaceAddProductScreenStillWorks.contract.test.ts",
    "tests/ai/liveRouteWiring/aiLiveRouteWiringMediaContext.contract.test.ts",
    "tests/media/backend/mediaNoStorageKeyLeak.contract.test.ts",
    "tests/media/backend/mediaMigrationSchema.contract.test.ts",
    "tests/architecture/mediaBackendMigrationRequired.contract.test.ts",
    "tests/load/sLoadFix1Hotspots.contract.test.ts",
    "tests/load/sLoadFix2Hotspots.contract.test.ts",
    "--runInBand",
  ], "focused_tests_passed");
  runGate("typecheck", commandBin("npm"), ["run", "verify:typecheck"], "typecheck_passed");
  runGate("lint", commandBin("npm"), ["run", "lint"], "lint_passed");
  runGate("diff_check", "git", ["diff", "--check"], "diff_check_passed");
  runGate("no_test_weakening", commandBin("npx"), ["tsx", "scripts/release/assertNoTestWeakening.ts"], "no_test_weakening_passed");
  runGate("web_public_smoke", commandBin("npm"), ["run", "verify:web-public-smoke"], "web_public_smoke_passed");
  runGate("ci_office_market", commandBin("npm"), ["run", "ci:office-market"], "ci_office_market_passed");
  runGate("secret_scan", commandBin("npx"), [
    "tsx",
    "scripts/release/scanCloseoutArtifactsForSecrets.ts",
    "artifacts",
    ".release-runtime",
  ], "secret_scan_passed");
}

function extractFirstJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("schema query did not return JSON");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(text.slice(start, index + 1));
      }
    }
  }
  throw new Error("schema query returned incomplete JSON");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstRowFromQuery(value: unknown): Record<string, unknown> {
  const rows = asRecord(value).rows;
  return Array.isArray(rows) ? asRecord(rows[0]) : {};
}

function runSchemaReadyQuery(): void {
  mark("staging_schema_ready_query");
  const defaultGoBinary = "C:\\Users\\User\\.local\\share\\supabase\\v2.105.0\\supabase-go.exe";
  const env = { ...process.env };
  if (!env.SUPABASE_GO_BINARY && fs.existsSync(defaultGoBinary)) {
    env.SUPABASE_GO_BINARY = defaultGoBinary;
  }
  const query = `
select
  exists(
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='market_listings'
      and column_name='client_mutation_id'
  ) as has_client_mutation_id,
  (to_regprocedure('public.media_storage_upload_session_insert_allowed_v1(text,text)') is not null) as storage_insert_helper,
  (to_regprocedure('public.marketplace_listing_public_image_url_v1(uuid)') is not null) as marketplace_image_helper,
  (to_regprocedure('public.media_backend_confirm_link(uuid,uuid,uuid,text,text,text,uuid)') is not null) as confirm_link_rpc,
  exists(
    select 1
    from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname='rls_storage_media_upload_session_insert_v1'
  ) as storage_insert_policy_present;
notify pgrst, 'reload schema';
`;
  const result = spawnSync("supabase", ["db", "query", "--linked", "--output", "json", query], {
    cwd: projectRoot,
    encoding: "utf8",
    env,
  });
  if (result.status !== 0) {
    throw new Error(`STOP_STAGING_SCHEMA_NOT_READY_FOR_MARKET_MEDIA: ${redactMessage(result.stderr || result.stdout)}`);
  }
  const row = firstRowFromQuery(extractFirstJsonObject(`${result.stdout}\n${result.stderr}`));
  summary.has_client_mutation_id = row.has_client_mutation_id === true;
  summary.storage_insert_helper = row.storage_insert_helper === true;
  summary.marketplace_image_helper = row.marketplace_image_helper === true;
  summary.confirm_link_rpc = row.confirm_link_rpc === true;
  summary.storage_insert_policy_present = row.storage_insert_policy_present === true;
  summary.staging_schema_ready =
    summary.has_client_mutation_id &&
    summary.storage_insert_helper &&
    summary.marketplace_image_helper &&
    summary.confirm_link_rpc &&
    summary.storage_insert_policy_present;
  writeSummary();
  if (!summary.staging_schema_ready) {
    throw new Error("STOP_STAGING_SCHEMA_NOT_READY_FOR_MARKET_MEDIA");
  }
}

function buildClient(accessToken?: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

async function rpcValue(client: SupabaseClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data;
}

async function signInForeman(): Promise<RoleSession> {
  mark("sign_in_foreman");
  const email = String(process.env.E2E_FOREMAN_EMAIL || "").trim();
  const password = String(process.env.E2E_FOREMAN_PASSWORD || "");
  if (!email || !password) {
    throw new Error("STOP_MARKET_MEDIA_LIVE_ACCEPTANCE_FAILED: E2E_FOREMAN credentials are missing");
  }
  const authClient = buildClient();
  const signIn = await authClient.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.session?.user) {
    throw signIn.error || new Error("FOREMAN sign-in failed");
  }
  const session = signIn.data.session;
  const client = buildClient(session.access_token);
  const role = String(await rpcValue(client, "get_my_role", {})).trim();
  if (role !== "foreman") {
    throw new Error("STOP_MARKET_MEDIA_LIVE_ACCEPTANCE_FAILED: signed-in user is not foreman");
  }
  const membership = await client
    .from("company_members")
    .select("company_id,role")
    .eq("user_id", session.user.id);
  if (membership.error) throw membership.error;
  const companyIds = Array.isArray(membership.data)
    ? membership.data.map((row) => String(asRecord(row).company_id || "").trim()).filter(Boolean)
    : [];
  if (!companyIds.includes(expectedCompanyId)) {
    throw new Error("STOP_MARKET_MEDIA_LIVE_ACCEPTANCE_FAILED: foreman is not a member of OFFICE_E2E_COMPANY_ID");
  }
  return {
    client,
    userId: session.user.id,
    accessToken: session.access_token,
    role,
    companyId: expectedCompanyId,
  };
}

function stablePublicImageUrl(value: unknown): string | null {
  const url = String(value || "").trim();
  if (!url) return null;
  if (/^(blob|data|file):/i.test(url)) return null;
  if (/media-local-photo-\d+/i.test(url)) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/storage/v1/object/public/")) {
    return new URL(url, supabaseUrl).toString();
  }
  return null;
}

function assertUrlGuards(): void {
  const transientLocalCandidate = `media-local-photo-${1}`;
  summary.fake_ids_rejected =
    !uuidRe.test(transientLocalCandidate) &&
    !uuidRe.test("not-a-real-media-asset") &&
    !uuidRe.test("blob:https://example.invalid/fake");
  summary.blob_data_file_urls_rejected =
    stablePublicImageUrl("blob:https://example.invalid/fake") == null &&
    stablePublicImageUrl("data:image/png;base64,AAAA") == null &&
    stablePublicImageUrl("file:///tmp/market.png") == null &&
    stablePublicImageUrl(transientLocalCandidate) == null;
  writeSummary();
}

async function findListingByTitle(client: SupabaseClient, title: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await client
    .from("market_listings")
    .select("id,title,user_id,company_id,created_at,client_mutation_id")
    .eq("title", title)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? asRecord(data) : null;
}

async function queryCatalogSeed(client: SupabaseClient): Promise<CatalogSeed> {
  const preferred = await client
    .from("catalog_items")
    .select("id,rik_code,name_human_ru,uom_code,kind")
    .eq("kind", "material")
    .limit(25);
  if (preferred.error) throw preferred.error;
  const rows = Array.isArray(preferred.data) ? preferred.data.map(asRecord) : [];
  const row = rows.find((item) =>
    String(item.rik_code || "").trim() &&
    String(item.name_human_ru || "").trim(),
  );
  if (!row) {
    throw new Error("STOP_MARKET_MEDIA_LIVE_ACCEPTANCE_FAILED: no material catalog seed available");
  }
  return {
    id: String(row.id || "").trim() || null,
    rikCode: String(row.rik_code || "").trim(),
    name: String(row.name_human_ru || "").trim(),
    uom: String(row.uom_code || "").trim() || null,
    kind: String(row.kind || "material").trim() || "material",
  };
}

async function waitForCondition<T>(
  label: string,
  check: () => Promise<T | null | false>,
  timeoutMs: number,
  intervalMs = 500,
): Promise<T> {
  const started = Date.now();
  let lastError: unknown = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await scheduler.wait(intervalMs);
  }
  if (lastError) throw lastError;
  throw new Error(`${label} timed out`);
}

async function runApiAcceptance(session: RoleSession): Promise<void> {
  mark("api_catalog_seed");
  const catalog = await queryCatalogSeed(session.client);

  mark("api_upload_session");
  const uploadSessionId = String(await rpcValue(session.client, "media_backend_create_upload_session", {
    p_org_id: session.companyId,
    p_project_id: null,
    p_requested_by_user_id: session.userId,
    p_requested_by_role: session.role,
    p_target_type: "marketplace_product",
    p_target_id: null,
    p_media_kind: "photo",
    p_purpose: "product_photo",
    p_expected_mime_type: "image/png",
    p_expected_byte_size_max: pngBytes.length + 1024,
    p_expected_duration_ms_max: null,
  })).trim();
  if (!uuidRe.test(uploadSessionId)) throw new Error("upload_session returned invalid id");
  const storageKey = `${session.companyId}/${uploadSessionId}/original`;

  mark("api_storage_upload");
  const upload = await session.client.storage
    .from("public-marketplace-media")
    .upload(storageKey, new Blob([new Uint8Array(pngBytes)], { type: "image/png" }), {
      cacheControl: "31536000",
      contentType: "image/png",
      upsert: false,
    });
  if (upload.error) throw upload.error;
  summary.storage_upload_passed = true;
  writeSummary();

  mark("api_complete_upload");
  const mediaAssetId = String(await rpcValue(session.client, "media_backend_complete_upload_session", {
    p_session_id: uploadSessionId,
    p_mime_type: "image/png",
    p_byte_size: pngBytes.length,
    p_content_hash: crypto.createHash("sha256").update(pngBytes).digest("hex"),
    p_duration_ms: null,
    p_width: 1,
    p_height: 1,
  })).trim();
  if (!uuidRe.test(mediaAssetId)) throw new Error("complete_upload returned invalid media asset id");
  summary.media_asset_created = true;
  writeSummary();

  mark("api_listing_insert");
  const title = `market-media-api-closeout-${runId}`;
  const clientMutationId = `market-media-live-closeout:${runId}:api`;
  const listingInsert = await session.client
    .from("market_listings")
    .insert({
      user_id: session.userId,
      company_id: session.companyId,
      title,
      description: "Live API closeout listing with persistent public marketplace media.",
      price: 1,
      currency: "KGS",
      uom: "pcs",
      city: "Bishkek",
      contacts_phone: "+996700000001",
      status: "active",
      side: "offer",
      kind: "material",
      catalog_item_id: catalog.id,
      catalog_kind: catalog.kind,
      lat: 42.8746,
      lng: 74.5698,
      rik_code: catalog.rikCode,
      items_json: [{
        rik_code: catalog.rikCode,
        name: catalog.name,
        uom: catalog.uom,
        qty: 1,
        price: 1,
        city: "Bishkek",
        kind: catalog.kind,
      }],
      client_mutation_id: clientMutationId,
    })
    .select("id")
    .single();
  if (listingInsert.error) throw listingInsert.error;
  const listingId = String(asRecord(listingInsert.data).id || "").trim();
  if (!uuidRe.test(listingId)) throw new Error("listing_insert returned invalid listing id");
  summary.listing_inserted = true;
  writeSummary();

  mark("api_confirm_link");
  const linkId = String(await rpcValue(session.client, "media_backend_confirm_link", {
    p_media_asset_id: mediaAssetId,
    p_org_id: session.companyId,
    p_project_id: null,
    p_target_type: "marketplace_product",
    p_target_id: listingId,
    p_purpose: "product_photo",
    p_actor_user_id: session.userId,
  })).trim();
  if (!uuidRe.test(linkId)) throw new Error("confirm_link returned invalid link id");
  summary.media_link_confirmed = true;
  writeSummary();

  mark("api_detail_rpc");
  const detail = await waitForCondition("detail_rpc image_url", async () => {
    const { data, error } = await session.client
      .rpc("marketplace_item_scope_detail_v1", { p_listing_id: listingId })
      .maybeSingle();
    if (error) throw error;
    const row = asRecord(data);
    const imageUrl = stablePublicImageUrl(row.image_url);
    return imageUrl ? { row, imageUrl } : null;
  }, 90_000, 1000);
  summary.detail_image_url_present = true;

  mark("api_page_rpc");
  const pageRow = await waitForCondition("page_rpc image_url", async () => {
    const { data, error } = await session.client.rpc("marketplace_items_scope_page_v1", {
      p_offset: 0,
      p_limit: 100,
      p_side: null,
      p_kind: null,
    });
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map(asRecord) : [];
    const row = rows.find((item) => String(item.id || "") === listingId);
    return row && stablePublicImageUrl(row.image_url) ? row : null;
  }, 90_000, 1000);
  summary.page_image_url_present = Boolean(pageRow);

  mark("api_public_fetch");
  const publicFetch = await fetch(detail.imageUrl);
  summary.public_image_fetch_ok =
    publicFetch.ok &&
    String(publicFetch.headers.get("content-type") || "").toLowerCase().startsWith("image/");
  summary.image_url_not_blob = !detail.imageUrl.startsWith("blob:");
  summary.image_url_not_data = !detail.imageUrl.startsWith("data:");
  summary.image_url_not_file = !detail.imageUrl.startsWith("file:");
  summary.image_url_not_local = !/media-local-photo-\d+/i.test(detail.imageUrl);
  writeSummary();
  if (!summary.public_image_fetch_ok) {
    throw new Error("public_fetch failed");
  }
}

async function canFetchBaseUrl(): Promise<boolean> {
  try {
    const response = await fetch(baseUrl);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function startWebServer(): Promise<ChildProcess | null> {
  mark("ui_web_server_start");
  if (await canFetchBaseUrl()) return null;
  const child = spawn(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", "expo", "start", "--web", "--clear", "--port", String(webPort)]
      : ["expo", "start", "--web", "--clear", "--port", String(webPort)],
    {
    cwd: projectRoot,
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      BROWSER: "none",
      RIK_WEB_BASE_URL: baseUrl,
      EXPO_PUBLIC_OFFICE_LOCAL_DEVELOPER_FULL_ACCESS: "false",
    },
    stdio: "ignore",
    windowsHide: true,
  });
  await waitForCondition("expo web reachable", canFetchBaseUrl, 180_000, 1000);
  return child;
}

function stopWebServer(child: ChildProcess | null): void {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-child.pid, "SIGTERM");
    }
  } catch {
    child.kill();
  }
}

async function setupPage(page: Page): Promise<void> {
  page.setDefaultTimeout(30_000);
  page.on("dialog", async (dialog) => {
    await dialog.accept().catch(() => undefined);
  });
}

function byTestId(page: Page, id: string): Locator {
  return page.locator(`[data-testid="${id}"]`);
}

async function loginViaUi(page: Page): Promise<void> {
  mark("ui_login");
  const email = String(process.env.E2E_FOREMAN_EMAIL || "").trim();
  const password = String(process.env.E2E_FOREMAN_PASSWORD || "");
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await byTestId(page, "auth.login.email").waitFor({ state: "visible", timeout: 90_000 });
  await byTestId(page, "auth.login.email").fill(email);
  await byTestId(page, "auth.login.password").fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 90_000 }),
    byTestId(page, "auth.login.submit").click(),
  ]);
}

async function fillNthField(scope: Page | Locator, index: number, value: string): Promise<void> {
  const fields = scope.locator('input:not([type="file"]), textarea');
  await waitForCondition(`field ${index}`, async () => (await fields.count()) > index ? true : null, 30_000);
  await fields.nth(index).fill(value);
}

async function chooseRealPhoto(page: Page, trigger: Locator): Promise<void> {
  try {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 30_000 }),
      trigger.click(),
    ]);
    await chooser.setFiles({
      name: "market-media-live-closeout.png",
      mimeType: "image/png",
      buffer: pngBytes,
    });
  } catch (error) {
    throw new Error(`STOP_MARKET_UI_FILE_PICKER_NOT_AUTOMATABLE: ${redactMessage(error)}`);
  }
}

async function imageSrc(locator: Locator): Promise<string> {
  return await locator.evaluate((element) => {
    const direct = element.getAttribute("src") || element.getAttribute("href") || "";
    if (direct) return direct;
    const image = element.matches("img") ? element : element.querySelector("img");
    return image ? image.getAttribute("src") || (image as HTMLImageElement).src || "" : "";
  });
}

async function visibleStableImage(locator: Locator): Promise<string | null> {
  if ((await locator.count()) < 1) return null;
  const first = locator.first();
  if (!(await first.isVisible().catch(() => false))) return null;
  const src = await imageSrc(first).catch(() => "");
  return stablePublicImageUrl(src);
}

async function runUiAcceptance(session: RoleSession): Promise<void> {
  mark("ui_browser_start");
  const browser: Browser = await chromium.launch({ headless: true });
  let context: BrowserContext | null = null;
  try {
    context = await browser.newContext({
      viewport: { width: 1440, height: 980 },
      geolocation: { latitude: 42.8746, longitude: 74.5698 },
      permissions: ["geolocation"],
    });
    await context.grantPermissions(["geolocation"], { origin: baseUrl });
    const page = await context.newPage();
    await setupPage(page);
    await loginViaUi(page);

    mark("ui_add_open");
    await page.goto(`${baseUrl}/add`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const shell = byTestId(page, "add-listing-owner-shell");
    await shell.waitFor({ state: "visible", timeout: 90_000 });
    summary.market_ui_add_opened = true;
    writeSummary();

    await byTestId(page, "market-add-kind-material").click();
    const marker = `market-media-ui-closeout-${runId}`;

    mark("ui_photo_select");
    const photoButton = byTestId(page, "marketplace.media.entrypoints.gallery_photo_button").first();
    await photoButton.waitFor({ state: "visible", timeout: 45_000 });
    await photoButton.scrollIntoViewIfNeeded();
    await chooseRealPhoto(page, photoButton);
    summary.market_ui_real_photo_selected = true;
    writeSummary();

    mark("ui_preview");
    const preview = byTestId(page, "marketplace.media.entrypoints.preview-image.0");
    await preview.waitFor({ state: "visible", timeout: 90_000 });
    summary.market_ui_preview_visible = await preview.isVisible();
    const panelText = await byTestId(page, "marketplace.media.entrypoints").first().innerText().catch(() => "");
    summary.market_ui_counter_real_assets_length = /1\s*\/\s*5/.test(panelText);
    writeSummary();

    await fillNthField(shell, 0, marker);
    await fillNthField(shell, 1, "Live UI closeout listing with persistent public marketplace media.");
    await fillNthField(shell, 2, "Bishkek");
    await fillNthField(shell, 3, "1");
    await fillNthField(shell, 4, "+996700000001");

    mark("ui_publish");
    const publish = byTestId(page, "add-listing-flow-publish").filter({ visible: true }).first();
    await publish.waitFor({ state: "visible", timeout: 45_000 });
    await publish.scrollIntoViewIfNeeded();
    await publish.click();
    const listing = await waitForCondition("ui listing inserted", async () => {
      const row = await findListingByTitle(session.client, marker);
      return row && uuidRe.test(String(row.id || "")) ? row : null;
    }, 90_000, 1000);
    const listingId = String(listing.id || "");
    summary.market_ui_listing_published = true;
    writeSummary();

    mark("ui_card");
    await page.goto(`${baseUrl}/market`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await byTestId(page, "market-home-title").waitFor({ state: "visible", timeout: 90_000 });
    await byTestId(page, "market_search_input").fill(marker);
    const cardImage = byTestId(page, `market_feed_card_image_${listingId}`);
    const cardSrc = await waitForCondition("market card image", async () => visibleStableImage(cardImage), 90_000, 1000);
    summary.market_ui_card_photo_visible = true;
    writeSummary();

    mark("ui_card_after_refresh");
    await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
    await byTestId(page, "market_search_input").fill(marker);
    const cardRefreshSrc = await waitForCondition("market card image after refresh", async () => visibleStableImage(cardImage), 90_000, 1000);
    summary.market_ui_card_photo_visible_after_refresh = true;
    writeSummary();

    mark("ui_detail");
    await page.goto(`${baseUrl}/product/${listingId}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const detailSrc = await waitForCondition(
      "market detail image",
      async () => visibleStableImage(byTestId(page, "market_product_hero_image")),
      90_000,
      1000,
    );
    summary.market_ui_detail_photo_visible = true;
    const finalUrls = [cardSrc, cardRefreshSrc, detailSrc].filter(Boolean);
    summary.market_ui_image_url_not_blob = finalUrls.every((url) => !url.startsWith("blob:"));
    summary.market_ui_image_url_not_data = finalUrls.every((url) => !url.startsWith("data:"));
    summary.market_ui_image_url_not_local = finalUrls.every((url) => !url.startsWith("file:") && !/media-local-photo-\d+/i.test(url));
    writeSummary();
  } finally {
    if (context) await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

function allGreen(): boolean {
  const required: Array<keyof Summary> = [
    "staging_schema_ready",
    "storage_upload_passed",
    "media_asset_created",
    "listing_inserted",
    "media_link_confirmed",
    "detail_image_url_present",
    "page_image_url_present",
    "public_image_fetch_ok",
    "market_ui_add_opened",
    "market_ui_real_photo_selected",
    "market_ui_preview_visible",
    "market_ui_counter_real_assets_length",
    "market_ui_listing_published",
    "market_ui_card_photo_visible",
    "market_ui_card_photo_visible_after_refresh",
    "market_ui_detail_photo_visible",
    "market_ui_image_url_not_blob",
    "market_ui_image_url_not_data",
    "market_ui_image_url_not_local",
    "image_url_not_blob",
    "image_url_not_data",
    "image_url_not_file",
    "image_url_not_local",
    "fake_ids_rejected",
    "blob_data_file_urls_rejected",
    "focused_tests_passed",
    "typecheck_passed",
    "lint_passed",
    "diff_check_passed",
    "no_test_weakening_passed",
    "web_public_smoke_passed",
    "ci_office_market_passed",
    "secret_scan_passed",
    "source_commit_pushed",
    "worktree_clean",
  ];
  return required.every((key) => summary[key] === true) &&
    summary.upstream_sync === "0 0" &&
    !summary.production_db_touched &&
    !summary.seed_reset_run &&
    !summary.destructive_migration_run &&
    !summary.native_build_started &&
    !summary.eas_started &&
    !summary.release_started &&
    !summary.full_jest_started &&
    !summary.fake_green_claimed;
}

function publicResult(): PublicResult {
  return {
    final_status: summary.final_status,
    source_sha: summary.source_sha,
    branch: summary.branch,
    target_environment: summary.target_environment,
    project_ref: summary.project_ref,
    artifact_dir: summary.artifact_dir,
    staging_schema_ready: summary.staging_schema_ready,
    storage_upload_passed: summary.storage_upload_passed,
    media_asset_created: summary.media_asset_created,
    listing_inserted: summary.listing_inserted,
    media_link_confirmed: summary.media_link_confirmed,
    detail_image_url_present: summary.detail_image_url_present,
    page_image_url_present: summary.page_image_url_present,
    public_image_fetch_ok: summary.public_image_fetch_ok,
    market_ui_add_opened: summary.market_ui_add_opened,
    market_ui_real_photo_selected: summary.market_ui_real_photo_selected,
    market_ui_preview_visible: summary.market_ui_preview_visible,
    market_ui_counter_real_assets_length: summary.market_ui_counter_real_assets_length,
    market_ui_listing_published: summary.market_ui_listing_published,
    market_ui_card_photo_visible: summary.market_ui_card_photo_visible,
    market_ui_card_photo_visible_after_refresh: summary.market_ui_card_photo_visible_after_refresh,
    market_ui_detail_photo_visible: summary.market_ui_detail_photo_visible,
    fake_ids_rejected: summary.fake_ids_rejected,
    blob_data_file_urls_rejected: summary.blob_data_file_urls_rejected,
    source_commit_pushed: summary.source_commit_pushed,
    upstream_sync: summary.upstream_sync,
    worktree_clean: summary.worktree_clean,
    error_step: summary.error_step,
    error_message: summary.error_message,
  };
}

(async () => {
  writeSummary();
  assertSafeEnvironment();
  updateGitState();
  runSchemaReadyQuery();
  assertUrlGuards();
  const session = await signInForeman();
  await runApiAcceptance(session);
  const server = await startWebServer();
  try {
  await runUiAcceptance(session);
  } finally {
    stopWebServer(server);
  }
  runSourceAndEvidenceGates();
  updateGitState();
  summary.final_status = allGreen()
    ? "GREEN_MARKET_MEDIA_LIVE_ACCEPTANCE_AND_SOURCE_CLOSEOUT_NO_BUILDS"
    : "STOP_MARKET_MEDIA_LIVE_ACCEPTANCE_FAILED";
  summary.error_step = summary.final_status.startsWith("GREEN_") ? null : summary.error_step;
  writeSummary();
  if (!summary.final_status.startsWith("GREEN_")) {
    throw new Error("market media closeout booleans are not all green");
  }
  console.info(JSON.stringify(publicResult(), null, 2));
})().catch((error) => {
  summary.error_message = redactMessage(error);
  if (String(summary.error_message).includes("STOP_STAGING_SCHEMA_NOT_READY_FOR_MARKET_MEDIA")) {
    summary.final_status = "STOP_STAGING_SCHEMA_NOT_READY_FOR_MARKET_MEDIA";
  } else if (String(summary.error_message).includes("STOP_MARKET_UI_FILE_PICKER_NOT_AUTOMATABLE")) {
    summary.final_status = "STOP_MARKET_UI_FILE_PICKER_NOT_AUTOMATABLE";
  } else if (String(summary.error_message).includes("STOP_MARKET_MEDIA_SOURCE_STATE_NOT_READY")) {
    summary.final_status = "STOP_MARKET_MEDIA_SOURCE_STATE_NOT_READY";
  } else {
    summary.final_status = "STOP_MARKET_MEDIA_LIVE_ACCEPTANCE_FAILED";
  }
  writeSummary();
  console.error(JSON.stringify(publicResult(), null, 2));
  process.exitCode = 1;
});
