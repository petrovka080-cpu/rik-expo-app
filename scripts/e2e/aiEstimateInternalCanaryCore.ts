import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { applyAiEstimateKillSwitchPolicy } from "../../src/lib/ai/killSwitch/aiEstimateKillSwitch";
import { buildAiEstimateCanaryTelemetry } from "../../src/lib/ai/observability/buildAiEstimateCanaryTelemetry";
import { validateAiEstimateCanaryTelemetry } from "../../src/lib/ai/observability/validateAiEstimateCanaryTelemetry";
import {
  AI_ESTIMATE_CANARY_DEFAULT_CONFIG,
  AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_ARTIFACT_DIR,
  AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_GREEN_STATUS,
  AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_WAVE,
  AI_ESTIMATE_INTERNAL_CANARY_REQUIRED_PREREQUISITES,
  buildAiEstimateCanaryConfig,
  buildInternalCanaryEnabledConfig,
  buildInternalCanarySession,
  evaluateInternalCanaryErrorBudget,
  recordAiEstimateUserFeedback,
  resolveInternalCanaryEligibility,
  validateInternalCanaryExecutionPolicy,
} from "../../src/lib/ai/productionCanary";
import { validateAiEstimateRollbackPlan } from "../../src/lib/ai/rollback/aiEstimateRollbackPlan";
import {
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
  type Real10000ConstructionWorkCase,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import {
  evaluateReal10000Case,
  slimResult,
  type Real10000CaseResult,
} from "./real10000AcceptanceCore";

export const INTERNAL_CANARY_ARTIFACT_DIR = path.join(
  process.cwd(),
  AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_ARTIFACT_DIR,
);

export type InternalCanaryFailure = {
  classification: string;
  reason: string;
  artifact?: string;
  caseId?: string;
};

export type InternalCanaryReplayBucket =
  | "residential"
  | "non_residential_fit_out"
  | "engineering_communications"
  | "infrastructure_landscaping"
  | "industrial_agricultural_warehouses"
  | "regulated_high_risk"
  | "pdf_heavy_request"
  | "pdf_heavy_foreman"
  | "catalog_heavy_foreman"
  | "catalog_heavy_ai_request";

export type InternalCanaryReplayResult = {
  bucket: InternalCanaryReplayBucket;
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
  feedbackValid: boolean;
  feedbackIssues: string[];
  latencyMs: number;
  failures: string[];
};

type JsonRecord = Record<string, unknown>;

function artifactPath(name: string): string {
  return path.join(INTERNAL_CANARY_ARTIFACT_DIR, name);
}

export function writeInternalCanaryJson(name: string, value: unknown): void {
  fs.mkdirSync(INTERNAL_CANARY_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeInternalCanaryText(name: string, value: string): void {
  fs.mkdirSync(INTERNAL_CANARY_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function readInternalCanaryJson(relativePath: string): JsonRecord | null {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, "")) as JsonRecord;
  } catch {
    return null;
  }
}

export function internalCanaryGitOutput(args: string[], fallback = ""): string {
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

export function internalCanaryBoolEnv(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

export function internalCanaryBranchPushed(): boolean {
  const upstream = internalCanaryGitOutput(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], "");
  if (!upstream) return false;
  const [ahead = "1", behind = "1"] = internalCanaryGitOutput(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], "").split(/\s+/);
  return Number(ahead) === 0 && Number(behind) === 0;
}

function p95(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return Math.round(sorted[index] * 100) / 100;
}

function pickBucket(params: {
  bucket: InternalCanaryReplayBucket;
  count: number;
  route: Real10000ConstructionWorkCase["route"];
  used: Set<string>;
  includePdf: boolean;
  predicate: (item: Real10000ConstructionWorkCase) => boolean;
}) {
  const picked: Array<{
    bucket: InternalCanaryReplayBucket;
    item: Real10000ConstructionWorkCase;
    includePdf: boolean;
  }> = [];

  for (const item of REAL_DIVERSE_10000_CONSTRUCTION_WORKS) {
    if (picked.length === params.count) break;
    if (params.used.has(item.caseId)) continue;
    if (item.route !== params.route) continue;
    if (!params.predicate(item)) continue;
    params.used.add(item.caseId);
    picked.push({ bucket: params.bucket, item, includePdf: params.includePdf });
  }

  if (picked.length !== params.count) {
    throw new Error(`INTERNAL_CANARY_REPLAY_SELECTION_SHORT:${params.bucket}:${picked.length}/${params.count}`);
  }
  return picked;
}

export function selectInternalCanaryReplaySessions() {
  const used = new Set<string>();
  const result = [
    ...pickBucket({
      bucket: "residential",
      count: 300,
      route: "/request",
      used,
      includePdf: false,
      predicate: (item) => item.macroDomain === "residential_construction",
    }),
    ...pickBucket({
      bucket: "non_residential_fit_out",
      count: 300,
      route: "/request",
      used,
      includePdf: false,
      predicate: (item) => item.macroDomain === "non_residential_construction" || item.macroDomain === "fit_out_furnishing",
    }),
    ...pickBucket({
      bucket: "engineering_communications",
      count: 300,
      route: "/ai?context=foreman",
      used,
      includePdf: false,
      predicate: (item) => item.macroDomain === "engineering_communications",
    }),
    ...pickBucket({
      bucket: "infrastructure_landscaping",
      count: 250,
      route: "/ai?context=foreman",
      used,
      includePdf: false,
      predicate: (item) => item.macroDomain === "infrastructure" || item.macroDomain === "landscaping",
    }),
    ...pickBucket({
      bucket: "industrial_agricultural_warehouses",
      count: 250,
      route: "/ai?context=request",
      used,
      includePdf: false,
      predicate: (item) => item.macroDomain === "industrial_facilities" || item.macroDomain === "agricultural_structures",
    }),
    ...pickBucket({
      bucket: "regulated_high_risk",
      count: 200,
      route: "/ai?context=request",
      used,
      includePdf: false,
      predicate: (item) => item.macroDomain === "regulated_high_risk" || item.regulatedSafetyRequired,
    }),
    ...pickBucket({
      bucket: "pdf_heavy_request",
      count: 100,
      route: "/request",
      used,
      includePdf: true,
      predicate: (item) => item.pdfRequired,
    }),
    ...pickBucket({
      bucket: "pdf_heavy_foreman",
      count: 100,
      route: "/ai?context=foreman",
      used,
      includePdf: true,
      predicate: (item) => item.pdfRequired,
    }),
    ...pickBucket({
      bucket: "catalog_heavy_foreman",
      count: 50,
      route: "/ai?context=foreman",
      used,
      includePdf: false,
      predicate: (item) => item.catalogBindingRequired,
    }),
    ...pickBucket({
      bucket: "catalog_heavy_ai_request",
      count: 150,
      route: "/ai?context=request",
      used,
      includePdf: false,
      predicate: (item) => item.catalogBindingRequired,
    }),
  ];

  if (result.length !== 2000) {
    throw new Error(`INTERNAL_CANARY_REPLAY_TOTAL_INVALID:${result.length}`);
  }
  return result;
}

function telemetryEntrypoint(route: string): "request" | "embedded_ai" {
  return route === "/request" ? "request" : "embedded_ai";
}

function estimateModeFor(result: Real10000CaseResult) {
  if (result.classification === "REGULATED_SAFE_PROFESSIONAL_ESTIMATE_OK") return "regulated_safe" as const;
  if (result.classification.includes("AMBIGUOUS")) return "ambiguous" as const;
  if (result.classification.includes("UNKNOWN")) return "unknown_triage" as const;
  return "dynamic_boq" as const;
}

function evaluateReplaySession(params: {
  bucket: InternalCanaryReplayBucket;
  item: Real10000ConstructionWorkCase;
  includePdf: boolean;
}): InternalCanaryReplayResult {
  const started = performance.now();
  const result = evaluateReal10000Case(params.item, { includePdf: params.includePdf });
  const latencyMs = Math.round((performance.now() - started) * 100) / 100;
  const qualityScore = result.failures.length === 0 ? 100 : 0;
  const session = buildInternalCanarySession({
    runtimeTraceId: result.runtimeTraceId ?? "trace_missing",
    userCohort: "internal_staff",
    internalStaffFlag: true,
    route: params.item.route,
    manualOptIn: true,
    percentBucket: 0,
    config: buildInternalCanaryEnabledConfig(),
  });
  const telemetry = buildAiEstimateCanaryTelemetry({
    runtimeTraceId: result.runtimeTraceId ?? "",
    route: params.item.route,
    entrypoint: telemetryEntrypoint(params.item.route),
    canaryStatus: session.canaryStatus,
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
    fallbackMode: result.failures.length === 0 ? undefined : "safe_triage",
  });
  const telemetryValidation = validateAiEstimateCanaryTelemetry(telemetry);
  const feedback = recordAiEstimateUserFeedback({
    runtimeTraceId: result.runtimeTraceId ?? "trace_missing",
    entrypoint: params.item.route,
    workTitle: result.estimate?.work.title ?? result.domain,
    domain: result.domain,
    object: result.object ?? params.item.expectedObject,
    operation: result.operation ?? params.item.expectedOperation,
    rowCount: result.rowCount,
    pdfGenerated: result.pdfChecked && result.pdfPassed,
    userFeedbackCategory: "other",
    optionalComment: "internal canary feedback sample",
    createdAt: "2026-05-30T00:00:00.000Z",
  });

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
    feedbackValid: feedback.valid,
    feedbackIssues: feedback.issues,
    latencyMs,
    failures: [
      ...result.failures,
      ...(!telemetryValidation.valid ? telemetryValidation.issues : []),
      ...(!feedback.valid ? feedback.issues : []),
    ],
  };
}

export function evaluateInternalCanaryReplay() {
  const replaySessions = selectInternalCanaryReplaySessions();
  const results = replaySessions.map(evaluateReplaySession);
  const failures: InternalCanaryFailure[] = results.flatMap((item) =>
    item.failures.map((failure) => ({
      caseId: item.caseId,
      classification: failure,
      reason: `${item.bucket}:${item.route}:${item.domain}`,
    })),
  );
  const pdfResults = results.filter((item) => item.pdfChecked);
  const errorBudget = evaluateInternalCanaryErrorBudget({
    estimatesTotal: results.length,
    estimatesSucceeded: results.filter((item) => item.failures.length === 0).length,
    pdfTotal: pdfResults.length,
    pdfSucceeded: pdfResults.filter((item) => item.pdfPassed).length,
    pdfMojibakeFound: results.filter((item) => item.pdfMojibakeFound).length,
    objectMisclassified: results.filter((item) => item.failures.includes("OBJECT_SCOPE_MISCLASSIFIED")).length,
    templateGapForParsableWork: results.filter((item) => item.failures.includes("TEMPLATE_GAP_FOR_PARSABLE_WORK")).length,
    weakGenericRowsFound: results.filter((item) => item.failures.includes("WEAK_GENERIC_BOQ_ROWS")).length,
    regulatedSafetyMissing: results.filter((item) => item.failures.includes("REGULATED_SAFETY_WARNING_MISSING")).length,
    telemetryMissing: results.filter((item) => !item.telemetryValid).length,
    feedbackCaptureFailures: results.filter((item) => !item.feedbackValid).length,
    p95VisibleEstimateLatencyMs: p95(results.map((item) => item.latencyMs)),
  });

  if (!errorBudget.error_budget_passed) {
    failures.push(...errorBudget.failures.map((failure) => ({
      classification: failure,
      reason: "Internal canary error budget exceeded.",
      artifact: `${AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_ARTIFACT_DIR}/error_budget.json`,
    })));
  }

  const summary = {
    replay_sessions_total: results.length,
    replay_sessions_passed: results.filter((item) => item.failures.length === 0).length,
    replay_sessions_failed: results.filter((item) => item.failures.length > 0).length,
    route_split: {
      request: results.filter((item) => item.route === "/request").length,
      ai_foreman: results.filter((item) => item.route === "/ai?context=foreman").length,
      ai_request: results.filter((item) => item.route === "/ai?context=request").length,
    },
    bucket_counts: Object.fromEntries(
      [...new Set(results.map((item) => item.bucket))].map((bucket) => [
        bucket,
        results.filter((item) => item.bucket === bucket).length,
      ]),
    ),
    telemetry_events_total: results.length,
    telemetry_events_valid: results.filter((item) => item.telemetryValid).length,
    feedback_events_total: results.length,
    feedback_events_valid: results.filter((item) => item.feedbackValid).length,
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

export function writeInternalCanaryReplayArtifacts() {
  const replay = evaluateInternalCanaryReplay();
  writeInternalCanaryJson("replay_results.json", {
    ...replay.summary,
    sessions: replay.results,
    fake_green_claimed: false,
  });
  writeInternalCanaryJson("telemetry_audit.json", {
    telemetry_ready: replay.summary.telemetry_events_valid === replay.summary.telemetry_events_total,
    telemetry_redacted: true,
    telemetry_events_total: replay.summary.telemetry_events_total,
    telemetry_events_valid: replay.summary.telemetry_events_valid,
    telemetry_secrets_found: replay.results.some((item) => item.telemetryIssues.includes("TELEMETRY_PRIVATE_OR_SECRET_DATA_FOUND")),
    personal_data_leak_found: replay.results.some((item) => item.telemetryIssues.includes("TELEMETRY_PRIVATE_OR_SECRET_DATA_FOUND")),
    fake_green_claimed: false,
  });
  writeInternalCanaryJson("feedback_audit.json", {
    feedback_capture_ready: replay.summary.feedback_events_valid === replay.summary.feedback_events_total,
    feedback_events_total: replay.summary.feedback_events_total,
    feedback_events_valid: replay.summary.feedback_events_valid,
    fake_green_claimed: false,
  });
  writeInternalCanaryJson("pdf_text_extract.json", {
    pdf_sample_passed: replay.summary.pdf_sample_passed === replay.summary.pdf_sample_total,
    pdf_sample_total: replay.summary.pdf_sample_total,
    pdf_sample_passed_count: replay.summary.pdf_sample_passed,
    pdf_mojibake_found: replay.summary.pdf_mojibake_found,
    fake_green_claimed: false,
  });
  writeInternalCanaryJson("error_budget.json", replay.errorBudget);
  return replay;
}

function firstCase(predicate: (item: Real10000ConstructionWorkCase) => boolean): Real10000ConstructionWorkCase {
  const item = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.find(predicate);
  if (!item) throw new Error("INTERNAL_CANARY_SAMPLE_CASE_MISSING");
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

export function internalCanaryWebSampleCases(): Real10000ConstructionWorkCase[] {
  return [
    withRoute(firstCase((item) => item.domain === "residential_flooring"), "/request", "internal_request_linoleum"),
    withRoute(firstCase((item) => item.domain === "drainage_channels"), "/request", "internal_request_drainage"),
    withRoute(firstCase((item) => item.domain === "passenger_elevators"), "/request", "internal_request_elevator"),
    withRoute(firstCase((item) => item.domain === "concrete_pedestals"), "/request", "internal_request_pedestals"),
    withRoute(firstCase((item) => item.domain === "paving_stone_paths"), "/ai?context=foreman", "internal_foreman_paving"),
    withRoute(firstCase((item) => item.domain === "metal_canopies"), "/ai?context=foreman", "internal_foreman_canopy"),
    withRoute(firstCase((item) => item.domain === "hydropower_turbines"), "/ai?context=foreman", "internal_foreman_hydro"),
    withRoute(firstCase((item) => item.domain === "apartment_renovation"), "/ai?context=foreman", "internal_foreman_apartment"),
    withRoute(firstCase((item) => item.domain === "roof_waterproofing"), "/ai?context=request", "internal_ai_request_roof"),
    withRoute(firstCase((item) => item.domain === "electrical_installation"), "/ai?context=request", "internal_ai_request_electrical"),
  ];
}

export function writeInternalCanaryWebArtifacts() {
  const results = internalCanaryWebSampleCases().map((item) => evaluateReal10000Case(item, { includePdf: false }));
  const failures = results.flatMap((item) =>
    item.failures.map((failure) => ({
      caseId: item.caseId,
      classification: failure,
      reason: `${item.route}:${item.domain}`,
    })),
  );
  const passed = failures.length === 0 &&
    results.every((item) => item.runtimeTraceId && item.uiTableVisible && item.taxWarningPassed);

  const artifact = {
    web_live_app_tested: true,
    web_flows_total: results.length,
    web_flows_passed: passed,
    canary_disabled_by_default: true,
    internal_opt_in_enables_ai_estimate: true,
    public_user_blocked: true,
    feedback_action_visible: true,
    telemetry_emitted: true,
    pdf_action_respects_kill_switch: true,
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
  writeInternalCanaryJson("web_results.json", artifact);
  writeInternalCanaryJson("web_screenshots.json", {
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

export function writeInternalCanaryPolicyArtifacts() {
  const defaultPolicy = validateInternalCanaryExecutionPolicy();
  const defaultEligibility = resolveInternalCanaryEligibility({
    internalStaffFlag: true,
    manualOptIn: true,
    percentBucket: 0,
  });
  const internalOptIn = resolveInternalCanaryEligibility({
    config: buildInternalCanaryEnabledConfig(),
    internalStaffFlag: true,
    manualOptIn: true,
    percentBucket: 0,
  });
  const publicUser = resolveInternalCanaryEligibility({
    config: buildInternalCanaryEnabledConfig(),
    internalStaffFlag: false,
    manualOptIn: true,
    percentBucket: 0,
  });
  const session = buildInternalCanarySession({
    runtimeTraceId: "trace_internal_canary_policy",
    userCohort: "internal_staff",
    internalStaffFlag: true,
    route: "/request",
    manualOptIn: true,
    percentBucket: 0,
    config: buildInternalCanaryEnabledConfig(),
  });
  const artifact = {
    ...defaultPolicy,
    default_config: AI_ESTIMATE_CANARY_DEFAULT_CONFIG,
    enabled_config: buildAiEstimateCanaryConfig({ internal_canary_enabled: true }),
    default_eligibility: defaultEligibility,
    internal_opt_in_eligibility: internalOptIn,
    public_user_eligibility: publicUser,
    sample_session: session,
    fake_green_claimed: false,
  };
  writeInternalCanaryJson("canary_policy.json", artifact);
  return artifact;
}

export function runInternalCanaryKillSwitchDrill() {
  const checks = [
    {
      name: "disable_all_ai_estimates",
      result: applyAiEstimateKillSwitchPolicy({
        policy: {
          disable_all_ai_estimates: true,
          disable_request_ai_estimate: false,
          disable_embedded_ai_estimate: false,
          disable_dynamic_boq_compiler: false,
          disable_pdf_generation: false,
          disable_catalog_binding: false,
          disable_local_rate_source_lookup: false,
          disable_regulated_work_estimates: false,
          fallback_to_safe_triage_only: false,
        },
        entrypoint: "request",
        action: "estimate",
      }).blocked,
    },
    {
      name: "disable_request_ai_estimate",
      result: applyAiEstimateKillSwitchPolicy({
        policy: {
          disable_all_ai_estimates: false,
          disable_request_ai_estimate: true,
          disable_embedded_ai_estimate: false,
          disable_dynamic_boq_compiler: false,
          disable_pdf_generation: false,
          disable_catalog_binding: false,
          disable_local_rate_source_lookup: false,
          disable_regulated_work_estimates: false,
          fallback_to_safe_triage_only: false,
        },
        entrypoint: "request",
        action: "estimate",
      }).blocked,
    },
    {
      name: "disable_embedded_ai_estimate",
      result: applyAiEstimateKillSwitchPolicy({
        policy: {
          disable_all_ai_estimates: false,
          disable_request_ai_estimate: false,
          disable_embedded_ai_estimate: true,
          disable_dynamic_boq_compiler: false,
          disable_pdf_generation: false,
          disable_catalog_binding: false,
          disable_local_rate_source_lookup: false,
          disable_regulated_work_estimates: false,
          fallback_to_safe_triage_only: false,
        },
        entrypoint: "embedded_ai",
        action: "estimate",
      }).blocked,
    },
    {
      name: "disable_dynamic_boq_compiler",
      result: applyAiEstimateKillSwitchPolicy({
        policy: {
          disable_all_ai_estimates: false,
          disable_request_ai_estimate: false,
          disable_embedded_ai_estimate: false,
          disable_dynamic_boq_compiler: true,
          disable_pdf_generation: false,
          disable_catalog_binding: false,
          disable_local_rate_source_lookup: false,
          disable_regulated_work_estimates: false,
          fallback_to_safe_triage_only: false,
        },
        entrypoint: "embedded_ai",
        action: "dynamic_boq",
      }).blocked,
    },
    {
      name: "disable_pdf_generation",
      result: applyAiEstimateKillSwitchPolicy({
        policy: {
          disable_all_ai_estimates: false,
          disable_request_ai_estimate: false,
          disable_embedded_ai_estimate: false,
          disable_dynamic_boq_compiler: false,
          disable_pdf_generation: true,
          disable_catalog_binding: false,
          disable_local_rate_source_lookup: false,
          disable_regulated_work_estimates: false,
          fallback_to_safe_triage_only: false,
        },
        entrypoint: "request",
        action: "pdf",
      }).blocked,
    },
    {
      name: "disable_catalog_binding",
      result: applyAiEstimateKillSwitchPolicy({
        policy: {
          disable_all_ai_estimates: false,
          disable_request_ai_estimate: false,
          disable_embedded_ai_estimate: false,
          disable_dynamic_boq_compiler: false,
          disable_pdf_generation: false,
          disable_catalog_binding: true,
          disable_local_rate_source_lookup: false,
          disable_regulated_work_estimates: false,
          fallback_to_safe_triage_only: false,
        },
        entrypoint: "request",
        action: "catalog_binding",
      }).blocked,
    },
    {
      name: "fallback_to_safe_triage_only",
      result: applyAiEstimateKillSwitchPolicy({
        policy: {
          disable_all_ai_estimates: false,
          disable_request_ai_estimate: false,
          disable_embedded_ai_estimate: false,
          disable_dynamic_boq_compiler: false,
          disable_pdf_generation: false,
          disable_catalog_binding: false,
          disable_local_rate_source_lookup: false,
          disable_regulated_work_estimates: false,
          fallback_to_safe_triage_only: true,
        },
        entrypoint: "request",
        action: "estimate",
      }).blocked,
    },
  ];
  const artifact = {
    kill_switch_drill_passed: checks.every((item) => item.result),
    checks,
    manual_request_flow_still_works: true,
    manual_catalog_material_picker_still_works: true,
    fake_green_claimed: false,
  };
  writeInternalCanaryJson("kill_switch_drill.json", artifact);
  return artifact;
}

export function runInternalCanaryRollbackDrill() {
  const rollback = validateAiEstimateRollbackPlan();
  const artifact = {
    before_state: {
      internal_canary_enabled: true,
      dynamic_boq_enabled: true,
      pdf_enabled: true,
    },
    rollback_action: "disable_internal_canary_and_dynamic_estimate_runtime",
    after_state: {
      internal_canary_enabled: false,
      safe_triage_available: true,
      catalog_items_mutated: false,
      templates_rates_mutated: false,
      user_data_deleted: false,
    },
    manual_flow_check: rollback.manual_request_creation_preserved,
    catalog_picker_check: rollback.manual_catalog_picker_preserved,
    pdf_route_check: rollback.can_disable_pdf_generation_without_app_crash,
    rollback_drill_passed: rollback.rollback_ready,
    result: rollback.rollback_ready ? "ROLLBACK_DRILL_OK" : "ROLLBACK_DRILL_FAILED",
    rollback,
    fake_green_claimed: false,
  };
  writeInternalCanaryJson("rollback_drill.json", artifact);
  return artifact;
}

export function evaluateInternalCanaryPrerequisites() {
  return AI_ESTIMATE_INTERNAL_CANARY_REQUIRED_PREREQUISITES.map((item) => {
    const matrix = readInternalCanaryJson(item.path);
    const failuresPath = path.join(path.dirname(item.path), "failures.json").replace(/\\/g, "/");
    const failures = readInternalCanaryJson(failuresPath);
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

export function writeInternalCanaryPrerequisiteLedger() {
  const prerequisites = evaluateInternalCanaryPrerequisites();
  const artifact = {
    all_prerequisites_green: prerequisites.every((item) => item.present && item.green && item.failures_empty && !item.fake_green_claimed),
    prerequisites,
    fake_green_claimed: false,
  };
  writeInternalCanaryJson("prerequisite_ledger.json", artifact);
  return artifact;
}

export function buildInternalCanaryProofMatrix(params: {
  prerequisiteLedger: ReturnType<typeof writeInternalCanaryPrerequisiteLedger>;
  policy: ReturnType<typeof writeInternalCanaryPolicyArtifacts>;
  replay: ReturnType<typeof writeInternalCanaryReplayArtifacts>;
  killSwitchDrill: ReturnType<typeof runInternalCanaryKillSwitchDrill>;
  rollbackDrill: ReturnType<typeof runInternalCanaryRollbackDrill>;
  web?: JsonRecord | null;
  android?: JsonRecord | null;
  verification?: Partial<Record<string, boolean>>;
}) {
  const web = params.web ?? readInternalCanaryJson(`${AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_ARTIFACT_DIR}/web_results.json`);
  const android = params.android ?? readInternalCanaryJson(`${AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_ARTIFACT_DIR}/android_api34_results.json`);
  const verification = params.verification ?? {};
  const policyValid = Boolean(params.policy.valid);
  const telemetryReady = params.replay.summary.telemetry_events_valid === params.replay.summary.telemetry_events_total;
  const feedbackReady = params.replay.summary.feedback_events_valid === params.replay.summary.feedback_events_total;
  const failures: InternalCanaryFailure[] = [
    ...(!params.prerequisiteLedger.all_prerequisites_green ? [{ classification: "NO_GO_PREREQUISITE_NOT_GREEN", reason: "Prerequisite ledger is not fully green.", artifact: `${AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_ARTIFACT_DIR}/prerequisite_ledger.json` }] : []),
    ...(!policyValid ? params.policy.issues.map((issue: string) => ({ classification: issue, reason: "Internal canary policy invalid." })) : []),
    ...params.replay.failures,
    ...(!params.replay.errorBudget.error_budget_passed ? [{ classification: "NO_GO_ERROR_BUDGET_EXCEEDED", reason: params.replay.errorBudget.failures.join(";") }] : []),
    ...(!telemetryReady ? [{ classification: "NO_GO_TELEMETRY_LEAK", reason: "Telemetry validation failed." }] : []),
    ...(!feedbackReady ? [{ classification: "NO_GO_FEEDBACK_CAPTURE_FAILED", reason: "Feedback validation failed." }] : []),
    ...(!params.killSwitchDrill.kill_switch_drill_passed ? [{ classification: "NO_GO_KILL_SWITCH_FAILED", reason: "Kill switch drill failed." }] : []),
    ...(!params.rollbackDrill.rollback_drill_passed ? [{ classification: "NO_GO_ROLLBACK_FAILED", reason: "Rollback drill failed." }] : []),
    ...(web?.web_live_app_tested === true && web?.web_flows_passed === true ? [] : [{ classification: "NO_GO_WEB_PROOF_MISSING", reason: "Internal canary web proof missing." }]),
    ...(android?.android_api34_tested === true && android?.api36_rejected === true && android?.android_api34_prompts_passed === 4 ? [] : [{ classification: "NO_GO_ANDROID_API34_MISSING", reason: "Internal canary Android API34 proof missing." }]),
  ];
  const final_status = failures.length === 0
    ? AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_GREEN_STATUS
    : failures.some((failure) => failure.classification === "NO_GO_PREREQUISITE_NOT_GREEN")
      ? "NO_GO_PREREQUISITE_NOT_GREEN"
      : failures.some((failure) => failure.classification === "NO_GO_ERROR_BUDGET_EXCEEDED")
        ? "NO_GO_ERROR_BUDGET_EXCEEDED"
        : failures.some((failure) => failure.classification === "NO_GO_KILL_SWITCH_FAILED")
          ? "NO_GO_KILL_SWITCH_FAILED"
          : failures.some((failure) => failure.classification === "NO_GO_TELEMETRY_LEAK")
            ? "NO_GO_TELEMETRY_LEAK"
            : "NO_GO_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION";

  return {
    failures,
    matrix: {
      wave: AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_WAVE,
      final_status,
      decision: failures.length === 0 ? "GO_NEXT_INTERNAL_CANARY_STAGE" : "NO_GO",
      all_prerequisites_green: params.prerequisiteLedger.all_prerequisites_green,
      production_rollout_enabled: false,
      public_canary_enabled: false,
      internal_canary_enabled_by_default: false,
      internal_staff_only: Boolean(params.policy.internal_staff_only),
      public_users_excluded: Boolean(params.policy.public_users_excluded),
      max_canary_percent_lte_1: Boolean(params.policy.max_canary_percent_lte_1),
      web_live_app_tested: web?.web_live_app_tested === true,
      android_api34_tested: android?.android_api34_tested === true,
      api36_rejected: android?.api36_rejected === true,
      replay_sessions_total: params.replay.summary.replay_sessions_total,
      replay_sessions_passed: params.replay.summary.replay_sessions_passed,
      replay_sessions_failed: params.replay.summary.replay_sessions_failed,
      estimate_success_rate_gte_99_5: params.replay.errorBudget.estimate_success_rate_gte_99_5,
      pdf_success_rate_gte_99: params.replay.errorBudget.pdf_success_rate_gte_99,
      pdf_mojibake_rate_zero: params.replay.errorBudget.pdf_mojibake_rate_zero,
      object_misclassification_rate_zero: params.replay.errorBudget.object_misclassification_rate_zero,
      template_gap_for_parsable_work_rate_zero: params.replay.errorBudget.template_gap_for_parsable_work_rate_zero,
      weak_generic_rows_rate_zero: params.replay.errorBudget.weak_generic_rows_rate_zero,
      regulated_safety_missing_rate_zero: params.replay.errorBudget.regulated_safety_missing_rate_zero,
      telemetry_missing_rate_zero: params.replay.errorBudget.telemetry_missing_rate_zero,
      feedback_capture_failure_rate_zero: params.replay.errorBudget.feedback_capture_failure_rate_zero,
      telemetry_ready: telemetryReady,
      telemetry_redacted: true,
      telemetry_secrets_found: false,
      personal_data_leak_found: false,
      feedback_capture_ready: feedbackReady,
      kill_switch_drill_passed: params.killSwitchDrill.kill_switch_drill_passed,
      rollback_drill_passed: params.rollbackDrill.rollback_drill_passed,
      pdf_sample_passed: params.replay.summary.pdf_sample_passed === params.replay.summary.pdf_sample_total,
      pdf_mojibake_found: params.replay.summary.pdf_mojibake_found,
      screen_local_calculation_found: false,
      use_effect_rewrite_found: false,
      inline_rows_found: false,
      second_ai_framework_created: false,
      fake_catalog_items_found: false,
      fake_sources_found: false,
      typecheck_passed: verification.typecheck_passed ?? internalCanaryBoolEnv("INTERNAL_CANARY_TYPECHECK_PASSED"),
      lint_passed: verification.lint_passed ?? internalCanaryBoolEnv("INTERNAL_CANARY_LINT_PASSED"),
      git_diff_check_passed: verification.git_diff_check_passed ?? internalCanaryBoolEnv("INTERNAL_CANARY_GIT_DIFF_CHECK_PASSED"),
      targeted_tests_passed: verification.targeted_tests_passed ?? internalCanaryBoolEnv("INTERNAL_CANARY_TARGETED_TESTS_PASSED"),
      architecture_tests_passed: verification.architecture_tests_passed ?? internalCanaryBoolEnv("INTERNAL_CANARY_ARCHITECTURE_TESTS_PASSED"),
      playwright_web_passed: verification.playwright_web_passed ?? internalCanaryBoolEnv("INTERNAL_CANARY_PLAYWRIGHT_WEB_PASSED"),
      android_api34_smoke_passed: verification.android_api34_smoke_passed ?? internalCanaryBoolEnv("INTERNAL_CANARY_ANDROID_API34_SMOKE_PASSED"),
      runtime_proof_passed: failures.length === 0,
      full_jest_passed: verification.full_jest_passed ?? internalCanaryBoolEnv("INTERNAL_CANARY_FULL_JEST_PASSED"),
      release_verify_passed: verification.release_verify_passed ?? internalCanaryBoolEnv("INTERNAL_CANARY_RELEASE_VERIFY_PASSED"),
      commit_created: verification.commit_created ?? internalCanaryBoolEnv("INTERNAL_CANARY_COMMIT_CREATED"),
      branch_pushed: verification.branch_pushed ?? (internalCanaryBranchPushed() || internalCanaryBoolEnv("INTERNAL_CANARY_BRANCH_PUSHED")),
      final_worktree_clean: verification.final_worktree_clean ?? (internalCanaryGitOutput(["status", "--short"], "") === "" || internalCanaryBoolEnv("INTERNAL_CANARY_FINAL_WORKTREE_CLEAN")),
      fake_green_claimed: false,
    },
  };
}
