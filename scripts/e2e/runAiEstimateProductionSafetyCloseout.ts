import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WAVE =
  "S_AI_ESTIMATE_PRODUCTION_SAFE_RELEASE_READINESS_AND_CANARY_GATES_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_PRODUCTION_SAFE_RELEASE_READINESS_AND_CANARY_GATES",
);

const PROOFS = {
  pricebookAdmin: {
    path: join(
      process.cwd(),
      "artifacts",
      "S_PRICEBOOK_ADMIN_BUYER_REVIEW_CONSOLE_AND_COVERAGE_DASHBOARD",
      "CLOSEOUT_PROOF.json",
    ),
    required:
      "GREEN_PRICEBOOK_ADMIN_BUYER_REVIEW_CONSOLE_AND_COVERAGE_DASHBOARD_READY",
    missing: "MISSING_PRICEBOOK_ADMIN_CONSOLE_PROOF",
  },
  supplierGovernance: {
    path: join(
      process.cwd(),
      "artifacts",
      "S_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE",
      "CLOSEOUT_PROOF.json",
    ),
    required:
      "GREEN_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE_READY",
    missing: "MISSING_SUPPLIER_PRICE_GOVERNANCE_PROOF",
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
  foremanChain: {
    path: join(
      process.cwd(),
      "artifacts",
      "S_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE",
      "CLOSEOUT_PROOF.json",
    ),
    required: "GREEN_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE_READY",
    missing: "MISSING_FOREMAN_CHAIN_PROOF",
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

const writeText = (fileName: string, content: string) => {
  writeFileSync(join(ARTIFACT_DIR, fileName), `${content.trim()}\n`, "utf8");
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

const allPreviousGreen = Object.values(proofResults).every(
  (result) => result.green,
);
const blockers = allPreviousGreen
  ? []
  : ["BLOCKED_PREVIOUS_AI_ESTIMATE_WAVE_NOT_GREEN"];

const blocked = blockers.length > 0;

const prerequisiteCheck = {
  ...proofResults,
  all_previous_ai_estimate_waves_green: allPreviousGreen,
  fake_green_claimed: false,
};

const blockedArtifact = (area: string) => ({
  wave: WAVE,
  status: blocked
    ? "BLOCKED_AI_ESTIMATE_PRODUCTION_SAFE_RELEASE_READINESS_AND_CANARY_GATES"
    : "READY_TO_START_AI_ESTIMATE_PRODUCTION_SAFE_RELEASE_READINESS_AND_CANARY_GATES",
  area,
  primary_blocker: blockers[0] ?? null,
  failed_area: blocked ? "prerequisite" : null,
  prerequisite_check: prerequisiteCheck,
  not_started_reason: blocked
    ? "One or more required AI estimate prerequisite waves are not green, so production safety readiness work was not started."
    : null,
  production_rollout_enabled: false,
  public_rollout_enabled: false,
  fake_green_claimed: false,
});

const matrix = {
  wave: WAVE,
  final_status: blocked
    ? "BLOCKED_AI_ESTIMATE_PRODUCTION_SAFE_RELEASE_READINESS_AND_CANARY_GATES"
    : "READY_TO_START_AI_ESTIMATE_PRODUCTION_SAFE_RELEASE_READINESS_AND_CANARY_GATES",
  fake_green_claimed: false,
  previous_pricebook_admin_console_green: proofResults.pricebookAdmin.green,
  feature_flags_ready: false,
  global_kill_switch_ready: false,
  existing_snapshots_readable_when_disabled: false,
  production_rollout_enabled: false,
  public_rollout_enabled: false,
  rbac_rls_passed: false,
  consumer_foreman_data_leak_found: null,
  buyer_labor_leak_found: null,
  data_integrity_passed: false,
  snapshot_immutability_passed: false,
  revision_integrity_passed: false,
  pricebook_publish_does_not_mutate_old_snapshots: false,
  db_migration_safety_passed: false,
  destructive_sql_found: null,
  production_db_write_attempted: false,
  performance_budgets_passed: false,
  telemetry_ready: false,
  telemetry_contains_secrets: null,
  telemetry_contains_raw_sensitive_prompt: null,
  error_handling_passed: false,
  silent_success_found: null,
  fake_generic_fallback_found: null,
  security_secret_scan_passed: false,
  secrets_written_to_artifacts: false,
  web_uat_passed: false,
  canary_rollout_plan_written: true,
  rollback_plan_written: true,
  code_desync_detected: null,
  net_code_bloat_risk: "NOT_ASSESSED_PREREQUISITE_BLOCKED",
  typecheck_passed: null,
  lint_passed: null,
  focused_jest_passed: null,
  chromium_web_uat_passed: false,
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
    "AI estimate platform is production-safe behind feature flags with rollback, RBAC/RLS, performance budgets, telemetry, security scan, canary plan and no public rollout enabled.",
  actual: blocked
    ? "At least one required previous AI estimate wave is not green, so production safety readiness was not started."
    : "Prerequisites satisfied; run production safety readiness audits next.",
  failed_command: blocked
    ? "npx tsx scripts/e2e/runAiEstimateProductionSafetyCloseout.ts"
    : null,
  artifact: join(
    "artifacts",
    "S_AI_ESTIMATE_PRODUCTION_SAFE_RELEASE_READINESS_AND_CANARY_GATES",
    "CLOSEOUT_PROOF.json",
  ),
  fake_green_claimed: false,
};

writeJson("prerequisite_check.json", prerequisiteCheck);
writeJson("feature_flag_matrix.json", blockedArtifact("feature_flags"));
writeJson("kill_switch_matrix.json", blockedArtifact("kill_switch"));
writeJson("rbac_rls_matrix.json", blockedArtifact("rbac_rls"));
writeJson("data_integrity_matrix.json", blockedArtifact("data_integrity"));
writeJson("db_migration_safety_matrix.json", blockedArtifact("db_safety"));
writeJson("performance_budget_matrix.json", blockedArtifact("performance"));
writeJson("telemetry_matrix.json", blockedArtifact("telemetry"));
writeJson("error_handling_matrix.json", blockedArtifact("error_handling"));
writeJson("security_secret_scan.json", blockedArtifact("security"));
writeJson("web_uat_results.json", {
  ...blockedArtifact("web_uat"),
  chromium_web_uat_passed: false,
});
writeJson("code_desync_guard.json", blockedArtifact("code_desync"));
writeJson("matrix.json", matrix);
writeJson("CLOSEOUT_PROOF.json", closeoutProof);

writeText(
  "canary_rollout_plan.md",
  `
# AI Estimate Canary Rollout Plan

Status: BLOCKED_PREREQUISITE_NOT_GREEN

No public rollout is enabled by this artifact.

Required before this plan can be activated:
- GREEN_PRICEBOOK_ADMIN_BUYER_REVIEW_CONSOLE_AND_COVERAGE_DASHBOARD_READY
- GREEN_SUPPLIER_PRICE_IMPORT_AND_REGIONAL_PRICEBOOK_GOVERNANCE_READY
- GREEN_AI_ESTIMATE_REAL_MATERIAL_CATALOG_AND_REGIONAL_PRICEBOOK_BINDING_READY
- GREEN_AI_ESTIMATE_UNIFIED_SNAPSHOT_REVISION_PERSISTENCE_AUDIT_READY
- GREEN_AI_ESTIMATE_CORE_SINGLE_SOURCE_OF_TRUTH_MULTI_ENTRYPOINT_PARITY_READY
- GREEN_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE_READY
- GREEN_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES_READY

Planned stages after prerequisites are green:
Stage 0: OFF
Stage 1: internal staff only
Stage 2: staging UAT
Stage 3: 1 percent canary
Stage 4: 10 percent canary
Stage 5: wider rollout after manual approval

Rollback triggers:
- compile error rate >= 1 percent
- snapshot save critical failures > 0
- wrong currency cases > 0
- buyer procurement leak cases > 0
- security or RLS blockers > 0
- PDF critical failures > 0

fake_green_claimed=false
`,
);

writeText(
  "rollback_plan.md",
  `
# AI Estimate Rollback Plan

Status: BLOCKED_PREREQUISITE_NOT_GREEN

This plan does not enable rollout, does not write production DB, and does not run OTA/EAS/iOS/Android release loops.

Rollback controls after prerequisites are green:
- disable AI estimate feature flags
- enable global kill switch
- keep existing snapshots readonly
- disable new supplier price publishing
- disable new foreman AI draft creation
- do not delete estimate snapshots, revisions, pricebook versions, or audit events
- do not run destructive DB rollback
- restore previous pricebook active pointer through audited version change only
- identify bad revision range by revisionId, estimateId, createdAt, and pricebookVersionId

fake_green_claimed=false
`,
);

console.log(JSON.stringify(matrix, null, 2));
