import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WAVE =
  "S_AI_ESTIMATE_REAL_MATERIAL_CATALOG_AND_REGIONAL_PRICEBOOK_BINDING_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_REAL_MATERIAL_CATALOG_AND_REGIONAL_PRICEBOOK_BINDING",
);
const PERSISTENCE_PROOF = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT",
  "CLOSEOUT_PROOF.json",
);
const TEMPLATE_10000_PROOF = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES",
  "CLOSEOUT_PROOF.json",
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

const readStatus = (proof: ProofLike, fallback: string) =>
  proof.matrix?.final_status ?? proof.final_status ?? fallback;

mkdirSync(ARTIFACT_DIR, { recursive: true });

const persistenceProof = readJson<ProofLike>(PERSISTENCE_PROOF, {});
const templateProof = readJson<ProofLike>(TEMPLATE_10000_PROOF, {});
const coreParityProof = readJson<ProofLike>(CORE_PARITY_PROOF, {});
const foremanProof = readJson<ProofLike>(FOREMAN_CHAIN_PROOF, {});

const persistenceStatus = readStatus(
  persistenceProof,
  "MISSING_AI_ESTIMATE_UNIFIED_PERSISTENCE_PROOF",
);
const templateStatus = readStatus(templateProof, "MISSING_10000_TEMPLATE_PROOF");
const coreParityStatus = readStatus(coreParityProof, "MISSING_CORE_PARITY_PROOF");
const foremanStatus = readStatus(foremanProof, "MISSING_FOREMAN_CHAIN_PROOF");

const persistenceGreen =
  persistenceStatus ===
  "GREEN_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT_READY";
const templatesGreen =
  templateStatus === "GREEN_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES_READY";
const coreParityGreen =
  coreParityStatus ===
  "GREEN_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY_READY";
const foremanGreen =
  foremanStatus === "GREEN_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE_READY";

const blockers: string[] = [];
if (!persistenceGreen || !coreParityGreen) {
  blockers.push("BLOCKED_AI_ESTIMATE_PERSISTENCE_OR_CORE_NOT_GREEN");
}
if (!templatesGreen) blockers.push("BLOCKED_AI_ESTIMATE_10000_TEMPLATES_NOT_GREEN");
if (!foremanGreen) blockers.push("BLOCKED_FOREMAN_CHAIN_NOT_GREEN");

const prerequisiteCheck = {
  persistence_required_status:
    "GREEN_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT_READY",
  persistence_actual_status: persistenceStatus,
  persistence_green: persistenceGreen,
  persistence_primary_blocker: persistenceProof.primary_blocker ?? null,
  persistence_failed_area: persistenceProof.failed_area ?? null,
  persistence_prerequisite_check: persistenceProof.prerequisite_check ?? null,
  templates_required_status:
    "GREEN_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES_READY",
  templates_actual_status: templateStatus,
  templates_green: templatesGreen,
  core_parity_required_status:
    "GREEN_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY_READY",
  core_parity_actual_status: coreParityStatus,
  core_parity_green: coreParityGreen,
  core_parity_primary_blocker: coreParityProof.primary_blocker ?? null,
  foreman_chain_required_status:
    "GREEN_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE_READY",
  foreman_chain_actual_status: foremanStatus,
  foreman_chain_green: foremanGreen,
  foreman_chain_live_blocker: foremanProof.matrix?.live_chain_blocker ?? null,
  fake_green_claimed: false,
};

const matrix = {
  wave: WAVE,
  final_status: blockers.length
    ? "BLOCKED_AI_ESTIMATE_REAL_MATERIAL_CATALOG_AND_REGIONAL_PRICEBOOK_BINDING"
    : "READY_TO_START_AI_ESTIMATE_REAL_MATERIAL_CATALOG_AND_REGIONAL_PRICEBOOK_BINDING",
  fake_green_claimed: false,
  previous_unified_snapshot_revision_persistence_green: persistenceGreen,
  catalog_pricebook_inventory_complete: false,
  second_catalog_created: false,
  canonical_material_dictionary_used: false,
  canonical_labor_rate_dictionary_used: false,
  templates_checked: null,
  material_rows_without_material_key: null,
  labor_rows_without_rate_policy: null,
  pricebook_scope_missing: null,
  regional_pricebook_resolver_used: false,
  kg_uses_kgs: false,
  kz_uses_kzt: false,
  usd_final_total_for_kg_kz: null,
  fake_prices_found: null,
  random_prices_found: null,
  zero_as_known_price_found: null,
  missing_price_handled_honestly: false,
  user_override_price_supported: false,
  user_override_creates_new_revision: false,
  old_revision_immutable_after_override: false,
  buyer_rows_have_material_or_catalog_binding: false,
  buyer_receives_only_procurement_rows: false,
  labor_rows_sent_to_buyer: null,
  quality_control_rows_sent_to_buyer: null,
  overhead_tax_rows_sent_to_buyer: null,
  missing_material_catalog_backlog_written: false,
  missing_price_backlog_written: false,
  acceptance_1560_material_pricebook_passed: false,
  b2c_material_pricebook_flow_passed: false,
  foreman_director_buyer_material_pricebook_flow_passed: false,
  mojibake_found: null,
  english_debug_labels_visible: null,
  internal_keys_visible: null,
  code_desync_detected: null,
  net_code_bloat_risk: "NOT_ASSESSED_PREREQUISITE_BLOCKED",
  typecheck_passed: null,
  lint_passed: null,
  focused_jest_passed: null,
  chromium_web_pricebook_passed: false,
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
    "AI estimate rows across B2C and office modes bind to canonical materials/labor rates and regional pricebook policy with honest missing prices and correct currency.",
  actual: blockers.length
    ? "Unified persistence/core prerequisites are not green, so real material catalog and regional pricebook binding was not started."
    : "Prerequisites satisfied; run material catalog and regional pricebook inventory/audits next.",
  failed_command: blockers.length
    ? "npx tsx scripts/e2e/runAiEstimateCatalogPricebookCloseout.ts"
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
