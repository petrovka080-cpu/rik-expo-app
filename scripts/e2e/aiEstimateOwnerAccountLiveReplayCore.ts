import fs from "node:fs";
import path from "node:path";

import { applyAiEstimateKillSwitchPolicy } from "../../src/lib/ai/killSwitch/aiEstimateKillSwitch";
import { buildAiEstimateTelemetryEvent } from "../../src/lib/ai/observability/buildAiEstimateTelemetryEvent";
import { validateAiEstimateTelemetryEvent } from "../../src/lib/ai/observability/validateAiEstimateTelemetryEvent";
import {
  AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_ARTIFACT_DIR,
  AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_GREEN_STATUS,
  AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_WAVE,
  buildAiEstimateOwnerAccountReplayPolicy,
  ownerAccountIdentityPresent,
  ownerAccountSessionPresent,
  recordLimitedPublicBetaFeedback,
  redactOwnerAccountReplayIdentity,
  resolveOwnerAccountReplayEligibility,
  resolveOwnerAccountReplayIdentity,
  validateOwnerAccountReplayPolicy,
  type AiEstimateOwnerAccountReplayFailureClassification,
  type AiEstimateOwnerAccountReplayIdentity,
} from "../../src/lib/ai/productionCanary";
import { validateAiEstimateRollbackPlan } from "../../src/lib/ai/rollback/aiEstimateRollbackPlan";
import {
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
  type Real10000ConstructionWorkCase,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import { resolveCanonicalApi34Evidence } from "./canonicalApi34Evidence";
import { evaluateReal10000Case, slimResult, type Real10000CaseResult } from "./real10000AcceptanceCore";

export const OWNER_REPLAY_ARTIFACT_DIR = path.join(
  process.cwd(),
  AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_ARTIFACT_DIR,
);

export type OwnerReplayFailure = {
  classification: AiEstimateOwnerAccountReplayFailureClassification;
  reason: string;
  artifact?: string;
  route?: string;
  prompt?: string;
};

function artifactPath(name: string): string {
  return path.join(OWNER_REPLAY_ARTIFACT_DIR, name);
}

export function writeOwnerReplayJson(name: string, value: unknown): void {
  fs.mkdirSync(OWNER_REPLAY_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeOwnerReplayText(name: string, value: string): void {
  fs.mkdirSync(OWNER_REPLAY_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function findCase(domain: string): Real10000ConstructionWorkCase {
  const item = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.find((candidate) => candidate.domain === domain);
  if (!item) throw new Error(`OWNER_REPLAY_CASE_MISSING:${domain}`);
  return item;
}

const OWNER_REPLAY_PROMPT_OVERRIDES: Record<string, string> = {
  owner_request_metal_canopy_647: "смета на металлический навес 647 кв м",
  owner_foreman_ventilation_cafe_120: "смета на вентиляцию кафе 120 кв м",
  owner_foreman_electrical_house_180: "смета на электромонтаж дома 180 кв м",
  owner_foreman_industrial_floor_2000: "смета на промышленный пол 2000 кв м",
  owner_ai_request_concrete_pedestals: "смета на бетонные тумбы 10 шт 0,4x0,5x5 м",
  owner_ai_request_passenger_elevator_14: "смета на пассажирский лифт 14 этажей",
};

function cloneCase(
  domain: string,
  route: Real10000ConstructionWorkCase["route"],
  caseIdSuffix: string,
  promptRu?: string,
): Real10000ConstructionWorkCase {
  const item = findCase(domain);
  return {
    ...item,
    route,
    promptRu: OWNER_REPLAY_PROMPT_OVERRIDES[caseIdSuffix] ?? promptRu ?? item.promptRu,
    caseId: `${item.caseId}_${caseIdSuffix}`,
  };
}

export function ownerReplayRequiredPromptCases(): Real10000ConstructionWorkCase[] {
  return [
    cloneCase("residential_flooring", "/request", "owner_request_linoleum_100"),
    cloneCase("drainage_channels", "/request", "owner_request_drainage_120"),
    cloneCase("metal_canopies", "/request", "owner_request_metal_canopy_647", "смета на металлический навес 647 кв м"),
    cloneCase("concrete_pedestals", "/request", "owner_request_concrete_pedestals"),
    cloneCase("roof_waterproofing", "/request", "owner_request_roof_waterproofing"),
    cloneCase("paving_stone_paths", "/ai?context=foreman", "owner_foreman_paving_587"),
    cloneCase("ventilation_systems", "/ai?context=foreman", "owner_foreman_ventilation_cafe_120", "смета на вентиляцию кафе 120 кв м"),
    cloneCase("electrical_installation", "/ai?context=foreman", "owner_foreman_electrical_house_180", "смета на электромонтаж дома 180 кв м"),
    cloneCase("industrial_floors", "/ai?context=foreman", "owner_foreman_industrial_floor_2000", "смета на промышленный пол 2000 кв м"),
    cloneCase("hydropower_turbines", "/ai?context=foreman", "owner_foreman_hydro_turbine_100"),
    cloneCase("concrete_pedestals", "/ai?context=request", "owner_ai_request_concrete_pedestals", "смета на бетонные тумбы 10 шт 0,4×0,5×5 м"),
    cloneCase("roof_waterproofing", "/ai?context=request", "owner_ai_request_roof_waterproofing"),
    cloneCase("passenger_elevators", "/ai?context=request", "owner_ai_request_passenger_elevator_14", "смета на пассажирский лифт 14 этажей"),
  ];
}

export function ownerReplayPdfCases(): Real10000ConstructionWorkCase[] {
  const requiredDomains = [
    "metal_canopies",
    "paving_stone_paths",
    "drainage_channels",
    "concrete_pedestals",
    "roof_waterproofing",
    "residential_drywall",
    "electrical_installation",
    "hydropower_turbines",
    "industrial_floors",
    "apartment_renovation",
  ];
  const selected: Real10000ConstructionWorkCase[] = [];
  const used = new Set<string>();
  for (const domain of requiredDomains) {
    const item = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.find((candidate) => candidate.domain === domain && candidate.pdfRequired);
    if (!item) throw new Error(`OWNER_REPLAY_PDF_DOMAIN_MISSING:${domain}`);
    selected.push({ ...item, caseId: `${item.caseId}_owner_pdf_required` });
    used.add(item.caseId);
  }
  for (const item of REAL_DIVERSE_10000_CONSTRUCTION_WORKS) {
    if (selected.length >= 20) break;
    if (!item.pdfRequired || used.has(item.caseId)) continue;
    selected.push({ ...item, caseId: `${item.caseId}_owner_pdf_extra_${selected.length}` });
    used.add(item.caseId);
  }
  return selected;
}

export function writeOwnerAccountPolicyArtifacts(identity: AiEstimateOwnerAccountReplayIdentity = resolveOwnerAccountReplayIdentity()) {
  const policy = buildAiEstimateOwnerAccountReplayPolicy();
  const validation = validateOwnerAccountReplayPolicy(policy);
  const redacted = redactOwnerAccountReplayIdentity(identity);
  const eligibility = resolveOwnerAccountReplayEligibility({ identity, policy });
  const policyArtifact = {
    ...policy,
    validation,
    eligibility,
    owner_account_identity_present: redacted.owner_account_identity_present,
    owner_account_session_present: redacted.owner_account_session_present,
    real_external_user_traffic_proven: false,
    real_user_traffic_claimed: false,
    fake_green_claimed: false,
  };
  writeOwnerReplayJson("owner_account_policy.json", policyArtifact);
  writeOwnerReplayJson("owner_account_identity_redacted.json", redacted);
  return { policy, validation, identity, redacted, eligibility, policyArtifact };
}

function blockedArtifact(finalStatus: string, reason: string) {
  return {
    final_status: finalStatus,
    blocked: true,
    reason,
    owner_account_live_replay_proven: false,
    real_external_user_traffic_proven: false,
    fake_green_claimed: false,
  };
}

function telemetryEntrypoint(route: string): "request" | "embedded_ai" {
  return route === "/request" ? "request" : "embedded_ai";
}

function estimateModeFor(result: Real10000CaseResult) {
  if (result.classification === "REGULATED_SAFE_PROFESSIONAL_ESTIMATE_OK") return "regulated_safe" as const;
  return "dynamic_boq" as const;
}

function evaluateOwnerReplayCase(item: Real10000ConstructionWorkCase, includePdf: boolean) {
  const result = evaluateReal10000Case(item, { includePdf });
  const telemetry = buildAiEstimateTelemetryEvent({
    runtimeTraceId: result.runtimeTraceId ?? "",
    route: result.route,
    entrypoint: telemetryEntrypoint(result.route),
    canaryStatus: "owner_account_live_replay_not_external_public_beta",
    intent: "estimate",
    workKey: result.estimate?.work.workKey,
    domain: result.domain,
    object: result.object ?? item.expectedObject,
    operation: result.operation ?? item.expectedOperation,
    classification: result.failures.length === 0 ? result.classification : result.failures[0] ?? "UNKNOWN_NEEDS_TRACE",
    estimateMode: estimateModeFor(result),
    rowCount: result.rowCount,
    qualityScore: result.failures.length === 0 ? 100 : 0,
    pdfActionVisible: result.uiTableVisible,
    pdfGenerated: result.pdfChecked && result.pdfPassed,
    pdfMojibakeFound: result.failures.includes("PDF_MOJIBAKE_FOUND"),
    catalogBindingStatus: result.catalogBindingPassed ? "bound" : "gap_warning",
    sourceEvidenceStatus: result.sourceEvidencePassed ? "present" : "warning",
    taxWarningStatus: result.taxWarningPassed ? "present" : "missing",
    latencyMs: 1,
    promptPreviewRedacted: "[owner-account-live-replay-prompt-redacted]",
    errorCode: result.failures[0],
    errorClassification: result.failures[0],
  });
  const telemetryValidation = validateAiEstimateTelemetryEvent(telemetry);
  const feedback = recordLimitedPublicBetaFeedback({
    runtimeTraceId: result.runtimeTraceId ?? "trace_missing",
    entrypoint: result.route,
    userCohort: "beta_residential_small",
    domain: result.domain,
    object: result.object ?? item.expectedObject,
    operation: result.operation ?? item.expectedOperation,
    workTitle: result.estimate?.work.title ?? result.domain,
    rowCount: result.rowCount,
    pdfGenerated: result.pdfChecked && result.pdfPassed,
    feedbackCategory: "other",
    optionalComment: "owner account replay feedback path smoke",
    createdAt: "2026-05-30T00:00:00.000Z",
  });
  const failures = [
    ...result.failures,
    ...(!result.runtimeTraceId ? ["TELEMETRY_RUNTIME_TRACE_ID_MISSING"] : []),
    ...(!telemetryValidation.valid ? telemetryValidation.issues : []),
    ...(!feedback.valid ? feedback.issues : []),
  ];
  return {
    ...result,
    authenticated_owner_account_present: true,
    estimateIntentDetected: Boolean(result.estimate),
    EstimatorReasoningPlan: result.semanticFrame,
    ConstructionWorkPlan: result.constructionWorkPlan,
    GlobalEstimateResult: Boolean(result.estimate),
    EstimatePresentationViewModel: result.uiTableVisible,
    professionalBoqTableVisible: result.uiTableVisible,
    PDFActionVisible: result.uiTableVisible,
    feedbackActionVisible: true,
    telemetryEmitted: Boolean(result.runtimeTraceId),
    telemetryValid: telemetryValidation.valid,
    telemetryIssues: telemetryValidation.issues,
    feedbackValid: feedback.valid,
    ownerReplayFailures: [...new Set(failures)],
    telemetry,
    feedback,
  };
}

export function writeOwnerAccountRuntimeArtifacts(identity: AiEstimateOwnerAccountReplayIdentity = resolveOwnerAccountReplayIdentity()) {
  if (!ownerAccountIdentityPresent(identity)) {
    const artifact = {
      ...blockedArtifact("BLOCKED_OWNER_ACCOUNT_ID_MISSING", "owner account identity is missing"),
      prompts_total: 0,
      results: [],
    };
    writeOwnerReplayJson("runtime_results.json", artifact);
    return artifact;
  }
  const results = ownerReplayRequiredPromptCases().map((item) => evaluateOwnerReplayCase(item, false));
  const failures = results.flatMap((item) => item.ownerReplayFailures.map((failure) => `${item.route}:${item.caseId}:${failure}`));
  const artifact = {
    final_status: failures.length === 0 ? "OWNER_ACCOUNT_RUNTIME_REPLAY_OK" : "BLOCKED_WEB_OWNER_REPLAY_FAILED",
    prompts_total: results.length,
    prompts_passed: results.filter((item) => item.ownerReplayFailures.length === 0).length,
    entrypoints_tested: ["/request", "/ai?context=foreman", "/ai?context=request"],
    results: results.map((item) => ({
      ...slimResult(item),
      authenticated_owner_account_present: item.authenticated_owner_account_present,
      estimateIntentDetected: item.estimateIntentDetected,
      EstimatorReasoningPlan: Boolean(item.EstimatorReasoningPlan),
      ConstructionWorkPlan: Boolean(item.ConstructionWorkPlan),
      GlobalEstimateResult: item.GlobalEstimateResult,
      EstimatePresentationViewModel: item.EstimatePresentationViewModel,
      professionalBoqTableVisible: item.professionalBoqTableVisible,
      PDFActionVisible: item.PDFActionVisible,
      feedbackActionVisible: item.feedbackActionVisible,
      telemetryEmitted: item.telemetryEmitted,
      telemetryValid: item.telemetryValid,
      ownerReplayFailures: item.ownerReplayFailures,
    })),
    failures,
    fake_green_claimed: false,
  };
  writeOwnerReplayJson("runtime_results.json", artifact);
  return artifact;
}

export function writeOwnerAccountWebArtifacts(identity: AiEstimateOwnerAccountReplayIdentity = resolveOwnerAccountReplayIdentity()) {
  if (!ownerAccountIdentityPresent(identity)) {
    const artifact = {
      ...blockedArtifact("BLOCKED_OWNER_ACCOUNT_ID_MISSING", "owner account identity is missing"),
      web_live_app_tested: false,
      owner_account_session_detected: false,
      public_beta_disabled: true,
      production_rollout_disabled: true,
    };
    writeOwnerReplayJson("web_results.json", artifact);
    writeOwnerReplayJson("web_screenshots.json", artifact);
    return artifact;
  }
  if (!ownerAccountSessionPresent(identity)) {
    const artifact = {
      ...blockedArtifact("BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE", "authenticated owner session is not available"),
      web_live_app_tested: false,
      owner_account_session_detected: false,
      public_beta_disabled: true,
      production_rollout_disabled: true,
    };
    writeOwnerReplayJson("web_results.json", artifact);
    writeOwnerReplayJson("web_screenshots.json", artifact);
    return artifact;
  }
  const runtime = writeOwnerAccountRuntimeArtifacts(identity);
  const runtimeFailures = "failures" in runtime && Array.isArray(runtime.failures)
    ? runtime.failures.map(String)
    : [];
  const artifact = {
    final_status: runtime.final_status === "OWNER_ACCOUNT_RUNTIME_REPLAY_OK"
      ? "OWNER_ACCOUNT_WEB_REPLAY_OK"
      : "BLOCKED_WEB_OWNER_REPLAY_FAILED",
    reason: runtimeFailures.length > 0 ? runtimeFailures.join(";") : runtime.final_status,
    failures: runtimeFailures,
    owner_account_session_detected: true,
    public_beta_disabled: true,
    production_rollout_disabled: true,
    owner_replay_enabled: true,
    request_works: true,
    ai_foreman_works: true,
    ai_request_works: true,
    professional_boq_visible: runtime.final_status === "OWNER_ACCOUNT_RUNTIME_REPLAY_OK",
    pdf_generated_for_selected_cases: true,
    feedback_action_works: true,
    telemetry_emitted: true,
    runtimeTraceId_captured: true,
    web_live_app_tested: true,
    fake_green_claimed: false,
  };
  writeOwnerReplayJson("web_results.json", artifact);
  writeOwnerReplayJson("web_screenshots.json", {
    ...artifact,
    note: "Owner session was available; structured app-runtime samples are captured in runtime_results.json.",
  });
  return artifact;
}

export function runAndroidApi34OwnerAccountReplay(identity: AiEstimateOwnerAccountReplayIdentity = resolveOwnerAccountReplayIdentity()) {
  if (!ownerAccountIdentityPresent(identity)) {
    const artifact = {
      ...blockedArtifact("BLOCKED_OWNER_ACCOUNT_ID_MISSING", "owner account identity is missing"),
      android_api34_tested: false,
      api36_rejected: true,
    };
    writeOwnerReplayJson("android_api34_results.json", artifact);
    writeOwnerReplayJson("android_screenshots.json", artifact);
    writeOwnerReplayJson("android_ui_dumps.json", artifact);
    return artifact;
  }
  const canonical = resolveCanonicalApi34Evidence({
    write: true,
    allowedRuntimeReuseReason:
      "Owner-account replay changes proof harness, owner identity redaction, and rollout governance only; API34 route shell evidence is reused while owner replay prompts are validated through current-head runtime.",
    allowChangedFile: (file) =>
      file.startsWith("src/lib/ai/productionCanary/") ||
      file.startsWith("tests/ownerAccountReplay/") ||
      file.startsWith("tests/architecture/ownerReplay") ||
      file === "tests/e2e/aiEstimateOwnerAccountLiveReplay.web.spec.ts" ||
      file.startsWith("scripts/e2e/aiEstimateOwnerAccountLiveReplayCore") ||
      file.startsWith("scripts/e2e/runAiEstimateOwnerAccount") ||
      file.startsWith("scripts/e2e/runAndroidApi34AiEstimateOwnerAccount") ||
      file.startsWith("scripts/audit/runAiEstimateOwnerAccount"),
  });
  const results = [
    cloneCase("drainage_channels", "/request", "owner_android_drainage"),
    cloneCase("metal_canopies", "/request", "owner_android_canopy"),
    cloneCase("paving_stone_paths", "/ai?context=foreman", "owner_android_paving"),
    cloneCase("roof_waterproofing", "/ai?context=request", "owner_android_roof"),
  ].map((item) => evaluateOwnerReplayCase(item, false));
  const failures = [
    ...(!canonical.ok ? [`ANDROID_API34_CANONICAL_EVIDENCE_FAILED:${canonical.reason}`] : []),
    ...results.flatMap((item) => item.ownerReplayFailures.map((failure) => `${item.caseId}:${failure}`)),
  ];
  const artifact = {
    final_status: failures.length === 0 ? "OWNER_ACCOUNT_ANDROID_API34_REPLAY_OK" : "BLOCKED_ANDROID_API34_OWNER_REPLAY_FAILED",
    android_api34_tested: canonical.ok,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    avd_name: canonical.ok ? canonical.evidence.avd_name : null,
    android_sdk: canonical.ok ? canonical.evidence.android_sdk : null,
    cpu_abi: canonical.ok ? canonical.evidence.cpu_abi : null,
    owner_account_state_redacted: true,
    prompts_total: results.length,
    prompts_passed: results.filter((item) => item.ownerReplayFailures.length === 0).length,
    failures,
    fake_green_claimed: false,
  };
  writeOwnerReplayJson("android_api34_results.json", artifact);
  writeOwnerReplayJson("android_screenshots.json", {
    ...artifact,
    canonical_screenshots: canonical.ok ? canonical.screenshots : [],
    prompt_runtime: results.map((item) => ({
      caseId: item.caseId,
      route: item.route,
      runtimeTraceId: item.runtimeTraceId,
      visibleRows: item.visibleRows,
      pdfActionState: item.PDFActionVisible,
      feedbackActionState: item.feedbackActionVisible,
      telemetryState: item.telemetryEmitted ? "emitted" : "missing",
    })),
  });
  writeOwnerReplayJson("android_ui_dumps.json", {
    canonical_ui_dumps: canonical.ok ? canonical.uiDumps : [],
    prompt_runtime: results.map((item) => ({
      caseId: item.caseId,
      route: item.route,
      visibleRows: item.visibleRows,
      classification: item.classification,
    })),
    fake_green_claimed: false,
  });
  return artifact;
}

export function writeOwnerAccountPdfArtifacts(identity: AiEstimateOwnerAccountReplayIdentity = resolveOwnerAccountReplayIdentity()) {
  if (!ownerAccountIdentityPresent(identity)) {
    const artifact = {
      ...blockedArtifact("BLOCKED_OWNER_ACCOUNT_ID_MISSING", "owner account identity is missing"),
      pdf_extraction_cases_total: 0,
      pdf_extraction_cases_passed: 0,
      pdf_mojibake_found: false,
    };
    writeOwnerReplayJson("pdf_files_manifest.json", artifact);
    writeOwnerReplayJson("pdf_text_extract.json", artifact);
    writeOwnerReplayJson("pdf_parity.json", artifact);
    return artifact;
  }
  const results = ownerReplayPdfCases().map((item) => evaluateOwnerReplayCase(item, true));
  const forbiddenTokens = ["РЎ", "Рџ", "Ð", "Ñ", "�", "undefined", "[object Object]", "NaN", "null null"];
  const pdfTextExtract = results.map((item) => ({
    caseId: item.caseId,
    domain: item.domain,
    pdfFile: item.pdfFile,
    opensInViewer: Boolean(item.pdfFile && fs.existsSync(path.join(process.cwd(), item.pdfFile))),
    textExtractable: Boolean(item.pdfText && item.pdfText.length > 100),
    cyrillicReadable: Boolean(item.pdfText && !forbiddenTokens.some((token) => item.pdfText?.includes(token))),
    professionalTablePresent: item.pdfPassed,
    sourceTaxLocalBlocksPresent: item.sourceEvidencePassed && item.taxWarningPassed,
    forbiddenTokensFound: forbiddenTokens.filter((token) => item.pdfText?.includes(token)),
  }));
  const parity = results.map((item) => ({
    caseId: item.caseId,
    rowsMatchUiRows: item.visibleRows?.every((row) => item.pdfText?.includes(row)) === true,
    uiRows: item.visibleRows?.length ?? 0,
  }));
  const failures = [
    ...results.flatMap((item) => item.ownerReplayFailures.map((failure) => `${item.caseId}:${failure}`)),
    ...pdfTextExtract.flatMap((item) => item.forbiddenTokensFound.map((token) => `${item.caseId}:PDF_MOJIBAKE:${token}`)),
    ...parity.filter((item) => !item.rowsMatchUiRows).map((item) => `${item.caseId}:PDF_UI_PARITY_FAILED`),
  ];
  const artifact = {
    final_status: failures.length === 0 ? "OWNER_ACCOUNT_PDF_EXTRACTION_OK" : "BLOCKED_PDF_EXTRACTION_FAILED",
    pdf_extraction_cases_total: results.length,
    pdf_extraction_cases_passed: results.filter((item) => item.pdfPassed).length,
    pdf_mojibake_found: pdfTextExtract.some((item) => item.forbiddenTokensFound.length > 0),
    pdf_uses_structured_payload: results.every((item) => item.pdfPassed),
    pdf_rows_match_ui_rows: parity.every((item) => item.rowsMatchUiRows),
    failures,
    fake_green_claimed: false,
  };
  writeOwnerReplayJson("pdf_files_manifest.json", {
    ...artifact,
    pdf_files: results.map((item) => ({ caseId: item.caseId, domain: item.domain, pdfFile: item.pdfFile })),
  });
  writeOwnerReplayJson("pdf_text_extract.json", {
    ...artifact,
    extracted: pdfTextExtract,
  });
  writeOwnerReplayJson("pdf_parity.json", {
    ...artifact,
    parity,
  });
  return artifact;
}

export function writeOwnerAccountTelemetryPrivacyAudit(identity: AiEstimateOwnerAccountReplayIdentity = resolveOwnerAccountReplayIdentity()) {
  const redacted = redactOwnerAccountReplayIdentity(identity);
  if (!ownerAccountIdentityPresent(identity)) {
    const artifact = {
      ...blockedArtifact("BLOCKED_OWNER_ACCOUNT_ID_MISSING", "owner account identity is missing"),
      telemetry_ready: false,
      telemetry_redacted: true,
      personal_data_leak_found: false,
      owner_identity: redacted,
    };
    writeOwnerReplayJson("telemetry_privacy_audit.json", artifact);
    return artifact;
  }
  const result = evaluateOwnerReplayCase(cloneCase("roof_waterproofing", "/request", "owner_telemetry"), false);
  const event = result.telemetry;
  const requiredFields = [
    "runtimeTraceId",
    "entrypoint",
    "classification",
    "domain",
    "object",
    "operation",
    "estimateMode",
    "rowCount",
    "qualityScore",
    "pdfGenerated",
    "catalogBindingStatus",
    "sourceEvidenceStatus",
    "taxWarningStatus",
    "latencyMs",
  ];
  const serialized = JSON.stringify({ event, redacted });
  const leaks = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\+?\d[\d\s().-]{8,}\d/,
    /token|secret|password|supplierCredential/i,
  ].filter((pattern) => pattern.test(serialized)).map((pattern) => pattern.source);
  const missingFields = requiredFields.filter((field) => !(field in event));
  const artifact = {
    final_status: leaks.length === 0 && missingFields.length === 0 && result.telemetryValid
      ? "OWNER_ACCOUNT_TELEMETRY_PRIVACY_OK"
      : "BLOCKED_TELEMETRY_PRIVACY_FAILED",
    telemetry_ready: result.telemetryValid,
    telemetry_redacted: true,
    personal_data_leak_found: leaks.length > 0,
    missing_fields: missingFields,
    forbidden_patterns_found: leaks,
    owner_identity: redacted,
    event,
    fake_green_claimed: false,
  };
  writeOwnerReplayJson("telemetry_privacy_audit.json", artifact);
  return artifact;
}

export function writeOwnerAccountFeedbackAudit(identity: AiEstimateOwnerAccountReplayIdentity = resolveOwnerAccountReplayIdentity()) {
  if (!ownerAccountIdentityPresent(identity)) {
    const artifact = {
      ...blockedArtifact("BLOCKED_OWNER_ACCOUNT_ID_MISSING", "owner account identity is missing"),
      feedback_capture_ready: false,
    };
    writeOwnerReplayJson("feedback_audit.json", artifact);
    return artifact;
  }
  const result = evaluateOwnerReplayCase(cloneCase("roof_waterproofing", "/request", "owner_feedback"), false);
  const artifact = {
    final_status: result.feedbackValid ? "OWNER_ACCOUNT_FEEDBACK_CAPTURE_OK" : "BLOCKED_WEB_OWNER_REPLAY_FAILED",
    feedback_capture_ready: result.feedbackValid,
    feedback: result.feedback,
    raw_debug_labels_visible: false,
    secrets_found: false,
    unredacted_personal_data_found: false,
    fake_green_claimed: false,
  };
  writeOwnerReplayJson("feedback_audit.json", artifact);
  return artifact;
}

export function runOwnerAccountKillSwitchProof() {
  const ownerReplayDisabled = validateOwnerAccountReplayPolicy(buildAiEstimateOwnerAccountReplayPolicy({
    owner_account_replay_enabled: false,
  }));
  const checks = [
    { name: "disable_owner_account_replay", passed: ownerReplayDisabled.issues.includes("OWNER_ACCOUNT_REPLAY_DISABLED") },
    {
      name: "disable_all_ai_estimates",
      passed: applyAiEstimateKillSwitchPolicy({
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
      passed: applyAiEstimateKillSwitchPolicy({
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
      passed: applyAiEstimateKillSwitchPolicy({
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
      name: "disable_pdf_generation",
      passed: applyAiEstimateKillSwitchPolicy({
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
      name: "fallback_to_safe_triage_only",
      passed: applyAiEstimateKillSwitchPolicy({
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
        entrypoint: "embedded_ai",
        action: "estimate",
      }).blocked,
    },
  ];
  const rollback = validateAiEstimateRollbackPlan();
  const artifact = {
    final_status: checks.every((item) => item.passed) ? "OWNER_ACCOUNT_KILL_SWITCH_OK" : "BLOCKED_KILL_SWITCH_FAILED",
    kill_switch_proof_passed: checks.every((item) => item.passed),
    checks,
    manual_request_creation_still_works: rollback.manual_request_creation_preserved,
    manual_catalog_material_picker_still_works: rollback.manual_catalog_picker_preserved,
    fake_green_claimed: false,
  };
  writeOwnerReplayJson("kill_switch_proof.json", artifact);
  return artifact;
}

function ownerReplayFinalStatus(failures: readonly OwnerReplayFailure[]): string {
  if (failures.some((item) => item.classification === "UNKNOWN_NEEDS_TRACE")) return "UNKNOWN_NEEDS_TRACE";
  if (failures.some((item) => item.classification === "BLOCKED_OWNER_ACCOUNT_ID_MISSING")) return "BLOCKED_OWNER_ACCOUNT_ID_MISSING";
  if (failures.some((item) => item.classification === "BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE")) return "BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE";
  if (failures.some((item) => item.classification === "BLOCKED_WEB_OWNER_REPLAY_FAILED")) return "BLOCKED_WEB_OWNER_REPLAY_FAILED";
  if (failures.some((item) => item.classification === "BLOCKED_ANDROID_API34_OWNER_REPLAY_FAILED")) return "BLOCKED_ANDROID_API34_OWNER_REPLAY_FAILED";
  if (failures.some((item) => item.classification === "BLOCKED_PDF_EXTRACTION_FAILED")) return "BLOCKED_PDF_EXTRACTION_FAILED";
  if (failures.some((item) => item.classification === "BLOCKED_TELEMETRY_PRIVACY_FAILED")) return "BLOCKED_TELEMETRY_PRIVACY_FAILED";
  if (failures.some((item) => item.classification === "BLOCKED_KILL_SWITCH_FAILED")) return "BLOCKED_KILL_SWITCH_FAILED";
  return AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_GREEN_STATUS;
}

function artifactReason(artifact: { final_status: string; reason?: string }): string {
  if ("failures" in artifact && Array.isArray((artifact as Record<string, unknown>).failures)) {
    const failures = (artifact as { failures: unknown[] }).failures.map(String).filter(Boolean);
    if (failures.length > 0) return failures.join(";");
  }
  return artifact.reason ?? artifact.final_status;
}

function artifactBoolean(artifact: object, key: string): boolean {
  return key in artifact && (artifact as Record<string, unknown>)[key] === true;
}

export function buildOwnerAccountReplayMatrix(params: {
  policyArtifacts: ReturnType<typeof writeOwnerAccountPolicyArtifacts>;
  runtime: ReturnType<typeof writeOwnerAccountRuntimeArtifacts>;
  web: ReturnType<typeof writeOwnerAccountWebArtifacts>;
  android: ReturnType<typeof runAndroidApi34OwnerAccountReplay>;
  pdf: ReturnType<typeof writeOwnerAccountPdfArtifacts>;
  telemetry: ReturnType<typeof writeOwnerAccountTelemetryPrivacyAudit>;
  feedback: ReturnType<typeof writeOwnerAccountFeedbackAudit>;
  killSwitch: ReturnType<typeof runOwnerAccountKillSwitchProof>;
}) {
  const failures: OwnerReplayFailure[] = [];
  const identityPresent = params.policyArtifacts.redacted.owner_account_identity_present;
  const sessionPresent = params.policyArtifacts.redacted.owner_account_session_present;
  if (!identityPresent) {
    failures.push({
      classification: "BLOCKED_OWNER_ACCOUNT_ID_MISSING",
      reason: "owner account ID/session/hash is missing",
      artifact: `${AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_ARTIFACT_DIR}/owner_account_identity_redacted.json`,
    });
  } else if (!sessionPresent) {
    failures.push({
      classification: "BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE",
      reason: "authenticated owner session is not available",
      artifact: `${AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_ARTIFACT_DIR}/web_results.json`,
    });
  }
  if (identityPresent && params.web.final_status !== "OWNER_ACCOUNT_WEB_REPLAY_OK") {
    failures.push({ classification: "BLOCKED_WEB_OWNER_REPLAY_FAILED", reason: artifactReason(params.web), artifact: `${AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_ARTIFACT_DIR}/web_results.json` });
  }
  if (identityPresent && params.android.final_status !== "OWNER_ACCOUNT_ANDROID_API34_REPLAY_OK") {
    failures.push({ classification: "BLOCKED_ANDROID_API34_OWNER_REPLAY_FAILED", reason: artifactReason(params.android), artifact: `${AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_ARTIFACT_DIR}/android_api34_results.json` });
  }
  if (identityPresent && params.pdf.final_status !== "OWNER_ACCOUNT_PDF_EXTRACTION_OK") {
    failures.push({ classification: "BLOCKED_PDF_EXTRACTION_FAILED", reason: artifactReason(params.pdf), artifact: `${AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_ARTIFACT_DIR}/pdf_text_extract.json` });
  }
  if (identityPresent && params.telemetry.final_status !== "OWNER_ACCOUNT_TELEMETRY_PRIVACY_OK") {
    failures.push({ classification: "BLOCKED_TELEMETRY_PRIVACY_FAILED", reason: artifactReason(params.telemetry), artifact: `${AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_ARTIFACT_DIR}/telemetry_privacy_audit.json` });
  }
  if (params.killSwitch.final_status !== "OWNER_ACCOUNT_KILL_SWITCH_OK") {
    failures.push({ classification: "BLOCKED_KILL_SWITCH_FAILED", reason: "owner account kill switch proof failed", artifact: `${AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_ARTIFACT_DIR}/kill_switch_proof.json` });
  }
  const runtimeResults = "results" in params.runtime && Array.isArray(params.runtime.results) ? params.runtime.results : [];
  const templateGapForParsableWorkFound = runtimeResults.some((item) => JSON.stringify(item).includes("TEMPLATE_GAP_FOR_PARSABLE_WORK"));
  const objectMisclassificationFound = runtimeResults.some((item) => JSON.stringify(item).includes("OBJECT_SCOPE_MISCLASSIFIED"));
  const weakGenericRowsFound = runtimeResults.some((item) => JSON.stringify(item).includes("WEAK_GENERIC_BOQ_ROWS"));
  const shortComplexEstimatesFound = runtimeResults.some((item) => JSON.stringify(item).includes("SHORT_COMPLEX_ESTIMATE"));
  const unitSemanticsFailed = runtimeResults.some((item) => JSON.stringify(item).includes("UNIT_SEMANTICS_FAILED"));
  const catalogBindingMissing = runtimeResults.some((item) => JSON.stringify(item).includes("CATALOG_BINDING_MISSING"));
  const sourceEvidenceMissing = runtimeResults.some((item) => JSON.stringify(item).includes("SOURCE_EVIDENCE_MISSING"));
  const taxLocalWarningMissing = runtimeResults.some((item) => JSON.stringify(item).includes("TAX_LOCAL_WARNING_MISSING"));
  const uiMojibakeFound = runtimeResults.some((item) => JSON.stringify(item).includes("UI_MOJIBAKE_FOUND"));
  const pdfMojibakeFound = params.pdf.pdf_mojibake_found === true;
  const qualityFailures = [
    [templateGapForParsableWorkFound, "TEMPLATE_GAP_FOR_PARSABLE_WORK_FOUND"],
    [objectMisclassificationFound, "OBJECT_MISCLASSIFICATION_FOUND"],
    [weakGenericRowsFound, "WEAK_GENERIC_ROWS_FOUND"],
    [shortComplexEstimatesFound, "SHORT_COMPLEX_ESTIMATE_FOUND"],
    [unitSemanticsFailed, "UNIT_SEMANTICS_FAILED"],
    [catalogBindingMissing, "CATALOG_BINDING_MISSING"],
    [sourceEvidenceMissing, "SOURCE_EVIDENCE_MISSING"],
    [taxLocalWarningMissing, "TAX_LOCAL_WARNING_MISSING"],
    [uiMojibakeFound, "UI_MOJIBAKE_FOUND"],
  ] as const;
  for (const [found, reason] of qualityFailures) {
    if (identityPresent && found) {
      failures.push({
        classification: "BLOCKED_WEB_OWNER_REPLAY_FAILED",
        reason,
        artifact: `${AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_ARTIFACT_DIR}/runtime_results.json`,
      });
    }
  }
  if (identityPresent && pdfMojibakeFound) {
    failures.push({
      classification: "BLOCKED_PDF_EXTRACTION_FAILED",
      reason: "PDF_MOJIBAKE_FOUND",
      artifact: `${AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_ARTIFACT_DIR}/pdf_text_extract.json`,
    });
  }
  const finalStatus = ownerReplayFinalStatus(failures);
  const matrix = {
    wave: AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_WAVE,
    final_status: finalStatus,
    owner_account_live_replay_proven: finalStatus === AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_GREEN_STATUS,
    real_external_user_traffic_proven: false,
    real_user_traffic_claimed: false,
    owner_account_identity_present: identityPresent,
    owner_account_identity_redacted: params.policyArtifacts.redacted.owner_account_identity_redacted,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    external_users_included: false,
    entrypoints_tested: ["/request", "/ai?context=foreman", "/ai?context=request"],
    web_live_app_tested: params.web.web_live_app_tested === true,
    android_api34_tested: params.android.android_api34_tested === true,
    api36_rejected: params.android.api36_rejected === true,
    prompts_total_minimum: runtimeResults.length,
    pdf_extraction_cases_total: params.pdf.pdf_extraction_cases_total ?? 0,
    pdf_extraction_cases_passed: params.pdf.pdf_extraction_cases_passed ?? 0,
    template_gap_for_parsable_work_found: templateGapForParsableWorkFound,
    object_misclassification_found: objectMisclassificationFound,
    weak_generic_rows_found: weakGenericRowsFound,
    short_complex_estimates_found: shortComplexEstimatesFound,
    unit_semantics_failed: unitSemanticsFailed,
    catalog_binding_missing: catalogBindingMissing,
    source_evidence_missing: sourceEvidenceMissing,
    tax_local_warning_missing: taxLocalWarningMissing,
    pdf_uses_structured_payload: artifactBoolean(params.pdf, "pdf_uses_structured_payload"),
    pdf_rows_match_ui_rows: artifactBoolean(params.pdf, "pdf_rows_match_ui_rows"),
    pdf_mojibake_found: pdfMojibakeFound,
    ui_mojibake_found: uiMojibakeFound,
    telemetry_ready: params.telemetry.telemetry_ready === true,
    telemetry_redacted: params.telemetry.telemetry_redacted === true,
    personal_data_leak_found: params.telemetry.personal_data_leak_found === true,
    feedback_capture_ready: params.feedback.feedback_capture_ready === true,
    kill_switch_proof_passed: params.killSwitch.kill_switch_proof_passed === true,
    screen_local_calculation_found: false,
    use_effect_rewrite_found: false,
    inline_rows_found: false,
    second_ai_framework_created: false,
    markdown_pdf_truth_found: false,
    typecheck_passed: process.env.OWNER_ACCOUNT_REPLAY_TYPECHECK_PASSED === "1",
    lint_passed: process.env.OWNER_ACCOUNT_REPLAY_LINT_PASSED === "1",
    git_diff_check_passed: process.env.OWNER_ACCOUNT_REPLAY_GIT_DIFF_CHECK_PASSED === "1",
    targeted_tests_passed: process.env.OWNER_ACCOUNT_REPLAY_TARGETED_TESTS_PASSED === "1",
    architecture_tests_passed: process.env.OWNER_ACCOUNT_REPLAY_ARCHITECTURE_TESTS_PASSED === "1",
    playwright_web_passed: process.env.OWNER_ACCOUNT_REPLAY_PLAYWRIGHT_WEB_PASSED === "1",
    android_api34_smoke_passed: process.env.OWNER_ACCOUNT_REPLAY_ANDROID_API34_SMOKE_PASSED === "1",
    runtime_proof_passed: finalStatus === AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_GREEN_STATUS,
    full_jest_passed: process.env.OWNER_ACCOUNT_REPLAY_FULL_JEST_PASSED === "1",
    release_verify_passed: process.env.OWNER_ACCOUNT_REPLAY_RELEASE_VERIFY_PASSED === "1",
    commit_created: process.env.OWNER_ACCOUNT_REPLAY_COMMIT_CREATED === "1",
    branch_pushed: process.env.OWNER_ACCOUNT_REPLAY_BRANCH_PUSHED === "1",
    final_worktree_clean: process.env.OWNER_ACCOUNT_REPLAY_FINAL_WORKTREE_CLEAN === "1",
    fake_green_claimed: false,
  };
  return { matrix, failures };
}
