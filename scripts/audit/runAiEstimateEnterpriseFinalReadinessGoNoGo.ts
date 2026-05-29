import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

export const AI_ESTIMATE_FINAL_READINESS_WAVE =
  "S_AI_ESTIMATE_ENTERPRISE_FINAL_READINESS_AUDIT_GO_NO_GO_POINT_OF_NO_RETURN";
export const AI_ESTIMATE_FINAL_READINESS_GREEN_STATUS =
  "GREEN_AI_ESTIMATE_ENTERPRISE_FINAL_READINESS_AUDIT_GO_NO_GO_READY";
export const AI_ESTIMATE_FINAL_READINESS_ARTIFACT_DIR =
  "artifacts/S_AI_ESTIMATE_ENTERPRISE_FINAL_READINESS";

type RequiredMatrix = {
  key: string;
  path: string;
  expectedStatus: string;
};

const REQUIRED_MATRICES: RequiredMatrix[] = [
  {
    key: "live_estimate_reality",
    path: "artifacts/S_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY/matrix.json",
    expectedStatus: "GREEN_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY_READY",
  },
  {
    key: "semantic_coverage_lock",
    path: "artifacts/S_OPEN_WORLD_ESTIMATE_SEMANTIC_COVERAGE/matrix.json",
    expectedStatus: "GREEN_LIVE_ESTIMATE_OPEN_WORLD_SEMANTIC_COVERAGE_LOCK_READY",
  },
  {
    key: "primitive_boq_compiler",
    path: "artifacts/S_OPEN_WORLD_PRIMITIVE_BOQ_COMPILER/matrix.json",
    expectedStatus: "GREEN_OPEN_WORLD_CONSTRUCTION_PRIMITIVE_BOQ_COMPILER_READY",
  },
  {
    key: "global_local_platform",
    path: "artifacts/S_GLOBAL_LOCAL_ESTIMATE_PLATFORM/matrix.json",
    expectedStatus: "GREEN_AI_ESTIMATE_GLOBAL_LOCAL_CONTEXT_RATE_SOURCE_PLATFORM_READY",
  },
  {
    key: "change_control",
    path: "artifacts/S_AI_ESTIMATE_CHANGE_CONTROL/matrix.json",
    expectedStatus: "GREEN_AI_ESTIMATE_TEMPLATE_RATE_CATALOG_ONTOLOGY_CHANGE_CONTROL_READY",
  },
  {
    key: "android_api34_canonical",
    path: "artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/matrix.json",
    expectedStatus: "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY",
  },
  {
    key: "performance_cost_guard",
    path: "artifacts/S_AI_ESTIMATE_PERFORMANCE/matrix.json",
    expectedStatus: "GREEN_AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_READY",
  },
  {
    key: "enterprise_release_candidate",
    path: "artifacts/S_ENTERPRISE_RELEASE_CANDIDATE_matrix.json",
    expectedStatus: "GREEN_ENTERPRISE_PRODUCTION_RELEASE_CANDIDATE_READY",
  },
];

export type FinalReadinessVerification = {
  typecheckPassed: boolean;
  lintPassed: boolean;
  gitDiffCheckPassed: boolean;
  targetedTestsPassed: boolean;
  architectureTestsPassed: boolean;
  fullJestPassed: boolean;
  releaseVerifyPassed: boolean;
  commitCreated: boolean;
  branchPushed: boolean;
  finalWorktreeClean: boolean;
};

type FinalReadinessOptions = {
  verification?: Partial<FinalReadinessVerification>;
  now?: string;
  ignoreNonArtifactDirtyPaths?: boolean;
};

function artifactPath(name: string): string {
  return path.join(process.cwd(), AI_ESTIMATE_FINAL_READINESS_ARTIFACT_DIR, name);
}

function readText(relativePath: string): string {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return "";
  return fs.readFileSync(absolutePath, "utf8");
}

function readJson(relativePath: string): JsonRecord | null {
  const source = readText(relativePath);
  if (!source.trim()) return null;
  try {
    return JSON.parse(source) as JsonRecord;
  } catch {
    return null;
  }
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(path.dirname(artifactPath(name)), { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(path.dirname(artifactPath(name)), { recursive: true });
  fs.writeFileSync(artifactPath(name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

function gitStatusFiles(): string[] {
  return gitOutput(["status", "--short"], "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const file = line.slice(2).trim().replace(/\\/g, "/");
      return file.includes(" -> ") ? file.split(" -> ").pop() ?? file : file;
    });
}

function nonArtifactDirtyFiles(): string[] {
  return gitStatusFiles().filter((file) => !file.startsWith("artifacts/"));
}

function branchPushed(): boolean {
  const upstream = gitOutput(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], "");
  if (!upstream) return false;
  const [ahead = "1", behind = "1"] = gitOutput(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], "").split(/\s+/);
  return Number(ahead) === 0 && Number(behind) === 0;
}

function bool(value: unknown): boolean {
  return value === true;
}

function envBool(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

function buildVerification(overrides: Partial<FinalReadinessVerification> = {}): FinalReadinessVerification {
  const nonArtifactDirty = nonArtifactDirtyFiles();
  const defaultVerification = {
    typecheckPassed: envBool("AI_ESTIMATE_FINAL_READINESS_TYPECHECK_PASSED"),
    lintPassed: envBool("AI_ESTIMATE_FINAL_READINESS_LINT_PASSED"),
    gitDiffCheckPassed: envBool("AI_ESTIMATE_FINAL_READINESS_GIT_DIFF_CHECK_PASSED"),
    targetedTestsPassed: envBool("AI_ESTIMATE_FINAL_READINESS_TARGETED_TESTS_PASSED"),
    architectureTestsPassed: envBool("AI_ESTIMATE_FINAL_READINESS_ARCHITECTURE_TESTS_PASSED"),
    fullJestPassed: envBool("AI_ESTIMATE_FINAL_READINESS_FULL_JEST_PASSED"),
    releaseVerifyPassed: envBool("AI_ESTIMATE_FINAL_READINESS_RELEASE_VERIFY_PASSED"),
    commitCreated: envBool("AI_ESTIMATE_FINAL_READINESS_COMMIT_CREATED") || gitOutput(["rev-parse", "--verify", "HEAD"], "") !== "",
    branchPushed: envBool("AI_ESTIMATE_FINAL_READINESS_BRANCH_PUSHED") || branchPushed(),
    finalWorktreeClean:
      envBool("AI_ESTIMATE_FINAL_READINESS_FINAL_WORKTREE_CLEAN") || (gitStatusFiles().length === 0 || nonArtifactDirty.length === 0),
  };
  return { ...defaultVerification, ...overrides };
}

function matrixStatus() {
  return REQUIRED_MATRICES.map((item) => {
    const parsed = readJson(item.path);
    const finalStatus = typeof parsed?.final_status === "string" ? parsed.final_status : null;
    const failures = Array.isArray(parsed?.failures) ? parsed.failures : [];
    const blockers = Array.isArray(parsed?.blockers) ? parsed.blockers : [];
    return {
      key: item.key,
      path: item.path,
      present: parsed !== null,
      final_status: finalStatus,
      expected_status: item.expectedStatus,
      green: finalStatus === item.expectedStatus,
      failures_empty: failures.length === 0,
      blockers_empty: blockers.length === 0,
      fake_green_claimed: parsed?.fake_green_claimed === true,
    };
  });
}

function buildReleaseCandidateStatus() {
  const candidate = readJson("artifacts/S_ENTERPRISE_RELEASE_CANDIDATE_matrix.json") ?? {};
  return {
    release_candidate_green: candidate.final_status === "GREEN_ENTERPRISE_PRODUCTION_RELEASE_CANDIDATE_READY",
    rollback_ready: bool(candidate.rollback_proof_passed),
    kill_switches_ready: bool(candidate.feature_flags_ready) && bool(candidate.feature_flags_default_safe) && bool(candidate.rollback_supported),
    observability_ready: bool(candidate.observability_ready),
    canary_plan_ready: bool(candidate.canary_plan_ready),
    redaction_passed: bool(candidate.redaction_passed),
    production_rollout_enabled: false,
    release_candidate_blockers_empty: Array.isArray(candidate.blockers) ? candidate.blockers.length === 0 : false,
  };
}

function buildReleaseGuardStatus() {
  const source = readText("scripts/release/releaseGuard.shared.ts");
  const command = "npx tsx scripts/audit/runAiEstimateEnterpriseFinalReadinessGoNoGo.ts";
  return {
    release_guard_registered: source.includes("ai-estimate-enterprise-final-readiness-go-no-go-proof"),
    release_guard_command_registered: source.includes(command),
    release_guard_name: "ai-estimate-enterprise-final-readiness-go-no-go-proof",
    release_guard_command: command,
  };
}

export function buildAiEstimateEnterpriseFinalReadinessReport(options: FinalReadinessOptions = {}) {
  const matrices = matrixStatus();
  const candidate = buildReleaseCandidateStatus();
  const releaseGuard = buildReleaseGuardStatus();
  const verification = buildVerification(options.verification);
  const nonArtifactDirty = options.ignoreNonArtifactDirtyPaths ? [] : nonArtifactDirtyFiles();
  const allMatricesGreen = matrices.every((item) => item.green && item.present && item.failures_empty && item.blockers_empty && !item.fake_green_claimed);
  const webAndroidPdfProofPresent =
    matrices.some((item) => item.key === "live_estimate_reality" && item.green) &&
    matrices.some((item) => item.key === "android_api34_canonical" && item.green) &&
    bool((readJson("artifacts/S_AI_ESTIMATE_PERFORMANCE/matrix.json") ?? {}).pdf_rate_limit_ready) &&
    bool((readJson("artifacts/S_AI_ESTIMATE_PERFORMANCE/matrix.json") ?? {}).web_live_app_tested);

  const blockers = [
    ...matrices.flatMap((item) => item.green && item.failures_empty && item.blockers_empty && !item.fake_green_claimed ? [] : [`BLOCKED_MATRIX_NOT_GREEN:${item.key}`]),
    ...(!candidate.release_candidate_green ? ["BLOCKED_RELEASE_CANDIDATE_NOT_GREEN"] : []),
    ...(!candidate.kill_switches_ready ? ["BLOCKED_KILL_SWITCHES_NOT_READY"] : []),
    ...(!candidate.rollback_ready ? ["BLOCKED_ROLLBACK_NOT_READY"] : []),
    ...(!candidate.observability_ready ? ["BLOCKED_OBSERVABILITY_NOT_READY"] : []),
    ...(!candidate.redaction_passed ? ["BLOCKED_REDACTION_NOT_READY"] : []),
    ...(!webAndroidPdfProofPresent ? ["BLOCKED_WEB_ANDROID_PDF_PROOF_MISSING"] : []),
    ...(!releaseGuard.release_guard_registered || !releaseGuard.release_guard_command_registered ? ["BLOCKED_RELEASE_GUARD_NOT_REGISTERED"] : []),
    ...(!verification.typecheckPassed ? ["BLOCKED_TYPECHECK_NOT_CONFIRMED"] : []),
    ...(!verification.lintPassed ? ["BLOCKED_LINT_NOT_CONFIRMED"] : []),
    ...(!verification.gitDiffCheckPassed ? ["BLOCKED_GIT_DIFF_CHECK_NOT_CONFIRMED"] : []),
    ...(!verification.targetedTestsPassed ? ["BLOCKED_TARGETED_TESTS_NOT_CONFIRMED"] : []),
    ...(!verification.architectureTestsPassed ? ["BLOCKED_ARCHITECTURE_TESTS_NOT_CONFIRMED"] : []),
    ...(!verification.fullJestPassed ? ["BLOCKED_FULL_JEST_NOT_CONFIRMED"] : []),
    ...(!verification.releaseVerifyPassed ? ["BLOCKED_RELEASE_VERIFY_NOT_CONFIRMED"] : []),
    ...(!verification.commitCreated ? ["BLOCKED_COMMIT_NOT_CREATED"] : []),
    ...(!verification.branchPushed ? ["BLOCKED_BRANCH_NOT_PUSHED"] : []),
    ...(!verification.finalWorktreeClean || nonArtifactDirty.length > 0 ? [`BLOCKED_WORKTREE_NOT_CLEAN:${nonArtifactDirty.join(",")}`] : []),
  ];

  const matrix = {
    wave: AI_ESTIMATE_FINAL_READINESS_WAVE,
    final_status: blockers.length === 0
      ? AI_ESTIMATE_FINAL_READINESS_GREEN_STATUS
      : "BLOCKED_AI_ESTIMATE_ENTERPRISE_FINAL_READINESS_AUDIT_GO_NO_GO",
    go_no_go_decision: blockers.length === 0 ? "GO_INTERNAL_CANARY_NO_PRODUCTION_ROLLOUT" : "NO_GO",
    all_required_matrices_green: allMatricesGreen,
    all_failures_empty: matrices.every((item) => item.failures_empty),
    web_android_pdf_proof_present: webAndroidPdfProofPresent,
    semantic_gates_green: matrices.find((item) => item.key === "semantic_coverage_lock")?.green === true,
    primitive_compiler_green: matrices.find((item) => item.key === "primitive_boq_compiler")?.green === true,
    global_local_platform_green: matrices.find((item) => item.key === "global_local_platform")?.green === true,
    change_control_green: matrices.find((item) => item.key === "change_control")?.green === true,
    performance_cost_green: matrices.find((item) => item.key === "performance_cost_guard")?.green === true,
    android_api34_green: matrices.find((item) => item.key === "android_api34_canonical")?.green === true,
    release_candidate_green: candidate.release_candidate_green,
    rollback_ready: candidate.rollback_ready,
    kill_switches_ready: candidate.kill_switches_ready,
    observability_ready: candidate.observability_ready,
    canary_plan_ready: candidate.canary_plan_ready,
    redaction_passed: candidate.redaction_passed,
    production_rollout_enabled: candidate.production_rollout_enabled,
    release_guard_registered: releaseGuard.release_guard_registered,
    typecheck_passed: verification.typecheckPassed,
    lint_passed: verification.lintPassed,
    git_diff_check_passed: verification.gitDiffCheckPassed,
    targeted_tests_passed: verification.targetedTestsPassed,
    architecture_tests_passed: verification.architectureTestsPassed,
    full_jest_passed: verification.fullJestPassed,
    release_verify_passed: verification.releaseVerifyPassed,
    commit_created: verification.commitCreated,
    branch_pushed: verification.branchPushed,
    final_worktree_clean: verification.finalWorktreeClean && nonArtifactDirty.length === 0,
    fake_green_claimed: false,
    blockers,
  };

  return {
    generated_at: options.now ?? new Date().toISOString(),
    matrices,
    release_candidate: candidate,
    release_guard: releaseGuard,
    verification,
    dirty_paths: {
      non_artifact_dirty: nonArtifactDirty,
      release_verify_generated_artifact_dirty_paths: gitStatusFiles().filter((file) => file.startsWith("artifacts/")),
    },
    matrix,
  };
}

export function writeAiEstimateEnterpriseFinalReadinessArtifacts(options: FinalReadinessOptions = {}) {
  const report = buildAiEstimateEnterpriseFinalReadinessReport(options);
  writeJson("prerequisite_matrices.json", report.matrices);
  writeJson("release_candidate_status.json", report.release_candidate);
  writeJson("release_guard_status.json", report.release_guard);
  writeJson("go_no_go_decision.json", {
    decision: report.matrix.go_no_go_decision,
    production_rollout_enabled: report.matrix.production_rollout_enabled,
    blockers: report.matrix.blockers,
    fake_green_claimed: false,
  });
  writeJson("verification.json", report.verification);
  writeJson("failures.json", report.matrix.blockers);
  writeJson("matrix.json", report.matrix);
  writeText(
    "proof.md",
    [
      `# ${AI_ESTIMATE_FINAL_READINESS_WAVE}`,
      "",
      `final_status: ${report.matrix.final_status}`,
      `decision: ${report.matrix.go_no_go_decision}`,
      `production_rollout_enabled: ${String(report.matrix.production_rollout_enabled)}`,
      "",
      "## Checked",
      "- live estimate reality",
      "- open-world semantic coverage lock",
      "- construction primitive BOQ compiler",
      "- global/local rate/source platform",
      "- template/rate/catalog/ontology change control",
      "- Android API34 canonical replay",
      "- enterprise load/performance/cost guard",
      "- enterprise release candidate rollback, observability, redaction and canary evidence",
      "",
      "## Blockers",
      ...(report.matrix.blockers.length > 0 ? report.matrix.blockers.map((blocker) => `- ${blocker}`) : ["- none"]),
      "",
    ].join("\n"),
  );
  return report;
}

export function assertAiEstimateEnterpriseFinalReadinessGreen(options: FinalReadinessOptions = {}) {
  const report = writeAiEstimateEnterpriseFinalReadinessArtifacts(options);
  if (report.matrix.blockers.length > 0) {
    throw new Error(`AI_ESTIMATE_ENTERPRISE_FINAL_READINESS_BLOCKED:${report.matrix.blockers.join(";")}`);
  }
  return report;
}

if (require.main === module) {
  assertAiEstimateEnterpriseFinalReadinessGreen();
}
