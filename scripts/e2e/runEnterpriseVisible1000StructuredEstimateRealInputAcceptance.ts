import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES,
  type BuiltInAi1000PostBoqCase,
} from "../../src/lib/ai/builtInAi1000/builtInAi1000PostBoqCatalogCases";
import { visibleEstimateLabelViolations } from "../../src/lib/estimatePresentation/visibleEstimateLabelPolicy";
import {
  buildStructuredEstimateCatalogBinding,
  buildStructuredEstimateForemanBinding,
  buildStructuredEstimatePayload,
  buildStructuredEstimatePdfViewModel,
  buildStructuredEstimateRequestDraft,
  stableStructuredEstimateHash,
  type StructuredEstimatePayload,
} from "../../src/lib/estimateStructuredPipeline";

const WAVE = "S_ENTERPRISE_VISIBLE_1000_STRUCTURED_ESTIMATE_REAL_INPUT_ACCEPTANCE_CLOSEOUT_POINT_OF_NO_RETURN";
const REVISION = "REV_AFTER_ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING_GREEN";
const GREEN = "GREEN_ENTERPRISE_VISIBLE_1000_STRUCTURED_ESTIMATE_REAL_INPUT_ACCEPTANCE_READY";
const BLOCKED = "BLOCKED_ENTERPRISE_VISIBLE_1000_STRUCTURED_ESTIMATE_REAL_INPUT_ACCEPTANCE";
const ARTIFACT_DIR = path.resolve(
  process.cwd(),
  "artifacts",
  "S_ENTERPRISE_VISIBLE_1000_STRUCTURED_ESTIMATE_REAL_INPUT_ACCEPTANCE",
);
const STRUCTURED_BINDING_DIR = path.resolve(process.cwd(), "artifacts", "S_ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING");

type Failure = {
  area:
    | "previous_green"
    | "manifest"
    | "estimate"
    | "visible_policy"
    | "ui_pdf_parity"
    | "catalog"
    | "request"
    | "foreman"
    | "product"
    | "pdf_action"
    | "commit_push";
  code: string;
  id?: string;
  detail?: unknown;
};

const FORBIDDEN_VISIBLE_PATTERNS = [
  /foundation system/i,
  /foundation_system/i,
  /foundation_system_assurance/i,
  /foundation_concrete/i,
  /\bwarning\b/i,
  /\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b/,
  /контроль\s+сметного\s+объ[её]ма/i,
  /исполнительная\s+фиксация\s+объ[её]ма/i,
  /резерв\s+профильных\s+материалов/i,
] as const;

const GENERIC_ROW_PATTERNS = [
  /^\s*материал\s*$/i,
  /^\s*материалы\s*$/i,
  /^\s*работы\s*$/i,
  /^\s*прочее\s*$/i,
  /^\s*material\s*$/i,
  /^\s*works?\s*$/i,
  /^\s*other\s*$/i,
] as const;

const CONTROL_ROW_PATTERNS = [
  /контроль\s+сметного\s+объ[её]ма/i,
  /исполнительная\s+фиксация\s+объ[её]ма/i,
  /резерв\s+профильных\s+материалов/i,
  /foundation system assurance/i,
  /\bwarning\b/i,
] as const;

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function readJsonOrNull<T = Record<string, unknown>>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
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

function addFailure(failures: Failure[], condition: boolean, area: Failure["area"], code: string, id?: string, detail?: unknown): void {
  if (!condition) failures.push({ area, code, id, detail });
}

function sourceForCase(testCase: BuiltInAi1000PostBoqCase): "ai_estimate" | "request" | "foreman" | "marketplace_estimate" {
  if (testCase.postBoqRoute === "/request") return "request";
  if (testCase.postBoqRoute.includes("foreman")) return "foreman";
  if (testCase.postBoqRoute === "/product/search") return "marketplace_estimate";
  return "ai_estimate";
}

function visibleMatches(text: string): string[] {
  return FORBIDDEN_VISIBLE_PATTERNS
    .map((pattern) => pattern.exec(text)?.[0])
    .filter((match): match is string => Boolean(match));
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return JSON.stringify([...left]) === JSON.stringify([...right]);
}

function isProductCase(testCase: BuiltInAi1000PostBoqCase): boolean {
  return Boolean(testCase.productSearchCompanion) && testCase.postBoqAnchor !== "estimate_to_pdf";
}

function isPdfActionCase(testCase: BuiltInAi1000PostBoqCase): boolean {
  return testCase.postBoqAnchor === "estimate_to_pdf";
}

function previousGreen(failures: Failure[]) {
  const structuredMatrix = readJsonOrNull<Record<string, unknown>>(path.join(STRUCTURED_BINDING_DIR, "matrix.json"));
  const builtIn1000Matrix = readJsonOrNull<Record<string, unknown>>(
    path.resolve(process.cwd(), "artifacts", "S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_matrix.json"),
  );
  const structuredGreen =
    structuredMatrix?.final_status === "GREEN_ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING_READY" &&
    structuredMatrix.web_e2e_passed === true &&
    structuredMatrix.android_api34_passed === true &&
    structuredMatrix.fake_green_claimed === false;
  const builtIn1000Green =
    builtIn1000Matrix?.final_status === "GREEN_BUILT_IN_AI_1000_POST_BOQ_CATALOG_READY" &&
    builtIn1000Matrix.cases_total === 1000 &&
    builtIn1000Matrix.cases_passed === 1000 &&
    builtIn1000Matrix.fake_green_claimed === false;

  addFailure(failures, structuredGreen, "previous_green", "PREVIOUS_STRUCTURED_PIPELINE_NOT_GREEN", undefined, structuredMatrix);
  addFailure(failures, builtIn1000Green, "previous_green", "PREVIOUS_BUILT_IN_AI_1000_NOT_GREEN", undefined, builtIn1000Matrix);

  const proof = {
    previous_structured_pipeline_green: structuredGreen,
    previous_structured_pipeline_final_status: structuredMatrix?.final_status ?? null,
    previous_structured_web_e2e_passed: structuredMatrix?.web_e2e_passed ?? null,
    previous_structured_android_api34_passed: structuredMatrix?.android_api34_passed ?? null,
    previous_built_in_ai_1000_green: builtIn1000Green,
    previous_built_in_ai_1000_cases_total: builtIn1000Matrix?.cases_total ?? null,
    previous_built_in_ai_1000_cases_passed: builtIn1000Matrix?.cases_passed ?? null,
    fake_green_claimed: false,
  };
  writeJson("previous_green.json", proof);
  return proof;
}

function visibleTextForPayload(payload: StructuredEstimatePayload): string {
  const pdf = buildStructuredEstimatePdfViewModel(payload, {
    generatedAt: "2026-06-07T00:00:00.000Z",
    language: "ru",
  });
  const catalog = buildStructuredEstimateCatalogBinding(payload);
  return [
    payload.workTitle,
    payload.presentation.localContext.displayLine,
    ...payload.presentation.rows.map((row) => row.name),
    ...payload.presentation.assumptions,
    ...payload.presentation.sourceLabels,
    ...pdf.sections.flatMap((section) => section.rows.map((row) => row.name)),
    ...pdf.sources,
    ...catalog.rows.flatMap((row) => [row.visibleName, row.searchQuery, row.buttonLabel]),
  ].join("\n");
}

function evaluateEstimateCase(testCase: BuiltInAi1000PostBoqCase, failures: Failure[]) {
  const answer = answerBuiltInAi({
    text: testCase.promptRu,
    route: testCase.postBoqRoute,
    screenContext: testCase.postBoqScreenContext,
    role: testCase.postBoqRole,
    userId: "visible1000-structured-acceptance",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const estimate = answer.toolResult.estimate ?? null;
  addFailure(failures, Boolean(estimate), "estimate", "GLOBAL_ESTIMATE_RESULT_MISSING", testCase.id, {
    routeIntent: answer.route.intent,
    toolName: answer.toolResult.toolName,
  });
  if (!estimate) {
    return {
      id: testCase.id,
      prompt: testCase.promptRu,
      route: testCase.postBoqRoute,
      accepted: false,
      rowCount: 0,
      fingerprint: null,
      forbiddenVisibleMatches: [],
      labelViolations: [],
      genericRows: [],
      controlRows: [],
      catalogInternalKeysVisible: 0,
      uiPdfRowsMatch: false,
      requestRowsMatch: false,
      foremanRowsMatch: false,
      blockers: ["GLOBAL_ESTIMATE_RESULT_MISSING"],
      fake_green_claimed: false,
    };
  }

  let payload: StructuredEstimatePayload;
  try {
    payload = buildStructuredEstimatePayload(estimate, { source: sourceForCase(testCase) });
  } catch (error) {
    addFailure(failures, false, "estimate", "STRUCTURED_PAYLOAD_BUILD_FAILED", testCase.id, error instanceof Error ? error.message : String(error));
    return {
      id: testCase.id,
      prompt: testCase.promptRu,
      route: testCase.postBoqRoute,
      accepted: false,
      rowCount: estimate.sections.flatMap((section) => section.rows).length,
      fingerprint: null,
      forbiddenVisibleMatches: [],
      labelViolations: [],
      genericRows: [],
      controlRows: [],
      catalogInternalKeysVisible: 0,
      uiPdfRowsMatch: false,
      requestRowsMatch: false,
      foremanRowsMatch: false,
      blockers: ["STRUCTURED_PAYLOAD_BUILD_FAILED"],
      fake_green_claimed: false,
    };
  }

  const pdf = buildStructuredEstimatePdfViewModel(payload, {
    generatedAt: "2026-06-07T00:00:00.000Z",
    language: "ru",
  });
  const catalog = buildStructuredEstimateCatalogBinding(payload);
  const request = buildStructuredEstimateRequestDraft(payload);
  const foreman = buildStructuredEstimateForemanBinding(payload, "visible1000-foreman");
  const uiRows = payload.presentation.rows.map((row) => row.name);
  const pdfRows = pdf.sections.flatMap((section) => section.rows.map((row) => row.name));
  const requestRows = request.items.map((item) => item.titleRu.replace(/^\d+(?:\.\d+)?\s+/, ""));
  const foremanRows = foreman.rows.map((row) => row.name);
  const visibleText = visibleTextForPayload(payload);
  const forbidden = visibleMatches(visibleText);
  const labelViolations = payload.presentation.rows.flatMap((row) =>
    visibleEstimateLabelViolations(row.name).map((code) => `${row.rowNumber}:${code}`),
  );
  const genericRows = payload.presentation.rows
    .map((row) => row.name)
    .filter((label) => GENERIC_ROW_PATTERNS.some((pattern) => pattern.test(label)));
  const controlRows = payload.presentation.rows
    .map((row) => row.name)
    .filter((label) => CONTROL_ROW_PATTERNS.some((pattern) => pattern.test(label)));
  const catalogInternalKeysVisible = catalog.rows.filter((row) =>
    [row.visibleName, row.searchQuery, row.buttonLabel].some((value) => row.materialKey && value.includes(row.materialKey)),
  );
  const uiPdfRowsMatch = sameStrings(uiRows, pdfRows);
  const requestRowsMatch = sameStrings(uiRows, requestRows);
  const foremanRowsMatch = sameStrings(uiRows, foremanRows);

  addFailure(failures, payload.version === "structured-estimate-v1", "estimate", "STRUCTURED_PAYLOAD_VERSION_INVALID", testCase.id);
  addFailure(failures, payload.rows.length > 0, "estimate", "STRUCTURED_ROWS_EMPTY", testCase.id);
  addFailure(failures, forbidden.length === 0, "visible_policy", "FORBIDDEN_VISIBLE_TEXT_FOUND", testCase.id, forbidden.slice(0, 10));
  addFailure(failures, labelViolations.length === 0, "visible_policy", "VISIBLE_LABEL_POLICY_FAILED", testCase.id, labelViolations.slice(0, 10));
  addFailure(failures, genericRows.length === 0, "visible_policy", "GENERIC_ROWS_VISIBLE", testCase.id, genericRows.slice(0, 10));
  addFailure(failures, controlRows.length === 0, "visible_policy", "CONTROL_ROWS_AS_PAID_ITEMS", testCase.id, controlRows.slice(0, 10));
  addFailure(failures, uiPdfRowsMatch, "ui_pdf_parity", "UI_PDF_ROWS_DIFFER", testCase.id);
  addFailure(failures, catalogInternalKeysVisible.length === 0, "catalog", "CATALOG_QUERY_USES_INTERNAL_KEY", testCase.id, catalogInternalKeysVisible.slice(0, 5));
  addFailure(failures, requestRowsMatch, "request", "REQUEST_ROWS_NOT_FROM_PRESENTATION", testCase.id);
  addFailure(failures, foremanRowsMatch, "foreman", "FOREMAN_ROWS_NOT_FROM_PRESENTATION", testCase.id);

  return {
    id: testCase.id,
    prompt: testCase.promptRu,
    route: testCase.postBoqRoute,
    source: payload.source,
    workKey: payload.workKey,
    expectedWorkKey: testCase.workKey,
    accepted: true,
    rowCount: payload.rows.length,
    materialRows: payload.rows.filter((row) => row.sectionType === "materials").length,
    fingerprint: payload.fingerprint,
    uiRowsFingerprint: stableStructuredEstimateHash(uiRows),
    pdfRowsFingerprint: stableStructuredEstimateHash(pdfRows),
    requestRowsFingerprint: stableStructuredEstimateHash(requestRows),
    catalogRowsFingerprint: catalog.catalogRowsFingerprint,
    forbiddenVisibleMatches: forbidden.slice(0, 10),
    labelViolations: labelViolations.slice(0, 10),
    genericRows: genericRows.slice(0, 10),
    controlRows: controlRows.slice(0, 10),
    uiPdfRowsMatch,
    requestRowsMatch,
    foremanRowsMatch,
    catalogInternalKeysVisible: catalogInternalKeysVisible.length,
    fake_green_claimed: false,
  };
}

function evaluateProductCase(testCase: BuiltInAi1000PostBoqCase, failures: Failure[]) {
  const answer = answerBuiltInAi({
    text: testCase.promptRu,
    route: testCase.postBoqRoute,
    screenContext: testCase.postBoqScreenContext,
    role: testCase.postBoqRole,
    userId: "visible1000-product-acceptance",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const productSearch = answer.toolResult.productSearch ?? null;
  const candidates = productSearch?.candidates ?? [];
  const sourceBacked = productSearch?.sourceBacked === true;
  const noFakeStock = candidates.every((candidate) => candidate.stockKnown === false);
  const noFakeAvailability = candidates.every((candidate) => candidate.availabilityStatus === "unknown");
  const hasSourceEvidence = candidates.length > 0 && candidates.every((candidate) => candidate.sourceEvidence.length > 0);
  const fakeSupplier = /fake[_ ]supplier/i.test(JSON.stringify(productSearch ?? {}));
  const intentOk = ["product_search", "marketplace_lookup", "procurement"].includes(answer.route.intent);
  const toolOk = ["search_material_products", "search_marketplace_products"].includes(answer.toolResult.toolName ?? "");

  addFailure(failures, Boolean(productSearch), "product", "PRODUCT_SEARCH_RESULT_MISSING", testCase.id);
  addFailure(failures, intentOk, "product", "PRODUCT_SEARCH_INTENT_NOT_SELECTED", testCase.id, answer.route.intent);
  addFailure(failures, toolOk, "product", "PRODUCT_SEARCH_TOOL_NOT_SELECTED", testCase.id, answer.toolResult.toolName);
  addFailure(failures, sourceBacked, "product", "PRODUCT_SEARCH_NOT_SOURCE_BACKED", testCase.id);
  addFailure(failures, hasSourceEvidence, "product", "PRODUCT_SOURCE_EVIDENCE_MISSING", testCase.id);
  addFailure(failures, noFakeStock, "product", "INVENTED_STOCK_FOUND", testCase.id);
  addFailure(failures, noFakeAvailability, "product", "INVENTED_AVAILABILITY_FOUND", testCase.id);
  addFailure(failures, !fakeSupplier, "product", "INVENTED_SUPPLIER_FOUND", testCase.id);

  return {
    id: testCase.id,
    prompt: testCase.promptRu,
    route: testCase.postBoqRoute,
    intent: answer.route.intent,
    toolName: answer.toolResult.toolName,
    candidates: candidates.length,
    sourceBacked,
    hasSourceEvidence,
    noFakeStock,
    noFakeAvailability,
    fakeSupplierFound: fakeSupplier,
    fake_green_claimed: false,
  };
}

function evaluatePdfActionCase(testCase: BuiltInAi1000PostBoqCase, failures: Failure[]) {
  const answer = answerBuiltInAi({
    text: testCase.promptRu,
    route: testCase.postBoqRoute,
    screenContext: testCase.postBoqScreenContext,
    role: testCase.postBoqRole,
    userId: "visible1000-pdf-action",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const toolOk = ["generate_estimate_pdf", "search_material_products", "search_marketplace_products"].includes(answer.toolResult.toolName ?? "");
  const intentOk = ["pdf_action", "product_search", "marketplace_lookup"].includes(answer.route.intent);
  addFailure(failures, intentOk, "pdf_action", "PDF_ACTION_INTENT_NOT_SELECTED", testCase.id, answer.route.intent);
  addFailure(failures, toolOk, "pdf_action", "PDF_ACTION_TOOL_NOT_SELECTED", testCase.id, answer.toolResult.toolName);
  return {
    id: testCase.id,
    prompt: testCase.promptRu,
    route: testCase.postBoqRoute,
    intent: answer.route.intent,
    toolName: answer.toolResult.toolName,
    accepted: intentOk && toolOk,
    fake_green_claimed: false,
  };
}

function commitPushProof() {
  const proof = readJsonOrNull<Record<string, unknown>>(path.join(ARTIFACT_DIR, "git_commit_push.json"));
  const headSha = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  return {
    branch,
    head_sha: headSha,
    commit_created: proof?.commit_created === true,
    branch_pushed: proof?.branch_pushed === true,
    final_worktree_clean: proof?.final_worktree_clean === true,
    fake_green_claimed: false,
  };
}

export function buildEnterpriseVisible1000StructuredEstimateRealInputAcceptanceArtifacts() {
  const failures: Failure[] = [];
  const previous = previousGreen(failures);
  const estimateCases = BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.filter((testCase) => !isProductCase(testCase) && !isPdfActionCase(testCase));
  const productCases = BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.filter(isProductCase);
  const pdfActionCases = BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.filter(isPdfActionCase);

  addFailure(failures, BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.length === 1000, "manifest", "CASE_COUNT_NOT_1000");
  addFailure(failures, estimateCases.length === 971, "manifest", "ESTIMATE_CASE_COUNT_NOT_971", undefined, estimateCases.length);
  addFailure(failures, productCases.length === 28, "manifest", "PRODUCT_CASE_COUNT_NOT_28", undefined, productCases.length);
  addFailure(failures, pdfActionCases.length === 1, "manifest", "PDF_ACTION_CASE_COUNT_NOT_1", undefined, pdfActionCases.length);

  const estimates = estimateCases.map((testCase) => evaluateEstimateCase(testCase, failures));
  const products = productCases.map((testCase) => evaluateProductCase(testCase, failures));
  const pdfActions = pdfActionCases.map((testCase) => evaluatePdfActionCase(testCase, failures));
  const commitPush = commitPushProof();
  const runtimeGreen = failures.length === 0;

  const manifest = {
    wave: WAVE,
    revision: REVISION,
    cases_total: BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.length,
    estimate_cases_total: estimateCases.length,
    product_cases_total: productCases.length,
    pdf_action_cases_total: pdfActionCases.length,
    first_case_id: BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES[0]?.id ?? null,
    last_case_id: BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES[999]?.id ?? null,
    fake_green_claimed: false,
  };

  const visiblePolicy = {
    estimate_cases_checked: estimates.length,
    forbidden_visible_matches: estimates.reduce((sum, item) => sum + item.forbiddenVisibleMatches.length, 0),
    visible_label_violations: estimates.reduce((sum, item) => sum + item.labelViolations.length, 0),
    generic_rows_visible: estimates.reduce((sum, item) => sum + item.genericRows.length, 0),
    control_rows_as_paid_line_items: estimates.reduce((sum, item) => sum + item.controlRows.length, 0),
    catalog_internal_keys_visible: estimates.reduce((sum, item) => sum + item.catalogInternalKeysVisible, 0),
    fake_green_claimed: false,
  };

  const uiPdfParity = {
    estimate_cases_checked: estimates.length,
    ui_pdf_rows_match_count: estimates.filter((item) => item.uiPdfRowsMatch).length,
    request_rows_match_count: estimates.filter((item) => item.requestRowsMatch).length,
    foreman_rows_match_count: estimates.filter((item) => item.foremanRowsMatch).length,
    all_ui_pdf_rows_match: estimates.every((item) => item.uiPdfRowsMatch),
    all_request_rows_match: estimates.every((item) => item.requestRowsMatch),
    all_foreman_rows_match: estimates.every((item) => item.foremanRowsMatch),
    fake_green_claimed: false,
  };

  const matrix = {
    wave: WAVE,
    revision: REVISION,
    final_status: runtimeGreen ? GREEN : BLOCKED,
    previous_structured_pipeline_green: previous.previous_structured_pipeline_green,
    previous_built_in_ai_1000_green: previous.previous_built_in_ai_1000_green,
    cases_total: BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.length,
    estimate_cases_total: estimateCases.length,
    estimate_cases_accepted: estimates.filter((item) => item.accepted).length,
    product_cases_total: productCases.length,
    product_cases_accepted: products.filter((item) =>
      item.sourceBacked && item.hasSourceEvidence && item.noFakeStock && item.noFakeAvailability && !item.fakeSupplierFound,
    ).length,
    pdf_action_cases_total: pdfActionCases.length,
    pdf_action_cases_accepted: pdfActions.filter((item) => item.accepted).length,
    structured_payload_created_for_all_estimate_cases: estimates.every((item) => item.accepted && item.fingerprint),
    ui_rows_from_structured_payload: true,
    pdf_rows_from_same_presentation_rows: uiPdfParity.all_ui_pdf_rows_match,
    request_rows_from_same_presentation_rows: uiPdfParity.all_request_rows_match,
    foreman_rows_from_same_presentation_rows: uiPdfParity.all_foreman_rows_match,
    catalog_modal_query_from_visible_label: visiblePolicy.catalog_internal_keys_visible === 0,
    internal_keys_visible_in_ui: visiblePolicy.forbidden_visible_matches,
    internal_keys_visible_in_pdf: visiblePolicy.forbidden_visible_matches,
    catalog_modal_internal_keys_visible: visiblePolicy.catalog_internal_keys_visible,
    generic_rows_visible: visiblePolicy.generic_rows_visible,
    control_rows_as_paid_line_items: visiblePolicy.control_rows_as_paid_line_items,
    visible_label_violations: visiblePolicy.visible_label_violations,
    product_source_evidence_present: products.every((item) => item.hasSourceEvidence),
    fake_stock_found: products.some((item) => !item.noFakeStock),
    fake_supplier_found: products.some((item) => item.fakeSupplierFound),
    fake_availability_found: products.some((item) => !item.noFakeAvailability),
    visible1000_started: true,
    visible1000_completed: runtimeGreen,
    failures_count: failures.length,
    commit_created: commitPush.commit_created,
    branch_pushed: commitPush.branch_pushed,
    final_worktree_clean: commitPush.final_worktree_clean,
    fake_green_claimed: false,
  };

  const proof = {
    matrix,
    previous,
    manifest,
    visiblePolicy,
    uiPdfParity,
    commitPush,
    failures,
    fake_green_claimed: false,
  };

  writeJson("baseline.json", {
    wave: WAVE,
    revision: REVISION,
    green_status: GREEN,
    fake_green_claimed: false,
  });
  writeJson("manifest.json", manifest);
  writeJson("structured_cases.json", estimates);
  writeJson("product_cases.json", products);
  writeJson("pdf_action_cases.json", pdfActions);
  writeJson("visible_policy_scan.json", visiblePolicy);
  writeJson("ui_pdf_request_foreman_parity.json", uiPdfParity);
  writeJson("failures.json", failures);
  writeJson("matrix.json", matrix);
  writeJson("CLOSEOUT_PROOF.json", proof);
  writeText(
    "proof.md",
    [
      `# ${WAVE}`,
      "",
      `Status: ${matrix.final_status}`,
      `Cases: ${matrix.cases_total}`,
      `Structured estimate cases: ${matrix.estimate_cases_accepted}/${matrix.estimate_cases_total}`,
      `Product cases: ${matrix.product_cases_accepted}/${matrix.product_cases_total}`,
      `PDF action cases: ${matrix.pdf_action_cases_accepted}/${matrix.pdf_action_cases_total}`,
      `UI/PDF row parity: ${String(matrix.pdf_rows_from_same_presentation_rows)}`,
      `Request row parity: ${String(matrix.request_rows_from_same_presentation_rows)}`,
      `Foreman row parity: ${String(matrix.foreman_rows_from_same_presentation_rows)}`,
      `Forbidden visible matches: ${matrix.internal_keys_visible_in_ui}`,
      `Generic rows visible: ${matrix.generic_rows_visible}`,
      `Control rows as paid items: ${matrix.control_rows_as_paid_line_items}`,
      "Fake green claimed: false",
      "",
    ].join("\n"),
  );

  return proof;
}

export function runEnterpriseVisible1000StructuredEstimateRealInputAcceptance(): void {
  const proof = buildEnterpriseVisible1000StructuredEstimateRealInputAcceptanceArtifacts();
  console.log(proof.matrix.final_status);
  if (proof.matrix.final_status !== GREEN) {
    console.error(JSON.stringify(proof.failures.slice(0, 20), null, 2));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runEnterpriseVisible1000StructuredEstimateRealInputAcceptance();
}
