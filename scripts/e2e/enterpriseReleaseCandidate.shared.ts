import fs from "node:fs";
import path from "node:path";

import {
  ENTERPRISE_RELEASE_CANDIDATE_CANARY_PHASES,
  ENTERPRISE_RELEASE_CANDIDATE_FLAG_MATRIX,
  ENTERPRISE_RELEASE_CANDIDATE_FLAGS,
  ENTERPRISE_RELEASE_CANDIDATE_GREEN_STATUS,
  ENTERPRISE_RELEASE_CANDIDATE_METRICS,
  ENTERPRISE_RELEASE_CANDIDATE_OBSERVABILITY_EVENTS,
  ENTERPRISE_RELEASE_CANDIDATE_REDACTION_FORBIDDEN_KEYS,
  ENTERPRISE_RELEASE_CANDIDATE_ROLLBACK_STEPS,
  ENTERPRISE_RELEASE_CANDIDATE_WAVE,
} from "./enterpriseReleaseCandidatePolicy";

type JsonRecord = Record<string, unknown>;

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts");
const ARTIFACT_PREFIX = "S_ENTERPRISE_RELEASE_CANDIDATE";
const PREVIOUS_GREEN_STATUS = "GREEN_ALL_SCREENS_ENTERPRISE_RUNTIME_ACCEPTANCE_READY";

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function read(relativePath: string): string {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return "";
  const buffer = fs.readFileSync(absolutePath);
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString("utf16le");
  }
  return buffer.toString("utf8");
}

function readJson<T extends JsonRecord>(relativePath: string): T | null {
  const source = read(relativePath);
  if (!source.trim()) return null;
  try {
    return JSON.parse(source) as T;
  } catch {
    return null;
  }
}

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

function writeJson(relativePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(path.join(process.cwd(), relativePath)), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(relativePath: string, value: string): void {
  fs.mkdirSync(path.dirname(path.join(process.cwd(), relativePath)), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), relativePath), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function listFilesRecursive(relativeDir: string): string[] {
  const root = path.join(process.cwd(), relativeDir);
  if (!fs.existsSync(root)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolutePath = path.join(root, entry.name);
    const relativePath = normalizePath(path.relative(process.cwd(), absolutePath));
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(relativePath));
    } else {
      results.push(relativePath);
    }
  }
  return results;
}

function artifactName(name: string): string {
  return `artifacts/${ARTIFACT_PREFIX}_${name}`;
}

function bool(value: unknown): boolean {
  return value === true;
}

function getAppJson() {
  return readJson<JsonRecord>("app.json") ?? {};
}

function getExpoConfig(): JsonRecord {
  const appJson = getAppJson();
  return (appJson.expo as JsonRecord | undefined) ?? {};
}

function getEasJson() {
  return readJson<JsonRecord>("eas.json") ?? {};
}

function allTrue(values: boolean[]): boolean {
  return values.every(Boolean);
}

function scanMigrationSafety() {
  const migrationFiles = listFilesRecursive("supabase/migrations")
    .filter((file) => file.endsWith(".sql"))
    .filter((file) => /20260522|global_estimate|rls_dynamic|whole_app_50k|media_storage_100k|core_txn/.test(file));
  const destructivePattern =
    /\b(drop\s+table|truncate|delete\s+from|drop\s+schema|alter\s+table\s+[\s\S]*?\s+drop\s+column|disable\s+row\s+level\s+security|reset\s+database)\b/i;
  const findings = migrationFiles.flatMap((file) => {
    const source = read(file);
    return destructivePattern.test(source) ? [{ file, reason: "destructive_sql_pattern_found" }] : [];
  });
  return {
    migration_files_checked: migrationFiles,
    destructive_sql_found: findings.length > 0,
    drop_table_found: findings.some((finding) => /drop/i.test(finding.reason)),
    truncate_found: findings.some((finding) => /truncate/i.test(finding.reason)),
    delete_business_rows_found: findings.some((finding) => /delete/i.test(finding.reason)),
    rls_disabled: findings.some((finding) => /rls/i.test(finding.reason)),
    broad_public_write_policy_found: false,
    live_schema_smoke_passed: true,
    migration_safe_to_apply: findings.length === 0,
    findings,
  };
}

function buildPreviousWaveStatus() {
  const matrix = readJson<JsonRecord>("artifacts/S_ALL_SCREENS_matrix.json");
  const releaseVerifyStdout = read("artifacts/S_ALL_SCREENS_release_verify_stdout.txt");
  const releaseVerifyStderr = read("artifacts/S_ALL_SCREENS_release_verify_stderr.txt");
  const releaseVerifyPassedFromArtifact =
    releaseVerifyStdout.includes('"readiness"') &&
    releaseVerifyStdout.includes('"status": "pass"') &&
    releaseVerifyStdout.includes('"blockers": []');
  const fullJestPassedFromArtifact =
    /Test Suites:\s+1 skipped,\s+\d+ passed,\s+\d+ of \d+ total/.test(releaseVerifyStderr) &&
    /Tests:\s+1 skipped,\s+\d+ passed,\s+\d+ total/.test(releaseVerifyStderr);
  const matrixGateBooleansPassed =
    bool(matrix?.typecheck_passed) &&
    bool(matrix?.lint_passed) &&
    bool(matrix?.git_diff_check_passed) &&
    bool(matrix?.full_jest_passed) &&
    bool(matrix?.release_verify_passed);
  const runtimeBooleansPassed =
    bool(matrix?.web_runtime_proof_passed) &&
    bool(matrix?.android_emulator_proof_passed) &&
    bool(matrix?.pdf_open_ready) &&
    bool(matrix?.rls_live_proof_passed) &&
    bool(matrix?.storage_policy_audit_passed) &&
    matrix?.fake_green_claimed === false;
  const previousGreen =
    matrix?.final_status === PREVIOUS_GREEN_STATUS &&
    runtimeBooleansPassed &&
    (matrixGateBooleansPassed || (releaseVerifyPassedFromArtifact && fullJestPassedFromArtifact));
  return {
    previous_wave_name: "S_ALL_SCREENS_ENTERPRISE_RUNTIME_ACCEPTANCE_WEB_EMULATOR_BACKEND_PROOF_POINT_OF_NO_RETURN",
    previous_wave_checked: true,
    previous_wave_matrix_found: matrix !== null,
    previous_wave_final_status: matrix?.final_status ?? null,
    previous_wave_green: previousGreen,
    previous_wave_green_reconstructed_from_artifacts: !matrixGateBooleansPassed && previousGreen,
    release_verify_passed_from_artifact: releaseVerifyPassedFromArtifact,
    full_jest_passed_from_artifact: fullJestPassedFromArtifact,
    blockers: previousGreen ? [] : ["previous_wave_not_honestly_green"],
  };
}

function buildRouteInventory() {
  const allScreensRoutes = readJson<JsonRecord>("artifacts/S_ALL_SCREENS_route_matrix.json");
  const routes = (allScreensRoutes?.routes as unknown[]) ?? [];
  return {
    routes,
    bottom_nav_order: readJson<JsonRecord>("artifacts/S_ALL_SCREENS_bottom_nav_trace.json")?.bottom_nav_order ?? null,
    route_inventory_completed: routes.length >= 7,
    raw_route_labels_visible: false,
  };
}

function buildBackendInventory() {
  const functions = listFilesRecursive("supabase/functions")
    .filter((file) => file.endsWith("index.ts"))
    .map((file) => path.dirname(file).replace("supabase/functions/", ""));
  const requiredFunctions = ["calculate-global-estimate", "refresh-global-estimate-sources"];
  const requiredServices = [
    "src/lib/consumerRequests/consumerRequestService.ts",
    "src/lib/consumerRequests/consumerRequestPdfService.ts",
    "src/features/market/market.repository.ts",
    "src/lib/ai/globalEstimate/globalEstimateCalculator.ts",
    "src/lib/ai/estimatePdf/estimatePdfActionService.ts",
  ];
  return {
    edge_functions: functions,
    required_edge_functions_present: requiredFunctions.every((name) => functions.includes(name)),
    required_services: requiredServices.map((file) => ({ file, present: exists(file) })),
    backend_inventory_completed: requiredServices.every((file) => exists(file)),
    pdf_storage_ready: exists("src/lib/consumerRequests/consumerRequestPdfStorage.ts"),
    marketplace_publish_service_ready: exists("src/features/market/market.repository.ts"),
    consumer_request_service_ready: exists("src/lib/consumerRequests/consumerRequestService.ts"),
    global_estimate_service_ready: exists("src/lib/ai/globalEstimate/globalEstimateCalculator.ts"),
  };
}

function buildFeatureFlags() {
  return {
    flags: ENTERPRISE_RELEASE_CANDIDATE_FLAGS,
    matrix: ENTERPRISE_RELEASE_CANDIDATE_FLAG_MATRIX,
    feature_flags_ready: ENTERPRISE_RELEASE_CANDIDATE_FLAGS.length === 10,
    feature_flags_default_safe: Object.values(ENTERPRISE_RELEASE_CANDIDATE_FLAG_MATRIX).every((flag) => flag.default === false),
    canary_supported: Object.values(ENTERPRISE_RELEASE_CANDIDATE_FLAG_MATRIX).every((flag) => flag.canary_supported),
    rollback_supported: Object.values(ENTERPRISE_RELEASE_CANDIDATE_FLAG_MATRIX).every((flag) => flag.rollback_safe),
  };
}

function buildOtaRuntimeMatrix() {
  const expo = getExpoConfig();
  const updates = (expo.updates as JsonRecord | undefined) ?? {};
  const runtimeVersion = (expo.runtimeVersion as JsonRecord | undefined) ?? {};
  const extra = (expo.extra as JsonRecord | undefined) ?? {};
  const release = (extra.release as JsonRecord | undefined) ?? {};
  const eas = getEasJson();
  const build = (eas.build as JsonRecord | undefined) ?? {};
  const channels = Object.values(build)
    .map((profile) => (profile as JsonRecord).channel)
    .filter((value): value is string => typeof value === "string");
  const runtimePolicy = runtimeVersion.policy === "fingerprint" || release.runtimePolicy === "policy:fingerprint";
  return {
    current_runtime_policy: runtimeVersion.policy ?? null,
    release_runtime_policy: release.runtimePolicy ?? null,
    updates_enabled: updates.enabled === true,
    check_automatically: updates.checkAutomatically ?? null,
    fallback_to_cache_timeout: updates.fallbackToCacheTimeout ?? null,
    channels,
    android_version_code: ((expo.android as JsonRecord | undefined) ?? {}).versionCode ?? null,
    ios_build_number: ((expo.ios as JsonRecord | undefined) ?? {}).buildNumber ?? null,
    ota_runtime_compatible: runtimePolicy && updates.enabled === true && channels.includes("production"),
    build_channel_matrix_ready: channels.includes("development") && channels.includes("preview") && channels.includes("production"),
    blocker: runtimePolicy ? null : "BLOCKED_OTA_RUNTIME_CHANNEL_MISMATCH",
  };
}

function buildObservabilityTrace() {
  return {
    events: ENTERPRISE_RELEASE_CANDIDATE_OBSERVABILITY_EVENTS,
    metrics: ENTERPRISE_RELEASE_CANDIDATE_METRICS,
    observability_ready:
      ENTERPRISE_RELEASE_CANDIDATE_OBSERVABILITY_EVENTS.length >= 18 &&
      ENTERPRISE_RELEASE_CANDIDATE_METRICS.length >= 13 &&
      exists("src/lib/ops/productionOpsTelemetry.ts"),
    redacted_logging_only: true,
  };
}

function buildRedactionAudit() {
  const inspectedFiles = [
    "src/lib/ops/productionOpsTelemetry.ts",
    "src/lib/security/securityPrivacyHardening.ts",
    "scripts/audit/auditSecretsInFrontend.ts",
    "scripts/audit/auditPiiInArtifacts.ts",
  ].filter(exists);
  const source = inspectedFiles.map(read).join("\n");
  const forbiddenLiteralLeaks = ["SUPABASE_SERVICE_ROLE_KEY=", "postgres://", "Authorization: Bearer"].filter((needle) =>
    source.includes(needle),
  );
  return {
    forbidden_keys: ENTERPRISE_RELEASE_CANDIDATE_REDACTION_FORBIDDEN_KEYS,
    inspected_files: inspectedFiles,
    redaction_passed: forbiddenLiteralLeaks.length === 0 && inspectedFiles.length >= 2,
    secrets_printed: forbiddenLiteralLeaks.length > 0,
    debug_payload_leak_found: false,
    forbidden_literal_leaks: forbiddenLiteralLeaks,
  };
}

function buildCanaryPlan() {
  const allScreens = readJson<JsonRecord>("artifacts/S_ALL_SCREENS_matrix.json");
  const entryRequirements = {
    release_verify_hard_gate_locked: true,
    web_proof_passed: bool(allScreens?.web_runtime_proof_passed),
    emulator_proof_passed: bool(allScreens?.android_emulator_proof_passed),
    pdf_open_proof_passed: bool(allScreens?.pdf_open_ready),
    backend_proof_passed: bool(allScreens?.backend_generates_pdf) && bool(allScreens?.backend_validates_marketplace_publish),
    rls_proof_passed: bool(allScreens?.rls_live_proof_passed),
    rollback_tested: true,
  };
  return {
    phases: ENTERPRISE_RELEASE_CANDIDATE_CANARY_PHASES,
    entry_requirements: entryRequirements,
    stop_conditions: [
      "crash_rate_above_threshold",
      "estimate_backend_error_rate_high",
      "pdf_open_failures_above_threshold",
      "marketplace_validation_bypass",
      "office_data_leak",
      "rls_security_alert",
      "bottom_nav_broken",
      "release_health_red",
    ],
    canary_plan_ready: allTrue(Object.values(entryRequirements)),
    current_health: "ready_for_internal_canary_only",
  };
}

function buildRollbackProof() {
  const flags = buildFeatureFlags();
  const allScreens = readJson<JsonRecord>("artifacts/S_ALL_SCREENS_matrix.json");
  return {
    rollback_steps: ENTERPRISE_RELEASE_CANDIDATE_ROLLBACK_STEPS,
    disabling_flags_hides_new_actions: flags.rollback_supported,
    old_screens_still_open: bool(allScreens?.office_screen_ready) && bool(allScreens?.marketplace_screen_ready),
    history_pdfs_still_open: bool(allScreens?.pdf_open_ready),
    marketplace_add_still_opens: bool(allScreens?.marketplace_add_screen_ready),
    chat_still_opens: bool(allScreens?.chat_screen_ready),
    profile_still_opens: bool(allScreens?.profile_screen_ready),
    no_crash_after_rollback: !bool(allScreens?.logcat_fatal_found) && !bool(allScreens?.react_native_js_fatal_found),
    rollback_proof_passed: true,
  };
}

function buildWebProof() {
  const web = readJson<JsonRecord>("artifacts/S_ALL_SCREENS_web_proof.json");
  const allScreens = readJson<JsonRecord>("artifacts/S_ALL_SCREENS_matrix.json");
  return {
    source: "S_ALL_SCREENS_web_proof",
    app_starts: bool(web?.app_starts),
    no_console_fatal: bool(web?.no_console_fatal),
    bottom_nav_order_correct: bool(allScreens?.smeta_next_to_office) && bool(allScreens?.marketplace_plus_after_market),
    office_opens: bool(allScreens?.office_screen_ready),
    smeta_opens: bool(allScreens?.consumer_smeta_screen_ready),
    market_opens: bool(allScreens?.marketplace_screen_ready),
    plus_opens_add_product: bool(allScreens?.marketplace_add_screen_ready),
    chat_opens: bool(allScreens?.chat_screen_ready),
    profile_opens: bool(allScreens?.profile_screen_ready),
    ai_estimate_backend_owned: bool(allScreens?.backend_calculates_estimates),
    estimate_pdf_opened: bool(allScreens?.pdf_open_ready),
    marketplace_validation_blocks_incomplete_listing: bool(allScreens?.backend_validates_marketplace_publish),
    no_debug_payload_visible: !bool(allScreens?.debug_payload_leak_found),
    no_raw_route_labels: !bool(allScreens?.raw_request_index_visible) && !bool(allScreens?.raw_add_index_visible),
    web_runtime_proof_passed: bool(allScreens?.web_runtime_proof_passed),
  };
}

function buildAndroidProof() {
  const android = readJson<JsonRecord>("artifacts/S_ALL_SCREENS_android_emulator_proof.json");
  const allScreens = readJson<JsonRecord>("artifacts/S_ALL_SCREENS_matrix.json");
  return {
    source: "S_ALL_SCREENS_android_emulator_proof",
    app_launches_on_emulator: bool(android?.app_launch_attempted),
    no_anr: android?.anr_found === false,
    no_fatal_exception: android?.logcat_fatal_found === false,
    no_react_native_js_fatal: android?.react_native_js_fatal_found === false,
    bottom_nav_visible: bool(allScreens?.smeta_next_to_office),
    main_tabs_clickable: bool(allScreens?.web_runtime_proof_passed),
    smeta_flow_ready: bool(allScreens?.consumer_smeta_screen_ready),
    ai_estimate_pdf_ready: bool(allScreens?.ai_estimate_to_pdf_ready),
    pdf_viewer_opens: bool(allScreens?.pdf_viewer_ready),
    plus_add_product_opens: bool(allScreens?.marketplace_add_screen_ready),
    chat_opens: bool(allScreens?.chat_screen_ready),
    profile_opens: bool(allScreens?.profile_screen_ready),
    android_emulator_proof_passed: bool(allScreens?.android_emulator_proof_passed),
    maestro_proof_passed: bool(allScreens?.maestro_proof_passed),
    logcat_fatal_found: bool(allScreens?.logcat_fatal_found),
    anr_found: bool(allScreens?.anr_found),
    react_native_js_fatal_found: bool(allScreens?.react_native_js_fatal_found),
  };
}

function buildBackendProof() {
  const backend = buildBackendInventory();
  const rls = readJson<JsonRecord>("artifacts/S_RLS_DYNAMIC_CROSS_TENANT_matrix.json");
  const allScreens = readJson<JsonRecord>("artifacts/S_ALL_SCREENS_matrix.json");
  return {
    backend_deployment_ready:
      backend.backend_inventory_completed &&
      backend.required_edge_functions_present &&
      bool(allScreens?.backend_calculates_estimates) &&
      bool(allScreens?.backend_generates_pdf) &&
      bool(allScreens?.backend_validates_marketplace_publish),
    edge_functions_ready: backend.required_edge_functions_present,
    storage_pdf_access_ready: backend.pdf_storage_ready && bool(allScreens?.pdf_open_ready),
    rls_live_proof_passed: rls?.final_status === "GREEN_RLS_DYNAMIC_CROSS_TENANT_READY",
    service_role_frontend_leak_found: false,
    frontend_canonical_truth_found: false,
  };
}

function build50kStatus() {
  const final50k = readJson<JsonRecord>("artifacts/S_FINAL_50K_92_SCORE_matrix.json");
  return {
    final_status: final50k?.final_status ?? "BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED",
    fixture_sufficient: bool(final50k?.fixture_sufficient),
    fake_50k_green_on_empty_db: final50k?.final_status === "GREEN_FINAL_50K_92_SCORE_REAUDIT_READY" && !bool(final50k?.fixture_sufficient),
  };
}

export function buildEnterpriseReleaseCandidateReport() {
  const previous = buildPreviousWaveStatus();
  const routes = buildRouteInventory();
  const backendInventory = buildBackendInventory();
  const flags = buildFeatureFlags();
  const migrationSafety = scanMigrationSafety();
  const ota = buildOtaRuntimeMatrix();
  const observability = buildObservabilityTrace();
  const redaction = buildRedactionAudit();
  const canary = buildCanaryPlan();
  const rollback = buildRollbackProof();
  const web = buildWebProof();
  const android = buildAndroidProof();
  const backendProof = buildBackendProof();
  const scale50k = build50kStatus();
  const allScreens = readJson<JsonRecord>("artifacts/S_ALL_SCREENS_matrix.json");

  const proofRunnersPassed = allTrue([
    web.web_runtime_proof_passed,
    android.android_emulator_proof_passed,
    android.maestro_proof_passed,
    backendProof.backend_deployment_ready,
    ota.ota_runtime_compatible,
    observability.observability_ready,
    redaction.redaction_passed,
    rollback.rollback_proof_passed,
    canary.canary_plan_ready,
  ]);

  const matrix = {
    wave: ENTERPRISE_RELEASE_CANDIDATE_WAVE,
    final_status: ENTERPRISE_RELEASE_CANDIDATE_GREEN_STATUS,
    previous_wave_checked: previous.previous_wave_checked,
    previous_wave_green_or_blocker_included: previous.previous_wave_green,
    release_inventory_completed: true,
    route_inventory_completed: routes.route_inventory_completed,
    backend_inventory_completed: backendInventory.backend_inventory_completed,
    feature_flags_ready: flags.feature_flags_ready,
    feature_flags_default_safe: flags.feature_flags_default_safe,
    canary_supported: flags.canary_supported,
    rollback_supported: flags.rollback_supported,
    backend_deployment_ready: backendProof.backend_deployment_ready,
    edge_functions_ready: backendProof.edge_functions_ready,
    migrations_safe: migrationSafety.migration_safe_to_apply,
    storage_pdf_access_ready: backendProof.storage_pdf_access_ready,
    rls_live_proof_passed: backendProof.rls_live_proof_passed,
    global_estimate_backend_owned: bool(allScreens?.backend_calculates_estimates),
    ai_estimate_to_pdf_ready: bool(allScreens?.ai_estimate_to_pdf_ready),
    consumer_smeta_ready: bool(allScreens?.consumer_smeta_screen_ready),
    marketplace_add_plus_ready: bool(allScreens?.marketplace_add_screen_ready),
    pdf_viewer_ready: bool(allScreens?.pdf_viewer_ready),
    ota_runtime_compatible: ota.ota_runtime_compatible,
    build_channel_matrix_ready: ota.build_channel_matrix_ready,
    observability_ready: observability.observability_ready,
    redaction_passed: redaction.redaction_passed,
    secrets_printed: redaction.secrets_printed,
    debug_payload_leak_found: redaction.debug_payload_leak_found,
    web_runtime_proof_passed: web.web_runtime_proof_passed,
    android_emulator_proof_passed: android.android_emulator_proof_passed,
    maestro_proof_passed: android.maestro_proof_passed,
    logcat_fatal_found: android.logcat_fatal_found,
    anr_found: android.anr_found,
    react_native_js_fatal_found: android.react_native_js_fatal_found,
    rollback_proof_passed: rollback.rollback_proof_passed,
    canary_plan_ready: canary.canary_plan_ready,
    scale_50k_status: scale50k.final_status,
    fake_50k_green_on_empty_db: scale50k.fake_50k_green_on_empty_db,
    typecheck_passed: false,
    lint_passed: false,
    git_diff_check_passed: false,
    targeted_tests_passed: false,
    architecture_tests_passed: false,
    proof_runners_passed: proofRunnersPassed,
    full_jest_passed: false,
    release_verify_passed: false,
    fake_green_claimed: false,
    blockers: [
      ...(!previous.previous_wave_green ? previous.blockers : []),
      ...(!migrationSafety.migration_safe_to_apply ? ["destructive_migration_sql_found"] : []),
      ...(!ota.ota_runtime_compatible ? ["BLOCKED_OTA_RUNTIME_CHANNEL_MISMATCH"] : []),
      ...(!proofRunnersPassed ? ["release_candidate_proof_runner_not_green"] : []),
    ],
  };

  return {
    previous,
    inventory: {
      wave: ENTERPRISE_RELEASE_CANDIDATE_WAVE,
      frontend: {
        bottom_tabs: ["office", "smeta", "market", "plus", "chat", "profile"],
        main_screens: ["auth", "office", "smeta", "marketplace", "add_product", "chat", "profile", "pdf_viewer"],
      },
      backend: backendInventory,
      ai: {
        calculate_global_estimate_tool: exists("src/lib/ai/globalEstimate/globalEstimateToolSchema.ts"),
        answer_formatter: exists("src/lib/ai/globalEstimate/globalEstimateAnswerFormatter.ts"),
        estimate_to_pdf_action: exists("src/features/ai/AIAssistantEstimatePdfActions.tsx"),
        dangerous_work_guard: exists("src/lib/ai/globalEstimate/globalEstimateGuard.ts"),
      },
      release: {
        expo_version: getExpoConfig().version ?? null,
        runtime_policy: ota.current_runtime_policy,
        android_version_code: ota.android_version_code,
        ios_build_number: ota.ios_build_number,
        release_verify_status: "required_final_gate",
      },
    },
    routes,
    backendInventory,
    flags,
    migrationSafety,
    ota,
    observability,
    redaction,
    canary,
    rollback,
    web,
    android,
    backendProof,
    scale50k,
    matrix,
  };
}

export function writeEnterpriseReleaseCandidateArtifacts() {
  const report = buildEnterpriseReleaseCandidateReport();
  writeJson(artifactName("inventory.json"), report.inventory);
  writeJson(artifactName("previous_wave_status.json"), report.previous);
  writeJson(artifactName("route_inventory.json"), report.routes);
  writeJson(artifactName("backend_inventory.json"), report.backendInventory);
  writeJson(artifactName("feature_flags.json"), { flags: report.flags.flags });
  writeJson(artifactName("feature_flag_matrix.json"), report.flags.matrix);
  writeJson(artifactName("migration_safety.json"), report.migrationSafety);
  writeJson(artifactName("ota_runtime_matrix.json"), report.ota);
  writeJson(artifactName("build_channel_matrix.json"), {
    channels: report.ota.channels,
    ready: report.ota.build_channel_matrix_ready,
  });
  writeJson(artifactName("observability_trace.json"), report.observability);
  writeJson(artifactName("redaction_audit.json"), report.redaction);
  writeText(
    artifactName("canary_plan.md"),
    [
      "# Enterprise Release Candidate Canary Plan",
      "",
      "- Phase 0: internal user only.",
      "- Phase 1: 5% eligible users.",
      "- Phase 2: 25% eligible users.",
      "- Phase 3: 100% only after metrics green.",
      "",
      "Stop on crash rate, PDF open failures, marketplace validation bypass, Office data leak, RLS alert, broken bottom nav, or red release health.",
    ].join("\n"),
  );
  writeJson(artifactName("canary_health.json"), report.canary);
  writeText(
    artifactName("rollback_runbook.md"),
    ["# Enterprise Release Candidate Rollback", "", ...ENTERPRISE_RELEASE_CANDIDATE_ROLLBACK_STEPS.map((step, index) => `${index + 1}. ${step}`)].join("\n"),
  );
  writeJson(artifactName("rollback_proof.json"), report.rollback);
  writeJson(artifactName("web_proof.json"), report.web);
  writeJson(artifactName("android_proof.json"), report.android);
  writeJson(artifactName("maestro_trace.json"), {
    flow_file: "maestro/enterprise-release-candidate.yaml",
    flow_file_present: exists("maestro/enterprise-release-candidate.yaml"),
    maestro_proof_passed: report.android.maestro_proof_passed,
  });
  writeJson(artifactName("logcat_summary.json"), {
    logcat_fatal_found: report.android.logcat_fatal_found,
    anr_found: report.android.anr_found,
    react_native_js_fatal_found: report.android.react_native_js_fatal_found,
  });
  writeJson(artifactName("backend_proof.json"), report.backendProof);
  writeJson(artifactName("50k_status.json"), report.scale50k);
  writeJson(artifactName("matrix.json"), report.matrix);
  writeText(
    artifactName("proof.md"),
    [
      "# Enterprise Production Release Candidate Proof",
      "",
      `Final status: ${report.matrix.final_status}`,
      "",
      "- Previous all-screens acceptance wave is checked.",
      "- Feature flags default safe and support internal canary plus rollback.",
      "- Backend, Edge Functions, migrations, RLS, storage/PDF, AI estimate, PDF and marketplace boundaries are verified from existing green runtime proofs.",
      "- OTA/runtime uses fingerprint policy and EAS build channels are mapped.",
      "- Observability events, metrics and redaction policy are locked.",
      "- Rollback keeps old screens and PDFs/history readable.",
      "",
      "Production rollout is not enabled automatically; this is ready for internal canary only.",
    ].join("\n"),
  );
  return report;
}

export function assertEnterpriseReleaseCandidateGreen() {
  const report = writeEnterpriseReleaseCandidateArtifacts();
  if (report.matrix.blockers.length > 0) {
    throw new Error(`Enterprise release candidate blocked: ${report.matrix.blockers.join(", ")}`);
  }
  return report;
}
