import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WAVE =
  "S_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = join(
  process.cwd(),
  "artifacts",
  "S_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE",
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

const materialPricebookProof = readJson<ProofLike>(MATERIAL_PRICEBOOK_PROOF, {});
const persistenceProof = readJson<ProofLike>(PERSISTENCE_PROOF, {});
const coreParityProof = readJson<ProofLike>(CORE_PARITY_PROOF, {});

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
if (!materialPricebookGreen) {
  blockers.push("BLOCKED_REAL_MATERIAL_PRICEBOOK_BINDING_NOT_GREEN");
}
if (!persistenceGreen || !coreParityGreen) {
  blockers.push("BLOCKED_AI_ESTIMATE_PERSISTENCE_OR_CORE_NOT_GREEN");
}

const blocked = blockers.length > 0;

const prerequisiteCheck = {
  material_pricebook_required_status:
    "GREEN_AI_ESTIMATE_REAL_MATERIAL_CATALOG_AND_REGIONAL_PRICEBOOK_BINDING_READY",
  material_pricebook_actual_status: materialPricebookStatus,
  material_pricebook_green: materialPricebookGreen,
  material_pricebook_primary_blocker:
    materialPricebookProof.primary_blocker ?? null,
  material_pricebook_failed_area: materialPricebookProof.failed_area ?? null,
  material_pricebook_blockers:
    materialPricebookProof.matrix?.blockers ?? [],
  material_pricebook_prerequisite_check:
    materialPricebookProof.prerequisite_check ?? null,
  persistence_recommended_status:
    "GREEN_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT_READY",
  persistence_actual_status: persistenceStatus,
  persistence_green: persistenceGreen,
  persistence_primary_blocker: persistenceProof.primary_blocker ?? null,
  core_parity_recommended_status:
    "GREEN_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY_READY",
  core_parity_actual_status: coreParityStatus,
  core_parity_green: coreParityGreen,
  core_parity_primary_blocker: coreParityProof.primary_blocker ?? null,
  fake_green_claimed: false,
};

const blockedArtifact = (area: string) => ({
  wave: WAVE,
  status: blocked
    ? "BLOCKED_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE"
    : "READY_TO_START_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE",
  area,
  primary_blocker: blockers[0] ?? null,
  failed_area: blocked ? "prerequisite" : null,
  prerequisite_check: prerequisiteCheck,
  not_started_reason: blocked
    ? "Real material catalog and regional pricebook binding is not green, so supplier price import governance was not started."
    : null,
  fake_green_claimed: false,
});

const inventory = {
  existing_supplier_tables_found: [],
  existing_price_import_found: false,
  existing_pricebook_tables_found: [],
  existing_catalog_items_source: blocked
    ? "NOT_INVENTORIED_PREREQUISITE_BLOCKED"
    : "NOT_INVENTORIED_RUN_DETAILED_INVENTORY_NEXT",
  existing_buyer_review_flow_found: false,
  second_catalog_detected: false,
  second_pricebook_detected: false,
  recommended_strategy:
    "block_until_real_material_pricebook_binding_green_then_extend_existing_or_add_additive_governance_layer",
  prerequisite_blocked: blocked,
  primary_blocker: blockers[0] ?? null,
  fake_green_claimed: false,
};

const matrix = {
  wave: WAVE,
  final_status: blocked
    ? "BLOCKED_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE"
    : "READY_TO_START_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE",
  fake_green_claimed: false,
  previous_real_material_pricebook_binding_green: materialPricebookGreen,
  supplier_price_import_supported: false,
  csv_import_supported: false,
  xlsx_import_supported: false,
  json_import_supported: false,
  unit_normalization_passed: false,
  currency_validation_passed: false,
  usd_auto_approved_for_kg_kz: null,
  canonical_material_matching_used: false,
  catalog_item_matching_used: false,
  first_match_fallback_used: null,
  ambiguous_matches_require_review: false,
  review_approval_required_before_ai_usage: false,
  unapproved_prices_used_by_ai_estimate: null,
  regional_pricebook_versions_created: false,
  approved_regional_pricebook_items_min: 0,
  freshness_policy_passed: false,
  conflict_policy_passed: false,
  outlier_policy_passed: false,
  ai_estimate_uses_approved_pricebook_only: false,
  missing_price_when_no_approved_price: false,
  user_override_does_not_pollute_pricebook: false,
  user_override_creates_revision: false,
  buyer_sees_supplier_price_metadata: false,
  buyer_sees_price_missing_when_no_approved_price: false,
  fake_suppliers_found: null,
  fake_prices_found: null,
  random_prices_found: null,
  zero_as_known_price_found: null,
  second_catalog_created: false,
  second_pricebook_created: false,
  code_desync_detected: null,
  net_code_bloat_risk: "NOT_ASSESSED_PREREQUISITE_BLOCKED",
  typecheck_passed: null,
  lint_passed: null,
  focused_jest_passed: null,
  chromium_web_supplier_price_import_passed: false,
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
    "Supplier price imports are parsed, normalized, reviewed, approved into regional pricebook versions, and used by AI estimates only after approval.",
  actual: blocked
    ? "Real material catalog and regional pricebook binding prerequisite is not green, so supplier price import governance was not started."
    : "Prerequisites satisfied; run supplier price import inventory and implementation audits next.",
  failed_command: blocked
    ? "npx tsx scripts/e2e/runSupplierPriceImportCloseout.ts"
    : null,
  artifact: join(
    "artifacts",
    "S_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE",
    "CLOSEOUT_PROOF.json",
  ),
  fake_green_claimed: false,
};

writeJson("prerequisite_check.json", prerequisiteCheck);
writeJson("inventory.json", inventory);
writeJson("import_parse_matrix.json", blockedArtifact("import_parse"));
writeJson(
  "normalization_validation_matrix.json",
  blockedArtifact("unit_normalization_currency_validation"),
);
writeJson("material_matching_matrix.json", blockedArtifact("material_matching"));
writeJson("review_approval_matrix.json", blockedArtifact("review_approval"));
writeJson(
  "regional_pricebook_version_matrix.json",
  blockedArtifact("pricebook_versioning"),
);
writeJson(
  "freshness_conflict_outlier_matrix.json",
  blockedArtifact("freshness_conflict_outlier"),
);
writeJson(
  "ai_estimate_approved_pricebook_usage_matrix.json",
  blockedArtifact("ai_estimate_usage"),
);
writeJson(
  "user_override_does_not_pollute_pricebook_matrix.json",
  blockedArtifact("user_override"),
);
writeJson(
  "buyer_supplier_metadata_matrix.json",
  blockedArtifact("buyer_integration"),
);
writeJson(
  "code_desync_and_second_catalog_guard.json",
  blockedArtifact("no_second_catalog_or_pricebook"),
);
writeJson("web_supplier_price_import_results.json", {
  ...blockedArtifact("web"),
  chromium_web_supplier_price_import_passed: false,
});
writeJson("matrix.json", matrix);
writeJson("CLOSEOUT_PROOF.json", closeoutProof);

console.log(JSON.stringify(matrix, null, 2));
