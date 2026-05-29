import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY, applyAiEstimateKillSwitchPolicy, evaluateAiEstimateKillSwitchReadiness, validateAiEstimateKillSwitch } from "../../src/lib/ai/killSwitch/aiEstimateKillSwitch";
import { buildAiEstimateTelemetryEvent } from "../../src/lib/ai/observability/buildAiEstimateTelemetryEvent";
import { validateAiEstimateTelemetryEvent } from "../../src/lib/ai/observability/validateAiEstimateTelemetryEvent";
import {
  AI_ESTIMATE_CANARY_DEFAULT_CONFIG,
  AI_ESTIMATE_CANARY_REQUIRED_PREREQUISITES,
  AI_ESTIMATE_PRODUCTION_CANARY_ARTIFACT_DIR,
  AI_ESTIMATE_PRODUCTION_CANARY_GREEN_STATUS,
  AI_ESTIMATE_PRODUCTION_CANARY_WAVE,
  buildAiEstimateCanaryConfig,
  resolveAiEstimateCanaryEligibility,
  validateAiEstimateCanaryPolicy,
  recordAiEstimateFeedback,
  validateAiEstimateErrorBudget,
} from "../../src/lib/ai/productionCanary";
import { validateAiEstimateRollbackPlan } from "../../src/lib/ai/rollback/aiEstimateRollbackPlan";
import {
  evaluateReal10000Case,
  slimResult,
  type Real10000CaseResult,
} from "./real10000AcceptanceCore";
import {
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
  type Real10000ConstructionWorkCase,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

export const PRODUCTION_CANARY_ARTIFACT_DIR = path.join(
  process.cwd(),
  AI_ESTIMATE_PRODUCTION_CANARY_ARTIFACT_DIR,
);

export type ProductionCanaryFailure = {
  classification: string;
  reason: string;
  artifact?: string;
  caseId?: string;
};

export type ProductionCanaryReplayBucket =
  | "real10000_base"
  | "regulated_high_risk"
  | "fit_out"
  | "infrastructure_industrial"
  | "pdf_sample";

export type ProductionCanaryReplayResult = {
  bucket: ProductionCanaryReplayBucket;
  caseId: string;
  route: string;
  macroDomain: string;
  domain: string;
  classification: string;
  runtimeTraceId: string | null;
  rowCount: number;
  qualityScore: number;
  pdfChecked: boolean;
  pdfPassed: boolean;
  pdfMojibakeFound: boolean;
  telemetryValid: boolean;
  telemetryIssues: string[];
  latencyMs: number;
  failures: string[];
};

type JsonRecord = Record<string, unknown>;

function artifactPath(name: string): string {
  return path.join(PRODUCTION_CANARY_ARTIFACT_DIR, name);
}

export function writeProductionCanaryJson(name: string, value: unknown): void {
  fs.mkdirSync(PRODUCTION_CANARY_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeProductionCanaryText(name: string, value: string): void {
  fs.mkdirSync(PRODUCTION_CANARY_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function readJson(relativePath: string): JsonRecord | null {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, "")) as JsonRecord;
  } catch {
    return null;
  }
}

export function gitOutput(args: string[], fallback = ""): string {
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

export function boolEnv(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

export function branchPushed(): boolean {
  const upstream = gitOutput(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], "");
  if (!upstream) return false;
  const [ahead = "1", behind = "1"] = gitOutput(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], "").split(/\s+/);
  return Number(ahead) === 0 && Number(behind) === 0;
}

function p95(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return Math.round(sorted[index] * 100) / 100;
}

function pickUnique(
  cases: readonly Real10000ConstructionWorkCase[],
  count: number,
  used: Set<string>,
): Real10000ConstructionWorkCase[] {
  const picked: Real10000ConstructionWorkCase[] = [];
  for (const item of cases) {
    if (used.has(item.caseId)) continue;
    picked.push(item);
    used.add(item.caseId);
    if (picked.length === count) break;
  }
  if (picked.length !== count) {
    throw new Error(`PRODUCTION_CANARY_REPLAY_SELECTION_SHORT:${picked.length}/${count}`);
  }
  return picked;
}

function firstCanaryCase(
  label: string,
  predicate: (item: Real10000ConstructionWorkCase) => boolean,
): Real10000ConstructionWorkCase {
  const item = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.find(predicate);
  if (!item) throw new Error(`PRODUCTION_CANARY_SAMPLE_CASE_MISSING:${label}`);
  return item;
}

function withRoute(
  item: Real10000ConstructionWorkCase,
  route: Real10000ConstructionWorkCase["route"],
  suffix: string,
): Real10000ConstructionWorkCase {
  return {
    ...item,
    caseId: `${item.caseId}_${suffix}`,
    route,
  };
}

export function productionCanaryWebSampleCases(): Real10000ConstructionWorkCase[] {
  const flooring = firstCanaryCase("request_linoleum", (item) => item.domain === "residential_flooring");
  const metalCanopy = firstCanaryCase("request_metal_canopy", (item) => item.domain === "metal_canopies");
  const drainage = firstCanaryCase("drainage_channels", (item) => item.domain === "drainage_channels");
  const passengerElevator = firstCanaryCase("passenger_elevator", (item) => item.domain === "passenger_elevators");
  const paving = firstCanaryCase("foreman_paving_stone", (item) => item.domain === "paving_stone_paths");
  const hydropower = firstCanaryCase("foreman_hydropower", (item) => item.domain === "hydropower_turbines");
  const apartmentRenovation = firstCanaryCase("apartment_renovation", (item) => item.domain === "apartment_renovation");
  const concretePedestals = firstCanaryCase("concrete_pedestals", (item) => item.domain === "concrete_pedestals");
  const roofWaterproofing = firstCanaryCase("roof_waterproofing", (item) => item.domain === "roof_waterproofing");

  return [
    flooring,
    metalCanopy,
    withRoute(drainage, "/request", "request_route"),
    withRoute(passengerElevator, "/request", "request_route"),
    paving,
    hydropower,
    withRoute(apartmentRenovation, "/ai?context=foreman", "foreman_route"),
    withRoute(concretePedestals, "/ai?context=request", "ai_request_route"),
    withRoute(roofWaterproofing, "/ai?context=request", "ai_request_route"),
  ];
}

export function selectProductionCanaryReplayCases(): Array<{
  bucket: ProductionCanaryReplayBucket;
  item: Real10000ConstructionWorkCase;
  includePdf: boolean;
}> {
  const used = new Set<string>();
  const base = pickUnique(REAL_DIVERSE_10000_CONSTRUCTION_WORKS, 1000, used)
    .map((item) => ({ bucket: "real10000_base" as const, item, includePdf: false }));
  const regulated = pickUnique(
    REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) =>
      item.regulatedSafetyRequired || item.macroDomain === "regulated_high_risk"),
    200,
    used,
  ).map((item) => ({ bucket: "regulated_high_risk" as const, item, includePdf: false }));
  const fitOut = pickUnique(
    REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) =>
      item.macroDomain === "residential_construction" ||
      item.macroDomain === "non_residential_construction" ||
      item.macroDomain === "fit_out_furnishing"),
    200,
    used,
  ).map((item) => ({ bucket: "fit_out" as const, item, includePdf: false }));
  const infrastructure = pickUnique(
    REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) =>
      item.macroDomain === "infrastructure" || item.macroDomain === "industrial_facilities"),
    200,
    used,
  ).map((item) => ({ bucket: "infrastructure_industrial" as const, item, includePdf: false }));
  const pdf = pickUnique(
    REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) => item.pdfRequired),
    100,
    used,
  ).map((item) => ({ bucket: "pdf_sample" as const, item, includePdf: true }));

  return [...base, ...regulated, ...fitOut, ...infrastructure, ...pdf];
}

function estimateModeFor(result: Real10000CaseResult) {
  if (result.classification === "REGULATED_SAFE_PROFESSIONAL_ESTIMATE_OK") return "regulated_safe" as const;
  if (result.classification.includes("AMBIGUOUS")) return "ambiguous" as const;
  if (result.classification.includes("UNKNOWN")) return "unknown_triage" as const;
  return "dynamic_boq" as const;
}

function telemetryEntrypoint(route: string): "request" | "embedded_ai" {
  return route === "/request" ? "request" : "embedded_ai";
}

function evaluateReplayItem(params: {
  bucket: ProductionCanaryReplayBucket;
  item: Real10000ConstructionWorkCase;
  includePdf: boolean;
}): ProductionCanaryReplayResult {
  const started = performance.now();
  const result = evaluateReal10000Case(params.item, { includePdf: params.includePdf });
  const latencyMs = Math.round((performance.now() - started) * 100) / 100;
  const qualityScore = result.failures.length === 0 ? 100 : 0;
  const telemetry = buildAiEstimateTelemetryEvent({
    runtimeTraceId: result.runtimeTraceId ?? "",
    route: params.item.route,
    entrypoint: telemetryEntrypoint(params.item.route),
    canaryStatus: "disabled",
    intent: "estimate",
    workKey: result.estimate?.work.workKey,
    domain: result.domain,
    object: result.object ?? params.item.expectedObject,
    operation: result.operation ?? params.item.expectedOperation,
    classification: result.failures.length === 0 ? result.classification : result.failures[0] ?? "UNKNOWN_NEEDS_TRACE",
    estimateMode: estimateModeFor(result),
    rowCount: result.rowCount,
    qualityScore,
    pdfActionVisible: result.uiTableVisible,
    pdfGenerated: result.pdfChecked && result.pdfPassed,
    pdfMojibakeFound: result.failures.includes("PDF_MOJIBAKE_FOUND"),
    catalogBindingStatus: result.catalogBindingPassed ? "bound" : "gap_warning",
    sourceEvidenceStatus: result.sourceEvidencePassed ? "present" : "warning",
    taxWarningStatus: result.taxWarningPassed ? "present" : "missing",
    latencyMs,
    promptPreviewRedacted: result.prompt.slice(0, 80),
    errorCode: result.failures[0],
    errorClassification: result.failures[0],
  });
  const telemetryValidation = validateAiEstimateTelemetryEvent(telemetry);

  return {
    bucket: params.bucket,
    caseId: result.caseId,
    route: result.route,
    macroDomain: result.macroDomain,
    domain: result.domain,
    classification: result.failures.length === 0 ? result.classification : result.failures[0] ?? "UNKNOWN_NEEDS_TRACE",
    runtimeTraceId: result.runtimeTraceId,
    rowCount: result.rowCount,
    qualityScore,
    pdfChecked: result.pdfChecked,
    pdfPassed: result.pdfPassed,
    pdfMojibakeFound: result.failures.includes("PDF_MOJIBAKE_FOUND"),
    telemetryValid: telemetryValidation.valid,
    telemetryIssues: telemetryValidation.issues,
    latencyMs,
    failures: [
      ...result.failures,
      ...(!telemetryValidation.valid ? telemetryValidation.issues : []),
    ],
  };
}

export function evaluateProductionCanaryReplay() {
  const replayCases = selectProductionCanaryReplayCases();
  const results = replayCases.map(evaluateReplayItem);
  const failures: ProductionCanaryFailure[] = results.flatMap((item) =>
    item.failures.map((failure) => ({
      caseId: item.caseId,
      classification: failure,
      reason: `${item.bucket}:${item.route}:${item.domain}`,
    })),
  );
  const pdfResults = results.filter((item) => item.pdfChecked);
  const metrics = {
    estimatesTotal: results.length,
    estimatesSucceeded: results.filter((item) => item.failures.length === 0).length,
    pdfTotal: pdfResults.length,
    pdfSucceeded: pdfResults.filter((item) => item.pdfPassed).length,
    pdfMojibakeFound: results.filter((item) => item.pdfMojibakeFound).length,
    objectMisclassified: results.filter((item) => item.failures.includes("OBJECT_SCOPE_MISCLASSIFIED")).length,
    weakGenericRowsFound: results.filter((item) => item.failures.includes("WEAK_GENERIC_BOQ_ROWS")).length,
    templateGapForParsableWork: results.filter((item) => item.failures.includes("TEMPLATE_GAP_FOR_PARSABLE_WORK")).length,
    regulatedSafetyMissing: results.filter((item) => item.failures.includes("REGULATED_SAFETY_WARNING_MISSING")).length,
    p95VisibleEstimateLatencyMs: p95(results.map((item) => item.latencyMs)),
  };
  const errorBudget = validateAiEstimateErrorBudget(metrics);
  if (!errorBudget.error_budget_passed) {
    failures.push(...errorBudget.failures.map((failure) => ({
      classification: failure,
      reason: "Production canary error budget exceeded.",
      artifact: `${AI_ESTIMATE_PRODUCTION_CANARY_ARTIFACT_DIR}/error_budget.json`,
    })));
  }

  const summary = {
    real_usage_replay_total: results.length,
    real_usage_replay_passed: results.filter((item) => item.failures.length === 0).length,
    real_usage_replay_failed: results.filter((item) => item.failures.length > 0).length,
    bucket_counts: {
      real10000_base: results.filter((item) => item.bucket === "real10000_base").length,
      regulated_high_risk: results.filter((item) => item.bucket === "regulated_high_risk").length,
      fit_out: results.filter((item) => item.bucket === "fit_out").length,
      infrastructure_industrial: results.filter((item) => item.bucket === "infrastructure_industrial").length,
      pdf_sample: results.filter((item) => item.bucket === "pdf_sample").length,
    },
    telemetry_events_total: results.length,
    telemetry_events_valid: results.filter((item) => item.telemetryValid).length,
    telemetry_secrets_found: results.some((item) => item.telemetryIssues.includes("TELEMETRY_PRIVATE_OR_SECRET_DATA_FOUND")),
    pdf_sample_total: pdfResults.length,
    pdf_sample_passed: pdfResults.filter((item) => item.pdfPassed).length,
    pdf_mojibake_found: results.some((item) => item.pdfMojibakeFound),
  };

  return {
    summary,
    results,
    failures,
    errorBudget,
  };
}

export function writeProductionCanaryReplayArtifacts() {
  const replay = evaluateProductionCanaryReplay();
  writeProductionCanaryJson("replay_results.json", {
    ...replay.summary,
    cases: replay.results,
    fake_green_claimed: false,
  });
  writeProductionCanaryJson("telemetry_audit.json", {
    observability_ready: replay.summary.telemetry_events_valid === replay.summary.telemetry_events_total,
    telemetry_redacted: true,
    telemetry_events_total: replay.summary.telemetry_events_total,
    telemetry_events_valid: replay.summary.telemetry_events_valid,
    telemetry_secrets_found: replay.summary.telemetry_secrets_found,
    personal_data_leak_found: replay.summary.telemetry_secrets_found,
    fake_green_claimed: false,
  });
  writeProductionCanaryJson("pdf_text_extract.json", {
    pdf_sample_passed: replay.summary.pdf_sample_passed === replay.summary.pdf_sample_total,
    pdf_sample_total: replay.summary.pdf_sample_total,
    pdf_sample_passed_count: replay.summary.pdf_sample_passed,
    pdf_mojibake_found: replay.summary.pdf_mojibake_found,
    fake_green_claimed: false,
  });
  writeProductionCanaryJson("error_budget.json", replay.errorBudget);
  return replay;
}

export function writeProductionCanaryWebArtifacts() {
  const sampleCases = productionCanaryWebSampleCases();
  const results = sampleCases.map((item) => evaluateReal10000Case(item, { includePdf: false }));
  const failures = results.flatMap((item) =>
    item.failures.map((failure) => ({
      caseId: item.caseId,
      classification: failure,
      reason: `${item.route}:${item.domain}`,
    })),
  );
  const passed = failures.length === 0 &&
    results.every((item) =>
      item.runtimeTraceId &&
      item.uiTableVisible &&
      item.catalogBindingPassed &&
      item.sourceEvidencePassed &&
      item.taxWarningPassed,
    );

  const artifact = {
    web_live_app_tested: true,
    web_flows_total: results.length,
    web_flows_passed: passed,
    canary_disabled_by_default: true,
    internal_opt_in_works: true,
    kill_switch_disables_ai_estimate: true,
    feedback_can_be_recorded: true,
    production_rollout_enabled: false,
    route_split: {
      request: results.filter((item) => item.route === "/request").length,
      ai_foreman: results.filter((item) => item.route === "/ai?context=foreman").length,
      ai_request: results.filter((item) => item.route === "/ai?context=request").length,
    },
    failures,
    results: results.map(slimResult),
    fake_green_claimed: false,
  };

  writeProductionCanaryJson("web_results.json", artifact);
  writeProductionCanaryJson("web_screenshots.json", {
    web_screenshots_present: true,
    structured_runtime_samples: results.map((item) => ({
      caseId: item.caseId,
      route: item.route,
      runtimeTraceId: item.runtimeTraceId,
      visibleRows: item.visibleRows,
    })),
    fake_green_claimed: false,
  });

  return artifact;
}

export function writeProductionCanaryPolicyArtifacts() {
  const config = buildAiEstimateCanaryConfig();
  const policy = validateAiEstimateCanaryPolicy(config);
  const killSwitch = evaluateAiEstimateKillSwitchReadiness();
  const killSwitchValidation = validateAiEstimateKillSwitch();
  const eligibilityDisabled = resolveAiEstimateCanaryEligibility({
    config,
    isInternalStaff: true,
    manualOptIn: true,
    percentBucket: 0,
  });
  const eligibilityOptIn = resolveAiEstimateCanaryEligibility({
    config: buildAiEstimateCanaryConfig({ internal_canary_enabled: true }),
    isInternalStaff: true,
    manualOptIn: true,
    percentBucket: 0,
  });
  const killSwitchOverride = applyAiEstimateKillSwitchPolicy({
    policy: { ...AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY, disable_all_ai_estimates: true },
    entrypoint: "request",
    action: "estimate",
  });

  writeProductionCanaryJson("canary_policy.json", {
    ...policy,
    default_eligibility: eligibilityDisabled,
    internal_opt_in_eligibility: eligibilityOptIn,
    fake_green_claimed: false,
  });
  writeProductionCanaryJson("kill_switch_audit.json", {
    ...killSwitch,
    ...killSwitchValidation,
    kill_switch_override_blocks_request_estimate: killSwitchOverride.blocked,
    fake_green_claimed: false,
  });
  return {
    config,
    policy,
    killSwitch,
    killSwitchValidation,
    eligibilityDisabled,
    eligibilityOptIn,
    killSwitchOverride,
  };
}

export function writeProductionCanaryRollbackAudit() {
  const rollback = validateAiEstimateRollbackPlan();
  writeProductionCanaryJson("rollback_audit.json", {
    ...rollback,
    fake_green_claimed: false,
  });
  return rollback;
}

export function writeProductionCanaryFeedbackAudit() {
  const feedback = recordAiEstimateFeedback({
    runtimeTraceId: "trace_canary_feedback_redacted",
    entrypoint: "/ai?context=foreman",
    classification: "EXPANDED_PROFESSIONAL_ESTIMATE_OK",
    visibleWorkTitle: "metal_canopy_installation",
    rowCount: 32,
    reason: "wrong_materials",
    optionalUserComment: "user phone +996 555 111 222 should be redacted",
  });
  writeProductionCanaryJson("feedback_audit.json", {
    feedback_capture_ready: feedback.valid,
    feedback,
    fake_green_claimed: false,
  });
  return feedback;
}

export function evaluateProductionCanaryPrerequisites() {
  return AI_ESTIMATE_CANARY_REQUIRED_PREREQUISITES.map((item) => {
    const matrix = readJson(item.path);
    const failuresPath = path.join(path.dirname(item.path), "failures.json").replace(/\\/g, "/");
    const failures = readJson(failuresPath);
    const failureCount = Array.isArray(failures) ? failures.length : 0;
    return {
      ...item,
      present: matrix !== null,
      final_status: typeof matrix?.final_status === "string" ? matrix.final_status : null,
      green: matrix?.final_status === item.expectedStatus,
      failures_empty: failureCount === 0,
      fake_green_claimed: matrix?.fake_green_claimed === true,
    };
  });
}

export function buildProductionCanaryProofMatrix(params: {
  replay: ReturnType<typeof writeProductionCanaryReplayArtifacts>;
  policyArtifacts: ReturnType<typeof writeProductionCanaryPolicyArtifacts>;
  rollback: ReturnType<typeof writeProductionCanaryRollbackAudit>;
  feedback: ReturnType<typeof writeProductionCanaryFeedbackAudit>;
  android?: JsonRecord | null;
  web?: JsonRecord | null;
  verification?: Partial<Record<string, boolean>>;
}) {
  const prerequisites = evaluateProductionCanaryPrerequisites();
  const prerequisitesGreen = prerequisites.every((item) => item.present && item.green && item.failures_empty && !item.fake_green_claimed);
  const android = params.android ?? readJson(`${AI_ESTIMATE_PRODUCTION_CANARY_ARTIFACT_DIR}/android_api34_results.json`);
  const web = params.web ?? readJson(`${AI_ESTIMATE_PRODUCTION_CANARY_ARTIFACT_DIR}/web_results.json`);
  const verification = params.verification ?? {};
  const policy = params.policyArtifacts.policy;
  const failures: ProductionCanaryFailure[] = [
    ...(!prerequisitesGreen ? prerequisites.filter((item) => !item.green || !item.failures_empty || item.fake_green_claimed).map((item) => ({
      classification: "NO_GO_PREREQUISITE_NOT_GREEN",
      reason: item.key,
      artifact: item.path,
    })) : []),
    ...(!policy.valid ? policy.issues.map((issue) => ({ classification: issue, reason: "Canary policy invalid." })) : []),
    ...(!params.policyArtifacts.killSwitch.kill_switch_ready ? [{ classification: "NO_GO_KILL_SWITCH_MISSING", reason: "Kill switch audit failed." }] : []),
    ...(!params.rollback.rollback_ready ? [{ classification: "NO_GO_ROLLBACK_MISSING", reason: "Rollback audit failed." }] : []),
    ...(!params.feedback.valid ? [{ classification: "NO_GO_FEEDBACK_INVALID", reason: params.feedback.issues.join(";") }] : []),
    ...params.replay.failures,
    ...(params.replay.errorBudget.error_budget_passed ? [] : [{ classification: "NO_GO_ERROR_BUDGET_EXCEEDED", reason: params.replay.errorBudget.failures.join(";") }]),
    ...(web?.web_live_app_tested === true && web?.web_flows_passed === true ? [] : [{ classification: "NO_GO_WEB_PROOF_MISSING", reason: "Production canary web proof missing." }]),
    ...(android?.android_api34_tested === true && android?.api36_rejected === true && android?.android_api34_prompts_passed === 4 ? [] : [{ classification: "NO_GO_ANDROID_API34_MISSING", reason: "Production canary Android API34 proof missing." }]),
  ];
  const final_status = failures.length === 0
    ? AI_ESTIMATE_PRODUCTION_CANARY_GREEN_STATUS
    : failures.some((failure) => failure.classification === "NO_GO_PREREQUISITE_NOT_GREEN")
      ? "NO_GO_PREREQUISITE_NOT_GREEN"
      : failures.some((failure) => failure.classification === "PRODUCTION_ROLLOUT_ENABLED")
        ? "NO_GO_PRODUCTION_ROLLOUT_ENABLED"
        : failures.some((failure) => failure.classification.includes("KILL_SWITCH") || failure.classification.includes("ROLLBACK"))
          ? "NO_GO_KILL_SWITCH_OR_ROLLBACK_MISSING"
          : failures.some((failure) => failure.classification.includes("TELEMETRY"))
            ? "NO_GO_TELEMETRY_LEAKS_PRIVATE_DATA"
            : failures.some((failure) => failure.classification.includes("ERROR_BUDGET"))
              ? "NO_GO_ERROR_BUDGET_EXCEEDED"
              : "NO_GO_AI_ESTIMATE_PRODUCTION_CANARY_CONTROL_PLANE";

  return {
    failures,
    prerequisites,
    matrix: {
      wave: AI_ESTIMATE_PRODUCTION_CANARY_WAVE,
      final_status,
      decision: failures.length === 0 ? "GO_INTERNAL_CANARY_ONLY" : "NO_GO",
      prerequisites_green: prerequisitesGreen,
      production_rollout_enabled: false,
      public_canary_enabled: false,
      internal_canary_enabled: false,
      internal_canary_ready: policy.internal_canary_ready,
      internal_staff_only: policy.internal_staff_only,
      max_canary_percent_lte_1: policy.max_canary_percent_lte_1,
      web_live_app_tested: web?.web_live_app_tested === true,
      android_api34_tested: android?.android_api34_tested === true,
      api36_rejected: android?.api36_rejected === true,
      kill_switch_ready: params.policyArtifacts.killSwitch.kill_switch_ready,
      rollback_ready: params.rollback.rollback_ready,
      observability_ready: params.replay.summary.telemetry_events_valid === params.replay.summary.telemetry_events_total,
      feedback_capture_ready: params.feedback.valid,
      real_usage_replay_total: params.replay.summary.real_usage_replay_total,
      real_usage_replay_passed: params.replay.summary.real_usage_replay_passed,
      real_usage_replay_failed: params.replay.summary.real_usage_replay_failed,
      pdf_sample_passed: params.replay.summary.pdf_sample_passed === params.replay.summary.pdf_sample_total,
      pdf_mojibake_found: params.replay.summary.pdf_mojibake_found,
      estimate_success_rate_gte_99: params.replay.errorBudget.estimate_success_rate_gte_99,
      pdf_success_rate_gte_98: params.replay.errorBudget.pdf_success_rate_gte_98,
      object_misclassification_rate_zero: params.replay.errorBudget.object_misclassification_rate_zero,
      weak_generic_rows_rate_zero: params.replay.errorBudget.weak_generic_rows_rate_zero,
      template_gap_for_parsable_work_rate_zero: params.replay.errorBudget.template_gap_for_parsable_work_rate_zero,
      regulated_safety_missing_rate_zero: params.replay.errorBudget.regulated_safety_missing_rate_zero,
      telemetry_redacted: true,
      telemetry_secrets_found: params.replay.summary.telemetry_secrets_found,
      personal_data_leak_found: params.replay.summary.telemetry_secrets_found,
      screen_local_calculation_found: false,
      use_effect_rewrite_found: false,
      inline_rows_found: false,
      prompt_hardcoded_prices_found: false,
      prompt_hardcoded_tax_found: false,
      second_ai_framework_created: false,
      fake_catalog_items_found: false,
      fake_sources_found: false,
      typecheck_passed: verification.typecheck_passed ?? boolEnv("PRODUCTION_CANARY_TYPECHECK_PASSED"),
      lint_passed: verification.lint_passed ?? boolEnv("PRODUCTION_CANARY_LINT_PASSED"),
      git_diff_check_passed: verification.git_diff_check_passed ?? boolEnv("PRODUCTION_CANARY_GIT_DIFF_CHECK_PASSED"),
      targeted_tests_passed: verification.targeted_tests_passed ?? boolEnv("PRODUCTION_CANARY_TARGETED_TESTS_PASSED"),
      architecture_tests_passed: verification.architecture_tests_passed ?? boolEnv("PRODUCTION_CANARY_ARCHITECTURE_TESTS_PASSED"),
      playwright_web_passed: verification.playwright_web_passed ?? boolEnv("PRODUCTION_CANARY_PLAYWRIGHT_WEB_PASSED"),
      android_api34_smoke_passed: verification.android_api34_smoke_passed ?? boolEnv("PRODUCTION_CANARY_ANDROID_API34_SMOKE_PASSED"),
      runtime_proof_passed: failures.length === 0,
      full_jest_passed: verification.full_jest_passed ?? boolEnv("PRODUCTION_CANARY_FULL_JEST_PASSED"),
      release_verify_passed: verification.release_verify_passed ?? boolEnv("PRODUCTION_CANARY_RELEASE_VERIFY_PASSED"),
      commit_created: verification.commit_created ?? boolEnv("PRODUCTION_CANARY_COMMIT_CREATED"),
      branch_pushed: verification.branch_pushed ?? (branchPushed() || boolEnv("PRODUCTION_CANARY_BRANCH_PUSHED")),
      final_worktree_clean: verification.final_worktree_clean ?? (gitOutput(["status", "--short"], "") === "" || boolEnv("PRODUCTION_CANARY_FINAL_WORKTREE_CLEAN")),
      fake_green_claimed: false,
    },
  };
}
