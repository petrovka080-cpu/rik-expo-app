import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WAVE =
  "S_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT",
);
const CORE_PARITY_PROOF = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY",
  "CLOSEOUT_PROOF.json",
);
const FOREMAN_CHAIN_PROOF = join(
  process.cwd(),
  "artifacts",
  "S_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE",
  "CLOSEOUT_PROOF.json",
);

type ProofLike = {
  final_status?: string;
  primary_blocker?: string | null;
  failed_area?: string | null;
  matrix?: {
    final_status?: string;
    live_chain_blocker?: string | null;
    blockers?: string[];
  };
  prerequisite_check?: Record<string, unknown>;
};

const readJson = <T>(path: string, fallback: T): T => {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8")) as T;
};

mkdirSync(ARTIFACT_DIR, { recursive: true });

const coreParityProof = readJson<ProofLike>(CORE_PARITY_PROOF, {});
const foremanProof = readJson<ProofLike>(FOREMAN_CHAIN_PROOF, {});

const coreParityStatus =
  coreParityProof.matrix?.final_status ??
  coreParityProof.final_status ??
  "MISSING_AI_ESTIMATE_CORE_PARITY_PROOF";
const foremanStatus =
  foremanProof.matrix?.final_status ??
  foremanProof.final_status ??
  "MISSING_FOREMAN_CHAIN_PROOF";

const coreParityGreen =
  coreParityStatus ===
  "GREEN_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY_READY";
const foremanGreen =
  foremanStatus === "GREEN_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE_READY";

const blockers: string[] = [];
if (!coreParityGreen) blockers.push("BLOCKED_AI_ESTIMATE_CORE_PARITY_NOT_GREEN");

const prerequisiteCheck = {
  core_parity_required_status:
    "GREEN_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY_READY",
  core_parity_actual_status: coreParityStatus,
  core_parity_green: coreParityGreen,
  core_parity_primary_blocker: coreParityProof.primary_blocker ?? null,
  core_parity_failed_area: coreParityProof.failed_area ?? null,
  core_parity_prerequisite_check:
    coreParityProof.prerequisite_check ?? null,
  foreman_chain_recommended_status:
    "GREEN_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE_READY",
  foreman_chain_actual_status: foremanStatus,
  foreman_chain_green: foremanGreen,
  foreman_chain_blockers: foremanProof.matrix?.blockers ?? [],
  foreman_chain_live_blocker: foremanProof.matrix?.live_chain_blocker ?? null,
  fake_green_claimed: false,
};

const matrix = {
  wave: WAVE,
  final_status: blockers.length
    ? "BLOCKED_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT"
    : "READY_TO_START_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT",
  fake_green_claimed: false,
  previous_ai_estimate_core_parity_green: coreParityGreen,
  unified_snapshot_contract_used: false,
  unified_revision_contract_used: false,
  unified_business_links_used: false,
  unified_audit_events_used: false,
  snapshot_immutable: false,
  revision_created_on_user_edit: false,
  b2c_snapshot_saved: false,
  b2c_revision_saved: false,
  b2c_history_links_revision: false,
  b2c_pdf_links_revision: false,
  b2c_creates_foreman_draft: false,
  foreman_snapshot_saved: false,
  foreman_revision_saved: false,
  foreman_draft_links_revision: false,
  foreman_writes_b2c_history: false,
  director_does_not_recompile: false,
  director_approval_links_revision: false,
  approved_revision_id_preserved: false,
  buyer_rows_from_approved_revision: false,
  buyer_rows_from_unapproved_revision: null,
  labor_rows_sent_to_buyer: null,
  quality_control_rows_sent_to_buyer: null,
  overhead_tax_rows_sent_to_buyer: null,
  pdf_links_revision: false,
  history_links_revision: false,
  pdf_does_not_use_screen_state: false,
  history_does_not_use_active_draft: false,
  audit_events_written: false,
  hash_parity_foreman_director_buyer_pdf: false,
  storage_separation_passed: false,
  duplicate_snapshot_stores_found: null,
  duplicate_revision_stores_found: null,
  code_desync_detected: null,
  net_code_bloat_risk: "NOT_ASSESSED_PREREQUISITE_BLOCKED",
  typecheck_passed: null,
  lint_passed: null,
  focused_jest_passed: null,
  chromium_web_persistence_passed: false,
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
    "All AI estimate modes use unified immutable snapshot/revision persistence with business links and no cross-storage leaks.",
  actual: blockers.length
    ? "Core single-source parity prerequisite is not green, so unified persistence implementation/audit was not started."
    : "Prerequisites satisfied; run the unified persistence inventory and audits next.",
  failed_command: blockers.length
    ? "npx tsx scripts/e2e/runAiEstimatePersistenceCloseout.ts"
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
