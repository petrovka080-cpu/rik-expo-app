import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WAVE =
  "S_AI_ESTIMATE_CORE_V2_SEMANTIC_QUALITY_AND_REPAIR_LOOP_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_CORE_V2_SEMANTIC_QUALITY_AND_REPAIR_LOOP",
);

const PROOFS = {
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
  productionSafety: {
    path: join(
      process.cwd(),
      "artifacts",
      "S_AI_ESTIMATE_PRODUCTION_SAFE_RELEASE_READINESS_AND_CANARY_GATES",
      "CLOSEOUT_PROOF.json",
    ),
    required:
      "GREEN_AI_ESTIMATE_PRODUCTION_SAFE_RELEASE_READINESS_AND_CANARY_GATES_READY",
    missing: "MISSING_AI_ESTIMATE_PRODUCTION_SAFETY_PROOF",
  },
} as const;

type ProofKey = keyof typeof PROOFS;

type ProofLike = {
  final_status?: string;
  status?: string;
  primary_blocker?: string | null;
  failed_area?: string | null;
  actual?: string;
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

const allPrerequisitesGreen = Object.values(proofResults).every(
  (result) => result.green,
);
const blockers = allPrerequisitesGreen
  ? []
  : ["BLOCKED_AI_ESTIMATE_CORE_PREREQUISITES_NOT_GREEN"];
const blocked = blockers.length > 0;

const prerequisiteCheck = {
  ...proofResults,
  all_core_v2_prerequisites_green: allPrerequisitesGreen,
  fake_green_claimed: false,
};

const blockedArtifact = (area: string) => ({
  wave: WAVE,
  status: blocked
    ? "BLOCKED_AI_ESTIMATE_CORE_V2_SEMANTIC_QUALITY_AND_REPAIR_LOOP"
    : "READY_TO_START_AI_ESTIMATE_CORE_V2_SEMANTIC_QUALITY_AND_REPAIR_LOOP",
  area,
  primary_blocker: blockers[0] ?? null,
  failed_area: blocked ? "prerequisite" : null,
  prerequisite_check: prerequisiteCheck,
  not_started_reason: blocked
    ? "AI estimate core v2 semantic quality work was not started because required prerequisite waves are not green."
    : null,
  fake_green_claimed: false,
});

const matrix = {
  wave: WAVE,
  final_status: blocked
    ? "BLOCKED_AI_ESTIMATE_CORE_V2_SEMANTIC_QUALITY_AND_REPAIR_LOOP"
    : "READY_TO_START_AI_ESTIMATE_CORE_V2_SEMANTIC_QUALITY_AND_REPAIR_LOOP",
  fake_green_claimed: false,
  prerequisites_green: allPrerequisitesGreen,
  previous_10000_templates_green: proofResults.templates10000.green,
  previous_core_parity_green: proofResults.coreParity.green,
  previous_material_pricebook_green: proofResults.materialPricebook.green,
  previous_production_safety_green: proofResults.productionSafety.green,
  core_quality_v2_enabled: false,
  second_ai_estimate_core_created: false,
  golden_scenarios_total: 0,
  golden_scenarios_passed_min_4925: false,
  p0_wrong_work_key: null,
  p0_wrong_category: null,
  p0_cross_work_contamination: null,
  p0_wrong_currency: null,
  p0_fake_price: null,
  quantity_unit_cases_total: 0,
  quantity_parse_accuracy_min_995: false,
  unit_parse_accuracy_min_995: false,
  critical_quantity_failures: null,
  confusion_groups_passed: false,
  high_confidence_wrong_matches: null,
  generic_known_work_fallback: null,
  confidence_gate_passed: false,
  ambiguity_gate_passed: false,
  clarifying_questions_passed: false,
  semantic_validator_passed: false,
  repair_backlog_written: true,
  repair_actions_taken_written: true,
  p0_p1_core_repairs_done: false,
  acceptance_1560_after_repair_passed: false,
  consumer_core_parity_preserved: false,
  foreman_core_parity_preserved: false,
  director_does_not_recompile: null,
  buyer_does_not_recompile: null,
  pdf_history_snapshot_preserved: false,
  fake_prices_found: null,
  random_prices_found: null,
  wrong_currency_cases: null,
  mojibake_found: null,
  english_debug_labels_visible: null,
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

const repairBacklog = {
  status: blocked
    ? "BLOCKED_AI_ESTIMATE_CORE_V2_SEMANTIC_QUALITY_AND_REPAIR_LOOP"
    : "READY_TO_START_AI_ESTIMATE_CORE_V2_SEMANTIC_QUALITY_AND_REPAIR_LOOP",
  primary_blocker: blockers[0] ?? null,
  prerequisite_check: prerequisiteCheck,
  p0_failures: [],
  p1_failures: [],
  p2_failures: [],
  recommended_repairs: [],
  not_started_reason: blocked
    ? "Semantic audit did not run because prerequisites are not green, so no P0/P1 repair root cause can be claimed yet."
    : null,
  fake_green_claimed: false,
};

const closeoutProof = {
  matrix,
  prerequisite_check: prerequisiteCheck,
  status: matrix.final_status,
  primary_blocker: blockers[0] ?? null,
  failed_area: blocked ? "prerequisite" : null,
  expected:
    "AI estimate core v2 improves semantic correctness, rejects ambiguous inputs, prevents wrong confident matches and cross-work contamination, and passes 1560 regression after repair.",
  actual: blocked
    ? "Required prerequisite waves are not green, so core v2 semantic quality and repair loop was not started."
    : "Prerequisites satisfied; run core v2 semantic dataset, validator, repair, and regression audits next.",
  failed_command: blocked
    ? "npx tsx scripts/e2e/runAiEstimateCoreV2Closeout.ts"
    : null,
  artifact: join(
    "artifacts",
    "S_AI_ESTIMATE_CORE_V2_SEMANTIC_QUALITY_AND_REPAIR_LOOP",
    "CLOSEOUT_PROOF.json",
  ),
  fake_green_claimed: false,
};

writeJson("prerequisite_check.json", prerequisiteCheck);
writeJson("golden_scenario_manifest.json", {
  ...blockedArtifact("golden_dataset"),
  dataset_path: "data/aiEstimateCoreQuality/golden_core_scenarios_5000.jsonl",
  golden_scenarios_total: 0,
});
writeJson(
  "golden_scenario_results_5000.json",
  blockedArtifact("intent_recognition"),
);
writeJson(
  "quantity_unit_stress_results_2000.json",
  blockedArtifact("quantity_unit"),
);
writeJson("confusion_group_matrix.json", blockedArtifact("confusion_groups"));
writeJson("semantic_validator_matrix.json", blockedArtifact("semantic_validator"));
writeJson(
  "confidence_ambiguity_matrix.json",
  blockedArtifact("confidence_gate_ambiguity_gate"),
);
writeJson(
  "clarifying_question_matrix.json",
  blockedArtifact("clarifying_questions"),
);
writeJson("repair_backlog.json", repairBacklog);
writeJson("repair_actions_taken.json", {
  ...blockedArtifact("repair_backlog"),
  actions_taken: [],
});
writeJson(
  "acceptance_1560_after_repair.json",
  blockedArtifact("1560_regression"),
);
writeJson(
  "code_desync_and_second_core_guard.json",
  blockedArtifact("code_desync"),
);
writeJson("matrix.json", matrix);
writeJson("CLOSEOUT_PROOF.json", closeoutProof);

console.log(JSON.stringify(matrix, null, 2));
