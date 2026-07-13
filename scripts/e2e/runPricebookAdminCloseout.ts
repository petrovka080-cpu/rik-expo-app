import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WAVE =
  "S_PRICEBOOK_ADMIN_BUYER_REVIEW_CONSOLE_AND_COVERAGE_DASHBOARD_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = join(
  process.cwd(),
  "artifacts",
  "S_PRICEBOOK_ADMIN_BUYER_REVIEW_CONSOLE_AND_COVERAGE_DASHBOARD",
);
const SUPPLIER_GOVERNANCE_PROOF = join(
  process.cwd(),
  "artifacts",
  "S_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE",
  "CLOSEOUT_PROOF.json",
);
const MATERIAL_PRICEBOOK_PROOF = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_REAL_MATERIAL_CATALOG_AND_REGIONAL_PRICEBOOK_BINDING",
  "CLOSEOUT_PROOF.json",
);
const PERSISTENCE_PROOF = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT",
  "CLOSEOUT_PROOF.json",
);
const CORE_PARITY_PROOF = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY",
  "CLOSEOUT_PROOF.json",
);

type ProofLike = {
  final_status?: string;
  status?: string;
  primary_blocker?: string | null;
  failed_area?: string | null;
  actual?: string;
  matrix?: {
    final_status?: string;
    blockers?: string[];
    fake_green_claimed?: boolean;
  };
  prerequisite_check?: Record<string, unknown>;
};

const readJson = <T>(path: string, fallback: T): T => {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8")) as T;
};

const readStatus = (proof: ProofLike, fallback: string) =>
  proof.matrix?.final_status ?? proof.final_status ?? proof.status ?? fallback;

const writeJson = (fileName: string, payload: unknown) => {
  writeFileSync(
    join(ARTIFACT_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
};

mkdirSync(ARTIFACT_DIR, { recursive: true });

const supplierGovernanceProof = readJson<ProofLike>(
  SUPPLIER_GOVERNANCE_PROOF,
  {},
);
const materialPricebookProof = readJson<ProofLike>(MATERIAL_PRICEBOOK_PROOF, {});
const persistenceProof = readJson<ProofLike>(PERSISTENCE_PROOF, {});
const coreParityProof = readJson<ProofLike>(CORE_PARITY_PROOF, {});

const supplierGovernanceStatus = readStatus(
  supplierGovernanceProof,
  "MISSING_SUPPLIER_PRICE_GOVERNANCE_PROOF",
);
const materialPricebookStatus = readStatus(
  materialPricebookProof,
  "MISSING_REAL_MATERIAL_PRICEBOOK_BINDING_PROOF",
);
const persistenceStatus = readStatus(
  persistenceProof,
  "MISSING_AI_ESTIMATE_UNIFIED_PERSISTENCE_PROOF",
);
const coreParityStatus = readStatus(
  coreParityProof,
  "MISSING_AI_ESTIMATE_CORE_PARITY_PROOF",
);

const supplierGovernanceGreen =
  supplierGovernanceStatus ===
  "GREEN_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE_READY";
const materialPricebookGreen =
  materialPricebookStatus ===
  "GREEN_AI_ESTIMATE_REAL_MATERIAL_CATALOG_AND_REGIONAL_PRICEBOOK_BINDING_READY";
const persistenceGreen =
  persistenceStatus ===
  "GREEN_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT_READY";
const coreParityGreen =
  coreParityStatus ===
  "GREEN_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY_READY";

const blockers: string[] = [];
if (!supplierGovernanceGreen) {
  blockers.push("BLOCKED_SUPPLIER_PRICE_GOVERNANCE_NOT_GREEN");
}
if (!materialPricebookGreen) {
  blockers.push("BLOCKED_REAL_MATERIAL_PRICEBOOK_BINDING_NOT_GREEN");
}
if (!persistenceGreen || !coreParityGreen) {
  blockers.push("BLOCKED_AI_ESTIMATE_PERSISTENCE_OR_CORE_NOT_GREEN");
}

const blocked = blockers.length > 0;

const prerequisiteCheck = {
  supplier_governance_required_status:
    "GREEN_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE_READY",
  supplier_governance_actual_status: supplierGovernanceStatus,
  supplier_governance_green: supplierGovernanceGreen,
  supplier_governance_primary_blocker:
    supplierGovernanceProof.primary_blocker ?? null,
  supplier_governance_failed_area:
    supplierGovernanceProof.failed_area ?? null,
  supplier_governance_blockers:
    supplierGovernanceProof.matrix?.blockers ?? [],
  supplier_governance_prerequisite_check:
    supplierGovernanceProof.prerequisite_check ?? null,
  material_pricebook_required_status:
    "GREEN_AI_ESTIMATE_REAL_MATERIAL_CATALOG_AND_REGIONAL_PRICEBOOK_BINDING_READY",
  material_pricebook_actual_status: materialPricebookStatus,
  material_pricebook_green: materialPricebookGreen,
  material_pricebook_primary_blocker:
    materialPricebookProof.primary_blocker ?? null,
  persistence_required_status:
    "GREEN_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT_READY",
  persistence_actual_status: persistenceStatus,
  persistence_green: persistenceGreen,
  persistence_primary_blocker: persistenceProof.primary_blocker ?? null,
  core_parity_required_status:
    "GREEN_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY_READY",
  core_parity_actual_status: coreParityStatus,
  core_parity_green: coreParityGreen,
  core_parity_primary_blocker: coreParityProof.primary_blocker ?? null,
  fake_green_claimed: false,
};

const blockedArtifact = (area: string) => ({
  wave: WAVE,
  status: blocked
    ? "BLOCKED_PRICEBOOK_ADMIN_BUYER_REVIEW_CONSOLE_AND_COVERAGE_DASHBOARD"
    : "READY_TO_START_PRICEBOOK_ADMIN_BUYER_REVIEW_CONSOLE_AND_COVERAGE_DASHBOARD",
  area,
  primary_blocker: blockers[0] ?? null,
  failed_area: blocked ? "prerequisite" : null,
  prerequisite_check: prerequisiteCheck,
  not_started_reason: blocked
    ? "Supplier price import and regional pricebook governance is not green, so buyer/admin pricebook console work was not started."
    : null,
  fake_green_claimed: false,
});

const routeInventory = {
  buyer_route_found: null,
  admin_route_found: null,
  selected_route: null,
  uses_existing_office_layout: false,
  route_inventory_performed: false,
  second_app_created: false,
  prerequisite_blocked: blocked,
  primary_blocker: blockers[0] ?? null,
  fake_green_claimed: false,
};

const matrix = {
  wave: WAVE,
  final_status: blocked
    ? "BLOCKED_PRICEBOOK_ADMIN_BUYER_REVIEW_CONSOLE_AND_COVERAGE_DASHBOARD"
    : "READY_TO_START_PRICEBOOK_ADMIN_BUYER_REVIEW_CONSOLE_AND_COVERAGE_DASHBOARD",
  fake_green_claimed: false,
  previous_supplier_price_governance_green: supplierGovernanceGreen,
  uses_existing_office_layout: false,
  second_app_created: false,
  price_import_screen_ready: false,
  review_queue_ready: false,
  review_filters_ready: false,
  ambiguous_match_requires_manual_choice: false,
  no_match_can_create_missing_material_backlog: false,
  raw_imported_prices_used_by_ai: null,
  approved_rows_create_pricebook_draft: false,
  regional_pricebook_publish_ready: false,
  rollback_supported_without_deleting_history: false,
  coverage_dashboard_ready: false,
  coverage_dashboard_10000_templates_visible: false,
  missing_material_backlog_ui_ready: false,
  missing_price_backlog_ui_ready: false,
  ai_estimate_uses_published_pricebook_version: false,
  old_snapshots_immutable_after_pricebook_publish: false,
  b2c_uses_published_pricebook: false,
  foreman_uses_published_pricebook: false,
  director_sees_same_price_metadata: false,
  buyer_sees_supplier_price_metadata: false,
  rbac_pricebook_admin_passed: false,
  consumer_can_publish_pricebook: null,
  foreman_can_publish_pricebook: null,
  audit_events_written: false,
  second_catalog_created: false,
  second_pricebook_created: false,
  code_desync_detected: null,
  net_code_bloat_risk: "NOT_ASSESSED_PREREQUISITE_BLOCKED",
  mojibake_found: null,
  english_debug_labels_visible: null,
  internal_keys_visible: null,
  typecheck_passed: null,
  lint_passed: null,
  focused_jest_passed: null,
  chromium_web_pricebook_admin_passed: false,
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
  failed_area: blocked ? "prerequisite" : null,
  expected:
    "Buyer/admin can import supplier prices, review/match/approve rows, publish regional pricebook versions, view coverage dashboard, and AI estimates use only published prices.",
  actual: blocked
    ? "Supplier price import and regional pricebook governance prerequisite is not green, so buyer/admin pricebook console work was not started."
    : "Prerequisites satisfied; run pricebook admin route inventory and implementation audits next.",
  failed_command: blocked
    ? "npx tsx scripts/e2e/runPricebookAdminCloseout.ts"
    : null,
  artifact: join(
    "artifacts",
    "S_PRICEBOOK_ADMIN_BUYER_REVIEW_CONSOLE_AND_COVERAGE_DASHBOARD",
    "CLOSEOUT_PROOF.json",
  ),
  fake_green_claimed: false,
};

writeJson("prerequisite_check.json", prerequisiteCheck);
writeJson("route_inventory.json", routeInventory);
writeJson("import_screen_matrix.json", blockedArtifact("import_screen"));
writeJson("review_queue_matrix.json", blockedArtifact("review_queue"));
writeJson("matching_decision_matrix.json", blockedArtifact("matching_decision"));
writeJson("publish_workflow_matrix.json", blockedArtifact("publish_workflow"));
writeJson("rollback_matrix.json", blockedArtifact("rollback"));
writeJson(
  "coverage_dashboard_matrix.json",
  blockedArtifact("coverage_dashboard"),
);
writeJson(
  "missing_material_backlog_matrix.json",
  blockedArtifact("missing_material_backlog"),
);
writeJson(
  "missing_price_backlog_matrix.json",
  blockedArtifact("missing_price_backlog"),
);
writeJson(
  "ai_estimate_refresh_matrix.json",
  blockedArtifact("ai_estimate_refresh"),
);
writeJson("rbac_matrix.json", blockedArtifact("rbac"));
writeJson("audit_event_matrix.json", blockedArtifact("audit_trail"));
writeJson(
  "code_desync_and_second_pricebook_guard.json",
  blockedArtifact("no_second_catalog_or_pricebook"),
);
writeJson("web_pricebook_admin_results.json", {
  ...blockedArtifact("web"),
  chromium_web_pricebook_admin_passed: false,
});
writeJson("matrix.json", matrix);
writeJson("CLOSEOUT_PROOF.json", closeoutProof);

console.log(JSON.stringify(matrix, null, 2));
