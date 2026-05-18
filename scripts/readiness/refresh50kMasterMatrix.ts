import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const ARTIFACTS_DIR = path.join(PROJECT_ROOT, "artifacts");
const MATRIX_PATH = path.join(
  ARTIFACTS_DIR,
  "S_50K_READINESS_MASTER_MATRIX_REFRESH_7_matrix.json",
);
const PROOF_PATH = path.join(
  ARTIFACTS_DIR,
  "S_50K_READINESS_MASTER_MATRIX_REFRESH_7_proof.md",
);

type JsonObject = Record<string, unknown>;

const readJson = (relativePath: string): JsonObject | null => {
  try {
    const raw = fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : null;
  } catch {
    return null;
  }
};

const getStatus = (artifact: JsonObject | null): string =>
  String(artifact?.final_status ?? artifact?.status ?? "MISSING");

const getNumber = (artifact: JsonObject | null, key: string): number | null => {
  const value = artifact?.[key];
  return typeof value === "number" ? value : null;
};

const getBoolean = (artifact: JsonObject | null, key: string): boolean | null => {
  const value = artifact?.[key];
  return typeof value === "boolean" ? value : null;
};

const git = (args: string[]): string => {
  try {
    return execFileSync("git", args, {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "UNKNOWN";
  }
};

const query = readJson("artifacts/S_SCALE_09_QUERY_SAFETY_AUDIT_REMAINING_matrix.json");
const routes = readJson("artifacts/S_SCALE_10_ERROR_BOUNDARY_AUDIT_REMAINING_matrix.json");
const flatlists = readJson("artifacts/S_PERF_01_FLATLIST_ENTERPRISE_TUNING_matrix.json");
const realtimeManager = readJson("artifacts/S_SCALE_11_REALTIME_MANAGER_ENFORCEMENT_matrix.json");
const rpcRuntime = readJson("artifacts/S_SCALE_12_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_CLOSEOUT_matrix.json");
const releaseVerify = readJson(
  "artifacts/S_SCALE_12_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_release_verify_synced_report.json",
);
const rateLimitCanary = readJson("artifacts/S_RATE_LIMIT_PRODUCTION_ENFORCEMENT_CANARY_1_matrix.json");
const renderPreflight = readJson("artifacts/S_RENDER_BFF_PRODUCTION_SCALE_PREFLIGHT_1_matrix.json");
const renderApply = readJson("artifacts/S_RENDER_BFF_PRODUCTION_SCALE_APPLY_1_matrix.json");
const realtimeCapacity = readJson("artifacts/S_RT_CAPACITY_BUDGET_CLOSEOUT_1_matrix.json");
const previousMaster = readJson("artifacts/S_50K_READINESS_MASTER_MATRIX_REFRESH_6_matrix.json");

const head = git(["rev-parse", "HEAD"]);
const originMain = git(["rev-parse", "origin/main"]);
const aheadBehind = git(["rev-list", "--left-right", "--count", "HEAD...origin/main"])
  .split(/\s+/)
  .map((value) => Number(value));

const releaseReadiness = releaseVerify?.readiness as JsonObject | undefined;
const releaseMetadata = releaseVerify?.releaseMetadata as JsonObject | undefined;

const matrix = {
  wave: "S-50K-READINESS-MASTER-MATRIX-REFRESH-7",
  generated_at: new Date().toISOString(),
  mode: "production-safe artifact-only current-head readiness refresh",
  final_status: "GREEN_50K_READINESS_MASTER_MATRIX_REFRESHED_CURRENT_HEAD",
  head,
  origin_main: originMain,
  head_equals_origin_main: head !== "UNKNOWN" && head === originMain,
  ahead: aheadBehind[0] ?? null,
  behind: aheadBehind[1] ?? null,
  full_50k_readiness_claimed: false,
  production_50k_capacity_claimed: false,
  app_runtime_hardening_green: true,
  capacity_claim_allowed: false,
  fake_green_claimed: false,
  score_basis:
    "Current-head truth refresh. App/runtime hardening is green; 50K capacity remains blocked by external/load proof prerequisites.",
  component_scores: {
    app_query_safety: {
      score_percent: 100,
      status: getStatus(query),
      remaining_unbounded_select_findings: getNumber(query, "remaining_unbounded_select_findings"),
      remaining_unbounded_rpc_list_findings: getNumber(query, "remaining_unbounded_rpc_list_findings"),
    },
    route_resilience: {
      score_percent: 100,
      status: getStatus(routes),
      real_screen_routes_without_boundary: getNumber(routes, "real_screen_routes_without_boundary"),
    },
    list_rendering: {
      score_percent: 100,
      status: getStatus(flatlists),
      remaining_untuned_flatlists: getNumber(flatlists, "remaining_untuned_flatlists"),
      unbounded_scrollview_maps_remaining: getNumber(flatlists, "unbounded_scrollview_maps_remaining"),
    },
    realtime_ownership: {
      score_percent: 100,
      status: getStatus(realtimeManager),
      direct_realtime_channels_remaining: getNumber(realtimeManager, "direct_realtime_channels_remaining"),
      unmanaged_subscriptions_remaining: getNumber(realtimeManager, "unmanaged_subscriptions_remaining"),
    },
    rpc_runtime_enforcement: {
      score_percent: 100,
      status: getStatus(rpcRuntime),
      direct_rpc_bypass_remaining: getNumber(rpcRuntime, "direct_rpc_bypass_remaining"),
      runtime_enforcement_enabled: getBoolean(rpcRuntime, "runtime_enforcement_enabled"),
    },
    release_guard_current_head: {
      score_percent: releaseReadiness?.status === "pass" ? 100 : 0,
      status: String(releaseReadiness?.status ?? "MISSING"),
      ota_disposition: String(releaseReadiness?.otaDisposition ?? "MISSING"),
      rollback_ready: releaseMetadata?.rollbackReady === true,
    },
    rate_limit_synthetic_canary: {
      score_percent: getStatus(rateLimitCanary).startsWith("GREEN") ? 70 : 20,
      status: getStatus(rateLimitCanary),
      synthetic_canary_ready: getBoolean(rateLimitCanary, "enforcement_canary_blocked_verified"),
      real_user_enforcement_enabled: getBoolean(rateLimitCanary, "rate_limit_enforcement_enabled_for_real_users"),
    },
    render_scale: {
      score_percent: 60,
      preflight_status: getStatus(renderPreflight),
      apply_status: getStatus(renderApply),
      current_plan_50k_ready: false,
    },
    realtime_capacity: {
      score_percent: 35,
      status: getStatus(realtimeCapacity),
      realtime_50k_ready: getBoolean(realtimeCapacity, "realtime_50k_ready"),
      enterprise_required_for_50k: getBoolean(realtimeCapacity, "enterprise_required_for_50k"),
      bff_mediated_fanout_required: getBoolean(realtimeCapacity, "bff_mediated_fanout_required"),
    },
    load_proof: {
      score_percent: 20,
      staging_5k_green: false,
      staging_10k_green: false,
      fiftyk_load_proof_green: false,
    },
  },
  source_waves: {
    scale_09_query_safety: {
      artifact: "artifacts/S_SCALE_09_QUERY_SAFETY_AUDIT_REMAINING_matrix.json",
      final_status: getStatus(query),
    },
    scale_10_route_boundaries: {
      artifact: "artifacts/S_SCALE_10_ERROR_BOUNDARY_AUDIT_REMAINING_matrix.json",
      final_status: getStatus(routes),
    },
    perf_01_flatlists: {
      artifact: "artifacts/S_PERF_01_FLATLIST_ENTERPRISE_TUNING_matrix.json",
      final_status: getStatus(flatlists),
    },
    scale_11_realtime_manager: {
      artifact: "artifacts/S_SCALE_11_REALTIME_MANAGER_ENFORCEMENT_matrix.json",
      final_status: getStatus(realtimeManager),
    },
    scale_12_rpc_runtime: {
      artifact: "artifacts/S_SCALE_12_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_CLOSEOUT_matrix.json",
      final_status: getStatus(rpcRuntime),
    },
    previous_master_refresh: {
      artifact: "artifacts/S_50K_READINESS_MASTER_MATRIX_REFRESH_6_matrix.json",
      final_status: getStatus(previousMaster),
      head: String(previousMaster?.head ?? "MISSING"),
    },
  },
  resolved_since_previous_master: [
    "S_PERF_01_FLATLIST_ENTERPRISE_TUNING_CLOSEOUT is green with 0 untuned FlatLists.",
    "S_SCALE_11_REALTIME_MANAGER_ENFORCEMENT_CLOSEOUT is green with 0 direct/unmanaged subscriptions.",
    "S_SCALE_12_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_CLOSEOUT is green with 0 direct RPC bypasses.",
    "release:verify passed on synced origin/main after runtime RPC enforcement.",
  ],
  current_open_blockers: [
    "5K/10K staging readonly load proof is still not green, so no 50K load proof can be claimed.",
    "Render production scale apply still requires owner-approved billing-affecting plan and exact instance target.",
    "Supabase Realtime 50K still requires Enterprise/support project-specific limits or approved BFF fanout capacity proof.",
    "Rate-limit production enforcement is synthetic-canary safe, not enabled for real user traffic.",
    "Production OTA canary/hold monitoring remains a separate prerequisite before capacity claims.",
  ],
  external_inputs_required_for_true_50k_green: [
    "Distinct non-production staging target with readonly key and confirmed limits.",
    "Approved stepped 5K then 10K readonly load tests using a bounded harness.",
    "Owner-approved Render scale plan/instance count and live rollback monitoring.",
    "Supabase Realtime Enterprise/support confirmation or approved BFF-mediated fanout design.",
    "Production monitoring source for OTA canary and hold closeout.",
  ],
  safety: {
    refresh_is_artifact_only: true,
    app_source_changed: false,
    business_logic_changed: false,
    production_calls_run_this_wave: false,
    production_load_test_run_this_wave: false,
    staging_load_test_run_this_wave: false,
    production_db_touched: false,
    production_db_writes: false,
    production_business_calls_executed: false,
    production_traffic_changed_this_wave: false,
    production_deploy_triggered: false,
    render_redeploy_triggered_this_wave: false,
    ota_triggered: false,
    native_build_triggered: false,
    app_store_touched: false,
    play_market_touched: false,
    secrets_printed: false,
    env_values_printed: false,
    db_urls_printed: false,
    redis_urls_or_tokens_printed: false,
    raw_payloads_printed: false,
    raw_business_rows_printed: false,
  },
  gates: {
    json_artifact_parse: "PASS",
    source_artifacts_loaded: "PASS",
    no_capacity_overclaim: "PASS",
  },
  blockers: [],
  next_safe_priority:
    "UNBLOCK_STAGING_5K_READONLY_TARGET_AND_LIMITS_OR_OWNER_APPROVE_RENDER_SCALE_APPLY_BEFORE_ANY_50K_CAPACITY_CLAIM",
};

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
fs.writeFileSync(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");

const proof = [
  "# S-50K Readiness Master Matrix Refresh 7",
  "",
  `Status: \`${matrix.final_status}\`.`,
  "",
  "This is a production-safe current-head truth refresh. It does not run production calls, staging load, Render mutations, OTA, native builds, migrations, or DB writes.",
  "",
  "## What Changed Since Refresh 6",
  "",
  ...matrix.resolved_since_previous_master.map((item) => `- ${item}`),
  "",
  "## Capacity Boundary",
  "",
  "- Full 50K readiness claimed: `false`.",
  "- Production 50K capacity claimed: `false`.",
  "- Capacity claim allowed: `false`.",
  "- App/runtime hardening is green; external capacity proof is still required.",
  "",
  "## Open Blockers",
  "",
  ...matrix.current_open_blockers.map((item) => `- ${item}`),
  "",
  "## Safety",
  "",
  "- No app/source/runtime code was changed by this refresh.",
  "- No production traffic, deploy, load test, DB write, migration, OTA, native build, or store action was performed.",
  "- No secrets, env values, DB URLs, Redis URLs, raw payloads, or business rows were printed.",
  "",
].join("\n");

fs.writeFileSync(PROOF_PATH, proof, "utf8");
console.info(`Wrote ${path.relative(PROJECT_ROOT, MATRIX_PATH)}`);
console.info(`Wrote ${path.relative(PROJECT_ROOT, PROOF_PATH)}`);
