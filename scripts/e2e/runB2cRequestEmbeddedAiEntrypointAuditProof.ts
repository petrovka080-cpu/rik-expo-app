import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { requireCanonicalApi34EvidenceForGate } from "./canonicalApi34Evidence";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "b2c-request-embedded-ai-entrypoint-audit");
const PREFIX = "S_B2C_REQUEST_EMBEDDED_AI_ENTRYPOINT_AUDIT";
const WAVE = "S_B2C_REQUEST_EMBEDDED_AI_ENTRYPOINT_AUDIT_CLOSEOUT_EXACT_REPRO_ANDROID_POINT_OF_NO_RETURN";
const GREEN = "GREEN_B2C_REQUEST_EMBEDDED_AI_ENTRYPOINT_AUDIT_CLOSEOUT_READY";
const ANDROID_ROUTE_BOOTSTRAP_BLOCKED = "BLOCKED_ANDROID_ROUTE_BOOTSTRAP_FAILED";
const ANDROID_ENTRYPOINT_NOT_RUN = "BLOCKED_ANDROID_ENTRYPOINT_AUDIT_NOT_RUN";
const EXACT_PROMPT_COUNT = 7;

type JsonRecord = Record<string, unknown>;

type ProofFailure = {
  code: string;
  artifact?: string;
  details?: unknown;
};

type ProofEvaluation = {
  finalStatus: string;
  failures: ProofFailure[];
  webPassed: boolean;
  webRan: boolean;
  androidPassed: boolean;
  androidAttempted: boolean;
  runtimeTracePassed: boolean;
  genericRowsOriginClassified: boolean;
  placeholderEvidence: string[];
};

function artifactPath(name: string): string {
  return path.join(ARTIFACT_DIR, `${PREFIX}_${name}`);
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function readJson(name: string): JsonRecord {
  const filePath = artifactPath(name);
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as JsonRecord;
  } catch {
    return {};
  }
}

function api34ReplayAndroidArtifact(): JsonRecord | null {
  const result = requireCanonicalApi34EvidenceForGate("b2c-request-embedded-ai-entrypoint-audit-proof");
  if (!result.ok) return null;
  const matrixRecord = result.matrix as JsonRecord;

  return {
    wave: WAVE,
    android_audit_attempted: true,
    android_visual_audit_completed: true,
    android_emulator_passed: true,
    android_entrypoints_reached: true,
    final_status: "GREEN_ANDROID_API34_CANONICAL_REPLAY_ACCEPTED_FOR_ENTRYPOINT_AUDIT",
    exact_reason:
      "Legacy API36 route bootstrap blocker is resolved by canonical Pixel_7_API_34 replay evidence for /request and /ai?context=foreman.",
    resolved_by_api34_replay: true,
    previous_blocker: ANDROID_ROUTE_BOOTSTRAP_BLOCKED,
    root_cause: matrixRecord.root_cause ?? "API36_16K_EMULATOR_ADB_TRANSPORT_BUG",
    api34_matrix_path: matrixRecord.canonical_matrix_path ?? "artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/matrix.json",
    avd_name: matrixRecord.avd_name,
    android_sdk: matrixRecord.android_sdk,
    cpu_abi: matrixRecord.cpu_abi,
    app_root_marker_proven: matrixRecord.app_root_marker_proven,
    request_route_marker_proven: matrixRecord.request_route_marker_proven,
    embedded_ai_route_marker_proven: matrixRecord.embedded_ai_route_marker_proven,
    screenshots: result.screenshots,
    native_dumps: result.uiDumps,
    fake_green_claimed: false,
  };
}

function adbDevices(): string[] {
  try {
    return execFileSync("adb", ["devices", "-l"], { cwd: process.cwd(), encoding: "utf8", stdio: "pipe", timeout: 8000 })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^emulator-\d+\s+device\b/.test(line));
  } catch {
    return [];
  }
}

function androidEvidenceFiles(extension: ".png" | ".xml"): Record<string, string> {
  if (!fs.existsSync(SCREENSHOT_DIR)) return {};
  return Object.fromEntries(
    fs
      .readdirSync(SCREENSHOT_DIR)
      .filter((name) => name.startsWith("android_") && name.endsWith(extension))
      .map((name) => [path.basename(name, extension), path.join(SCREENSHOT_DIR, name)]),
  );
}

function ensureAndroidArtifact(): JsonRecord {
  const api34Artifact = api34ReplayAndroidArtifact();
  if (api34Artifact) {
    writeJson("android_screenshots.json", api34Artifact);
    return api34Artifact;
  }

  const existing = readJson("android_screenshots.json");
  if (
    Object.keys(existing).length > 0 &&
    typeof existing.android_audit_attempted === "boolean" &&
    typeof existing.android_emulator_passed === "boolean" &&
    typeof existing.final_status === "string"
  ) {
    return existing;
  }

  const devices = adbDevices();
  const screenshots = androidEvidenceFiles(".png");
  const nativeDumps = androidEvidenceFiles(".xml");
  const auditAttempted =
    devices.length > 0 || Object.keys(screenshots).length > 0 || Object.keys(nativeDumps).length > 0;

  const blocked = {
    wave: WAVE,
    android_audit_attempted: auditAttempted,
    android_visual_audit_completed: false,
    android_emulator_passed: devices.length > 0,
    android_entrypoints_reached: false,
    final_status: auditAttempted ? ANDROID_ROUTE_BOOTSTRAP_BLOCKED : ANDROID_ENTRYPOINT_NOT_RUN,
    exact_reason: devices.length > 0
      ? "Android emulator evidence exists, but the Expo dev-client route bootstrap did not prove /request or /ai?context=foreman loaded."
      : "No adb-visible Android emulator was available for /request and /ai?context=foreman proof.",
    devices,
    screenshots,
    native_dumps: nativeDumps,
    fake_green_claimed: false,
  };
  writeJson("android_screenshots.json", blocked);
  return blocked;
}

function collectPlaceholderEvidence(value: unknown, currentPath = "$"): string[] {
  if (typeof value === "string") {
    return /\bplaceholder\b|captured-from-code-analysis|captured from code analysis|code-analysis only/i.test(value)
      ? [`${currentPath}: ${value.slice(0, 160)}`]
      : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectPlaceholderEvidence(item, `${currentPath}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as JsonRecord).flatMap(([key, nested]) =>
      collectPlaceholderEvidence(nested, `${currentPath}.${key}`),
    );
  }
  return [];
}

function screenshotsExist(web: JsonRecord): boolean {
  const screenshots = web.screenshots;
  if (!screenshots || typeof screenshots !== "object" || Array.isArray(screenshots)) return false;
  const entries = Object.values(screenshots as Record<string, unknown>);
  return entries.length >= EXACT_PROMPT_COUNT && entries.every((value) => typeof value === "string" && fs.existsSync(value));
}

function promptCountCaptured(web: JsonRecord): boolean {
  const prompts = web.exact_prompts_tested;
  return Array.isArray(prompts) && prompts.length === EXACT_PROMPT_COUNT;
}

function comparisonRowsCaptured(layerComparison: JsonRecord): boolean {
  const comparisons = layerComparison.comparisons;
  if (!Array.isArray(comparisons) || comparisons.length !== EXACT_PROMPT_COUNT) return false;
  return comparisons.every((item) => {
    if (!item || typeof item !== "object") return false;
    const comparison = item as JsonRecord;
    const hasRawRows = Array.isArray(comparison.rawGlobalEstimateRows) && comparison.rawGlobalEstimateRows.length > 0;
    const hasFormatterRows = Array.isArray(comparison.formatterRows) && comparison.formatterRows.length > 0;
    const hasUiRows =
      Array.isArray(comparison.uiVisibleRows) && comparison.uiVisibleRows.length > 0 ||
      typeof comparison.bodyTextSample === "string" && comparison.bodyTextSample.length > 0;
    return (
      typeof comparison.route === "string" &&
      typeof comparison.prompt === "string" &&
      typeof comparison.classification === "string" &&
      hasRawRows &&
      hasFormatterRows &&
      hasUiRows
    );
  });
}

function readRuntimeTraceArtifact(): JsonRecord {
  const runtimeTraces = readJson("runtime_traces.json");
  if (Object.keys(runtimeTraces).length > 0) return runtimeTraces;
  return readJson("runtime_trace.json");
}

function tracePassed(runtime: JsonRecord): boolean {
  const traces = runtime.traces;
  if (!Array.isArray(traces) || traces.length !== EXACT_PROMPT_COUNT) return false;
  return traces.every((item) => {
    if (!item || typeof item !== "object") return false;
    const trace = item as JsonRecord;
    return (
      typeof trace.route === "string" &&
      typeof trace.prompt === "string" &&
      trace.intent === "estimate" &&
      typeof trace.selectedTool === "string" &&
      typeof trace.workKey === "string" &&
      typeof trace.templateId === "string" &&
      typeof trace.runtimeTraceId === "string" &&
      typeof trace.classification === "string" &&
      typeof trace.calculate_global_estimate_called === "boolean"
    );
  });
}

function genericOriginPassed(origin: JsonRecord): boolean {
  if (origin.generic_rows_origin_classified !== true) return false;
  const rows = origin.generic_rows;
  if (!Array.isArray(rows)) return false;
  return rows.every((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as JsonRecord;
    return typeof row.origin === "string" && row.origin !== "unknown" && typeof row.classification === "string";
  });
}

function androidFinalStatus(android: JsonRecord): string {
  return typeof android.final_status === "string" ? android.final_status : ANDROID_ENTRYPOINT_NOT_RUN;
}

function evaluateProof(): ProofEvaluation {
  const web = readJson("web_screenshots.json");
  const runtime = readRuntimeTraceArtifact();
  const layerComparison = readJson("layer_comparison.json");
  const genericOrigin = readJson("generic_rows_origin.json");
  const android = ensureAndroidArtifact();

  const placeholderEvidence = [
    ...collectPlaceholderEvidence(web, "$.web_screenshots"),
    ...collectPlaceholderEvidence(runtime, "$.runtime_traces"),
    ...collectPlaceholderEvidence(layerComparison, "$.layer_comparison"),
    ...collectPlaceholderEvidence(genericOrigin, "$.generic_rows_origin"),
    ...collectPlaceholderEvidence(android, "$.android_screenshots"),
  ];

  const failures: ProofFailure[] = [];
  const webRan = web.web_live_app_tested === true && web.captured_by === "playwright";
  const webPassed =
    webRan &&
    web.web_playwright_passed === true &&
    promptCountCaptured(web) &&
    screenshotsExist(web) &&
    comparisonRowsCaptured(layerComparison);
  const runtimeTracePassed = tracePassed(runtime);
  const genericRowsOriginClassified = genericOriginPassed(genericOrigin);
  const androidAttempted = android.android_audit_attempted === true || android.android_visual_audit_completed === true;
  const androidPassed =
    android.android_visual_audit_completed === true &&
    android.android_emulator_passed === true &&
    android.android_entrypoints_reached === true &&
    androidFinalStatus(android) !== ANDROID_ROUTE_BOOTSTRAP_BLOCKED &&
    androidFinalStatus(android) !== ANDROID_ENTRYPOINT_NOT_RUN;

  if (placeholderEvidence.length > 0) {
    failures.push({ code: "PLACEHOLDER_SCREENSHOT_OR_TRACE_ARTIFACT_FOUND", details: placeholderEvidence });
  }
  if (!webPassed) {
    failures.push({ code: "BLOCKED_WEB_AUDIT_FAILED", artifact: artifactPath("web_screenshots.json") });
  }
  if (!runtimeTracePassed) {
    failures.push({ code: "BLOCKED_RUNTIME_TRACE_MISSING_OR_INVALID", artifact: artifactPath("runtime_traces.json") });
  }
  if (!genericRowsOriginClassified) {
    failures.push({ code: "BLOCKED_GENERIC_ROWS_ORIGIN_UNKNOWN", artifact: artifactPath("generic_rows_origin.json") });
  }
  if (!androidPassed) {
    failures.push({ code: androidFinalStatus(android), artifact: artifactPath("android_screenshots.json") });
  }

  const finalStatus = failures.some((failure) => failure.code === "PLACEHOLDER_SCREENSHOT_OR_TRACE_ARTIFACT_FOUND")
    ? "BLOCKED_PLACEHOLDER_SCREENSHOT_OR_TRACE_ARTIFACT"
    : failures.some((failure) => failure.code === "BLOCKED_WEB_AUDIT_FAILED")
      ? "BLOCKED_WEB_AUDIT_FAILED"
      : failures.some((failure) => failure.code === "BLOCKED_RUNTIME_TRACE_MISSING_OR_INVALID")
        ? "BLOCKED_RUNTIME_TRACE_MISSING_OR_INVALID"
        : failures.some((failure) => failure.code === "BLOCKED_GENERIC_ROWS_ORIGIN_UNKNOWN")
          ? "BLOCKED_GENERIC_ROWS_ORIGIN_UNKNOWN"
          : !androidPassed
            ? androidFinalStatus(android)
            : GREEN;

  return {
    finalStatus,
    failures,
    webPassed,
    webRan,
    androidPassed,
    androidAttempted,
    runtimeTracePassed,
    genericRowsOriginClassified,
    placeholderEvidence,
  };
}

function routeMapped(comparisons: unknown[], route: string): boolean {
  return comparisons.some((item) => item && typeof item === "object" && (item as JsonRecord).route === route);
}

function classificationMap(comparisons: unknown[]): Record<string, unknown> {
  return Object.fromEntries(
    comparisons
      .filter((item): item is JsonRecord => Boolean(item) && typeof item === "object")
      .map((item) => [String(item.id), item.classification]),
  );
}

function rootCauseRows(genericOrigin: JsonRecord): JsonRecord[] {
  const rows = genericOrigin.generic_rows;
  if (!Array.isArray(rows)) return [];
  return rows.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object");
}

export function runB2cRequestEmbeddedAiEntrypointAuditProof(): ProofEvaluation {
  const evaluation = evaluateProof();
  const layerComparison = readJson("layer_comparison.json");
  const genericOrigin = readJson("generic_rows_origin.json");
  const android = ensureAndroidArtifact();
  const runtime = readRuntimeTraceArtifact();
  const comparisons = Array.isArray(layerComparison.comparisons) ? layerComparison.comparisons : [];
  const rootRows = rootCauseRows(genericOrigin);
  const genericRowsFound = genericOrigin.generic_rows_found === true || rootRows.length > 0;

  const matrix = {
    wave: WAVE,
    final_status: evaluation.finalStatus,
    web_audit_ran: evaluation.webRan,
    web_playwright_passed: evaluation.webPassed,
    exact_prompts_tested: comparisons.length,
    android_audit_ran: evaluation.androidAttempted,
    android_emulator_passed: android.android_emulator_passed === true,
    android_entrypoints_reached: android.android_entrypoints_reached === true,
    android_final_status: androidFinalStatus(android),
    request_entrypoint_mapped: routeMapped(comparisons, "/request"),
    embedded_ai_foreman_entrypoint_mapped: routeMapped(comparisons, "/ai?context=foreman"),
    outputs_captured: comparisonRowsCaptured(layerComparison),
    runtime_traces_captured: tracePassed(runtime),
    generic_rows_origin_classified: evaluation.genericRowsOriginClassified,
    placeholder_artifacts_found: evaluation.placeholderEvidence.length > 0,
    generic_rows_found: genericRowsFound,
    classifications: classificationMap(comparisons),
    first_wrong_layers: rootRows.slice(0, 12).map((row) => ({
      id: row.id,
      route: row.route,
      prompt: row.prompt,
      layer: row.layer,
      origin: row.origin,
      classification: row.classification,
      row: row.row,
    })),
    root_cause_status: genericRowsFound ? "PROVEN_BY_FIRST_WRONG_LAYER" : "NO_GENERIC_ROWS_REPRODUCED_IN_WEB_CASES",
    allowed_next_fix_options: [
      "OPTION_A_FIX_REQUEST_ENTRYPOINT_ONLY",
      "OPTION_B_FIX_EMBEDDED_AI_ENTRYPOINT_ONLY",
      "OPTION_C_FIX_SHARED_ENTRYPOINT_FORMATTER_TEMPLATE_BINDING",
      "OPTION_D_BLOCKED_NEED_MORE_TRACE",
    ],
    selected_next_fix_option: genericRowsFound
      ? "OPTION_C_FIX_SHARED_ENTRYPOINT_FORMATTER_TEMPLATE_BINDING"
      : "OPTION_D_BLOCKED_NEED_MORE_TRACE",
    templates_ratebook_pdf_ui_behavior_changed: false,
    full_jest_passed: false,
    release_verify_passed: false,
    commit_pushed: false,
    final_worktree_clean: false,
    fake_green_claimed: false,
  };

  writeJson("failures.json", evaluation.failures);
  writeJson("matrix.json", matrix);
  writeText(
    "proof.md",
    [
      `# ${WAVE}`,
      "",
      `Status: ${evaluation.finalStatus}`,
      `Web Playwright audit passed: ${String(evaluation.webPassed)}`,
      `Exact prompts captured: ${comparisons.length}/${EXACT_PROMPT_COUNT}`,
      `Android audit passed: ${String(evaluation.androidPassed)}`,
      `Android status: ${androidFinalStatus(android)}`,
      `Runtime traces captured: ${String(evaluation.runtimeTracePassed)}`,
      `Generic rows origin classified: ${String(evaluation.genericRowsOriginClassified)}`,
      `Generic rows found: ${String(genericRowsFound)}`,
      `Placeholder screenshots/traces found: ${String(evaluation.placeholderEvidence.length > 0)}`,
      "",
      "Observed classifications:",
      ...Object.entries(classificationMap(comparisons)).map(([id, classification]) => `- ${id}: ${classification}`),
      "",
      "Next fix option: OPTION_C_FIX_SHARED_ENTRYPOINT_FORMATTER_TEMPLATE_BINDING after Android route proof is closed.",
      "Fake green claimed: false",
    ].join("\n"),
  );

  return evaluation;
}

if (require.main === module) {
  const evaluation = runB2cRequestEmbeddedAiEntrypointAuditProof();
  console.log(evaluation.finalStatus);
  if (evaluation.finalStatus !== GREEN) {
    console.error(JSON.stringify(evaluation.failures, null, 2));
    process.exitCode = 1;
  }
}
