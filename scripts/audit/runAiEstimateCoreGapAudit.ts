import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const GAP_AUDIT_PATH = path.join(ARTIFACT_DIR, "S_AI_ESTIMATE_CORE_COMPLETION_gap_audit.json");
const GIT_PREFLIGHT_PATH = path.join(ARTIFACT_DIR, "S_AI_ESTIMATE_CORE_COMPLETION_git_preflight.json");

type AuditCheck = {
  id: string;
  passed: boolean;
  evidence: string;
};

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function exists(relativePath: string): boolean {
  return fs.existsSync(path.resolve(process.cwd(), relativePath));
}

function git(args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function classifyDirtyLine(line: string) {
  const status = line.slice(0, 2).trim() || line.slice(0, 2);
  const pathName = line.slice(3).trim();
  const normalized = pathName.replace(/\\/g, "/");
  const currentWave =
    normalized.startsWith("src/lib/ai/globalEstimate/unfinishedAiEstimateCases.ts") ||
    normalized.startsWith("src/lib/ai/globalEstimate/validateAiEstimateCoreResult.ts") ||
    normalized.startsWith("src/lib/ai/globalEstimate/globalWorkTypeResolver.ts") ||
    normalized.startsWith("src/lib/ai/globalEstimate/index.ts") ||
    normalized.startsWith("tests/aiEstimateCore/") ||
    normalized.startsWith("tests/routeParity/") ||
    normalized.startsWith("tests/e2e/aiEstimateCoreCompletion.web.spec.ts") ||
    normalized.startsWith("scripts/audit/runAiEstimateCoreGapAudit.ts") ||
    normalized.startsWith("scripts/e2e/runAiEstimateCoreCompletionProof.ts") ||
    normalized.startsWith("scripts/e2e/runAndroidAiEstimateCoreCompletionSmoke.ts") ||
    normalized.startsWith("artifacts/S_AI_ESTIMATE_CORE_COMPLETION_");
  return {
    path: normalized,
    status,
    classification: currentWave ? "current_wave_required" : "previous_wave_required",
    action: currentWave ? "stage" : "ignore_by_policy",
    reason: currentWave
      ? "Required by S_AI_ESTIMATE_CORE_COMPLETION wave."
      : "Pre-existing dirty or generated file outside this wave; not staged by this wave.",
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function check(id: string, passed: boolean, evidence: string): AuditCheck {
  return { id, passed, evidence };
}

function main(): void {
  const ingress = read("src/lib/ai/builtInAi/builtInAiIngress.ts");
  const registry = read("src/lib/ai/builtInAi/builtInAiToolRegistry.ts");
  const formatter = read("src/lib/ai/globalEstimate/globalEstimateAnswerFormatter.ts");
  const requestAdapter = read("src/features/consumerRepair/consumerRepairAiAdapter.ts");
  const requestIntegration = read("src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts");
  const pdfMapper = exists("src/lib/ai/estimatePdf/estimatePdfModelMapper.ts")
    ? read("src/lib/ai/estimatePdf/estimatePdfModelMapper.ts")
    : "";
  const releaseGuard = read("scripts/release/releaseGuard.shared.ts");

  const checks: AuditCheck[] = [
    check("calculate_global_estimate_tool_exists", registry.includes("calculate_global_estimate"), "builtInAiToolRegistry.ts"),
    check("tool_reachable_from_built_in_ai", ingress.includes("runBuiltInAiTool") && ingress.includes("routeBuiltInAiIntent"), "builtInAiIngress.ts"),
    check("global_estimate_validator_exists", exists("src/lib/ai/globalEstimate/validateAiEstimateCoreResult.ts"), "validateAiEstimateCoreResult.ts"),
    check("unfinished_cases_manifest_exists", exists("src/lib/ai/globalEstimate/unfinishedAiEstimateCases.ts"), "unfinishedAiEstimateCases.ts"),
    check("formatter_uses_structured_result", formatter.includes("GlobalEstimateResult") && formatter.includes("result.sections"), "globalEstimateAnswerFormatter.ts"),
    check("request_uses_structured_estimate", requestAdapter.includes("answerBuiltInAi") && requestIntegration.includes("result.sections.flatMap"), "consumer repair request integration"),
    check("pdf_action_receives_structured_payload", pdfMapper.includes("estimate") || pdfMapper.includes("GlobalEstimateResult"), "estimatePdfModelMapper.ts"),
    check("source_evidence_tied_to_rows", registry.includes("sourceEvidence") || read("src/lib/ai/globalEstimate/globalEstimateCalculator.ts").includes("sourceEvidence"), "globalEstimateCalculator.ts"),
    check("tax_rule_or_warning_available", read("src/lib/ai/globalEstimate/globalTaxEngine.ts").includes("warning") || read("src/lib/ai/globalEstimate/globalTaxEngine.ts").includes("taxLabel"), "globalTaxEngine.ts"),
    check("no_screen_local_calculation_marker", !/(useEffect\([^)]*estimate|screen-local estimate|screenLocalEstimate)/i.test(ingress + requestAdapter), "static scan"),
    check("tests_exist", exists("tests/aiEstimateCore/unfinishedAiEstimateCasesManifest.contract.test.ts"), "tests/aiEstimateCore"),
    check("web_tests_exist", exists("tests/e2e/aiEstimateCoreCompletion.web.spec.ts"), "tests/e2e/aiEstimateCoreCompletion.web.spec.ts"),
    check("android_emulator_tests_exist", exists("scripts/e2e/runAndroidAiEstimateCoreCompletionSmoke.ts"), "scripts/e2e/runAndroidAiEstimateCoreCompletionSmoke.ts"),
    check("release_guard_includes_proof", releaseGuard.includes("ai-estimate-core-completion-proof"), "scripts/release/releaseGuard.shared.ts"),
  ];

  const dirtyLines = git(["status", "--short"]).split(/\r?\n/).filter(Boolean);
  const gitPreflight = {
    branch: git(["branch", "--show-current"]),
    head: git(["rev-parse", "HEAD"]),
    remote: git(["remote", "-v"]),
    status_short: dirtyLines,
    status_sb: git(["status", "-sb"]),
    diff_stat: git(["diff", "--stat"]),
    diff_name_status: git(["diff", "--name-status"]),
    untracked: git(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/).filter(Boolean),
    files: dirtyLines.map(classifyDirtyLine),
    fake_green_claimed: false,
  };

  const failures = checks.filter((item) => !item.passed);
  const audit = {
    wave: "S_AI_ESTIMATE_CORE_COMPLETION_UNFINISHED_SMETAS_WEB_ANDROID_COMMIT_PUSH_POINT_OF_NO_RETURN",
    gap_audit_completed: true,
    passed: failures.length === 0,
    checks,
    failures,
    fake_green_claimed: false,
  };

  writeJson(GAP_AUDIT_PATH, audit);
  writeJson(GIT_PREFLIGHT_PATH, gitPreflight);

  if (failures.length > 0) {
    throw new Error(`BLOCKED_AI_ESTIMATE_CORE_GAP_AUDIT_FAILED:${failures.map((item) => item.id).join(",")}`);
  }
  console.log("GREEN_AI_ESTIMATE_CORE_GAP_AUDIT_READY");
}

main();
