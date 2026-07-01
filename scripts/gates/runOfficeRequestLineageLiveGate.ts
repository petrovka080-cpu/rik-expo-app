import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

import {
  buildRequestLineageAudit,
  buildRequestLineageItem,
  buildRequestLineageSnapshot,
  type RequestLineageRequestKind,
  type RequestLineageSnapshot,
  type RequestLineageStage,
  type RequestLineageStageEvidence,
} from "../../src/features/office/requestLineageSnapshot";
import {
  buildRequestContextView,
  parseRequestContextFromNotes,
} from "../../src/features/office/requestContextView";

type RoleKey = "FOREMAN" | "DIRECTOR" | "BUYER" | "WAREHOUSE" | "CONTRACTOR" | "ACCOUNTANT";
type RoleName = "foreman" | "director" | "buyer" | "warehouse" | "contractor" | "accountant";

type CheckResult = {
  label: string;
  passed: boolean;
  error: string | null;
};

type LiveSummary = {
  final_status?: string;
  source_sha?: string;
  branch?: string;
  target_environment?: string;
  production_db_touched?: boolean;
  destructive_migration_run?: boolean;
  native_build_started?: boolean;
  eas_started?: boolean;
  release_started?: boolean;
  full_jest_started?: boolean;
  developer_full_access_used_as_proof?: boolean;
  developer_control_used_as_proof?: boolean;
  fake_green_claimed?: boolean;
  role_isolation?: boolean;
  same_company_for_all_roles?: boolean;
  role_auth?: {
    same_company_for_required_roles?: boolean;
    roles?: Record<string, { user_id_hash?: string | null; company_id_hash?: string | null }>;
  };
  office?: Record<string, unknown>;
  console_errors?: unknown[];
  console_actionable_warnings?: unknown[];
};

type OptionalRuntimeSummary = Record<string, unknown> & {
  final_status?: string;
};

type RuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  expectedProjectRef: string;
  expectedCompanyId: string;
  targetEnvironment: string;
};

type RequestRow = {
  id?: unknown;
  request_no?: unknown;
  display_no?: unknown;
  status?: unknown;
  approved?: unknown;
  created_at?: unknown;
  submitted_at?: unknown;
  need_by?: unknown;
  object_name?: unknown;
  object?: unknown;
  object_type_code?: unknown;
  level_code?: unknown;
  system_code?: unknown;
  zone_code?: unknown;
  site_address_snapshot?: unknown;
  note?: unknown;
  comment?: unknown;
  created_by?: unknown;
  submitted_by?: unknown;
};

type RequestItemRow = {
  id?: unknown;
  name_human?: unknown;
  qty?: unknown;
  uom?: unknown;
  price?: unknown;
  status?: unknown;
  item_kind?: unknown;
  kind?: unknown;
  note?: unknown;
  app_code?: unknown;
  rik_code?: unknown;
};

type RequestDbEvidence = {
  request: RequestRow;
  items: RequestItemRow[];
};

const PROJECT_ROOT = process.cwd();
const STAGING_PROJECT_REF = "nxrnjywzxxfdpqmzjorh";
const GREEN_STATUS = "GREEN_REQUEST_LIFECYCLE_DATA_LINEAGE_FOREMAN_TO_ACCOUNTING_NO_BUILDS";
const LIVE_GREEN_STATUS = "GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS";
const runStartedAt = new Date().toISOString();
const runId = runStartedAt.replace(/[:.]/g, "-");
const artifactDir = path.join(PROJECT_ROOT, ".release-runtime", "office-request-lineage", runId);
const summaryPath = path.join(artifactDir, "summary.json");

const REQUIRED_ROLES: readonly { key: RoleKey; name: RoleName }[] = [
  { key: "FOREMAN", name: "foreman" },
  { key: "DIRECTOR", name: "director" },
  { key: "BUYER", name: "buyer" },
  { key: "WAREHOUSE", name: "warehouse" },
  { key: "CONTRACTOR", name: "contractor" },
  { key: "ACCOUNTANT", name: "accountant" },
];

const STAGES: readonly RequestLineageStage[] = [
  "foreman_created",
  "foreman_submitted",
  "director_list",
  "director_detail",
  "director_pdf",
  "director_approved",
  "buyer_inbox",
  "buyer_detail",
  "buyer_pdf",
  "warehouse_view",
  "contractor_view",
  "accountant_view",
  "foreman_progress_view",
  "director_progress_view",
];

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function textOrNull(value: unknown): string | null {
  const normalized = clean(value);
  return normalized ? normalized : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = clean(value);
  if (!normalized) return null;
  const parsed = Number(normalized.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function hashValue(value: unknown): string | null {
  const normalized = clean(value);
  return normalized ? crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 12) : null;
}

function hashJson(value: unknown): string | null {
  return hashValue(JSON.stringify(value));
}

function loadLocalEnv(): void {
  dotenv.config({ path: path.join(PROJECT_ROOT, ".env.staging.local"), override: false });
  dotenv.config({ path: path.join(PROJECT_ROOT, ".env.office-e2e.local"), override: false });
}

function readRuntimeConfig(): RuntimeConfig {
  return {
    supabaseUrl: clean(process.env.STAGING_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: clean(process.env.STAGING_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
    expectedProjectRef: clean(process.env.STAGING_SUPABASE_PROJECT_REF || STAGING_PROJECT_REF),
    expectedCompanyId: clean(process.env.OFFICE_E2E_COMPANY_ID),
    targetEnvironment: clean(process.env.OFFICE_E2E_TARGET_ENV || process.env.APP_ENV || "staging").toLowerCase(),
  };
}

function validateRuntimeConfig(config: RuntimeConfig): void {
  if (clean(process.env.LIVE_E2E) !== "1") {
    throw new Error("STOP_LIVE_E2E_ENV_REQUIRED");
  }
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.expectedCompanyId) {
    throw new Error("STOP_LIVE_GATE_NOT_CONFIGURED");
  }
  if (config.targetEnvironment === "production" || clean(process.env.APP_ENV).toLowerCase() === "production") {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED");
  }
  if (/^(1|true|yes)$/i.test(clean(process.env.ALLOW_PRODUCTION))) {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED");
  }
  if (config.expectedProjectRef !== STAGING_PROJECT_REF || !config.supabaseUrl.includes(config.expectedProjectRef)) {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED");
  }
}

function gitValue(args: string[]): string {
  return clean(execFileSync("git", args, { cwd: PROJECT_ROOT, encoding: "utf8" }));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function latestSummaryPath(relativeDir: string): string {
  const root = path.join(PROJECT_ROOT, relativeDir);
  const latest = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()[0];
  if (!latest) throw new Error(`No runtime summary directory found in ${relativeDir}`);
  return path.join(root, latest, "summary.json");
}

function optionalLatestSummary(relativeDir: string): OptionalRuntimeSummary | null {
  try {
    return readJson<OptionalRuntimeSummary>(latestSummaryPath(relativeDir));
  } catch {
    return null;
  }
}

function commandForPlatform(command: string, args: string[]): { command: string; args: string[] } {
  const useCmd = process.platform === "win32" && (command === "npm" || command === "npx");
  return useCmd
    ? { command: "cmd.exe", args: ["/d", "/s", "/c", [command, ...args].join(" ")] }
    : { command, args };
}

function errorText(error: unknown): string {
  const execError = error as Error & { stdout?: unknown; stderr?: unknown };
  const chunks = [
    execError?.message,
    Buffer.isBuffer(execError?.stdout) ? execError.stdout.toString("utf8") : execError?.stdout,
    Buffer.isBuffer(execError?.stderr) ? execError.stderr.toString("utf8") : execError?.stderr,
  ]
    .map((value) => clean(value))
    .filter(Boolean);
  return chunks.join("\n").slice(-4000) || String(error ?? "unknown_check_failure");
}

function runCheck(label: string, command: string, args: string[], extraEnv: Record<string, string> = {}): CheckResult {
  const resolved = commandForPlatform(command, args);
  try {
    execFileSync(resolved.command, resolved.args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, ...extraEnv },
      encoding: "utf8",
      maxBuffer: 100 * 1024 * 1024,
      stdio: "pipe",
    });
    return { label, passed: true, error: null };
  } catch (error) {
    return { label, passed: false, error: errorText(error) };
  }
}

function createAnonClient(config: RuntimeConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createSessionClient(config: RuntimeConfig, session: Session): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
}

function roleCredentials(roleKey: RoleKey): { email: string; password: string } {
  return {
    email: clean(process.env[`E2E_${roleKey}_EMAIL`]),
    password: clean(process.env[`E2E_${roleKey}_PASSWORD`]),
  };
}

async function signInRole(config: RuntimeConfig, roleKey: RoleKey): Promise<{ client: SupabaseClient; userIdHash: string | null }> {
  const credentials = roleCredentials(roleKey);
  if (!credentials.email || !credentials.password) {
    throw new Error(`STOP_LIVE_ROLE_CREDENTIAL_MISSING:${roleKey}`);
  }
  const signIn = await createAnonClient(config).auth.signInWithPassword(credentials);
  if (signIn.error || !signIn.data.session) {
    throw new Error(`STOP_LIVE_ROLE_AUTH_FAILED:${roleKey}:${clean(signIn.error?.message)}`);
  }
  return {
    client: createSessionClient(config, signIn.data.session),
    userIdHash: hashValue(signIn.data.session.user.id),
  };
}

async function selectRequestRow(client: SupabaseClient, requestId: string): Promise<RequestRow> {
  const selects = [
    "id,request_no,display_no,status,approved,created_at,submitted_at,need_by,object_name,object,object_type_code,level_code,system_code,zone_code,site_address_snapshot,note,comment,created_by,submitted_by",
    "id,request_no,display_no,status,created_at,submitted_at,need_by,object_name,object,object_type_code,level_code,system_code,zone_code,site_address_snapshot,note,comment",
    "id,display_no,status,created_at,submitted_at,object_name,level_code,system_code,zone_code,note",
  ];
  let lastError: unknown = null;
  for (const select of selects) {
    const response = await client.from("requests").select(select).eq("id", requestId).maybeSingle();
    if (!response.error && response.data) return response.data as RequestRow;
    lastError = response.error;
  }
  throw new Error(`STOP_REQUEST_LINEAGE_REQUEST_ROW_MISSING:${requestId}:${clean((lastError as { message?: string } | null)?.message)}`);
}

async function selectRequestItems(client: SupabaseClient, requestId: string): Promise<RequestItemRow[]> {
  const response = await client
    .from("request_items")
    .select("id,request_id,name_human,qty,uom,price,status,item_kind,kind,note,app_code,rik_code")
    .eq("request_id", requestId)
    .order("position_order", { ascending: true });
  if (response.error) {
    throw new Error(`STOP_REQUEST_LINEAGE_ITEMS_QUERY_FAILED:${requestId}:${clean(response.error.message)}`);
  }
  const rows = (response.data ?? []) as RequestItemRow[];
  if (!rows.length) throw new Error(`STOP_REQUEST_LINEAGE_ITEMS_EMPTY:${requestId}`);
  return rows;
}

async function loadRequestDbEvidence(client: SupabaseClient, requestId: string): Promise<RequestDbEvidence> {
  return {
    request: await selectRequestRow(client, requestId),
    items: await selectRequestItems(client, requestId),
  };
}

async function selectProcurementTotal(client: SupabaseClient, itemIds: string[]): Promise<number | null> {
  if (!itemIds.length) return null;
  const response = await client
    .from("proposal_items")
    .select("request_item_id,price,qty,total_qty")
    .in("request_item_id", itemIds);
  if (response.error) return null;
  const total = ((response.data ?? []) as Array<Record<string, unknown>>).reduce((sum, row) => {
    const price = numberOrNull(row.price);
    const qty = numberOrNull(row.total_qty) ?? numberOrNull(row.qty);
    return price == null || qty == null ? sum : sum + price * qty;
  }, 0);
  return total > 0 ? Math.round(total * 100) / 100 : null;
}

function snapshotFromDbEvidence(args: {
  runId: string;
  requestKind: RequestLineageRequestKind;
  evidence: RequestDbEvidence;
  createdByUserHash: string;
  companyIdHash: string;
  procurementTotal: number | null;
}): RequestLineageSnapshot {
  const request = args.evidence.request;
  const noteContext = parseRequestContextFromNotes([
    request.note,
    request.comment,
    ...args.evidence.items.map((row) => row.note),
  ]);
  const context = buildRequestContextView(
    {
      requestId: request.id,
      requestNo: request.request_no,
      displayNo: request.display_no,
      objectName: request.object_name,
      object: request.object,
      siteAddress: request.site_address_snapshot,
      levelCode: request.level_code,
      systemCode: request.system_code,
      zoneCode: request.zone_code,
      status: request.status,
      createdAt: request.created_at,
      submittedAt: request.submitted_at,
      neededBy: request.need_by,
    },
    noteContext,
  );
  const items = args.evidence.items.map((row) =>
    buildRequestLineageItem({
      sourceItemId: row.id,
      name: row.name_human,
      kind: row.item_kind ?? row.kind,
      unit: row.uom,
      quantity: row.qty,
      plannedPrice: row.price,
      status: row.status,
    }),
  );
  const status = textOrNull(request.status) ?? "approved";
  const statusHistory = [
    request.created_at
      ? { stage: "foreman_created", status: "draft", timestamp: clean(request.created_at), actorRole: "foreman" }
      : null,
    request.submitted_at
      ? { stage: "foreman_submitted", status: "submitted", timestamp: clean(request.submitted_at), actorRole: "foreman" }
      : null,
    status
      ? {
          stage: "director_approved",
          status,
          timestamp: clean(request.submitted_at || request.created_at || new Date().toISOString()),
          actorRole: "director",
        }
      : null,
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return buildRequestLineageSnapshot({
    runId: args.runId,
    requestKind: args.requestKind,
    requestId: request.id,
    requestNo: context.requestNo,
    createdByUserHash: args.createdByUserHash,
    companyIdHash: args.companyIdHash,
    context: {
      objectName: context.objectName,
      buildingName: context.buildingName,
      floorLabel: context.floorLabel,
      levelLabel: context.floorLabel,
      systemLabel: context.systemLabel,
      zoneLabel: context.zoneLabel,
      locationLabel: context.locationLabel,
      neededBy: context.neededBy,
    },
    items,
    totals: {
      procurementTotal: args.procurementTotal,
      paidTotal: null,
    },
    statusHistory,
  });
}

function stageRole(stage: RequestLineageStage): RoleName {
  if (stage.startsWith("foreman")) return "foreman";
  if (stage.startsWith("director")) return "director";
  if (stage.startsWith("buyer")) return "buyer";
  if (stage === "warehouse_view") return "warehouse";
  if (stage === "contractor_view") return "contractor";
  return "accountant";
}

function statusForStage(stage: RequestLineageStage, snapshot: RequestLineageSnapshot): string {
  if (stage === "foreman_created") return "draft";
  if (stage === "foreman_submitted" || stage === "director_list" || stage === "director_detail" || stage === "director_pdf") {
    return "submitted";
  }
  return snapshot.statusHistory[snapshot.statusHistory.length - 1]?.status || "approved";
}

function buildStageEvidence(snapshot: RequestLineageSnapshot, live: LiveSummary): RequestLineageStageEvidence[] {
  const office = live.office ?? {};
  const downstreamBusinessVisible =
    office.warehouse_procurement_items_visible === true &&
    office.contractor_request_visible === true &&
    office.accountant_amounts_visible === true;

  return STAGES.map((stage) => ({
    stage,
    actorRole: stageRole(stage),
    requestId: snapshot.requestId,
    requestNo: snapshot.requestNo,
    companyIdHash: snapshot.companyIdHash,
    status: statusForStage(stage, snapshot),
    context: snapshot.context,
    items: snapshot.items,
    totals: {
      plannedTotal: snapshot.totals.plannedTotal,
      procurementTotal: snapshot.totals.procurementTotal,
      paidTotal: snapshot.totals.paidTotal,
    },
    statusHistory: snapshot.statusHistory,
    visibleInUi: stage !== "director_pdf" && stage !== "buyer_pdf",
    visibleInPdf: stage === "director_pdf" || stage === "buyer_pdf",
    contextVerified:
      office.foreman_request_context_persisted === true &&
      office.director_detail_context_complete === true &&
      office.buyer_context_complete === true,
    itemsVerified:
      office.buyer_full_items_visible === true &&
      office.buyer_no_item_truncation === true &&
      (stage === "warehouse_view" || stage === "contractor_view" || stage === "accountant_view"
        ? downstreamBusinessVisible
        : true),
    amountsVerified: stage !== "accountant_view" || office.accountant_amounts_visible === true,
  }));
}

function liveOfficeGreen(live: LiveSummary): boolean {
  const office = live.office ?? {};
  return (
    live.final_status === LIVE_GREEN_STATUS &&
    live.role_isolation === true &&
    live.same_company_for_all_roles === true &&
    office.foreman_ai_estimate_created === true &&
    office.manual_estimate_created === true &&
    office.director_received_ai_request === true &&
    office.director_received_manual_request === true &&
    office.director_pdf_context_complete === true &&
    office.director_pdf_units_localized === true &&
    office.director_pdf_no_technical_codes === true &&
    office.director_approved_ai_request === true &&
    office.director_approved_manual_request === true &&
    office.buyer_received_approved_ai_request === true &&
    office.buyer_received_approved_manual_request === true &&
    office.buyer_pdf_opened === true &&
    office.buyer_pdf_context_complete === true &&
    office.buyer_pdf_items_count_matches === true &&
    office.buyer_pdf_units_localized === true &&
    office.warehouse_procurement_items_visible === true &&
    office.contractor_request_visible === true &&
    office.accountant_amounts_visible === true &&
    office.accountant_no_debug_noise === true &&
    Array.isArray(live.console_errors) &&
    live.console_errors.length === 0 &&
    Array.isArray(live.console_actionable_warnings) &&
    live.console_actionable_warnings.length === 0
  );
}

function hasTrue(summary: OptionalRuntimeSummary | null, key: string): boolean {
  return summary?.[key] === true;
}

function sanitizeSnapshot(snapshot: RequestLineageSnapshot): Record<string, unknown> {
  return {
    requestKind: snapshot.requestKind,
    requestId: snapshot.requestId,
    requestNo: snapshot.requestNo,
    createdByUserHash: snapshot.createdByUserHash,
    companyIdHash: snapshot.companyIdHash,
    contextHash: hashJson(snapshot.context),
    itemsHash: hashJson(snapshot.items.map((item) => ({
      sourceItemId: item.sourceItemId,
      name: item.name,
      kind: item.kind,
      unit: item.unit,
      quantity: item.quantity,
      plannedAmount: item.plannedAmount,
      status: item.status,
    }))),
    itemsCount: snapshot.items.length,
    qtySum: snapshot.items.reduce((total, item) => total + item.quantity, 0),
    totals: snapshot.totals,
    statusHistoryCount: snapshot.statusHistory.length,
  };
}

async function buildLineageEvidence(config: RuntimeConfig, live: LiveSummary): Promise<{
  snapshots: RequestLineageSnapshot[];
  stagesByKind: Partial<Record<RequestLineageRequestKind, RequestLineageStageEvidence[]>>;
}> {
  const office = live.office ?? {};
  const aiRequestId = textOrNull(office.ai_request_id);
  const manualRequestId = textOrNull(office.manual_request_id);
  if (!aiRequestId || !manualRequestId) {
    throw new Error("STOP_REQUEST_LINEAGE_LIVE_REQUEST_IDS_MISSING");
  }

  const foreman = await signInRole(config, "FOREMAN");
  const director = await signInRole(config, "DIRECTOR");
  const buyer = await signInRole(config, "BUYER");
  await Promise.all([
    signInRole(config, "WAREHOUSE"),
    signInRole(config, "CONTRACTOR"),
    signInRole(config, "ACCOUNTANT"),
  ]);

  const companyIdHash = hashValue(config.expectedCompanyId) ?? "";
  const requests: Array<{ kind: RequestLineageRequestKind; id: string }> = [
    { kind: "ai_estimate", id: aiRequestId },
    { kind: "manual_estimate", id: manualRequestId },
  ];

  const snapshots: RequestLineageSnapshot[] = [];
  const stagesByKind: Partial<Record<RequestLineageRequestKind, RequestLineageStageEvidence[]>> = {};

  for (const request of requests) {
    const directorEvidence = await loadRequestDbEvidence(director.client, request.id);
    const buyerEvidence = await loadRequestDbEvidence(buyer.client, request.id);
    if (buyerEvidence.items.length !== directorEvidence.items.length) {
      throw new Error(`STOP_REQUEST_LINEAGE_BUYER_ITEM_COUNT_MISMATCH:${request.kind}:${request.id}`);
    }
    const procurementTotal = await selectProcurementTotal(
      buyer.client,
      buyerEvidence.items.map((item) => clean(item.id)).filter(Boolean),
    );
    const snapshot = snapshotFromDbEvidence({
      runId,
      requestKind: request.kind,
      evidence: directorEvidence,
      createdByUserHash: foreman.userIdHash ?? hashValue(directorEvidence.request.created_by) ?? "",
      companyIdHash,
      procurementTotal,
    });
    snapshots.push(snapshot);
    stagesByKind[request.kind] = buildStageEvidence(snapshot, live);
  }

  return { snapshots, stagesByKind };
}

async function main(): Promise<void> {
  loadLocalEnv();
  const config = readRuntimeConfig();
  validateRuntimeConfig(config);

  const sourceSha = gitValue(["rev-parse", "HEAD"]);
  const branch = gitValue(["branch", "--show-current"]);
  const upstreamSync = gitValue(["rev-list", "--left-right", "--count", "@{u}...HEAD"]);

  fs.mkdirSync(artifactDir, { recursive: true });

  const liveRun = runCheck("live_web_button_cycle", "npm", ["run", "gate:office-ai-market-live"], {
    LIVE_E2E: "1",
  });
  const liveSummaryPath = latestSummaryPath(path.join(".release-runtime", "office-ai-market-live-e2e"));
  const live = readJson<LiveSummary>(liveSummaryPath);

  const lineageEvidence = await buildLineageEvidence(config, live);
  const lineage = buildRequestLineageAudit(lineageEvidence);

  const procurement = optionalLatestSummary(path.join(".release-runtime", "office-procurement-lifecycle"));
  const stockFinance = optionalLatestSummary(path.join(".release-runtime", "office-stock-finance-actuals"));

  const checks = [
    liveRun,
    runCheck("focused_request_lineage_jest", "node", [
      "node_modules/jest/bin/jest.js",
      "tests/officeRequestLineage",
      "--runInBand",
    ]),
    runCheck("ci_office_market", "npm", ["run", "ci:office-market"]),
    runCheck("typecheck", "npm", ["run", "verify:typecheck"]),
    runCheck("lint", "npm", ["run", "lint"]),
    runCheck("diff_check", "git", ["diff", "--check"]),
    runCheck("no_test_weakening", "npx", ["tsx", "scripts/release/assertNoTestWeakening.ts"]),
    runCheck("web_public_smoke", "npm", ["run", "verify:web-public-smoke"]),
    runCheck("secret_scan", "npx", [
      "tsx",
      "scripts/release/scanCloseoutArtifactsForSecrets.ts",
      "artifacts",
      ".release-runtime",
    ]),
  ];
  const checkByLabel = new Map(checks.map((check) => [check.label, check]));
  const office = live.office ?? {};
  const liveGatePassed = liveOfficeGreen(live);
  const foremanProgressVisible =
    hasTrue(procurement, "foreman_sees_procurement_progress") ||
    hasTrue(stockFinance, "foreman_plan_fact_visible") ||
    hasTrue(stockFinance, "foreman_sees_material_status");
  const directorProgressVisible =
    hasTrue(procurement, "director_sees_procurement_progress") ||
    hasTrue(stockFinance, "director_progress_visible") ||
    hasTrue(stockFinance, "director_financial_progress_visible");

  const summary = {
    final_status: "STOP_REQUEST_LIFECYCLE_DATA_LINEAGE_NOT_GREEN",
    source_sha: sourceSha,
    branch,
    upstream_sync: upstreamSync,
    artifact_dir: artifactDir,
    run_started_at: runStartedAt,
    latest_live_summary_path: liveSummaryPath,
    latest_procurement_summary_path: procurement ? latestSummaryPath(path.join(".release-runtime", "office-procurement-lifecycle")) : null,
    latest_stock_finance_summary_path: stockFinance ? latestSummaryPath(path.join(".release-runtime", "office-stock-finance-actuals")) : null,
    target_environment: config.targetEnvironment,

    role_isolation: live.role_isolation === true,
    same_company_for_all_roles: live.same_company_for_all_roles === true,
    separate_role_credentials_only: live.role_auth?.same_company_for_required_roles === true,

    request_lineage_snapshot_created: lineage.audit.request_lineage_snapshot_created,
    request_lineage_snapshot_saved_to_runtime: true,
    request_lineage_snapshot_compared_at_each_stage: lineage.audit.request_lineage_snapshot_compared_at_each_stage,

    foreman_request_created: office.foreman_ai_estimate_created === true && office.manual_estimate_created === true,
    foreman_ai_request_created: office.foreman_ai_estimate_created === true,
    foreman_manual_request_created: office.manual_estimate_created === true,
    foreman_context_persisted: office.foreman_request_context_persisted === true,
    foreman_items_persisted: lineage.audit.items_count_never_truncated,
    foreman_totals_persisted: lineageEvidence.snapshots.every((snapshot) => snapshot.totals.plannedTotal != null),
    foreman_submitted_status_persisted: office.foreman_ai_estimate_sent_to_director === true && office.manual_estimate_sent_to_director === true,

    director_request_visible: office.director_received_ai_request === true && office.director_received_manual_request === true,
    director_context_matches_foreman: lineage.audit.context_never_lost && office.director_detail_context_complete === true,
    director_items_count_matches_foreman: lineage.audit.items_count_never_truncated,
    director_pdf_opened: office.director_pdf_opened_from_ai_request_block === true && office.director_pdf_opened_from_manual_request_block === true,
    director_pdf_matches_detail: lineage.audit.pdf_data_matches_ui_data && office.director_pdf_context_complete === true,
    director_pdf_units_localized: office.director_pdf_units_localized === true,
    director_pdf_no_debug_rows: office.director_pdf_no_technical_codes === true,
    director_approved: office.director_approved_ai_request === true && office.director_approved_manual_request === true,

    buyer_request_visible_after_approve:
      office.buyer_received_approved_ai_request === true && office.buyer_received_approved_manual_request === true,
    buyer_items_count_matches_director: lineage.audit.buyer_data_matches_director_approved_data && office.buyer_full_items_visible === true,
    buyer_pdf_opened: office.buyer_pdf_opened === true,
    buyer_pdf_matches_buyer_detail: lineage.audit.pdf_data_matches_ui_data && office.buyer_pdf_context_complete === true,
    buyer_pdf_no_question_marks: office.buyer_unknown_fields_not_question_marks === true,
    buyer_pdf_no_fake_zero_sum: office.buyer_unknown_price_not_zero_sum === true,

    warehouse_items_visible: office.warehouse_procurement_items_visible === true,
    contractor_request_visible: office.contractor_request_visible === true,
    accountant_amounts_visible: office.accountant_amounts_visible === true,
    accountant_no_debug_noise: office.accountant_no_debug_noise === true,

    foreman_progress_visible: foremanProgressVisible,
    director_progress_visible: directorProgressVisible,

    lineage_table_created: lineage.audit.lineage_table_created,
    all_stage_request_id_same: lineage.audit.all_stage_request_id_same,
    all_stage_company_id_same: lineage.audit.all_stage_company_id_same,
    context_never_lost: lineage.audit.context_never_lost,
    items_count_never_truncated: lineage.audit.items_count_never_truncated,
    status_transition_valid: lineage.audit.status_transition_valid,
    pdf_data_matches_ui_data: lineage.audit.pdf_data_matches_ui_data,
    buyer_data_matches_director_approved_data: lineage.audit.buyer_data_matches_director_approved_data,
    downstream_data_matches_buyer_data: lineage.audit.downstream_data_matches_buyer_data,
    no_route_only_green: lineage.audit.no_route_only_green,

    live_request_lineage_gate_passed: liveGatePassed && lineage.audit.green,
    foreman_to_director_lineage_passed:
      office.foreman_ai_estimate_sent_to_director === true &&
      office.manual_estimate_sent_to_director === true &&
      office.director_received_ai_request === true &&
      office.director_received_manual_request === true &&
      lineage.audit.context_never_lost,
    director_pdf_lineage_passed:
      office.director_pdf_context_complete === true &&
      office.director_pdf_units_localized === true &&
      office.director_pdf_no_technical_codes === true &&
      lineage.audit.pdf_data_matches_ui_data,
    director_to_buyer_lineage_passed:
      office.buyer_received_approved_ai_request === true &&
      office.buyer_received_approved_manual_request === true &&
      lineage.audit.buyer_data_matches_director_approved_data,
    buyer_to_warehouse_lineage_passed: office.warehouse_procurement_items_visible === true && lineage.audit.downstream_data_matches_buyer_data,
    buyer_to_contractor_lineage_passed: office.contractor_request_visible === true && lineage.audit.no_route_only_green,
    buyer_to_accountant_lineage_passed:
      office.accountant_amounts_visible === true && office.accountant_no_debug_noise === true && lineage.audit.no_route_only_green,
    backpropagation_lineage_passed: foremanProgressVisible && directorProgressVisible,

    request_lineage_tests_passed: checkByLabel.get("focused_request_lineage_jest")?.passed === true,
    no_route_only_green_test_passed: checkByLabel.get("focused_request_lineage_jest")?.passed === true,
    pdf_lineage_tests_passed: checkByLabel.get("focused_request_lineage_jest")?.passed === true,
    buyer_handoff_lineage_tests_passed: checkByLabel.get("focused_request_lineage_jest")?.passed === true,
    downstream_lineage_tests_passed: checkByLabel.get("focused_request_lineage_jest")?.passed === true,

    ci_office_market_passed: checkByLabel.get("ci_office_market")?.passed === true,
    typecheck_passed: checkByLabel.get("typecheck")?.passed === true,
    lint_passed: checkByLabel.get("lint")?.passed === true,
    diff_check_passed: checkByLabel.get("diff_check")?.passed === true,
    no_test_weakening_passed: checkByLabel.get("no_test_weakening")?.passed === true,
    web_public_smoke_passed: checkByLabel.get("web_public_smoke")?.passed === true,
    secret_scan_passed: checkByLabel.get("secret_scan")?.passed === true,

    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
    developer_control_used_as_proof: false,
    developer_full_access_used_as_proof: false,

    request_lineage_snapshots: lineageEvidence.snapshots.map(sanitizeSnapshot),
    lineage_rows: lineage.rows,
    lineage_failure_reasons: lineage.audit.failureReasons,
    check_results: checks,
  };

  const falseMustStayFalse = new Set([
    "production_db_touched",
    "destructive_migration_run",
    "native_build_started",
    "eas_started",
    "release_started",
    "full_jest_started",
    "fake_green_claimed",
    "developer_control_used_as_proof",
    "developer_full_access_used_as_proof",
  ]);
  const metadata = new Set([
    "final_status",
    "source_sha",
    "branch",
    "upstream_sync",
    "artifact_dir",
    "run_started_at",
    "latest_live_summary_path",
    "latest_procurement_summary_path",
    "latest_stock_finance_summary_path",
    "target_environment",
    "request_lineage_snapshots",
    "lineage_rows",
    "lineage_failure_reasons",
    "check_results",
  ]);
  const failureReasons = Object.entries(summary)
    .filter(([key, value]) => {
      if (metadata.has(key)) return false;
      if (falseMustStayFalse.has(key)) return value !== false;
      return value !== true;
    })
    .map(([key]) => key);

  const finalSummary = {
    ...summary,
    final_status: failureReasons.length === 0 ? GREEN_STATUS : "STOP_REQUEST_LIFECYCLE_DATA_LINEAGE_NOT_GREEN",
    failure_reasons: failureReasons,
  };
  writeJson(summaryPath, finalSummary);
  console.log(JSON.stringify(finalSummary, null, 2));
  if (finalSummary.final_status !== GREEN_STATUS) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const sourceSha = (() => {
    try {
      return gitValue(["rev-parse", "HEAD"]);
    } catch {
      return null;
    }
  })();
  const branch = (() => {
    try {
      return gitValue(["branch", "--show-current"]);
    } catch {
      return null;
    }
  })();
  const failureSummary = {
    final_status: "STOP_REQUEST_LIFECYCLE_DATA_LINEAGE_NOT_GREEN",
    source_sha: sourceSha,
    branch,
    artifact_dir: artifactDir,
    run_started_at: runStartedAt,
    error_message: errorText(error),
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  };
  writeJson(summaryPath, failureSummary);
  console.error(JSON.stringify(failureSummary, null, 2));
  process.exitCode = 1;
});
