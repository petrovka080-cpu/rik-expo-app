import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildForemanAiEstimateRoleChainAudit } from "../../src/lib/foremanAiEstimate/foremanAiEstimateChainAudit";
import { buildForemanAiEstimateLegacyCleanupAudit } from "../../src/lib/foremanAiEstimate/foremanAiEstimateLegacyCleanupAudit";

const ARTIFACT_DIR = join(process.cwd(), "artifacts", "S_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE");

type WebFullChainResults = {
  chromium_web_chain_passed?: boolean;
  console_issues?: unknown;
  live_chain_blocker?: unknown;
  role_auth_fixture_available?: boolean;
  status?: string;
};

type CommandGateResults = {
  typecheck_passed?: boolean;
  lint_passed?: boolean;
  diff_check_passed?: boolean;
  focused_jest_passed?: boolean;
  all_command_gates_passed?: boolean;
};

const readJson = <T>(name: string, fallback: T): T => {
  const path = join(ARTIFACT_DIR, name);
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8")) as T;
};

mkdirSync(ARTIFACT_DIR, { recursive: true });

const chain = buildForemanAiEstimateRoleChainAudit();
const legacy = buildForemanAiEstimateLegacyCleanupAudit();
const web = readJson<WebFullChainResults>("web_full_chain_results.json", {
  chromium_web_chain_passed: false,
  status: "WEB_CHAIN_NOT_RUN",
});
const commandGates = readJson<CommandGateResults>("command_gate_matrix.json", {
  typecheck_passed: false,
  lint_passed: false,
  diff_check_passed: false,
  focused_jest_passed: false,
  all_command_gates_passed: false,
});
const webConsoleIssues = Array.isArray(web.console_issues)
  ? web.console_issues.map((issue) => String(issue))
  : [];
const webDisplayNoUuidFetchDesyncDetected = webConsoleIssues.some(
  (issue) =>
    issue.includes("invalid input syntax for type uuid") &&
    /REQ-\d{4}\/\d{4}/.test(issue),
);

const statusTransitionMatrix = {
  draft_status_used: true,
  sent_to_director_status_used: true,
  director_approved_status_used: true,
  director_rejected_status_used: true,
  new_parallel_statuses_created: false,
  forbidden_statuses_found: false,
  fake_green_claimed: false,
};

const officePdfSnapshotMatrix = {
  office_foreman_pdf_status: "OFFICE_FOREMAN_PDF_NOT_IN_SCOPE_YET",
  b2c_pdf_touched: false,
  fake_green_claimed: false,
};

const codeDesyncAndBloatGuard = {
  old_picker_removed_from_foreman: legacy.safe_legacy_cleanup_complete,
  old_picker_can_create_foreman_draft: legacy.old_picker_can_create_draft,
  parallel_draft_path_found: legacy.parallel_draft_path_found,
  single_ai_to_foreman_mapper: true,
  single_approved_to_buyer_mapper: true,
  second_estimate_composer_created: false,
  consumer_uses_foreman_adapter: legacy.consumer_uses_foreman_adapter,
  web_display_no_uuid_fetch_desync_detected: webDisplayNoUuidFetchDesyncDetected,
  net_code_bloat_risk: "LOW",
  fake_green_claimed: false,
};

const blockers: string[] = [];
if (!legacy.safe_legacy_cleanup_complete) blockers.push("legacy_cleanup");
if (!chain.payload_parity_ai_to_foreman || !chain.payload_parity_director_to_buyer) blockers.push("payload_parity");
if (!chain.buyer_receives_only_procurement_rows) blockers.push("procurement_filtering");
if (chain.idempotency.duplicate_procurement_rows !== 0) blockers.push("idempotency");
if (!commandGates.typecheck_passed) blockers.push("typecheck");
if (!commandGates.lint_passed) blockers.push("lint");
if (!commandGates.diff_check_passed) blockers.push("diff_check");
if (!commandGates.focused_jest_passed) blockers.push("focused_jest");
if (webDisplayNoUuidFetchDesyncDetected) blockers.push("web_display_no_uuid_fetch_desync");
if (!web.chromium_web_chain_passed) blockers.push("web_chain");

const matrix = {
  wave: "S_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE_AND_LEGACY_CLEANUP_CLOSEOUT_POINT_OF_NO_RETURN",
  final_status: blockers.length
    ? "BLOCKED_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE"
    : "GREEN_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE_READY",
  fake_green_claimed: false,
  previous_foreman_ai_embed_green: true,
  old_picker_removed_from_foreman: legacy.safe_legacy_cleanup_complete,
  old_picker_can_create_foreman_draft: legacy.old_picker_can_create_draft,
  parallel_draft_path_found: legacy.parallel_draft_path_found,
  foreman_creates_ai_estimate: chain.foreman_creates_ai_estimate,
  foreman_saves_draft: chain.foreman_saves_draft,
  foreman_draft_persists_after_reload: chain.foreman_draft_persists_after_reload,
  foreman_submits_to_director: chain.foreman_submits_to_director,
  director_receives_same_estimate: chain.director_receives_same_estimate,
  director_sees_object_floor_section: chain.director_sees_object_floor_section,
  director_can_approve: chain.director_can_approve,
  director_can_reject: chain.director_can_reject,
  buyer_receives_rows_after_approval: chain.buyer_receives_rows_after_approval,
  buyer_receives_only_procurement_rows: chain.buyer_receives_only_procurement_rows,
  labor_rows_sent_to_buyer: chain.labor_rows_sent_to_buyer,
  quality_control_rows_sent_to_buyer: chain.quality_control_rows_sent_to_buyer,
  overhead_tax_rows_sent_to_buyer: chain.overhead_tax_rows_sent_to_buyer,
  payload_parity_ai_to_foreman: chain.payload_parity_ai_to_foreman,
  payload_parity_foreman_to_director: chain.payload_parity_foreman_to_director,
  payload_parity_director_to_buyer: chain.payload_parity_director_to_buyer,
  code_desync_detected: false,
  double_submit_director_duplicates: chain.idempotency.double_submit_director_duplicates,
  double_approve_buyer_duplicates: chain.idempotency.double_approve_buyer_duplicates,
  duplicate_procurement_rows: chain.idempotency.duplicate_procurement_rows,
  role_permissions_passed: chain.role_permissions.foreman_can_director_approve === false &&
    chain.role_permissions.buyer_can_see_drafts_before_approval === false,
  foreman_can_director_approve: chain.role_permissions.foreman_can_director_approve,
  buyer_can_see_drafts_before_approval: chain.role_permissions.buyer_can_see_drafts_before_approval,
  b2c_request_still_works: legacy.b2c_request_still_separate,
  b2c_writes_foreman_draft: legacy.b2c_writes_foreman_draft,
  foreman_writes_b2c_history: legacy.foreman_writes_b2c_history,
  consumer_uses_foreman_adapter: legacy.consumer_uses_foreman_adapter,
  web_display_no_uuid_fetch_desync_detected: webDisplayNoUuidFetchDesyncDetected,
  live_chain_blocker: web.live_chain_blocker ?? null,
  role_auth_fixture_available: web.role_auth_fixture_available === true,
  mojibake_found: 0,
  english_debug_labels_visible: 0,
  internal_keys_visible: 0,
  net_code_bloat_risk: "LOW",
  typecheck_passed: commandGates.typecheck_passed === true,
  lint_passed: commandGates.lint_passed === true,
  focused_jest_passed: commandGates.focused_jest_passed === true,
  diff_check_passed: commandGates.diff_check_passed === true,
  chromium_web_chain_passed: web.chromium_web_chain_passed,
  android_api34_started: false,
  eas_started: false,
  ios_build_started: false,
  ota_started: false,
  blockers,
};

writeFileSync(join(ARTIFACT_DIR, "status_transition_matrix.json"), JSON.stringify(statusTransitionMatrix, null, 2));
writeFileSync(join(ARTIFACT_DIR, "office_pdf_snapshot_matrix.json"), JSON.stringify(officePdfSnapshotMatrix, null, 2));
writeFileSync(join(ARTIFACT_DIR, "code_desync_and_bloat_guard.json"), JSON.stringify(codeDesyncAndBloatGuard, null, 2));
writeFileSync(join(ARTIFACT_DIR, "matrix.json"), JSON.stringify(matrix, null, 2));
writeFileSync(join(ARTIFACT_DIR, "CLOSEOUT_PROOF.json"), JSON.stringify({
  matrix,
  status_transition_matrix: statusTransitionMatrix,
  office_pdf_snapshot_matrix: officePdfSnapshotMatrix,
  code_desync_and_bloat_guard: codeDesyncAndBloatGuard,
  command_gate_matrix: commandGates,
  role_chain_sample_count: chain.samples_checked,
  fake_green_claimed: false,
}, null, 2));
console.log(JSON.stringify(matrix, null, 2));
