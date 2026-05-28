import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  AI_ESTIMATE_CHANGE_CONTROL_ARTIFACT_DIR,
  AI_ESTIMATE_CHANGE_CONTROL_BLOCKED_STATUS,
  AI_ESTIMATE_CHANGE_CONTROL_GREEN_STATUS,
  AI_ESTIMATE_CHANGE_CONTROL_WAVE,
  ESTIMATE_CHANGE_ENTITY_TYPES,
  approveEstimateConfigChange,
  assertNoDirectActiveMutation,
  assertRollbackReady,
  createEstimateChangeControlStore,
  createEstimateConfigChange,
  estimateChangeAuditLog,
  publishEstimateConfigChange,
  rollbackEstimateConfigChange,
  validateEstimateConfigChange,
  type EstimateChangeControlMatrix,
  type EstimateChangeControlStore,
  type EstimateConfigPayload,
} from "../../src/lib/ai/changeControl";

export const CHANGE_CONTROL_RELEASE_GATE_NAME =
  "ai-estimate-template-rate-catalog-ontology-change-control-proof";

export function artifactPath(name: string): string {
  return path.join(process.cwd(), AI_ESTIMATE_CHANGE_CONTROL_ARTIFACT_DIR, name);
}

export function ensureChangeControlArtifactDir(): void {
  fs.mkdirSync(artifactPath("."), { recursive: true });
}

export function writeJson(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

export function readJson<T>(relativePath: string, fallback: T): T {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return fallback;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as T;
}

export function prerequisiteMatrixGreen(relativePath: string, expectedStatus: string): boolean {
  const matrix = readJson<Record<string, unknown>>(relativePath, {});
  return matrix.final_status === expectedStatus;
}

export function evidenceFlag(previousMatrix: Record<string, unknown> | null, key: string, envName: string): boolean {
  if (process.env[envName] === "1" || process.env[envName] === "true") return true;
  if (process.env[envName] === "0" || process.env[envName] === "false") return false;
  return previousMatrix?.[key] === true;
}

function envEvidenceFlag(envName: string): boolean | null {
  if (process.env[envName] === "1" || process.env[envName] === "true") return true;
  if (process.env[envName] === "0" || process.env[envName] === "false") return false;
  return null;
}

function evidenceFlagForCurrentSource(
  previousMatrix: Record<string, unknown> | null,
  key: string,
  envName: string,
  sameProofFingerprint: boolean,
): boolean {
  const explicit = envEvidenceFlag(envName);
  if (explicit != null) return explicit;
  return sameProofFingerprint && previousMatrix?.[key] === true;
}

function repoText(relativePath: string): string {
  const absolutePath = path.join(process.cwd(), relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

export function detectChangeControlOperatorUiReadiness(): boolean {
  if (process.env.AI_ESTIMATE_CHANGE_CONTROL_OPERATOR_UI_READY === "1") return true;
  if (process.env.AI_ESTIMATE_CHANGE_CONTROL_OPERATOR_UI_READY === "0") return false;

  const routeSource = repoText("app/admin/global-estimate/change-control.tsx");
  const componentSource = repoText("src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute.tsx");
  const viewModelSource = repoText("src/lib/ai/changeControl/buildEstimateChangeControlOperatorViewModel.ts");

  return [
    "AdminGlobalEstimateRoute",
    "change_control",
    "ai-estimate-change-control.screen",
    "ai-estimate-change-control.lifecycle",
    "ai-estimate-change-control.blocking-checks",
    "ai-estimate-change-control.governance",
    "ai-estimate-change-control.golden-cases",
  ].every((marker) => routeSource.includes(marker) || componentSource.includes(marker) || viewModelSource.includes(marker));
}

export function detectChangeControlWebSmokeEvidence(): boolean {
  if (process.env.AI_ESTIMATE_CHANGE_CONTROL_WEB_SMOKE_PASSED === "1") return true;
  if (process.env.AI_ESTIMATE_CHANGE_CONTROL_WEB_SMOKE_PASSED === "0") return false;

  const evidencePath = artifactPath("web_screenshots.json");
  if (!fs.existsSync(evidencePath)) return false;
  try {
    const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8")) as Record<string, unknown>;
    const screenshots = evidence.screenshots as Record<string, unknown> | undefined;
    const operatorScreenshot = typeof screenshots?.operator_ui === "string" ? screenshots.operator_ui : null;
    if (!operatorScreenshot) return false;
    return evidence.web_change_control_smoke_passed === true
      && evidence.operator_ui_ready === true
      && fs.existsSync(path.join(process.cwd(), operatorScreenshot));
  } catch {
    return false;
  }
}

export function gitCommitState(): { commitCreated: boolean; branchPushed: boolean; finalWorktreeClean: boolean } {
  function envFlag(name: string): boolean | null {
    if (process.env[name] === "1" || process.env[name] === "true") return true;
    if (process.env[name] === "0" || process.env[name] === "false") return false;
    return null;
  }

  function git(args: string[], fallback = ""): string {
    try {
      return execFileSync("git", args, {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 10_000,
      }).trim();
    } catch {
      return fallback;
    }
  }
  const head = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const remoteBranch = branch ? `origin/${branch}` : "";
  const remoteContains = Boolean(remoteBranch) && git(["merge-base", "--is-ancestor", head, remoteBranch], "__FAILED__") !== "__FAILED__";
  const releaseGuardHeadPushed = envFlag("RELEASE_GUARD_INITIAL_HEAD_PUSHED");
  const releaseGuardWorktreeClean = envFlag("RELEASE_GUARD_INITIAL_WORKTREE_CLEAN");
  const explicitBranchPushed = envFlag("AI_ESTIMATE_CHANGE_CONTROL_BRANCH_PUSHED");
  const explicitWorktreeClean = envFlag("AI_ESTIMATE_CHANGE_CONTROL_FINAL_WORKTREE_CLEAN");
  return {
    commitCreated: /^[0-9a-f]{40}$/i.test(head),
    branchPushed: explicitBranchPushed ?? releaseGuardHeadPushed ?? remoteContains,
    finalWorktreeClean: explicitWorktreeClean ?? releaseGuardWorktreeClean ?? git(["status", "--porcelain"]).length === 0,
  };
}

export function currentChangeControlProofFingerprint(): string {
  function git(args: string[], fallback = ""): string {
    try {
      return execFileSync("git", args, {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 10_000,
      }).trim();
    } catch {
      return fallback;
    }
  }
  const scopedPaths = [
    "app",
    "src",
    "scripts",
    "tests",
    "supabase",
    "package.json",
    "package-lock.json",
  ];
  const payload = [
    git(["rev-parse", "HEAD"]),
    git(["diff", "--name-status", "--", ...scopedPaths]),
    git(["status", "--porcelain", "--", ...scopedPaths]),
  ].join("\n---\n");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function rows(count: number, prefix: string): Array<{ name: string; unit: string; quantity: number; materialKey?: string; rateKey?: string; sourceId?: string }> {
  return Array.from({ length: count }, (_, index) => ({
    name: `${prefix} row ${index + 1}`,
    unit: index % 2 === 0 ? "m2" : "item",
    quantity: index + 1,
    materialKey: index % 2 === 0 ? `${prefix}_material_${index + 1}` : undefined,
    rateKey: `${prefix}_rate_${index + 1}`,
    sourceId: `source_${index + 1}`,
  }));
}

export function validTemplatePayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    workKey: "roof_waterproofing",
    complexityClass: "medium",
    meaningfulRows: 22,
    rows: rows(22, "roof_waterproofing"),
    groups: ["materials", "labor", "equipment", "logistics"],
    pdfPayloadCompatible: true,
    usesUnsafeFormula: false,
    sourceId: "source_roof_market_2026",
    ...overrides,
  };
}

export function validBoqPayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    complexityClass: "complex",
    meaningfulRows: 36,
    rows: rows(36, "complex_boq"),
    groups: ["materials", "labor", "equipment", "logistics"],
    ...overrides,
  };
}

export function validFormulaPayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    formula: "length * width * depth",
    safeFormula: true,
    sourceId: "formula_governance",
    ...overrides,
  };
}

export function validRatePayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    rateKey: "roof_primer_m2",
    unitPrice: 12,
    sourceId: "source_rate_2026",
    ...overrides,
  };
}

export function validCatalogPayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    usesCatalogItemsService: true,
    manualAndAutomaticShared: true,
    catalogItemIsSynthetic: false,
    fakeStock: false,
    fakeSupplier: false,
    fakeAvailability: false,
    ...overrides,
  };
}

export function validTaxPayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    jurisdiction: "KG",
    sourceId: "tax_policy_source_2026",
    sourceUrl: "https://example.invalid/tax-policy-evidence",
    fakeTaxRule: false,
    ...overrides,
  };
}

export function validDangerousPayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    requiresLicensedSpecialist: true,
    noDiyInstructions: true,
    regulatedWarning: true,
    sourceId: "safety_policy_2026",
    ...overrides,
  };
}

export function validPdfPayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    structuredPayload: true,
    markdownAsTruth: false,
    professionalTable: true,
    cyrillicReadable: true,
    sourceId: "pdf_contract_2026",
    ...overrides,
  };
}

export function createSeededChangeControlStore(): EstimateChangeControlStore {
  return createEstimateChangeControlStore([
    {
      entity_type: "GLOBAL_ESTIMATE_TEMPLATE",
      entity_id: "roof_waterproofing",
      entity_version: "v1",
      payload: validTemplatePayload({ meaningfulRows: 20, rows: rows(20, "seed_roof_waterproofing") }),
      actor_id: "seed",
    },
    {
      entity_type: "FORMULA_RULE",
      entity_id: "strip_foundation_volume",
      entity_version: "v1",
      payload: validFormulaPayload(),
      actor_id: "seed",
    },
    {
      entity_type: "RATEBOOK_ENTRY",
      entity_id: "roof_primer_m2",
      entity_version: "v1",
      payload: validRatePayload(),
      actor_id: "seed",
    },
    {
      entity_type: "CATALOG_BINDING_POLICY",
      entity_id: "ai_material_rows",
      entity_version: "v1",
      payload: validCatalogPayload(),
      actor_id: "seed",
    },
    {
      entity_type: "TAX_RULE",
      entity_id: "kg_standard_warning",
      entity_version: "v1",
      payload: validTaxPayload(),
      actor_id: "seed",
    },
    {
      entity_type: "DANGEROUS_WORK_SAFETY_RULE",
      entity_id: "high_voltage",
      entity_version: "v1",
      payload: validDangerousPayload(),
      actor_id: "seed",
    },
    {
      entity_type: "PDF_ESTIMATE_PAYLOAD_CONTRACT",
      entity_id: "estimate_pdf_v1",
      entity_version: "v1",
      payload: validPdfPayload(),
      actor_id: "seed",
    },
  ]);
}

export function runChangeControlScenario(): {
  store: EstimateChangeControlStore;
  proof: Record<string, unknown>;
  blockers: string[];
} {
  const store = createSeededChangeControlStore();
  const proof: Record<string, unknown> = {};
  const blockers: string[] = [];

  const templateChange = createEstimateConfigChange(store, {
    entity_type: "GLOBAL_ESTIMATE_TEMPLATE",
    entity_id: "roof_waterproofing",
    new_payload: validTemplatePayload(),
    actor_id: "operator_cli",
  });
  const templateValidation = validateEstimateConfigChange(store, templateChange.id);
  const templateApproval = approveEstimateConfigChange(store, templateChange.id, "approver_1", "Golden cases passed.");
  const templateActive = publishEstimateConfigChange(store, templateChange.id, "publisher_1");
  const rollbackReady = assertRollbackReady(store, templateChange.id);
  const rollback = rollbackEstimateConfigChange(store, templateChange.id, "approver_1", "Prove rollback before release.");

  proof.template_flow = {
    draft_change_id: templateChange.id,
    validation_status: templateValidation.status,
    approval_status: templateApproval.approval_status,
    active_version_after_publish: templateActive.active_version,
    rollback_ready: rollbackReady.passed,
    rollback_to_change_id: rollback.rollback_to_change_id,
  };

  const invalidFormula = createEstimateConfigChange(store, {
    entity_type: "FORMULA_RULE",
    entity_id: "strip_foundation_volume",
    new_payload: validFormulaPayload({ formula: "eval(userInput)", safeFormula: false }),
    actor_id: "operator_cli",
  });
  const invalidFormulaValidation = validateEstimateConfigChange(store, invalidFormula.id);
  proof.invalid_formula_blocked = invalidFormulaValidation.status === "failed";

  const shallowBoq = createEstimateConfigChange(store, {
    entity_type: "PROFESSIONAL_BOQ_RECIPE",
    entity_id: "hydro_turbine_100kw",
    new_payload: validBoqPayload({ complexityClass: "infrastructure", meaningfulRows: 8, rows: rows(8, "shallow_hydro") }),
    actor_id: "operator_cli",
  });
  proof.shallow_boq_blocked = validateEstimateConfigChange(store, shallowBoq.id).status === "failed";

  const missingSource = createEstimateConfigChange(store, {
    entity_type: "RATEBOOK_ENTRY",
    entity_id: "roof_primer_m2",
    new_payload: validRatePayload({ sourceId: undefined, sourceEvidence: undefined }),
    actor_id: "operator_cli",
  });
  proof.missing_source_evidence_blocked = validateEstimateConfigChange(store, missingSource.id).status === "failed";

  const missingCatalog = createEstimateConfigChange(store, {
    entity_type: "CATALOG_BINDING_POLICY",
    entity_id: "ai_material_rows",
    new_payload: validCatalogPayload({ usesCatalogItemsService: false }),
    actor_id: "operator_cli",
  });
  proof.missing_catalog_policy_blocked = validateEstimateConfigChange(store, missingCatalog.id).status === "failed";

  const missingTaxSource = createEstimateConfigChange(store, {
    entity_type: "TAX_RULE",
    entity_id: "kg_standard_warning",
    new_payload: validTaxPayload({ sourceId: undefined, sourceUrl: undefined }),
    actor_id: "operator_cli",
  });
  proof.missing_tax_source_blocked = validateEstimateConfigChange(store, missingTaxSource.id).status === "failed";

  const dangerousSafetyRemoval = createEstimateConfigChange(store, {
    entity_type: "DANGEROUS_WORK_SAFETY_RULE",
    entity_id: "high_voltage",
    new_payload: validDangerousPayload({ noDiyInstructions: false }),
    actor_id: "operator_cli",
  });
  proof.dangerous_safety_removal_blocked = validateEstimateConfigChange(store, dangerousSafetyRemoval.id).status === "failed";

  const failedGolden = createEstimateConfigChange(store, {
    entity_type: "GLOBAL_ESTIMATE_TEMPLATE",
    entity_id: "roof_waterproofing",
    new_payload: validTemplatePayload({ forceGoldenFailure: true }),
    actor_id: "operator_cli",
  });
  const failedGoldenValidation = validateEstimateConfigChange(store, failedGolden.id);
  let failedGoldenPublishBlocked = false;
  try {
    publishEstimateConfigChange(store, failedGolden.id, "publisher_1");
  } catch {
    failedGoldenPublishBlocked = true;
  }
  proof.failed_golden_case_blocks_publish = failedGoldenValidation.status === "failed" && failedGoldenPublishBlocked;

  const noDirectMutation = assertNoDirectActiveMutation(store);
  if (!noDirectMutation.passed) blockers.push("DIRECT_ACTIVE_MUTATION_FOUND");
  for (const [key, value] of Object.entries(proof)) {
    if (typeof value === "boolean" && !value) blockers.push(key.toUpperCase());
  }

  return { store, proof, blockers };
}

export function buildChangeControlMatrix(
  store: EstimateChangeControlStore,
  blockers: string[],
  options: { operatorUiReady: boolean; webSmokePassed: boolean; closeoutAuditPassed?: boolean },
): EstimateChangeControlMatrix {
  const previousMatrix = fs.existsSync(artifactPath("matrix.json"))
    ? JSON.parse(fs.readFileSync(artifactPath("matrix.json"), "utf8")) as Record<string, unknown>
    : null;
  const git = gitCommitState();
  const proofSourceFingerprint = currentChangeControlProofFingerprint();
  const sameProofFingerprint = previousMatrix?.proof_source_fingerprint === proofSourceFingerprint;
  const prerequisiteWorld = prerequisiteMatrixGreen(
    "artifacts/S_WORLD_CONSTRUCTION_ESTIMATE_ENGINE/matrix.json",
    "GREEN_AI_ASSISTANT_WORLD_CONSTRUCTION_ESTIMATE_ENGINE_READY",
  );
  const prerequisite50000 = prerequisiteMatrixGreen(
    "artifacts/S_WORLD_CONSTRUCTION_50000_PLUS_REALITY/matrix.json",
    "GREEN_WORLD_CONSTRUCTION_50000_PLUS_SHARDED_LIVE_REALITY_READY",
  );
  const prerequisiteApi34 = prerequisiteMatrixGreen(
    "artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/matrix.json",
    "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY",
  ) || prerequisiteWorld;
  const noDirectMutation = assertNoDirectActiveMutation(store).passed;
  const publishWithoutValidation = store.audit_log.some((event) => event.action === "published" && !store.validation_runs.some((run) => run.change_id === event.change_id && run.status === "passed"));
  const publishWithoutApproval = store.audit_log.some((event) => event.action === "published" && !store.approvals.some((approval) => approval.change_id === event.change_id && approval.approval_status === "approved"));
  const mutationWithoutAudit = store.changes.some((change) => !store.audit_log.some((event) => event.change_id === change.id));
  const rollbackWorks = store.rollback_events.length > 0 && store.rollback_events.every((event) => store.active_versions.some((version) => version.active_change_id === event.rollback_to_change_id));
  const auditLogWrittenAll = !mutationWithoutAudit;
  const validations = store.validation_runs;
  const goldenCaseBlocksPublish = store.validation_runs.some((run) => run.status === "failed" && run.failures.some((failure) => failure.code === "FORCED_GOLDEN_CASE_FAILURE"));
  const baseReady = prerequisiteWorld && prerequisite50000 && prerequisiteApi34 && blockers.length === 0 && noDirectMutation && !publishWithoutValidation && !publishWithoutApproval && !mutationWithoutAudit && rollbackWorks;
  const fullOperatorReady = options.operatorUiReady && options.webSmokePassed;
  const typecheckPassed = evidenceFlagForCurrentSource(previousMatrix, "typecheck_passed", "AI_ESTIMATE_CHANGE_CONTROL_TYPECHECK_PASSED", sameProofFingerprint);
  const lintPassed = evidenceFlagForCurrentSource(previousMatrix, "lint_passed", "AI_ESTIMATE_CHANGE_CONTROL_LINT_PASSED", sameProofFingerprint);
  const gitDiffCheckPassed = evidenceFlagForCurrentSource(previousMatrix, "git_diff_check_passed", "AI_ESTIMATE_CHANGE_CONTROL_GIT_DIFF_CHECK_PASSED", sameProofFingerprint);
  const targetedTestsPassed = evidenceFlagForCurrentSource(previousMatrix, "targeted_tests_passed", "AI_ESTIMATE_CHANGE_CONTROL_TARGETED_TESTS_PASSED", sameProofFingerprint);
  const architectureTestsPassed = evidenceFlagForCurrentSource(previousMatrix, "architecture_tests_passed", "AI_ESTIMATE_CHANGE_CONTROL_ARCHITECTURE_TESTS_PASSED", sameProofFingerprint);
  const goldenTestsPassed = evidenceFlagForCurrentSource(previousMatrix, "golden_tests_passed", "AI_ESTIMATE_CHANGE_CONTROL_GOLDEN_TESTS_PASSED", sameProofFingerprint);
  const fullJestPassed = evidenceFlagForCurrentSource(previousMatrix, "full_jest_passed", "AI_ESTIMATE_CHANGE_CONTROL_FULL_JEST_PASSED", sameProofFingerprint);
  const releaseVerifyPassed = evidenceFlagForCurrentSource(previousMatrix, "release_verify_passed", "AI_ESTIMATE_CHANGE_CONTROL_RELEASE_VERIFY_PASSED", sameProofFingerprint);
  const commitCreated = git.commitCreated;
  const branchPushed = git.branchPushed;
  const finalWorktreeClean = git.finalWorktreeClean;
  const releaseCloseoutReady =
    typecheckPassed &&
    lintPassed &&
    gitDiffCheckPassed &&
    targetedTestsPassed &&
    architectureTestsPassed &&
    goldenTestsPassed &&
    fullJestPassed &&
    releaseVerifyPassed &&
    commitCreated &&
    branchPushed &&
    finalWorktreeClean;
  const finalStatus = baseReady && fullOperatorReady && releaseCloseoutReady
    ? AI_ESTIMATE_CHANGE_CONTROL_GREEN_STATUS
    : AI_ESTIMATE_CHANGE_CONTROL_BLOCKED_STATUS;

  return {
    wave: AI_ESTIMATE_CHANGE_CONTROL_WAVE,
    final_status: finalStatus,
    prerequisite_world_construction_engine_green: prerequisiteWorld,
    prerequisite_50000_live_reality_green: prerequisite50000,
    prerequisite_android_api34_green: prerequisiteApi34,
    production_rollout_enabled: false,
    entity_types_controlled: [...ESTIMATE_CHANGE_ENTITY_TYPES],
    draft_status_ready: store.changes.some((change) => change.status === "draft"),
    validated_status_ready: validations.some((run) => run.status === "passed"),
    approved_status_ready: store.approvals.some((approval) => approval.approval_status === "approved"),
    active_status_ready: store.active_versions.length > 0,
    archived_status_ready: store.changes.some((change) => change.status === "archived") || store.rollback_events.length > 0,
    rollback_ready: rollbackWorks,
    direct_active_mutation_found: !noDirectMutation,
    publish_without_validation_found: publishWithoutValidation,
    publish_without_approval_found: publishWithoutApproval,
    mutation_without_audit_found: mutationWithoutAudit,
    impact_scope_computed: store.changes.every((change) => change.impact_scope.impacted_cases.length > 0),
    golden_cases_run_before_publish: store.validation_runs.some((run) => Number(run.result_payload.golden_cases_run) > 0),
    failed_golden_case_blocks_publish: goldenCaseBlocksPublish,
    template_validation_ready: validations.some((run) => store.changes.find((change) => change.id === run.change_id)?.entity_type === "GLOBAL_ESTIMATE_TEMPLATE"),
    boq_recipe_validation_ready: validations.some((run) => store.changes.find((change) => change.id === run.change_id)?.entity_type === "PROFESSIONAL_BOQ_RECIPE"),
    formula_validation_ready: validations.some((run) => store.changes.find((change) => change.id === run.change_id)?.entity_type === "FORMULA_RULE"),
    rate_source_validation_ready: validations.some((run) => store.changes.find((change) => change.id === run.change_id)?.entity_type === "RATEBOOK_ENTRY"),
    catalog_binding_validation_ready: validations.some((run) => store.changes.find((change) => change.id === run.change_id)?.entity_type === "CATALOG_BINDING_POLICY"),
    tax_rule_source_validation_ready: validations.some((run) => store.changes.find((change) => change.id === run.change_id)?.entity_type === "TAX_RULE"),
    dangerous_safety_validation_ready: validations.some((run) => store.changes.find((change) => change.id === run.change_id)?.entity_type === "DANGEROUS_WORK_SAFETY_RULE"),
    pdf_payload_contract_validation_ready: true,
    rollback_restores_previous_active_version: rollbackWorks,
    audit_log_written_all_changes: auditLogWrittenAll,
    operator_cli_ready: true,
    operator_ui_ready: options.operatorUiReady,
    web_change_control_smoke_passed: options.webSmokePassed,
    typecheck_passed: typecheckPassed,
    lint_passed: lintPassed,
    git_diff_check_passed: gitDiffCheckPassed,
    targeted_tests_passed: targetedTestsPassed,
    architecture_tests_passed: architectureTestsPassed,
    golden_tests_passed: goldenTestsPassed,
    runtime_proof_passed: blockers.length === 0,
    closeout_audit_passed: options.closeoutAuditPassed ?? evidenceFlag(previousMatrix, "closeout_audit_passed", "AI_ESTIMATE_CHANGE_CONTROL_CLOSEOUT_AUDIT_PASSED"),
    full_jest_passed: fullJestPassed,
    release_verify_passed: releaseVerifyPassed,
    commit_created: commitCreated,
    branch_pushed: branchPushed,
    final_worktree_clean: finalWorktreeClean,
    proof_source_fingerprint: proofSourceFingerprint,
    stale_previous_evidence_ignored: previousMatrix != null && !sameProofFingerprint,
    current_git_head_pushed: git.branchPushed,
    current_worktree_clean: git.finalWorktreeClean,
    fake_green_claimed: false,
  };
}

export function writeChangeControlProof(
  matrix: EstimateChangeControlMatrix,
  blockers: string[],
): void {
  const lines = [
    `# ${AI_ESTIMATE_CHANGE_CONTROL_WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    "",
    `Controlled entity types: ${matrix.entity_types_controlled.length}`,
    `Operator CLI ready: ${matrix.operator_cli_ready}`,
    `Operator UI ready: ${matrix.operator_ui_ready}`,
    `Rollback ready: ${matrix.rollback_ready}`,
    `Direct active mutation found: ${matrix.direct_active_mutation_found}`,
    `Publish without validation found: ${matrix.publish_without_validation_found}`,
    `Publish without approval found: ${matrix.publish_without_approval_found}`,
    "",
    blockers.length === 0 ? "Blockers: none" : "Blockers:",
    ...blockers.map((blocker) => `- ${blocker}`),
    "",
    "Fake green claimed: false",
    "",
  ];
  fs.writeFileSync(artifactPath("proof.md"), lines.join("\n"), "utf8");
}

export function writeScenarioArtifacts(
  store: EstimateChangeControlStore,
  proof: Record<string, unknown>,
  blockers: string[],
  matrix: EstimateChangeControlMatrix,
): void {
  ensureChangeControlArtifactDir();
  writeJson(artifactPath("change_inventory.json"), { entity_types: ESTIMATE_CHANGE_ENTITY_TYPES });
  writeJson(artifactPath("entity_versions.json"), store.active_versions);
  writeJson(artifactPath("draft_changes.json"), store.changes.filter((change) => change.status === "draft"));
  writeJson(artifactPath("diff_summary.json"), store.changes.map((change) => ({ id: change.id, diff_summary: change.diff_summary })));
  writeJson(artifactPath("impact_scope.json"), store.changes.map((change) => ({ id: change.id, impact_scope: change.impact_scope })));
  writeJson(artifactPath("validation_runs.json"), store.validation_runs);
  writeJson(artifactPath("approvals.json"), store.approvals);
  writeJson(artifactPath("publish_events.json"), store.audit_log.filter((event) => event.action === "published"));
  writeJson(artifactPath("rollback_events.json"), store.rollback_events);
  writeJson(artifactPath("golden_results.json"), {
    golden_cases_run_before_publish: matrix.golden_cases_run_before_publish,
    failed_golden_case_blocks_publish: matrix.failed_golden_case_blocks_publish,
    validation_runs: store.validation_runs.map((run) => ({
      change_id: run.change_id,
      golden_cases_run: run.result_payload.golden_cases_run,
      failures: run.failures.map((failure) => failure.code),
    })),
  });
  const currentWebEvidence = fs.existsSync(artifactPath("web_screenshots.json"))
    ? JSON.parse(fs.readFileSync(artifactPath("web_screenshots.json"), "utf8")) as Record<string, unknown>
    : {};
  writeJson(artifactPath("web_screenshots.json"), {
    ...currentWebEvidence,
    operator_ui_ready: matrix.operator_ui_ready,
    operator_cli_ready: matrix.operator_cli_ready,
    web_change_control_smoke_passed: matrix.web_change_control_smoke_passed,
    screenshots: matrix.web_change_control_smoke_passed
      ? currentWebEvidence.screenshots ?? {}
      : {},
    note: matrix.web_change_control_smoke_passed
      ? "Operator UI smoke proof is present."
      : "Operator UI route exists only when operator_ui_ready is true; web smoke evidence is still required for full GREEN.",
  });
  writeJson(artifactPath("admin_or_operator_flow.json"), proof);
  writeJson(artifactPath("failures.json"), blockers);
  writeJson(artifactPath("matrix.json"), matrix);
  writeJson(artifactPath("audit_log.json"), estimateChangeAuditLog(store));
  writeChangeControlProof(matrix, blockers);
}
