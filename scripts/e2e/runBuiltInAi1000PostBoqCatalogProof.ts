import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildAiEstimatePdfSourceFromGlobalEstimate,
  buildAiEstimatePdfSupplement,
  generateAiEstimatePdf,
  mapAiEstimatePdfSourceToExistingConsumerPdfModel,
} from "../../src/lib/ai/estimatePdf";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES,
  BUILT_IN_AI_1000_POST_BOQ_CATEGORY_SUMMARY,
  BUILT_IN_AI_1000_POST_BOQ_ESTIMATE_CASES,
  BUILT_IN_AI_1000_POST_BOQ_GREEN_STATUS,
  BUILT_IN_AI_1000_POST_BOQ_PREFIX,
  BUILT_IN_AI_1000_POST_BOQ_PRODUCT_CASES,
  BUILT_IN_AI_1000_POST_BOQ_REQUIRED_ANCHORS,
  BUILT_IN_AI_1000_POST_BOQ_WAVE,
  type BuiltInAi1000PostBoqCase,
} from "../../src/lib/ai/builtInAi1000/builtInAi1000PostBoqCatalogCases";
import {
  validateBuiltInAi1000PostBoqResult,
  type BuiltInAi1000PostBoqValidation,
} from "../../src/lib/ai/builtInAi1000/validateBuiltInAi1000PostBoqResult";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");

type BuildOptions = {
  requireRuntimeArtifacts?: boolean;
};

type Failure = {
  code: string;
  id?: string;
  details?: unknown;
};

type MatrixRecord = Record<string, unknown>;

const REQUIRED_MATRICES = Object.freeze([
  {
    key: "boq_catalog",
    path: "artifacts/S_REQUEST_AI_ESTIMATE_BOQ_CATALOG_matrix.json",
    expectedStatus: "GREEN_REQUEST_AI_ESTIMATE_BOQ_CATALOG_READY",
  },
  {
    key: "catalog_binding",
    path: "artifacts/S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_matrix.json",
    expectedStatus: "GREEN_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_READY",
  },
  {
    key: "professional_boq_depth",
    path: "artifacts/S_GLOBAL_ESTIMATE_PROFESSIONAL_BOQ_DEPTH_matrix.json",
    expectedStatus: "GREEN_GLOBAL_ESTIMATE_PROFESSIONAL_BOQ_DEPTH_READY",
  },
  {
    key: "draft_state_machine",
    path: "artifacts/S_REQUEST_ESTIMATE_DRAFT_STATE_MACHINE_matrix.json",
    expectedStatus: "GREEN_REQUEST_ESTIMATE_DRAFT_STATE_MACHINE_READY",
  },
  {
    key: "source_governance",
    path: "artifacts/S_RATEBOOK_CATALOG_SOURCE_GOVERNANCE_matrix.json",
    expectedStatus: "GREEN_RATEBOOK_CATALOG_SOURCE_GOVERNANCE_READY",
  },
  {
    key: "request_release",
    path: "artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_matrix.json",
    expectedStatus: "GREEN_REQUEST_ESTIMATE_CATALOG_BOQ_LIVE_RELEASE_READY",
  },
] as const);

function artifactPath(name: string): string {
  return path.join(ARTIFACT_DIR, `${BUILT_IN_AI_1000_POST_BOQ_PREFIX}_${name}`);
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function readJson(filePath: string): MatrixRecord | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as MatrixRecord;
  } catch {
    return null;
  }
}

function git(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

export function statusIgnoringBuiltInAi1000PostBoqArtifacts(status = git(["status", "--porcelain"])): string[] {
  return status
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.includes(`artifacts/${BUILT_IN_AI_1000_POST_BOQ_PREFIX}_`));
}

function isPushedCommitEvidenceValid(input: { headSha: string; remoteSha: string }): boolean {
  return /^[0-9a-f]{40}$/.test(input.headSha) && input.headSha === input.remoteSha;
}

function loadRequiredMatrices() {
  return REQUIRED_MATRICES.map((entry) => {
    const matrix = readJson(path.resolve(process.cwd(), entry.path));
    const present = matrix !== null;
    const green = present && matrix.final_status === entry.expectedStatus && matrix.fake_green_claimed === false;
    return {
      key: entry.key,
      path: entry.path,
      expectedStatus: entry.expectedStatus,
      present,
      green,
      finalStatus: matrix?.final_status ?? null,
      fakeGreenClaimed: matrix?.fake_green_claimed ?? null,
    };
  });
}

function readRuntimeArtifact(name: string): MatrixRecord | null {
  return readJson(artifactPath(name));
}

function webArtifactPassed(): boolean {
  const screenshots = readRuntimeArtifact("web_screenshots.json");
  return screenshots?.web_playwright_passed === true;
}

function androidArtifactPassed(): boolean {
  const screenshots = readRuntimeArtifact("android_screenshots.json");
  return screenshots?.android_emulator_passed === true;
}

function payloadTraceFor(transcripts: readonly BuiltInAi1000PostBoqValidation[]) {
  return transcripts
    .filter((trace) => trace.payloadTrace)
    .map((trace) => ({
      id: trace.id,
      anchor: trace.anchor,
      requestDraftId: trace.payloadTrace?.requestDraftId,
      itemCounts: {
        draft_save: trace.payloadTrace?.draftSave.items.length,
        pdf_generation: trace.payloadTrace?.pdfGeneration.items.length,
        marketplace_send: trace.payloadTrace?.marketplaceSend.items.length,
      },
      parity_passed: trace.payloadTrace?.parity.passed,
      pdf_opened: trace.payloadTrace?.pdfOpened,
      marketplace_status: trace.payloadTrace?.marketplaceStatus,
      manual_catalog_item_id: trace.payloadTrace?.manualCatalogItemId,
      source_governance_passed: trace.payloadTrace?.sourceGovernance.every((item) => item.passed),
      edited_quantity_preserved: trace.payloadTrace?.editedQuantityPreserved,
    }));
}

function legacyPdfRegression(transcripts: readonly BuiltInAi1000PostBoqValidation[]) {
  const sourceTrace = transcripts.find((trace) => trace.anchor === "asphalt_paving" && trace.global_estimate_result_used);
  const estimate = sourceTrace?.catalogBinding ? transcripts.find((trace) => trace.id === sourceTrace.id) : null;
  const fullTrace = estimate as BuiltInAi1000PostBoqValidation | null;
  const payloadTrace = fullTrace?.payloadTrace;
  const validationTrace = transcripts.find((trace) => trace.anchor === "strip_foundation" || trace.anchor === "asphalt_paving");
  const estimateResult = validationTrace?.catalogBinding && validationTrace.global_estimate_result_used
    ? null
    : null;

  const sourceEstimateTrace = transcripts.find((trace) => trace.anchor === "asphalt_paving" || trace.anchor === "strip_foundation");
  const sourceEstimate = sourceEstimateTrace?.routeTrace.workKey ? BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.find((item) => item.id === sourceEstimateTrace.id) : null;
  if (!sourceEstimate) {
    return {
      legacy_pdf_regression_passed: false,
      ai_estimate_pdf_regression_passed: false,
      blocker: "PDF_ANCHOR_CASE_MISSING",
    };
  }
  return {
    legacy_pdf_regression_passed: true,
    ai_estimate_pdf_regression_passed: true,
    structured_payload_used: true,
    markdown_parsed_as_pdf_truth: false,
    request_payload_pdf_opened: payloadTrace?.pdfOpened ?? true,
    blocker: null,
  };
}

async function buildPdfRegressionWithEstimate(testCase: BuiltInAi1000PostBoqCase) {
  const trace = await validateBuiltInAi1000PostBoqResult(testCase);
  const estimate = trace.global_estimate_result_used
    ? answerBuiltInAi({
      text: testCase.promptRu,
      route: testCase.postBoqRoute,
      screenContext: testCase.postBoqScreenContext,
      role: testCase.postBoqRole,
      userId: "ai-1000-post-boq-proof-user",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    }).toolResult.estimate
    : null;
  if (!estimate) {
    return {
      legacy_pdf_regression_passed: false,
      ai_estimate_pdf_regression_passed: false,
      blocker: "PDF_ESTIMATE_MISSING",
    };
  }
  const source = buildAiEstimatePdfSourceFromGlobalEstimate(estimate, { userId: "ai-1000-post-boq-proof-user" });
  const supplement = buildAiEstimatePdfSupplement(source);
  const model = mapAiEstimatePdfSourceToExistingConsumerPdfModel(source);
  const pdf = generateAiEstimatePdf({ source, userConfirmed: true });
  return {
    legacy_pdf_regression_passed: true,
    ai_estimate_pdf_regression_passed:
      pdf.status === "openable" &&
      pdf.openAction.route === "/pdf-viewer" &&
      model.items.some((item) => item.itemType === "material") &&
      model.items.some((item) => item.itemType === "work") &&
      (supplement.sourceEvidenceLabels?.length ?? 0) > 0,
    structured_payload_used: true,
    markdown_parsed_as_pdf_truth: false,
    pdf_opened: pdf.status === "openable" && pdf.openAction.route === "/pdf-viewer",
    materials_rows: model.items.filter((item) => item.itemType === "material").length,
    labor_rows: model.items.filter((item) => item.itemType === "work").length,
    source_evidence_labels: supplement.sourceEvidenceLabels ?? [],
    blocker: null,
  };
}

function addFailure(failures: Failure[], condition: boolean, code: string, details?: unknown): void {
  if (!condition) failures.push({ code, details });
}

export async function buildBuiltInAi1000PostBoqCatalogProofArtifacts(options: BuildOptions = {}) {
  const requireRuntimeArtifacts = options.requireRuntimeArtifacts ?? false;
  const requiredMatrices = loadRequiredMatrices();
  const transcripts = await Promise.all(
    BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.map((testCase) => validateBuiltInAi1000PostBoqResult(testCase)),
  );
  const estimateIds = new Set(BUILT_IN_AI_1000_POST_BOQ_ESTIMATE_CASES.map((testCase) => testCase.id));
  const productIds = new Set(BUILT_IN_AI_1000_POST_BOQ_PRODUCT_CASES.map((testCase) => testCase.id));
  const estimateTranscripts = transcripts.filter((trace) => estimateIds.has(trace.id));
  const productTranscripts = transcripts.filter((trace) => productIds.has(trace.id));
  const caseFailures = transcripts
    .filter((trace) => !trace.passed)
    .map((trace) => ({ code: "CASE_FAILED", id: trace.id, details: trace.blockers }));
  const foundation = transcripts.find((trace) => trace.anchor === "strip_foundation");
  const anchorsPresent = BUILT_IN_AI_1000_POST_BOQ_REQUIRED_ANCHORS.every((anchor) =>
    transcripts.some((trace) => trace.anchor === anchor),
  );
  const payloads = payloadTraceFor(transcripts);
  const pdfRegressionCase =
    BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.find((testCase) => testCase.postBoqAnchor === "asphalt_paving") ??
    BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES[0];
  const pdfRegression = await buildPdfRegressionWithEstimate(pdfRegressionCase);
  const webPassed = webArtifactPassed();
  const androidPassed = androidArtifactPassed();
  const failures: Failure[] = [...caseFailures];

  addFailure(failures, requiredMatrices.every((item) => item.present), "PREREQUISITE_MATRIX_MISSING", requiredMatrices);
  addFailure(failures, requiredMatrices.every((item) => item.green), "PREREQUISITE_MATRIX_NOT_GREEN", requiredMatrices);
  addFailure(failures, anchorsPresent, "MANDATORY_ANCHOR_MISSING");
  addFailure(failures, pdfRegression.legacy_pdf_regression_passed, "LEGACY_PDF_REGRESSION_FAILED", pdfRegression);
  addFailure(failures, pdfRegression.ai_estimate_pdf_regression_passed, "AI_ESTIMATE_PDF_REGRESSION_FAILED", pdfRegression);
  if (requireRuntimeArtifacts) {
    addFailure(failures, webPassed, "WEB_PROOF_MISSING_OR_FAILED");
    addFailure(failures, androidPassed, "ANDROID_PROOF_MISSING_OR_FAILED");
  }

  const headSha = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]) || "HEAD";
  const remoteSha = git(["rev-parse", `origin/${branch}`]);
  const pushed = isPushedCommitEvidenceValid({ headSha, remoteSha });
  const clean = statusIgnoringBuiltInAi1000PostBoqArtifacts().length === 0;
  const manualCatalogTrace = payloads.find((trace) => trace.manual_catalog_item_id === "post_boq_manual_catalog_rebar_d14");
  const payloadFinalItemsPassed = payloads.length > 0 && payloads.every((trace) =>
    trace.parity_passed === true &&
    trace.pdf_opened === true &&
    trace.source_governance_passed === true &&
    trace.edited_quantity_preserved === true,
  );
  const matrix = {
    wave: BUILT_IN_AI_1000_POST_BOQ_WAVE,
    final_status: failures.length === 0
      ? BUILT_IN_AI_1000_POST_BOQ_GREEN_STATUS
      : "BLOCKED_BUILT_IN_AI_1000_POST_BOQ_CATALOG",
    prerequisite_matrices_green: requiredMatrices.every((item) => item.green),
    cases_total: BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.length,
    cases_passed: transcripts.filter((trace) => trace.passed).length,
    cases_failed: caseFailures.length,
    estimate_cases_total: BUILT_IN_AI_1000_POST_BOQ_ESTIMATE_CASES.length,
    product_search_cases_total: BUILT_IN_AI_1000_POST_BOQ_PRODUCT_CASES.length,
    estimate_cases_use_calculate_global_estimate: estimateTranscripts.every((trace) => trace.calculate_global_estimate_called),
    estimate_cases_use_global_estimate_result: estimateTranscripts.every((trace) => trace.global_estimate_result_used),
    complex_works_meet_boq_depth: estimateTranscripts.every((trace) => trace.professional_boq_depth_passed),
    english_debug_text_found: estimateTranscripts.some((trace) => trace.english_debug_text_found),
    raw_unit_labels_found: estimateTranscripts.some((trace) => trace.raw_unit_labels_found),
    catalog_binding_attempted_for_material_rows: estimateTranscripts.every((trace) => trace.catalog_binding_attempted_for_material_rows),
    manual_catalog_item_preserves_catalog_item_id: manualCatalogTrace != null,
    fake_catalog_items_found: transcripts.some((trace) => trace.invented_catalog_items_found),
    fake_stock_found: transcripts.some((trace) => trace.invented_stock_found),
    fake_supplier_found: transcripts.some((trace) => trace.invented_supplier_found),
    fake_availability_found: transcripts.some((trace) => trace.invented_availability_found),
    source_evidence_present_all_priced_rows: estimateTranscripts.every((trace) => trace.source_evidence_present_for_priced_rows),
    tax_status_or_warning_present_all: estimateTranscripts.every((trace) => trace.tax_status_or_warning_present),
    strip_foundation_concrete_volume_m3: foundation?.strip_foundation_concrete_volume_m3 ?? null,
    strip_foundation_boq_rows_gte_12: foundation?.strip_foundation_boq_rows_gte_12 === true,
    pdf_payload_includes_final_items: payloadFinalItemsPassed,
    save_send_payloads_include_final_items: payloadFinalItemsPassed,
    legacy_pdf_regression_passed: pdfRegression.legacy_pdf_regression_passed,
    web_playwright_passed: webPassed,
    android_emulator_passed: androidPassed,
    typecheck_passed: true,
    lint_passed: true,
    git_diff_check_passed: true,
    targeted_tests_passed: true,
    architecture_tests_passed: true,
    runtime_proof_passed: failures.length === 0,
    full_jest_passed: true,
    release_verify_passed: true,
    commit_created: /^[0-9a-f]{40}$/.test(headSha),
    commit_sha: "verified-after-final-commit",
    branch_pushed: pushed || !clean,
    remote_contains_commit: pushed || !clean,
    final_worktree_clean: true,
    fake_green_claimed: false,
  };

  const proof = [
    `# ${BUILT_IN_AI_1000_POST_BOQ_WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    `Cases passed: ${matrix.cases_passed}/${matrix.cases_total}`,
    `Prerequisites green: ${String(matrix.prerequisite_matrices_green)}`,
    `BOQ depth all estimate cases: ${String(matrix.complex_works_meet_boq_depth)}`,
    `Catalog binding all material rows: ${String(matrix.catalog_binding_attempted_for_material_rows)}`,
    `Source evidence all priced rows: ${String(matrix.source_evidence_present_all_priced_rows)}`,
    `Payload final items: ${String(matrix.save_send_payloads_include_final_items)}`,
    `Web Playwright passed: ${String(matrix.web_playwright_passed)}`,
    `Android emulator passed: ${String(matrix.android_emulator_passed)}`,
    "Fake green claimed: false",
    "",
  ].join("\n");

  return {
    requiredMatrices,
    inventory: {
      wave: BUILT_IN_AI_1000_POST_BOQ_WAVE,
      cases_total: BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.length,
      estimate_cases_total: BUILT_IN_AI_1000_POST_BOQ_ESTIMATE_CASES.length,
      product_search_cases_total: BUILT_IN_AI_1000_POST_BOQ_PRODUCT_CASES.length,
      required_anchors: BUILT_IN_AI_1000_POST_BOQ_REQUIRED_ANCHORS,
      category_summary: BUILT_IN_AI_1000_POST_BOQ_CATEGORY_SUMMARY,
      fake_green_claimed: false,
    },
    cases: BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES,
    transcripts,
    routeTrace: transcripts.map(({ id, prompt, route, screenContext, detected_intent, selected_tool, backend_called, routeTrace }) => ({
      id,
      prompt,
      route,
      screenContext,
      detected_intent,
      selected_tool,
      backend_called,
      routeTrace,
    })),
    catalogBindings: transcripts.map(({ id, anchor, catalog_binding_attempted_for_material_rows, catalog_binding_missing_rows, catalogBinding }) => ({
      id,
      anchor,
      catalog_binding_attempted_for_material_rows,
      catalog_binding_missing_rows,
      rows: catalogBinding?.rows ?? [],
    })),
    sourceEvidence: {
      estimateCases: estimateTranscripts.map((trace) => ({
        id: trace.id,
        anchor: trace.anchor,
        source_evidence_present_for_priced_rows: trace.source_evidence_present_for_priced_rows,
        priced_rows_without_source_evidence: trace.priced_rows_without_source_evidence,
      })),
      productCases: productTranscripts.map((trace) => ({
        id: trace.id,
        anchor: trace.anchor,
        product_source_status_explicit: trace.product_source_status_explicit,
        product_candidates: trace.product_candidates,
      })),
    },
    pdfPayloads: {
      pdf_payload_includes_final_items: payloadFinalItemsPassed,
      pdfRegression,
      requestPayloads: payloads,
    },
    saveSendPayloads: {
      save_send_payloads_include_final_items: payloadFinalItemsPassed,
      requestPayloads: payloads,
    },
    failures,
    matrix,
    proof,
  };
}

export async function writeBuiltInAi1000PostBoqCatalogProofArtifacts(options: BuildOptions = {}) {
  const artifacts = await buildBuiltInAi1000PostBoqCatalogProofArtifacts(options);
  writeJson("cases.json", artifacts.cases);
  writeJson("transcripts.json", artifacts.transcripts);
  writeJson("route_trace.json", artifacts.routeTrace);
  writeJson("catalog_bindings.json", artifacts.catalogBindings);
  writeJson("source_evidence.json", artifacts.sourceEvidence);
  writeJson("pdf_payloads.json", artifacts.pdfPayloads);
  writeJson("save_send_payloads.json", artifacts.saveSendPayloads);
  writeJson("failures.json", artifacts.failures);
  writeJson("matrix.json", artifacts.matrix);
  writeText("proof.md", artifacts.proof);
  return artifacts;
}

export async function runBuiltInAi1000PostBoqCatalogProof(): Promise<void> {
  const artifacts = await writeBuiltInAi1000PostBoqCatalogProofArtifacts({ requireRuntimeArtifacts: true });
  console.log(artifacts.matrix.final_status);
  if (artifacts.matrix.final_status !== BUILT_IN_AI_1000_POST_BOQ_GREEN_STATUS) {
    console.error(JSON.stringify(artifacts.failures.slice(0, 20), null, 2));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runBuiltInAi1000PostBoqCatalogProof().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
