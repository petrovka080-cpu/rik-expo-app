import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WAVE =
  "S_AI_ESTIMATE_NORMATIVE_QUANTITY_FORMULA_ENGINE_V2_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_NORMATIVE_QUANTITY_FORMULA_ENGINE_V2",
);

const PROOFS = {
  coreV2: {
    path: join(
      process.cwd(),
      "artifacts",
      "S_AI_ESTIMATE_CORE_V2_SEMANTIC_QUALITY_AND_REPAIR_LOOP",
      "CLOSEOUT_PROOF.json",
    ),
    required:
      "GREEN_AI_ESTIMATE_CORE_V2_SEMANTIC_QUALITY_AND_REPAIR_LOOP_READY",
    missing: "MISSING_AI_ESTIMATE_CORE_V2_PROOF",
  },
  materialPricebook: {
    path: join(
      process.cwd(),
      "artifacts",
      "S_AI_ESTIMATE_REAL_MATERIAL_CATALOG_AND_REGIONAL_PRICEBOOK_BINDING",
      "CLOSEOUT_PROOF.json",
    ),
    required:
      "GREEN_AI_ESTIMATE_REAL_MATERIAL_CATALOG_AND_REGIONAL_PRICEBOOK_BINDING_READY",
    missing: "MISSING_REAL_MATERIAL_PRICEBOOK_BINDING_PROOF",
  },
  templates10000: {
    path: join(
      process.cwd(),
      "artifacts",
      "S_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES",
      "CLOSEOUT_PROOF.json",
    ),
    required:
      "GREEN_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES_READY",
    missing: "MISSING_10000_TEMPLATE_PROOF",
  },
  persistence: {
    path: join(
      process.cwd(),
      "artifacts",
      "S_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT",
      "CLOSEOUT_PROOF.json",
    ),
    required:
      "GREEN_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT_READY",
    missing: "MISSING_AI_ESTIMATE_UNIFIED_PERSISTENCE_PROOF",
  },
} as const;

type ProofKey = keyof typeof PROOFS;

type ProofLike = {
  final_status?: string;
  status?: string;
  primary_blocker?: string | null;
  failed_area?: string | null;
  matrix?: {
    final_status?: string;
    blockers?: string[];
    live_chain_blocker?: string | null;
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

const proofResults = Object.entries(PROOFS).reduce(
  (acc, [key, config]) => {
    const proof = readJson<ProofLike>(config.path, {});
    const actualStatus = readStatus(proof, config.missing);
    acc[key as ProofKey] = {
      required_status: config.required,
      actual_status: actualStatus,
      green: actualStatus === config.required,
      primary_blocker: proof.primary_blocker ?? null,
      failed_area: proof.failed_area ?? null,
      blockers: proof.matrix?.blockers ?? [],
      live_chain_blocker: proof.matrix?.live_chain_blocker ?? null,
      prerequisite_check: proof.prerequisite_check ?? null,
    };
    return acc;
  },
  {} as Record<
    ProofKey,
    {
      required_status: string;
      actual_status: string;
      green: boolean;
      primary_blocker: string | null;
      failed_area: string | null;
      blockers: string[];
      live_chain_blocker: string | null;
      prerequisite_check: Record<string, unknown> | null;
    }
  >,
);

const blockers: string[] = [];
if (!proofResults.coreV2.green) {
  blockers.push("BLOCKED_AI_ESTIMATE_CORE_V2_NOT_GREEN");
}

const blocked = blockers.length > 0;

const prerequisiteCheck = {
  ...proofResults,
  core_v2_required_for_start: proofResults.coreV2.green,
  recommended_material_pricebook_green: proofResults.materialPricebook.green,
  recommended_10000_templates_green: proofResults.templates10000.green,
  recommended_persistence_green: proofResults.persistence.green,
  fake_green_claimed: false,
};

const blockedArtifact = (area: string) => ({
  wave: WAVE,
  status: blocked
    ? "BLOCKED_AI_ESTIMATE_NORMATIVE_QUANTITY_FORMULA_ENGINE_V2"
    : "READY_TO_START_AI_ESTIMATE_NORMATIVE_QUANTITY_FORMULA_ENGINE_V2",
  area,
  primary_blocker: blockers[0] ?? null,
  failed_area: blocked ? "prerequisite" : null,
  prerequisite_check: prerequisiteCheck,
  not_started_reason: blocked
    ? "AI estimate formula engine v2 was not started because Core V2 semantic quality is not green."
    : null,
  fake_green_claimed: false,
});

const formulaInventory = {
  existing_formula_engine_found: null,
  existing_quantity_formulas_found: [],
  existing_unit_conversion_found: null,
  existing_waste_policy_found: null,
  existing_labor_productivity_found: null,
  inventory_performed: false,
  recommended_strategy: blocked
    ? "block_until_core_v2_green_then_inventory_existing_formula_layer"
    : "inventory_existing_formula_layer_then_extend_without_second_engine",
  second_formula_engine_created: false,
  primary_blocker: blockers[0] ?? null,
  fake_green_claimed: false,
};

const matrix = {
  wave: WAVE,
  final_status: blocked
    ? "BLOCKED_AI_ESTIMATE_NORMATIVE_QUANTITY_FORMULA_ENGINE_V2"
    : "READY_TO_START_AI_ESTIMATE_NORMATIVE_QUANTITY_FORMULA_ENGINE_V2",
  fake_green_claimed: false,
  previous_core_v2_quality_green: proofResults.coreV2.green,
  normative_formula_engine_v2_enabled: false,
  second_formula_engine_created: false,
  material_quantity_formulas_passed: false,
  labor_productivity_formulas_passed: false,
  equipment_usage_formulas_passed: false,
  waste_factor_policy_passed: false,
  complexity_coefficient_policy_passed: false,
  unit_conversion_guards_passed: false,
  manual_input_required_policy_passed: false,
  templates_checked: 0,
  formula_rows_checked_min: 0,
  invalid_formulas: null,
  nan_quantities: null,
  negative_quantities: null,
  fake_precision_claimed: null,
  acceptance_1560_formula_passed: false,
  manual_review_500_passed: false,
  pricebook_policy_preserved: false,
  snapshot_revision_policy_preserved: false,
  consumer_foreman_parity_preserved: false,
  code_desync_detected: null,
  net_code_bloat_risk: "NOT_ASSESSED_PREREQUISITE_BLOCKED",
  typecheck_passed: null,
  lint_passed: null,
  focused_jest_passed: null,
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
    "AI estimate formula engine calculates professional quantities, waste, labor, equipment and assumptions without fake precision.",
  actual: blocked
    ? "Core V2 semantic quality prerequisite is not green, so normative quantity formula engine v2 was not started."
    : "Prerequisites satisfied; run formula inventory, validation, 1560 formula acceptance, and manual review audits next.",
  failed_command: blocked
    ? "npx tsx scripts/e2e/runAiEstimateFormulaEngineCloseout.ts"
    : null,
  artifact: join(
    "artifacts",
    "S_AI_ESTIMATE_NORMATIVE_QUANTITY_FORMULA_ENGINE_V2",
    "CLOSEOUT_PROOF.json",
  ),
  fake_green_claimed: false,
};

writeJson("prerequisite_check.json", prerequisiteCheck);
writeJson("formula_inventory.json", formulaInventory);
writeJson(
  "material_quantity_formula_matrix.json",
  blockedArtifact("material_quantity"),
);
writeJson("labor_productivity_matrix.json", blockedArtifact("labor_productivity"));
writeJson("equipment_usage_matrix.json", blockedArtifact("equipment_usage"));
writeJson("waste_factor_matrix.json", blockedArtifact("waste_factor"));
writeJson(
  "complexity_coefficient_matrix.json",
  blockedArtifact("complexity_coefficient"),
);
writeJson(
  "unit_conversion_guard_matrix.json",
  blockedArtifact("unit_conversion"),
);
writeJson(
  "manual_input_required_matrix.json",
  blockedArtifact("manual_input_required"),
);
writeJson(
  "formula_validation_10000.json",
  blockedArtifact("formula_validation_10000"),
);
writeJson(
  "acceptance_1560_formula_results.json",
  blockedArtifact("acceptance_1560"),
);
writeJson(
  "manual_review_500_results.json",
  blockedArtifact("manual_review_500"),
);
writeJson("no_fake_precision_matrix.json", blockedArtifact("no_fake_precision"));
writeJson(
  "code_desync_and_second_formula_engine_guard.json",
  blockedArtifact("code_desync"),
);
writeJson("matrix.json", matrix);
writeJson("CLOSEOUT_PROOF.json", closeoutProof);

console.log(JSON.stringify(matrix, null, 2));
