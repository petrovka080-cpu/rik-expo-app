import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WAVE =
  "S_AI_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_BENCHMARK_CALIBRATION_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_BENCHMARK_CALIBRATION",
);

const PROOFS = {
  formulaEngine: {
    path: join(
      process.cwd(),
      "artifacts",
      "S_AI_ESTIMATE_NORMATIVE_QUANTITY_FORMULA_ENGINE_V2",
      "CLOSEOUT_PROOF.json",
    ),
    required: "GREEN_AI_ESTIMATE_NORMATIVE_QUANTITY_FORMULA_ENGINE_V2_READY",
    missing: "MISSING_AI_ESTIMATE_FORMULA_ENGINE_V2_PROOF",
  },
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
  coreParity: {
    path: join(
      process.cwd(),
      "artifacts",
      "S_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY",
      "CLOSEOUT_PROOF.json",
    ),
    required:
      "GREEN_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY_READY",
    missing: "MISSING_AI_ESTIMATE_CORE_PARITY_PROOF",
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

const formulaOrCoreGreen = proofResults.formulaEngine.green && proofResults.coreV2.green;
const allPrerequisitesGreen = Object.values(proofResults).every(
  (result) => result.green,
);
const blockers: string[] = [];
if (!formulaOrCoreGreen) {
  blockers.push("BLOCKED_AI_ESTIMATE_CORE_OR_FORMULA_NOT_GREEN");
}
if (!allPrerequisitesGreen && formulaOrCoreGreen) {
  blockers.push("BLOCKED_AI_ESTIMATE_QUALITY_GATE_PREREQUISITES_NOT_GREEN");
}

const blocked = blockers.length > 0;

const prerequisiteCheck = {
  ...proofResults,
  formula_and_core_green: formulaOrCoreGreen,
  all_quality_gate_prerequisites_green: allPrerequisitesGreen,
  fake_green_claimed: false,
};

const blockedArtifact = (area: string) => ({
  wave: WAVE,
  status: blocked
    ? "BLOCKED_AI_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_BENCHMARK_CALIBRATION"
    : "READY_TO_START_AI_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_BENCHMARK_CALIBRATION",
  area,
  primary_blocker: blockers[0] ?? null,
  failed_area: blocked ? "prerequisite" : null,
  prerequisite_check: prerequisiteCheck,
  not_started_reason: blocked
    ? "AI estimate professional quality gate was not started because formula engine or core quality prerequisites are not green."
    : null,
  fake_green_claimed: false,
});

const qualityGateInventory = {
  existing_quality_gate_found: null,
  existing_quality_validators_found: [],
  inventory_performed: false,
  recommended_strategy: blocked
    ? "block_until_formula_engine_and_core_v2_green_then_inventory_existing_quality_gate_layer"
    : "inventory_existing_quality_gate_layer_then_extend_without_second_gate",
  single_quality_gate_used: false,
  second_quality_gate_created: false,
  primary_blocker: blockers[0] ?? null,
  fake_green_claimed: false,
};

const qualityRepairBacklog = {
  status: blocked
    ? "BLOCKED_AI_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_BENCHMARK_CALIBRATION"
    : "READY_TO_START_AI_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_BENCHMARK_CALIBRATION",
  primary_blocker: blockers[0] ?? null,
  prerequisite_check: prerequisiteCheck,
  p0: [],
  p1: [],
  p2: [],
  recommendedRepairs: [],
  not_started_reason: blocked
    ? "Quality benchmark and quality gate audits did not run because prerequisites are not green, so no P0 repair root cause can be claimed yet."
    : null,
  fake_green_claimed: false,
};

const matrix = {
  wave: WAVE,
  final_status: blocked
    ? "BLOCKED_AI_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_BENCHMARK_CALIBRATION"
    : "READY_TO_START_AI_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_BENCHMARK_CALIBRATION",
  fake_green_claimed: false,
  previous_formula_engine_green: proofResults.formulaEngine.green,
  previous_core_v2_quality_green: proofResults.coreV2.green,
  previous_material_pricebook_green: proofResults.materialPricebook.green,
  previous_persistence_green: proofResults.persistence.green,
  previous_core_parity_green: proofResults.coreParity.green,
  quality_gate_enabled: false,
  single_quality_gate_used: false,
  second_quality_gate_created: false,
  professional_benchmark_cases_total: 0,
  professional_benchmark_passed_min_970: false,
  p0_quality_failures: null,
  wrong_work_key_p0: null,
  cross_work_contamination_p0: null,
  fake_price_p0: null,
  wrong_currency_p0: null,
  snapshot_hash_mismatch_p0: null,
  material_completeness_validator_passed: false,
  forbidden_material_validator_passed: false,
  quantity_sanity_validator_passed: false,
  formula_sanity_validator_passed: false,
  price_sanity_validator_passed: false,
  currency_quality_validator_passed: false,
  procurement_readiness_validator_passed: false,
  director_submission_gate_passed: false,
  p0_estimate_can_submit_to_director: null,
  buyer_procurement_gate_passed: false,
  labor_rows_sent_to_buyer: null,
  quality_control_rows_sent_to_buyer: null,
  overhead_tax_rows_sent_to_buyer: null,
  pdf_history_gate_passed: false,
  quality_repair_backlog_written: true,
  repair_actions_taken_written: true,
  p0_repairs_completed: false,
  acceptance_1560_quality_passed: false,
  hard_cases_500_passed: false,
  visible_smoke_100_passed: false,
  consumer_quality_gate_used: false,
  foreman_quality_gate_used: false,
  director_quality_report_visible: false,
  buyer_procurement_quality_gate_used: false,
  pdf_quality_gate_used: false,
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
    "AI estimates pass a professional quality gate before user/director/buyer/PDF usage, with zero P0 quality failures.",
  actual: blocked
    ? "Formula engine or Core V2 prerequisite is not green, so professional quality gate and benchmark calibration was not started."
    : "Prerequisites satisfied; run quality gate inventory, benchmark, repair, and acceptance audits next.",
  failed_command: blocked
    ? "npx tsx scripts/e2e/runAiEstimateQualityGateCloseout.ts"
    : null,
  artifact: join(
    "artifacts",
    "S_AI_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_BENCHMARK_CALIBRATION",
    "CLOSEOUT_PROOF.json",
  ),
  fake_green_claimed: false,
};

writeJson("prerequisite_check.json", prerequisiteCheck);
writeJson("quality_gate_inventory.json", qualityGateInventory);
writeJson("professional_benchmark_manifest_1000.json", {
  ...blockedArtifact("benchmark_1000"),
  dataset_path:
    "data/aiEstimateQualityGate/professional_estimate_benchmark_1000.jsonl",
  professional_benchmark_cases_total: 0,
});
writeJson(
  "professional_benchmark_results_1000.json",
  blockedArtifact("benchmark_1000"),
);
writeJson(
  "material_completeness_matrix.json",
  blockedArtifact("material_completeness"),
);
writeJson(
  "forbidden_material_matrix.json",
  blockedArtifact("forbidden_material"),
);
writeJson("quantity_sanity_matrix.json", blockedArtifact("quantity_sanity"));
writeJson("price_sanity_matrix.json", blockedArtifact("price_sanity"));
writeJson(
  "procurement_readiness_matrix.json",
  blockedArtifact("procurement_readiness"),
);
writeJson(
  "director_submission_gate_matrix.json",
  blockedArtifact("director_gate"),
);
writeJson("pdf_history_gate_matrix.json", blockedArtifact("pdf_history_gate"));
writeJson(
  "acceptance_1560_quality_results.json",
  blockedArtifact("1560_acceptance"),
);
writeJson("hard_cases_500_results.json", blockedArtifact("hard_cases_500"));
writeJson(
  "visible_smoke_100_results.json",
  blockedArtifact("visible_smoke_100"),
);
writeJson("quality_repair_backlog.json", qualityRepairBacklog);
writeJson("repair_actions_taken.json", {
  ...blockedArtifact("repair_backlog"),
  actions_taken: [],
});
writeJson(
  "code_desync_and_quality_gate_bloat_guard.json",
  blockedArtifact("code_desync"),
);
writeJson("matrix.json", matrix);
writeJson("CLOSEOUT_PROOF.json", closeoutProof);

console.log(JSON.stringify(matrix, null, 2));
