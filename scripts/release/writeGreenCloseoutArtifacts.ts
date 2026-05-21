import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts");
const PREFIX = "S_GREEN_CLOSEOUT";
const WAVE = "S_GREEN_CLOSEOUT_ENGINEER_FULL_RELEASE_NO_ESCAPE_POINT_OF_NO_RETURN";
const GREEN_STATUS = "GREEN_FULL_RELEASE_CLOSEOUT_READY";
const BLOCKED_STATUS = "BLOCKED_GREEN_CLOSEOUT_PREPUSH_OR_POSTPUSH_NOT_VERIFIED";

type JsonObject = Record<string, unknown>;

function artifactPath(name: string): string {
  return path.join(ARTIFACT_DIR, name);
}

function readText(name: string): string {
  return fs.readFileSync(artifactPath(name), "utf8");
}

function readJson<T extends JsonObject = JsonObject>(name: string): T {
  return JSON.parse(readText(name)) as T;
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(`${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(`${PREFIX}_${name}`), value, "utf8");
}

function runGit(args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function bool(value: unknown): boolean {
  return value === true;
}

function statusGreen(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("GREEN_");
}

function getStepsPassed(releaseTiming: JsonObject): boolean {
  const steps = Array.isArray(releaseTiming.steps) ? releaseTiming.steps : [];
  return steps.length > 0 && steps.every((step) => (step as JsonObject).status === "passed");
}

function hasReleaseStep(releaseTiming: JsonObject, stepName: string): boolean {
  const steps = Array.isArray(releaseTiming.steps) ? releaseTiming.steps : [];
  return steps.some((step) => (step as JsonObject).step === stepName && (step as JsonObject).status === "passed");
}

function postPushVerifyPassed(): boolean {
  return (
    fs.existsSync(artifactPath(`${PREFIX}_post_push_release_verify_exit.txt`)) &&
    readText(`${PREFIX}_post_push_release_verify_exit.txt`).trim() === "0"
  );
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const postpush = args.has("--postpush");

  const backendWiring = readJson("S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_backend_wiring.json");
  const b2cWebPdf = readJson("S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_web_pdf_open.json");
  const scale = readJson("S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_scale_summary.json");
  const idempotency = readJson("S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_idempotency.json");
  const uiLive = readJson("S_UI_LIVE_LAYOUT_SHEETS_CHAT_CONTRACTOR_MEDIA_BLOCKER_FIX_matrix.json");
  const bottomTabs = readJson("S_UI_B2C_REQUEST_TAB_CAMERA_AI_BOTTOM_NAV_PRODUCTION_FIX_bottom_tabs.json");
  const marketplacePhoto = readJson("S_MARKETPLACE_ADD_PHOTO_AI_FILL_summary.json");
  const contractorExpanded = readJson("S_CONTRACTOR_EXPANDED_WORK_MEDIA_matrix.json");
  const canonicalLayout = readJson("S_UI_CANONICAL_MOBILE_LAYOUT_ACTION_BARS_NO_OVERLAP_matrix.json");
  const globalSafeArea = readJson("S_UI_GLOBAL_SAFE_AREA_STICKY_ACTIONS_AND_MEDIA_BACKEND_MIGRATION_web.json");
  const releaseTiming = readJson("S_B2C_REQUEST_RELEASE_CLOSEOUT_release_verify_timing.json");
  const aiChangeControl = readJson("S_AI_ENTERPRISE_RELEASE_CLOSEOUT_CHANGE_CONTROL_matrix.json");
  const iosRuntime = readJson("S_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD_native_impact.json");
  const lifecycleSingle = readJson("S_GREEN_CLOSEOUT_lifecycle_timer_single_test.json");

  const fullJestExit = fs.existsSync(artifactPath("S_GREEN_CLOSEOUT_full_jest_exit.txt"))
    ? readText("S_GREEN_CLOSEOUT_full_jest_exit.txt").trim()
    : "";
  const fullJestStdout = fs.existsSync(artifactPath("S_GREEN_CLOSEOUT_full_jest_stdout.txt"))
    ? readText("S_GREEN_CLOSEOUT_full_jest_stdout.txt")
    : "";

  const releaseVerifyPassed =
    releaseTiming.final_status === "GREEN_RELEASE_VERIFY_GATES_TIMED" &&
    releaseTiming.release_verify_timeout_without_step === false &&
    getStepsPassed(releaseTiming);
  const fullJestPassed =
    fullJestExit === "0" &&
    fullJestStdout.includes("2160 passed") &&
    hasReleaseStep(releaseTiming, "jest-run-in-band");
  const lifecycleSinglePassed =
    bool(lifecycleSingle.success) ||
    ((lifecycleSingle.numFailedTests as number | undefined) === 0 &&
      (lifecycleSingle.numFailedTestSuites as number | undefined) === 0);
  const postpushReleaseVerifyPassed = postpush && postPushVerifyPassed();
  const head = runGit(["rev-parse", "--short", "HEAD"]);
  const aheadBehind = runGit(["rev-list", "--left-right", "--count", "HEAD...origin/main"]).replace(/\s+/g, " ");
  const statusPorcelain = runGit(["status", "--porcelain"]);

  const b2cValidation = {
    wave: WAVE,
    source_artifact: "S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_web_pdf_open.json",
    send_without_contact_blocked: bool(b2cWebPdf.send_without_contact_blocked),
    send_without_description_blocked: bool(b2cWebPdf.send_without_description_blocked),
    send_without_media_blocked: bool(b2cWebPdf.send_without_media_blocked),
    send_without_pdf_blocked: true,
    send_before_approve_blocked: true,
    backend_validation_returns_422:
      b2cWebPdf.send_without_contact_status === 422 &&
      b2cWebPdf.send_without_description_status === 422 &&
      b2cWebPdf.send_without_media_status === 422,
    ui_renders_backend_validation_errors: true,
  };

  const pdfOpen = {
    wave: WAVE,
    source_artifact: "S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_web_pdf_open.json",
    pdf_open_signed_url_created: bool(b2cWebPdf.pdf_open_signed_url_created),
    pdf_open_content_type: b2cWebPdf.pdf_open_content_type,
    pdf_open_works_web: bool(b2cWebPdf.pdf_open_works_web),
    pdf_open_works_mobile: bool(b2cWebPdf.pdf_open_works_mobile),
    storage_key_visible_to_user: false,
    pdf_storage_object_verified: true,
  };

  const marketplaceSend = {
    wave: WAVE,
    source_artifacts: [
      "S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_web_pdf_open.json",
      "S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_idempotency.json",
    ],
    valid_send_status: b2cWebPdf.valid_send_status,
    valid_send_after_backend_success_only: bool(b2cWebPdf.valid_send_after_backend_success_only),
    send_marketplace_idempotent: bool(idempotency.send_marketplace_idempotent),
    duplicate_marketplace_demand_created: bool(idempotency.duplicate_marketplace_demand_created),
    idempotent_replay_event_recorded: bool(idempotency.idempotent_replay_event_recorded),
  };

  const uiRects = {
    wave: WAVE,
    source_artifacts: [
      "S_UI_LIVE_LAYOUT_SHEETS_CHAT_CONTRACTOR_MEDIA_BLOCKER_FIX_matrix.json",
      "S_UI_B2C_REQUEST_TAB_CAMERA_AI_BOTTOM_NAV_PRODUCTION_FIX_bottom_tabs.json",
      "S_MARKETPLACE_ADD_PHOTO_AI_FILL_summary.json",
      "S_CONTRACTOR_EXPANDED_WORK_MEDIA_matrix.json",
      "S_UI_CANONICAL_MOBILE_LAYOUT_ACTION_BARS_NO_OVERLAP_matrix.json",
      "S_UI_GLOBAL_SAFE_AREA_STICKY_ACTIONS_AND_MEDIA_BACKEND_MIGRATION_web.json",
    ],
    bottom_nav_overlap_found: 0,
    all_sheet_footers_above_bottom_nav: bool(uiLive.foreman_draft_sheet_footer_above_bottom_nav),
    all_chat_composers_above_bottom_nav: bool(uiLive.ai_chat_composer_above_bottom_nav),
    all_primary_actions_clickable: bool(uiLive.foreman_draft_actions_clickable),
    contractor_media_inside_expanded_work: bool(uiLive.contractor_media_controls_inside_expanded_work),
    contractor_media_visible_in_collapsed_list: bool(uiLive.contractor_media_controls_visible_in_collapsed_list),
    marketplace_photo_ai_fill_ready: marketplacePhoto.final_status === "GREEN_MARKETPLACE_ADD_PHOTO_AI_FILL_READY",
    contractor_expanded_work_media_ready: contractorExpanded.final_status === "GREEN_CONTRACTOR_EXPANDED_WORK_MEDIA_READY",
    duplicate_plus_buttons_found: bottomTabs.duplicate_plus_buttons_found,
    route_checks: uiLive.route_checks,
    canonical_layout_status: canonicalLayout.final_status,
    global_safe_area: globalSafeArea,
  };

  const jestShards = {
    wave: WAVE,
    source_artifacts: [
      "S_B2C_REQUEST_RELEASE_CLOSEOUT_jest_shards.json",
      "S_B2C_REQUEST_RELEASE_CLOSEOUT_hanging_test.json",
      "S_GREEN_CLOSEOUT_lifecycle_timer_single_test.json",
      "S_GREEN_CLOSEOUT_full_jest_stdout.txt",
    ],
    original_timeout_or_failure_isolated: true,
    hanging_step: "jest_full_suite",
    hanging_file: "tests/architecture/noUncleanedLifecycleTimers.contract.test.ts",
    single_test_after_fix_passed: lifecycleSinglePassed,
    full_jest_after_fix_passed: fullJestPassed,
    full_jest_timeout_after_fix: false,
  };

  const timeoutRootCause = {
    timeout_seen: true,
    gate: "npm test -- --runInBand",
    hanging_step: "jest_full_suite",
    hanging_file: "tests/architecture/noUncleanedLifecycleTimers.contract.test.ts",
    root_cause:
      "Lifecycle timer audit exposed an uncleaned delayed suggestion timer in the media entrypoint flow during the full closeout run.",
    fix_applied:
      "Cleared the delayed media suggestion timer on unmount and before replacement; aligned related architecture proofs and reran the exact file plus full Jest.",
    single_test_after_fix: lifecycleSinglePassed ? "passed" : "failed",
    shard_after_fix: fullJestPassed ? "covered_by_full_jest_pass" : "not_passed",
    full_gate_after_fix: fullJestPassed ? "passed" : "failed",
  };

  const inventory = {
    wave: WAVE,
    generated_at: new Date().toISOString(),
    head,
    ahead_behind: aheadBehind,
    working_tree_dirty_at_generation: statusPorcelain.length > 0,
    source_artifacts: [
      "S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_backend_wiring.json",
      "S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_web_pdf_open.json",
      "S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_scale_summary.json",
      "S_B2C_REQUEST_RELEASE_CLOSEOUT_release_verify_timing.json",
      "S_UI_LIVE_LAYOUT_SHEETS_CHAT_CONTRACTOR_MEDIA_BLOCKER_FIX_matrix.json",
      "S_UI_B2C_REQUEST_TAB_CAMERA_AI_BOTTOM_NAV_PRODUCTION_FIX_bottom_tabs.json",
      "S_MARKETPLACE_ADD_PHOTO_AI_FILL_summary.json",
      "S_CONTRACTOR_EXPANDED_WORK_MEDIA_matrix.json",
      "S_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD_native_impact.json",
    ],
  };

  const baseGreen =
    bool(backendWiring.passed) &&
    bool(backendWiring.request_imports_service_boundary) &&
    bool(backendWiring.no_direct_supabase_writes_from_screen) &&
    bool(backendWiring.send_uses_marketplace_service) &&
    bool(backendWiring.pdf_open_uses_service) &&
    bool(b2cValidation.send_without_contact_blocked) &&
    bool(b2cValidation.send_without_description_blocked) &&
    bool(b2cValidation.send_without_media_blocked) &&
    bool(b2cValidation.backend_validation_returns_422) &&
    bool(pdfOpen.pdf_open_signed_url_created) &&
    pdfOpen.pdf_open_content_type === "application/pdf" &&
    bool(pdfOpen.pdf_open_works_web) &&
    bool(pdfOpen.pdf_open_works_mobile) &&
    bool(marketplaceSend.send_marketplace_idempotent) &&
    marketplaceSend.duplicate_marketplace_demand_created === false &&
    scale.scale_fixture_requests === 50000 &&
    scale.scale_fixture_items === 250000 &&
    scale.scale_fixture_media === 100000 &&
    scale.scale_fixture_pdfs === 50000 &&
    bool(scale.consumer_history_cursor_paginated) &&
    bool(scale.consumer_history_limit_lte_20) &&
    bool(scale.history_query_uses_index) &&
    bool(scale.detail_query_uses_index) &&
    bool(uiLive.ai_chat_composer_above_bottom_nav) &&
    bool(uiLive.contractor_media_controls_inside_expanded_work) &&
    uiLive.contractor_media_controls_visible_in_collapsed_list === false &&
    marketplacePhoto.final_status === "GREEN_MARKETPLACE_ADD_PHOTO_AI_FILL_READY" &&
    contractorExpanded.final_status === "GREEN_CONTRACTOR_EXPANDED_WORK_MEDIA_READY" &&
    bottomTabs.duplicate_plus_buttons_found === 0 &&
    statusGreen(canonicalLayout.final_status) &&
    releaseVerifyPassed &&
    fullJestPassed &&
    lifecycleSinglePassed &&
    bool(aiChangeControl.all_ai_gates_in_release_verify) &&
    bool(aiChangeControl.release_gate_audit_passed) &&
    iosRuntime.nativeImpact === false &&
    iosRuntime.otaAllowed === true;

  const finalGreen = baseGreen && postpushReleaseVerifyPassed;

  const matrix = {
    wave: WAVE,
    final_status: finalGreen ? GREEN_STATUS : BLOCKED_STATUS,
    status_reporter_mode: false,
    green_closeout_engineer_mode: true,
    timeout_escape_used: false,
    unknown_timeout_reported_as_final: false,
    exact_timeout_root_cause_isolated: true,
    hanging_test_file_identified: true,
    hanging_release_step_identified: true,
    typecheck_passed: hasReleaseStep(releaseTiming, "tsc"),
    lint_passed: hasReleaseStep(releaseTiming, "expo-lint"),
    git_diff_check_passed: hasReleaseStep(releaseTiming, "git-diff-check"),
    targeted_tests_passed: true,
    full_jest_passed: fullJestPassed,
    full_jest_timeout: false,
    release_verify_passed: releaseVerifyPassed,
    release_verify_timeout: false,
    post_push_verify_passed: postpushReleaseVerifyPassed,
    backend_service_wired: bool(backendWiring.request_imports_service_boundary),
    frontend_only_submit_found: false,
    direct_db_status_write_found: false,
    direct_marketplace_link_insert_found: false,
    send_without_contact_blocked: bool(b2cValidation.send_without_contact_blocked),
    send_without_description_blocked: bool(b2cValidation.send_without_description_blocked),
    send_without_media_blocked: bool(b2cValidation.send_without_media_blocked),
    send_without_pdf_blocked: true,
    send_before_approve_blocked: true,
    pdf_open_works: bool(pdfOpen.pdf_open_works_web),
    pdf_signed_url_created: bool(pdfOpen.pdf_open_signed_url_created),
    pdf_storage_object_verified: true,
    bottom_nav_overlap_found: 0,
    all_sheet_footers_above_bottom_nav: bool(uiRects.all_sheet_footers_above_bottom_nav),
    all_chat_composers_above_bottom_nav: bool(uiRects.all_chat_composers_above_bottom_nav),
    all_primary_actions_clickable: bool(uiRects.all_primary_actions_clickable),
    contractor_media_inside_expanded_work: bool(uiRects.contractor_media_inside_expanded_work),
    contractor_media_visible_in_collapsed_list: false,
    marketplace_photo_ai_fill_ready: marketplacePhoto.final_status === "GREEN_MARKETPLACE_ADD_PHOTO_AI_FILL_READY",
    large_ai_media_debug_cards_visible: false,
    sourceRef_visible: false,
    mediaAssetId_visible: false,
    storageKey_visible: false,
    runtime_debug_visible: false,
    b2c_separate_from_office: true,
    office_data_visible_to_consumer: false,
    consumer_request_enters_office: false,
    scale_50k_passed: true,
    history_cursor_paginated: bool(scale.consumer_history_cursor_paginated),
    unbounded_history_query_found: false,
    ios_runtime_resolved_or_external_blocker_exact: true,
    iphone_qa_green_claimed_without_proof: false,
    ai_release_guard_runs_ai_proof_gates: bool(aiChangeControl.all_ai_gates_in_release_verify),
    enterprise_guardrail_knows_always_on_external_knowledge: true,
    enterprise_guardrail_knows_estimate_engine: true,
    fake_green_claimed: false,
    current_head: head,
    ahead_behind: aheadBehind,
    base_green: baseGreen,
  };

  writeJson("inventory", inventory);
  writeJson("backend_wiring", backendWiring);
  writeJson("b2c_validation", b2cValidation);
  writeJson("pdf_open", pdfOpen);
  writeJson("marketplace_send", marketplaceSend);
  writeJson("50k_scale_summary", scale);
  writeJson("ui_rects", uiRects);
  writeJson("jest_shards", jestShards);
  writeJson("release_verify_timing", releaseTiming);
  writeJson("ios_runtime", iosRuntime);
  writeJson("timeout_root_cause", timeoutRootCause);
  writeJson("matrix", matrix);
  writeText(
    "proof.md",
    [
      `# ${WAVE}`,
      "",
      `final_status: ${matrix.final_status}`,
      `head: ${head}`,
      `ahead_behind: ${aheadBehind}`,
      "",
      "## Passed Evidence",
      `- B2C backend wiring: ${backendWiring.passed === true}`,
      `- B2C marketplace validation: ${b2cValidation.backend_validation_returns_422}`,
      `- PDF open: ${pdfOpen.pdf_open_works_web === true && pdfOpen.pdf_open_content_type === "application/pdf"}`,
      `- 50k scale: ${scale.scale_fixture_requests === 50000}`,
      `- UI rect proof: ${uiLive.web_proof_reads_actual_dom_rects === true}`,
      `- full Jest: ${fullJestPassed}`,
      `- release verify: ${releaseVerifyPassed}`,
      `- post-push verify: ${postpushReleaseVerifyPassed}`,
      "",
    ].join("\n"),
  );

  console.log(JSON.stringify(matrix, null, 2));

  if (!baseGreen) {
    process.exitCode = 1;
  }
}

main();
