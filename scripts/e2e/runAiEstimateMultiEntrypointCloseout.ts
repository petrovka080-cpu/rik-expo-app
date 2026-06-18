import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WAVE =
  "S_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY",
);
const FOREMAN_CHAIN_PROOF = join(
  process.cwd(),
  "artifacts",
  "S_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE",
  "CLOSEOUT_PROOF.json",
);
const TEMPLATE_10000_PROOF = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES",
  "CLOSEOUT_PROOF.json",
);

const readJson = <T>(path: string, fallback: T): T => {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8")) as T;
};

type ProofLike = {
  final_status?: string;
  matrix?: {
    final_status?: string;
    live_chain_blocker?: string;
    blockers?: string[];
  };
  blockers?: string[];
};

mkdirSync(ARTIFACT_DIR, { recursive: true });

const foremanProof = readJson<ProofLike>(FOREMAN_CHAIN_PROOF, {});
const templateProof = readJson<ProofLike>(TEMPLATE_10000_PROOF, {});
const foremanStatus =
  foremanProof.matrix?.final_status ?? foremanProof.final_status ?? "MISSING_FOREMAN_CHAIN_PROOF";
const templateStatus =
  templateProof.matrix?.final_status ?? templateProof.final_status ?? "MISSING_10000_TEMPLATE_PROOF";

const foremanGreen =
  foremanStatus === "GREEN_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE_READY";
const templatesGreen =
  templateStatus === "GREEN_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES_READY";

const blockers: string[] = [];
if (!foremanGreen) blockers.push("BLOCKED_FOREMAN_CHAIN_NOT_GREEN");
if (!templatesGreen) blockers.push("BLOCKED_AI_ESTIMATE_CORE_10000_TEMPLATES_NOT_GREEN");

const prerequisiteCheck = {
  foreman_chain_required_status:
    "GREEN_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE_READY",
  foreman_chain_actual_status: foremanStatus,
  foreman_chain_green: foremanGreen,
  foreman_chain_blockers:
    foremanProof.matrix?.blockers ?? foremanProof.blockers ?? [],
  foreman_chain_live_blocker: foremanProof.matrix?.live_chain_blocker ?? null,
  templates_required_status:
    "GREEN_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES_READY",
  templates_actual_status: templateStatus,
  templates_green: templatesGreen,
  fake_green_claimed: false,
};

const matrix = {
  wave: WAVE,
  final_status: blockers.length
    ? "BLOCKED_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY"
    : "READY_TO_START_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY",
  fake_green_claimed: false,
  ai_estimate_core_is_single_source_of_truth: false,
  professional_expanded_core_used: templatesGreen,
  production_10000_templates_used: templatesGreen,
  entrypoints_inventory_complete: false,
  consumer_request_registered: false,
  consumer_estimate_button_registered: false,
  office_foreman_registered: false,
  office_director_readonly_registered: false,
  office_buyer_procurement_registered: false,
  pdf_snapshot_registered: false,
  history_snapshot_registered: false,
  b2c_uses_consumer_mode: false,
  foreman_uses_foreman_mode: false,
  director_readonly_does_not_recompile: false,
  buyer_does_not_run_ai_compiler: false,
  b2c_writes_consumer_history: false,
  b2c_writes_foreman_draft: false,
  foreman_writes_foreman_draft: false,
  foreman_writes_consumer_history: false,
  director_reads_foreman_snapshot: false,
  buyer_reads_approved_procurement_rows: false,
  pdf_uses_ai_estimate_snapshot: false,
  history_uses_ai_estimate_snapshot: false,
  pdf_does_not_use_screen_state: false,
  history_click_does_not_hydrate_active_draft: false,
  generic_fallback_used_for_known_work: null,
  other_construction_work_used_for_known_work: null,
  generic_rows_visible: null,
  kg_uses_kgs_all_entrypoints: false,
  kz_uses_kzt_all_entrypoints: false,
  usd_final_total_for_kg_kz: null,
  fake_prices_found: null,
  random_prices_found: null,
  missing_price_handled_honestly: false,
  mojibake_found: null,
  english_debug_labels_visible: null,
  internal_keys_visible: null,
  duplicate_compilers_found: null,
  duplicate_row_types_found: null,
  duplicate_snapshot_types_found: null,
  duplicate_pdf_payloads_found: null,
  duplicate_history_payloads_found: null,
  code_desync_detected: null,
  net_code_bloat_risk: "NOT_ASSESSED_PREREQUISITE_BLOCKED",
  typecheck_passed: null,
  lint_passed: null,
  focused_jest_passed: null,
  chromium_web_parity_passed: false,
  android_api34_started: false,
  eas_started: false,
  ios_build_started: false,
  ota_started: false,
  blockers,
};

const closeoutProof = {
  matrix,
  prerequisite_check: prerequisiteCheck,
  status: matrix.final_status,
  primary_blocker: blockers[0] ?? null,
  failed_area: blockers.length ? "prerequisite" : null,
  expected:
    "All AI estimate entrypoints use one professional expanded AI estimate core with separate business adapters and no cross-storage leaks.",
  actual: blockers.length
    ? "Prerequisite green status is not satisfied, so multi-entrypoint parity implementation/audit was not started."
    : "Prerequisites satisfied; run the core parity audits next.",
  failed_command: blockers.length
    ? "npx tsx scripts/e2e/runAiEstimateMultiEntrypointCloseout.ts"
    : null,
  fake_green_claimed: false,
};

writeFileSync(
  join(ARTIFACT_DIR, "prerequisite_check.json"),
  `${JSON.stringify(prerequisiteCheck, null, 2)}\n`,
  "utf8",
);
writeFileSync(
  join(ARTIFACT_DIR, "matrix.json"),
  `${JSON.stringify(matrix, null, 2)}\n`,
  "utf8",
);
writeFileSync(
  join(ARTIFACT_DIR, "CLOSEOUT_PROOF.json"),
  `${JSON.stringify(closeoutProof, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(matrix, null, 2));
