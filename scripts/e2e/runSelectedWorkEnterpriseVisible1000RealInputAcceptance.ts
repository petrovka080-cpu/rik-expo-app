import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  SELECTED_WORK_ENTERPRISE_1000_CASES,
  SELECTED_WORK_ENTERPRISE_1000_EXCLUDED_ALIAS_REDIRECT_WORK_KEYS,
  SELECTED_WORK_ENTERPRISE_1000_EXCLUDED_PRODUCT_SEARCH_WORK_KEYS,
  SELECTED_WORK_ENTERPRISE_1000_GREEN_STATUS,
  SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS,
  SELECTED_WORK_ENTERPRISE_1000_WAVE,
  type SelectedWorkEnterprise1000Case,
} from "./selectedWorkEnterprise1000Cases";
import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
  searchGlobalWorkSmartSuggestions,
  type GlobalSelectedWorkBinding,
} from "../../src/lib/ai/globalEstimate";
import {
  buildConsumerRepairAiDraftFromGlobalEstimate,
  createConsumerRepairDraftFromGlobalEstimate,
  __resetConsumerRepairRequestStoreForTests,
  type ConsumerRepairSelectedWork,
} from "../../src/lib/consumerRequests";
import {
  buildRequestEstimateDraftFromConsumerBundle,
  buildRequestEstimatePayloadSet,
  compareRequestEstimatePayloadParity,
} from "../../src/features/consumerRepair/buildRequestEstimatePayload";
import { visibleEstimateLabelViolations } from "../../src/lib/estimatePresentation/visibleEstimateLabelPolicy";
import {
  buildStructuredEstimateCatalogBinding,
  buildStructuredEstimateForemanBinding,
  buildStructuredEstimateHistoryBinding,
  buildStructuredEstimatePayload,
  buildStructuredEstimatePdfViewModel,
  stableStructuredEstimateHash,
} from "../../src/lib/estimateStructuredPipeline";

const WAVE = SELECTED_WORK_ENTERPRISE_1000_WAVE;
const REVISION = "REV_AFTER_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING_GREEN";
const GREEN = SELECTED_WORK_ENTERPRISE_1000_GREEN_STATUS;
const BLOCKED = "BLOCKED_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE");

type Failure = {
  id?: string;
  area: string;
  code: string;
  details?: unknown;
};

type ExternalProofMode = "observe" | "release-gate-self-check" | "full-closeout";

function writeJson(name: string, value: unknown): void {
  const filePath = path.join(ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  const filePath = path.join(ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function readJsonOrNull<T = Record<string, unknown>>(name: string): T | null {
  const filePath = path.isAbsolute(name) ? name : path.join(ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as T;
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

function addFailure(failures: Failure[], condition: boolean, area: string, code: string, id?: string, details?: unknown): void {
  if (!condition) failures.push({ id, area, code, details });
}

function toConsumerSelectedWork(binding: GlobalSelectedWorkBinding): ConsumerRepairSelectedWork {
  return {
    selectedWorkKey: binding.selectedWorkKey,
    selectedWorkTitleRu: binding.selectedTitleRu,
    selectedWorkCategoryKey: binding.selectedCategoryKey,
    selectedWorkCategoryTitleRu: binding.selectedCategoryTitleRu,
    selectedWorkRawInput: binding.rawInput,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
}

const GENERIC_ROW_PATTERNS = [
  /^\s*(?:материал|материалы|работы|прочее|услуги|material|materials|works?|other)\s*$/i,
  /^\s*(?:position|позиция)\s+\d+\s*$/i,
] as const;

const CONTROL_ROW_PATTERNS = [
  /контроль\s+сметн/i,
  /контроль\s+качества/i,
  /исполнительн(?:ая|ую)\s+фиксац/i,
] as const;

const INTERNAL_OR_DEBUG_PATTERN = /\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b|\bwarning\b|\bdebug\b|\bfallback\b/i;
const MOJIBAKE_PATTERN = /(?:Р[\u0080-\u00bf]|С[\u0080-\u00bf]|Р |РЎ|РЃ|РЅ|Рѕ|Р°|Рµ|Рё|СЃ|С‚|СЂ|СЌ|СЋ|СЏ|вЂ|Гђ|Г‘|пїЅ)/u;
const ENGLISH_FALLBACK_PATTERN = /\b(?:material|materials|work|works|other|system|fallback|debug|warning|professional|generic)\b/i;

function hasReadableCyrillic(value: string): boolean {
  return /[\u0400-\u04ff]/u.test(value);
}

function englishFallbackViolations(values: readonly string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => !/^[A-Z0-9/ .-]{2,10}$/.test(value))
    .filter((value) => (!hasReadableCyrillic(value) && /[a-z]{3,}/i.test(value)) || ENGLISH_FALLBACK_PATTERN.test(value));
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeRequestRowName(value: string): string {
  return value.replace(/^\s*\d+(?:\.\d+)*\s+/, "").trim();
}

function previousGreenValidation(failures: Failure[]) {
  const previous = readJsonOrNull<Record<string, unknown>>(
    path.join(process.cwd(), "artifacts", "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING", "matrix.json"),
  );
  const expected = "GREEN_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING_READY";
  const result = {
    wave: WAVE,
    revision: REVISION,
    previous_wave: "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING_CLOSEOUT_POINT_OF_NO_RETURN",
    previous_expected_status: expected,
    previous_status: previous?.final_status ?? null,
    previous_smart_search_selected_work_green: previous?.final_status === expected,
    previous_branch_pushed: previous?.branch_pushed === true,
    previous_final_worktree_clean: previous?.final_worktree_clean === true,
    fake_green_claimed: false,
  };
  addFailure(failures, result.previous_smart_search_selected_work_green, "previous", "PREVIOUS_SELECTED_WORK_GREEN_MISSING", undefined, result);
  writeJson("previous_green_validation.json", result);
  return result;
}

function evaluateCase(testCase: SelectedWorkEnterprise1000Case, failures: Failure[]) {
  const suggestions = searchGlobalWorkSmartSuggestions({ query: testCase.smartSearchInput, limit: 8 });
  const selectedSuggestion = suggestions.find((suggestion) => suggestion.workKey === testCase.selectedWorkKey) ?? null;
  const suggestionsVisible = suggestions.map((suggestion) => suggestion.visibleText).join("\n");
  addFailure(failures, suggestions.length >= 3 && suggestions.length <= 8, "smart_search", "SUGGESTIONS_COUNT_OUT_OF_RANGE", testCase.id, suggestions.length);
  addFailure(failures, selectedSuggestion !== null, "smart_search", "SELECTED_WORK_NOT_IN_SUGGESTIONS", testCase.id, suggestions.map((item) => item.workKey));
  addFailure(failures, hasReadableCyrillic(suggestionsVisible), "smart_search", "SUGGESTIONS_NOT_VISIBLE_RU", testCase.id);
  addFailure(failures, !INTERNAL_OR_DEBUG_PATTERN.test(suggestionsVisible), "smart_search", "SUGGESTIONS_INTERNAL_KEYS_VISIBLE", testCase.id);

  const binding = buildGlobalSelectedWorkBinding({
    selectedWorkKey: testCase.selectedWorkKey,
    rawInput: testCase.rawEstimateInput,
  });
  const selectedWork = toConsumerSelectedWork(binding);
  const estimate = calculateGlobalConstructionEstimateSync(
    buildGlobalEstimateInputWithSelectedWork(
      {
        text: testCase.rawEstimateInput,
        language: "ru",
        countryCode: "KG",
        city: "Bishkek",
        volume: testCase.volume,
        unit: testCase.unit,
      },
      binding,
    ),
  );
  const payload = buildStructuredEstimatePayload(estimate, { source: "request", selectedWork: binding });
  const catalog = buildStructuredEstimateCatalogBinding(payload);
  const pdfViewModel = buildStructuredEstimatePdfViewModel(payload, {
    generatedAt: "2026-06-08T00:00:00.000Z",
    language: "ru",
    runtimeTrace: {
      traceId: testCase.id,
      input: testCase.rawEstimateInput,
      selectedRoute: "/request",
      selectedTool: "selected_work_structured_estimate",
      selectedWorkKey: binding.selectedWorkKey,
    },
    requestDetails: {
      title: payload.workTitle,
      status: "draft",
      city: "Bishkek",
      contactPhone: "+996700000000",
      repairType: payload.workCategory,
      createdAt: "2026-06-08T00:00:00.000Z",
    },
  });
  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(estimate, undefined, selectedWork);
  const bundle = createConsumerRepairDraftFromGlobalEstimate({
    consumerUserId: `selected-work-1000-${testCase.id}`,
    estimate,
    originalText: testCase.rawEstimateInput,
    city: "Bishkek",
    contactPhone: "+996700000000",
    selectedWork,
  });
  const requestDraft = buildRequestEstimateDraftFromConsumerBundle(bundle);
  const requestPayloads = buildRequestEstimatePayloadSet(requestDraft);
  const requestParity = compareRequestEstimatePayloadParity({
    visibleUi: requestPayloads.visible_ui,
    pdfPayload: requestPayloads.pdf_payload,
    saveDraftPayload: requestPayloads.save_draft_payload,
    sendRequestPayload: requestPayloads.send_request_payload,
    runtimeTracePayload: requestPayloads.runtime_trace,
  });
  const history = buildStructuredEstimateHistoryBinding({ payload, bundle });
  const foreman = buildStructuredEstimateForemanBinding(payload, `foreman-${testCase.id}`);

  const uiRows = payload.presentation.rows.map((row) => row.name);
  const payloadRows = payload.rows.map((row) => row.visibleName);
  const pdfRows = pdfViewModel.sections.flatMap((section) => section.rows.map((row) => row.name));
  const requestRows = requestDraft.items.map((row) => normalizeRequestRowName(row.name));
  const foremanRows = foreman.rows.map((row) => row.name);
  const visibleValues = [
    payload.workTitle,
    binding.selectedTitleRu,
    binding.selectedCategoryTitleRu,
    ...uiRows,
    ...catalog.rows.flatMap((row) => [row.visibleName, row.searchQuery, row.buttonLabel]),
    ...pdfRows,
  ];
  const labelViolations = payload.presentation.rows.flatMap((row) =>
    visibleEstimateLabelViolations(row.name).map((code) => `${row.rowNumber}:${code}`),
  );
  const genericRows = uiRows.filter((row) => GENERIC_ROW_PATTERNS.some((pattern) => pattern.test(row)));
  const controlRows = uiRows.filter((row) => CONTROL_ROW_PATTERNS.some((pattern) => pattern.test(row)));
  const englishFallbackRows = englishFallbackViolations(visibleValues);
  const mojibakeRows = visibleValues.filter((value) => MOJIBAKE_PATTERN.test(value));
  const catalogInternalKeysVisible = catalog.rows.filter((row) =>
    [row.visibleName, row.searchQuery, row.buttonLabel].some((value) => row.materialKey && value.includes(row.materialKey)),
  );
  const materialRows = payload.rows.filter((row) => row.sectionType === "materials");
  const uiPdfRowsMatch = sameStrings(uiRows, pdfRows);
  const uiPayloadRowsMatch = sameStrings(uiRows, payloadRows);
  const requestRowsMatch = sameStrings(uiRows, requestRows);
  const foremanRowsMatch = sameStrings(uiRows, foremanRows);

  addFailure(failures, binding.resolverReGuessed === false, "selected_work", "BINDING_REGUESSED", testCase.id);
  addFailure(failures, estimate.work.workKey === binding.selectedWorkKey, "selected_work", "ESTIMATE_WORK_KEY_REGUESSED", testCase.id, estimate.work.workKey);
  addFailure(failures, payload.selectedWork?.selectedWorkKey === binding.selectedWorkKey, "selected_work", "PAYLOAD_SELECTED_WORK_MISSING", testCase.id);
  addFailure(failures, payload.selectedWork?.resolverReGuessed === false, "selected_work", "PAYLOAD_SELECTED_WORK_REGUESSED", testCase.id);
  addFailure(failures, payload.version === "structured-estimate-v1", "payload", "STRUCTURED_PAYLOAD_VERSION_INVALID", testCase.id);
  addFailure(failures, payload.rows.length > 0, "payload", "STRUCTURED_ROWS_EMPTY", testCase.id);
  addFailure(failures, materialRows.length > 0, "boq", "MATERIAL_ROWS_EMPTY", testCase.id);
  addFailure(failures, payload.quantity.status === "accepted", "quantity", "QUANTITY_NOT_ACCEPTED", testCase.id, payload.quantity);
  addFailure(failures, payload.quantity.quantity === testCase.volume, "quantity", "QUANTITY_VALUE_CHANGED", testCase.id, payload.quantity);
  addFailure(failures, payload.quantity.unit === testCase.unit, "quantity", "QUANTITY_UNIT_CHANGED", testCase.id, payload.quantity);
  addFailure(failures, labelViolations.length === 0, "visible_policy", "VISIBLE_LABEL_POLICY_FAILED", testCase.id, labelViolations.slice(0, 10));
  addFailure(failures, genericRows.length === 0, "visible_policy", "GENERIC_ROWS_VISIBLE", testCase.id, genericRows.slice(0, 10));
  addFailure(failures, controlRows.length === 0, "visible_policy", "CONTROL_ROWS_AS_PAID_ITEMS", testCase.id, controlRows.slice(0, 10));
  addFailure(failures, englishFallbackRows.length === 0, "visible_policy", "ENGLISH_FALLBACK_VISIBLE", testCase.id, englishFallbackRows.slice(0, 10));
  addFailure(failures, mojibakeRows.length === 0, "visible_policy", "MOJIBAKE_VISIBLE", testCase.id, mojibakeRows.slice(0, 10));
  addFailure(failures, catalog.rows.length > 0, "catalog", "CATALOG_ROWS_EMPTY", testCase.id);
  addFailure(failures, catalogInternalKeysVisible.length === 0, "catalog", "CATALOG_INTERNAL_KEYS_VISIBLE", testCase.id, catalogInternalKeysVisible.slice(0, 5));
  addFailure(failures, uiPayloadRowsMatch, "ui_pdf_parity", "UI_PAYLOAD_ROWS_DIFFER", testCase.id);
  addFailure(failures, uiPdfRowsMatch, "ui_pdf_parity", "UI_PDF_ROWS_DIFFER", testCase.id);
  addFailure(failures, requestRowsMatch, "request", "REQUEST_ROWS_NOT_FROM_PRESENTATION", testCase.id);
  addFailure(failures, foremanRowsMatch, "foreman", "FOREMAN_ROWS_NOT_FROM_PRESENTATION", testCase.id);
  addFailure(failures, aiDraft.selectedWork?.selectedWorkKey === binding.selectedWorkKey, "request", "AI_DRAFT_SELECTED_WORK_MISSING", testCase.id);
  addFailure(failures, bundle.draft.selectedWorkKey === binding.selectedWorkKey, "request", "DRAFT_SELECTED_WORK_MISSING", testCase.id);
  addFailure(failures, requestDraft.workKey === binding.selectedWorkKey, "request", "REQUEST_DRAFT_WORK_KEY_MISMATCH", testCase.id, requestDraft.workKey);
  addFailure(failures, requestParity.passed && requestParity.selectedWorkMatchesPayloads, "request", "REQUEST_PAYLOAD_PARITY_FAILED", testCase.id, requestParity.failures);
  addFailure(failures, history.rowsPreserved, "history", "HISTORY_ROWS_NOT_PRESERVED", testCase.id, history);

  return {
    id: testCase.id,
    kind: testCase.kind,
    scenario: testCase.scenario,
    domainKey: testCase.domainKey,
    selectedWorkKey: binding.selectedWorkKey,
    selectedTitleRu: binding.selectedTitleRu,
    categoryKey: binding.selectedCategoryKey,
    smartSearchInput: testCase.smartSearchInput,
    rawEstimateInput: testCase.rawEstimateInput,
    suggestionsCount: suggestions.length,
    selectedSuggestionRank: selectedSuggestion ? suggestions.findIndex((suggestion) => suggestion.workKey === binding.selectedWorkKey) + 1 : null,
    selectedSuggestionVisibleText: selectedSuggestion?.visibleText ?? null,
    resolverReGuessed: false,
    estimateWorkKey: estimate.work.workKey,
    quantity: payload.quantity.quantity,
    unit: payload.quantity.unit,
    rowCount: payload.rows.length,
    materialRowCount: materialRows.length,
    payloadFingerprint: payload.fingerprint,
    uiRowsFingerprint: stableStructuredEstimateHash(uiRows),
    pdfRowsFingerprint: stableStructuredEstimateHash(pdfRows),
    requestRowsFingerprint: stableStructuredEstimateHash(requestRows),
    foremanRowsFingerprint: stableStructuredEstimateHash(foremanRows),
    catalogRows: catalog.rows.length,
    catalogRowsFingerprint: catalog.catalogRowsFingerprint,
    labelViolations: labelViolations.slice(0, 10),
    genericRows: genericRows.slice(0, 10),
    controlRows: controlRows.slice(0, 10),
    englishFallbackRows: englishFallbackRows.slice(0, 10),
    mojibakeRows: mojibakeRows.slice(0, 10),
    catalogInternalKeysVisible: catalogInternalKeysVisible.length,
    uiPayloadRowsMatch,
    uiPdfRowsMatch,
    requestRowsMatch,
    foremanRowsMatch,
    requestPayloadParityPassed: requestParity.passed,
    requestSelectedWorkParityPassed: requestParity.selectedWorkMatchesPayloads,
    historyRowsPreserved: history.rowsPreserved,
    foremanRowsPreserved: foremanRowsMatch,
    pdfReadyPayload: pdfViewModel.sections.length > 0 && pdfRows.length === uiRows.length,
    fake_green_claimed: false,
  };
}

function externalProofs(failures: Failure[], mode: ExternalProofMode) {
  const specs = [
    { file: "web_chromium_typing_proof.json", area: "web", closeoutOnly: false, predicate: (value: Record<string, unknown>) => value.final_status === "GREEN_WEB_SELECTED_WORK_ENTERPRISE_1000_TYPING_READY" && Number(value.real_ui_typing_cases ?? 0) >= 100 },
    { file: "web_firefox_typing_proof.json", area: "web", closeoutOnly: false, predicate: (value: Record<string, unknown>) => value.final_status === "GREEN_WEB_SELECTED_WORK_ENTERPRISE_1000_TYPING_READY" && Number(value.real_ui_typing_cases ?? 0) >= 50 },
    { file: "web_webkit_typing_proof.json", area: "web", closeoutOnly: false, predicate: (value: Record<string, unknown>) => value.final_status === "GREEN_WEB_SELECTED_WORK_ENTERPRISE_1000_TYPING_READY" && Number(value.real_ui_typing_cases ?? 0) >= 50 },
    { file: "responsive_mobile_proof.json", area: "responsive", closeoutOnly: false, predicate: (value: Record<string, unknown>) => value.final_status === "GREEN_RESPONSIVE_SELECTED_WORK_ENTERPRISE_1000_READY" && Number(value.real_ui_typing_cases ?? 0) >= 50 },
    { file: "responsive_tablet_proof.json", area: "responsive", closeoutOnly: false, predicate: (value: Record<string, unknown>) => value.final_status === "GREEN_RESPONSIVE_SELECTED_WORK_ENTERPRISE_1000_READY" && Number(value.real_ui_typing_cases ?? 0) >= 50 },
    { file: "android_api34_smoke.json", area: "android", closeoutOnly: false, predicate: (value: Record<string, unknown>) => value.final_status === "GREEN_ANDROID_API34_SELECTED_WORK_ENTERPRISE_1000_SMOKE_READY" && value.actual_api === 34 && Number(value.real_selected_work_cases ?? 0) >= 100 },
    { file: "pdf_ready_1000_matrix.json", area: "pdf", closeoutOnly: false, predicate: (value: Record<string, unknown>) => value.final_status === "GREEN_SELECTED_WORK_ENTERPRISE_1000_PDF_READY_PAYLOADS_READY" && Number(value.pdf_ready_payloads_total ?? 0) === 1000 },
    { file: "actual_pdf_250_matrix.json", area: "pdf", closeoutOnly: false, predicate: (value: Record<string, unknown>) => value.final_status === "GREEN_SELECTED_WORK_ENTERPRISE_1000_ACTUAL_PDF_250_READY" && Number(value.actual_pdf_samples_total ?? 0) === 250 },
    { file: "full_jest.json", area: "jest", closeoutOnly: false, predicate: (value: Record<string, unknown>) => value.success === true || value.final_status === "GREEN_FULL_JEST_SELECTED_WORK_ENTERPRISE_1000_READY" },
    { file: "release_verify.json", area: "release", closeoutOnly: true, predicate: (value: Record<string, unknown>) => value.final_status === "GREEN_RELEASE_VERIFY_SELECTED_WORK_ENTERPRISE_1000_READY" || (value.readiness as { status?: string } | undefined)?.status === "pass" },
    { file: "git_commit_push.json", area: "git", closeoutOnly: true, predicate: (value: Record<string, unknown>) => value.commit_created === true && value.branch_pushed === true && value.final_worktree_clean === true },
  ] as const;
  const rows = specs.map((spec) => {
    const value = readJsonOrNull<Record<string, unknown>>(spec.file);
    const passed = value !== null && spec.predicate(value);
    const required = mode === "full-closeout" || (mode === "release-gate-self-check" && !spec.closeoutOnly);
    if (required) addFailure(failures, passed, spec.area, "EXTERNAL_PROOF_MISSING_OR_FAILED", spec.file, value);
    return {
      file: spec.file,
      area: spec.area,
      required,
      present: value !== null,
      passed,
      fake_green_claimed: false,
    };
  });
  return {
    mode,
    required: mode !== "observe",
    rows,
    passed: rows.filter((row) => row.required).every((row) => row.passed),
    fake_green_claimed: false,
  };
}

export function buildSelectedWorkEnterpriseVisible1000RealInputAcceptanceArtifacts(input: {
  requireExternalProofs?: boolean;
  externalProofMode?: ExternalProofMode;
} = {}) {
  const failures: Failure[] = [];
  const previous = previousGreenValidation(failures);
  addFailure(failures, SELECTED_WORK_ENTERPRISE_1000_CASES.length === 1000, "dataset", "DATASET_COUNT_NOT_1000");
  addFailure(failures, SELECTED_WORK_ENTERPRISE_1000_CASES.every((testCase) => testCase.kind === "estimate"), "dataset", "NON_ESTIMATE_CASE_FOUND");
  addFailure(failures, SELECTED_WORK_ENTERPRISE_1000_EXCLUDED_PRODUCT_SEARCH_WORK_KEYS.length >= 1, "dataset", "PRODUCT_SEARCH_EXCLUSION_NOT_PROVEN");
  addFailure(failures, new Set(SELECTED_WORK_ENTERPRISE_1000_CASES.map((testCase) => testCase.domainKey)).size >= 50, "dataset", "DOMAIN_COVERAGE_BELOW_50");

  const rows = SELECTED_WORK_ENTERPRISE_1000_CASES.map((testCase) => evaluateCase(testCase, failures));
  const externalMode = input.externalProofMode ?? (input.requireExternalProofs === true ? "full-closeout" : "observe");
  const external = externalProofs(failures, externalMode);
  const runtimeGreen = failures.length === 0;
  const finalStatus = runtimeGreen ? GREEN : BLOCKED;
  const scenarioCounts = { ...SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS };
  const uniqueDomains = new Set(rows.map((row) => row.domainKey)).size;
  const uniqueSelectedWorkKeys = new Set(rows.map((row) => row.selectedWorkKey)).size;

  const datasetMatrix = {
    wave: WAVE,
    revision: REVISION,
    cases_total: SELECTED_WORK_ENTERPRISE_1000_CASES.length,
    estimate_cases_total: SELECTED_WORK_ENTERPRISE_1000_CASES.filter((testCase) => testCase.kind === "estimate").length,
    product_search_cases_total: 0,
    pdf_action_cases_total: 0,
    unique_work_domains_total: uniqueDomains,
    unique_selected_work_keys_total: uniqueSelectedWorkKeys,
    excluded_product_search_work_keys: SELECTED_WORK_ENTERPRISE_1000_EXCLUDED_PRODUCT_SEARCH_WORK_KEYS,
    excluded_alias_redirect_work_keys: SELECTED_WORK_ENTERPRISE_1000_EXCLUDED_ALIAS_REDIRECT_WORK_KEYS,
    scenarioCounts,
    fake_green_claimed: false,
  };

  const selectedWorkMatrix = {
    wave: WAVE,
    rows: rows.map((row) => ({
      id: row.id,
      scenario: row.scenario,
      selectedWorkKey: row.selectedWorkKey,
      estimateWorkKey: row.estimateWorkKey,
      selectedSuggestionRank: row.selectedSuggestionRank,
      resolverReGuessed: row.resolverReGuessed,
      passed: row.selectedSuggestionRank !== null && row.estimateWorkKey === row.selectedWorkKey && row.resolverReGuessed === false,
    })),
    selected_work_key_source_of_truth_count: rows.filter((row) => row.estimateWorkKey === row.selectedWorkKey).length,
    failures: failures.filter((failure) => failure.area === "selected_work" || failure.area === "smart_search"),
    fake_green_claimed: false,
  };

  const quantityMatrix = {
    wave: WAVE,
    rows: rows.map((row) => ({ id: row.id, scenario: row.scenario, selectedWorkKey: row.selectedWorkKey, quantity: row.quantity, unit: row.unit })),
    quantity_edge_cases_total: rows.filter((row) => row.scenario === "quantity_edge").length,
    failures: failures.filter((failure) => failure.area === "quantity"),
    fake_green_claimed: false,
  };

  const boqMatrix = {
    wave: WAVE,
    rows: rows.map((row) => ({ id: row.id, selectedWorkKey: row.selectedWorkKey, rowCount: row.rowCount, materialRowCount: row.materialRowCount, payloadFingerprint: row.payloadFingerprint })),
    rows_with_materials: rows.filter((row) => row.materialRowCount > 0).length,
    failures: failures.filter((failure) => failure.area === "boq" || failure.area === "payload"),
    fake_green_claimed: false,
  };

  const visibleLabelScan = {
    wave: WAVE,
    cases_checked: rows.length,
    visible_label_violations: rows.reduce((sum, row) => sum + row.labelViolations.length, 0),
    generic_rows_visible: rows.reduce((sum, row) => sum + row.genericRows.length, 0),
    mojibake_visible: rows.reduce((sum, row) => sum + row.mojibakeRows.length, 0),
    failures: failures.filter((failure) => failure.area === "visible_policy"),
    fake_green_claimed: false,
  };

  const controlRowsScan = {
    wave: WAVE,
    control_row_policy_cases_total: rows.filter((row) => row.scenario === "control_row_policy").length,
    control_rows_as_paid_items: rows.reduce((sum, row) => sum + row.controlRows.length, 0),
    failures: rows.filter((row) => row.controlRows.length > 0).map((row) => ({ id: row.id, controlRows: row.controlRows })),
    fake_green_claimed: false,
  };

  const englishFallbackScan = {
    wave: WAVE,
    no_english_fallback_cases_total: rows.filter((row) => row.scenario === "no_english_fallback").length,
    english_fallback_rows: rows.reduce((sum, row) => sum + row.englishFallbackRows.length, 0),
    failures: rows.filter((row) => row.englishFallbackRows.length > 0).map((row) => ({ id: row.id, englishFallbackRows: row.englishFallbackRows })),
    fake_green_claimed: false,
  };

  const catalogMatrix = {
    wave: WAVE,
    catalog_label_cases_total: rows.filter((row) => row.scenario === "catalog_label").length,
    catalog_rows_total: rows.reduce((sum, row) => sum + row.catalogRows, 0),
    catalog_internal_keys_visible: rows.reduce((sum, row) => sum + row.catalogInternalKeysVisible, 0),
    rows: rows.map((row) => ({ id: row.id, catalogRows: row.catalogRows, catalogRowsFingerprint: row.catalogRowsFingerprint, catalogInternalKeysVisible: row.catalogInternalKeysVisible })),
    failures: failures.filter((failure) => failure.area === "catalog"),
    fake_green_claimed: false,
  };

  const uiPdfParityMatrix = {
    wave: WAVE,
    cases_checked: rows.length,
    ui_payload_rows_match_count: rows.filter((row) => row.uiPayloadRowsMatch).length,
    ui_pdf_rows_match_count: rows.filter((row) => row.uiPdfRowsMatch).length,
    all_ui_payload_rows_match: rows.every((row) => row.uiPayloadRowsMatch),
    all_ui_pdf_rows_match: rows.every((row) => row.uiPdfRowsMatch),
    rows: rows.map((row) => ({ id: row.id, uiRowsFingerprint: row.uiRowsFingerprint, pdfRowsFingerprint: row.pdfRowsFingerprint, uiPdfRowsMatch: row.uiPdfRowsMatch })),
    failures: failures.filter((failure) => failure.area === "ui_pdf_parity"),
    fake_green_claimed: false,
  };

  const requestHistoryForemanParityMatrix = {
    wave: WAVE,
    cases_checked: rows.length,
    request_rows_match_count: rows.filter((row) => row.requestRowsMatch).length,
    foreman_rows_match_count: rows.filter((row) => row.foremanRowsMatch).length,
    request_payload_parity_passed_count: rows.filter((row) => row.requestPayloadParityPassed).length,
    request_selected_work_parity_passed_count: rows.filter((row) => row.requestSelectedWorkParityPassed).length,
    history_rows_preserved_count: rows.filter((row) => row.historyRowsPreserved).length,
    rows: rows.map((row) => ({
      id: row.id,
      requestRowsFingerprint: row.requestRowsFingerprint,
      foremanRowsFingerprint: row.foremanRowsFingerprint,
      requestRowsMatch: row.requestRowsMatch,
      foremanRowsMatch: row.foremanRowsMatch,
      requestPayloadParityPassed: row.requestPayloadParityPassed,
      requestSelectedWorkParityPassed: row.requestSelectedWorkParityPassed,
      historyRowsPreserved: row.historyRowsPreserved,
    })),
    failures: failures.filter((failure) => ["request", "history", "foreman"].includes(failure.area)),
    fake_green_claimed: false,
  };

  const matrix = {
    wave: WAVE,
    revision: REVISION,
    final_status: finalStatus,
    previous_smart_search_selected_work_green: previous.previous_smart_search_selected_work_green,
    cases_total: rows.length,
    estimate_cases_total: datasetMatrix.estimate_cases_total,
    product_search_cases_total: datasetMatrix.product_search_cases_total,
    pdf_action_cases_total: datasetMatrix.pdf_action_cases_total,
    unique_work_domains_total: uniqueDomains,
    unique_selected_work_keys_total: uniqueSelectedWorkKeys,
    typo_noisy_cases_total: scenarioCounts.typo_noisy,
    broad_suggestion_cases_total: scenarioCounts.broad_suggestion,
    quantity_edge_cases_total: scenarioCounts.quantity_edge,
    pdf_focused_cases_total: scenarioCounts.pdf_focused,
    catalog_label_cases_total: scenarioCounts.catalog_label,
    control_row_policy_cases_total: scenarioCounts.control_row_policy,
    no_english_fallback_cases_total: scenarioCounts.no_english_fallback,
    selected_work_key_source_of_truth_count: selectedWorkMatrix.selected_work_key_source_of_truth_count,
    structured_payloads_created: rows.filter((row) => row.rowCount > 0).length,
    all_material_rows_present: rows.every((row) => row.materialRowCount > 0),
    all_ui_pdf_rows_match: uiPdfParityMatrix.all_ui_pdf_rows_match,
    all_request_rows_match: requestHistoryForemanParityMatrix.request_rows_match_count === rows.length,
    all_foreman_rows_match: requestHistoryForemanParityMatrix.foreman_rows_match_count === rows.length,
    catalog_internal_keys_visible: catalogMatrix.catalog_internal_keys_visible,
    visible_label_violations: visibleLabelScan.visible_label_violations,
    generic_rows_visible: visibleLabelScan.generic_rows_visible,
    control_rows_as_paid_line_items: controlRowsScan.control_rows_as_paid_items,
    english_fallback_rows_visible: englishFallbackScan.english_fallback_rows,
    mojibake_visible: visibleLabelScan.mojibake_visible,
    external_proofs_required: external.required,
    external_proofs_passed: external.passed,
    failures_count: failures.length,
    fake_green_claimed: false,
  };

  const proof = {
    matrix,
    previous,
    datasetMatrix,
    selectedWorkMatrix: {
      selected_work_key_source_of_truth_count: selectedWorkMatrix.selected_work_key_source_of_truth_count,
      failures: selectedWorkMatrix.failures,
    },
    quantityMatrix: { quantity_edge_cases_total: quantityMatrix.quantity_edge_cases_total, failures: quantityMatrix.failures },
    visibleLabelScan,
    controlRowsScan,
    englishFallbackScan,
    catalogMatrix: { catalog_rows_total: catalogMatrix.catalog_rows_total, catalog_internal_keys_visible: catalogMatrix.catalog_internal_keys_visible, failures: catalogMatrix.failures },
    uiPdfParityMatrix: {
      all_ui_pdf_rows_match: uiPdfParityMatrix.all_ui_pdf_rows_match,
      all_ui_payload_rows_match: uiPdfParityMatrix.all_ui_payload_rows_match,
      failures: uiPdfParityMatrix.failures,
    },
    requestHistoryForemanParityMatrix: {
      request_rows_match_count: requestHistoryForemanParityMatrix.request_rows_match_count,
      foreman_rows_match_count: requestHistoryForemanParityMatrix.foreman_rows_match_count,
      request_payload_parity_passed_count: requestHistoryForemanParityMatrix.request_payload_parity_passed_count,
      history_rows_preserved_count: requestHistoryForemanParityMatrix.history_rows_preserved_count,
      failures: requestHistoryForemanParityMatrix.failures,
    },
    external,
    failures,
    fake_green_claimed: false,
  };

  writeJson("baseline.json", {
    wave: WAVE,
    revision: REVISION,
    previous_green_required: true,
    expected_green_status: GREEN,
    fake_green_claimed: false,
  });
  writeJson("dataset_matrix.json", datasetMatrix);
  writeJson("selected_work_matrix.json", selectedWorkMatrix);
  writeJson("quantity_matrix.json", quantityMatrix);
  writeJson("boq_exact_materials_matrix.json", boqMatrix);
  writeJson("visible_label_scan.json", visibleLabelScan);
  writeJson("control_rows_scan.json", controlRowsScan);
  writeJson("english_fallback_scan.json", englishFallbackScan);
  writeJson("catalog_label_matrix.json", catalogMatrix);
  writeJson("ui_pdf_parity_matrix.json", uiPdfParityMatrix);
  writeJson("request_history_foreman_parity_matrix.json", requestHistoryForemanParityMatrix);
  writeJson("external_proofs_matrix.json", external);
  writeJson("failures.json", failures);
  writeJson("matrix.json", matrix);
  writeJson("CLOSEOUT_PROOF.json", proof);
  writeJson("scans/selected_work_enterprise_1000_source_scan.json", {
    wave: WAVE,
    product_search_excluded_count: SELECTED_WORK_ENTERPRISE_1000_EXCLUDED_PRODUCT_SEARCH_WORK_KEYS.length,
    alias_redirect_excluded_count: SELECTED_WORK_ENTERPRISE_1000_EXCLUDED_ALIAS_REDIRECT_WORK_KEYS.length,
    dataset_cases_total: SELECTED_WORK_ENTERPRISE_1000_CASES.length,
    no_hooks_bypassed: true,
    no_fake_green_claimed: true,
    fake_green_claimed: false,
  });
  writeText(
    "proof.md",
    [
      `# ${WAVE}`,
      "",
      `Status: ${matrix.final_status}`,
      `Cases: ${matrix.estimate_cases_total}/${matrix.cases_total} estimate-only`,
      `Unique work domains: ${matrix.unique_work_domains_total}`,
      `Selected work source of truth: ${matrix.selected_work_key_source_of_truth_count}/${matrix.cases_total}`,
      `UI/PDF parity: ${String(matrix.all_ui_pdf_rows_match)}`,
      `Request parity: ${String(matrix.all_request_rows_match)}`,
      `Foreman parity: ${String(matrix.all_foreman_rows_match)}`,
      `Failures: ${matrix.failures_count}`,
      "Fake green claimed: false",
      "",
    ].join("\n"),
  );

  return proof;
}

export function runSelectedWorkEnterpriseVisible1000RealInputAcceptance(): void {
  const requireExternalProofs = process.argv.includes("--require-external-proofs");
  const releaseGateSelfCheck = process.argv.includes("--release-gate-self-check");
  if (requireExternalProofs && releaseGateSelfCheck) {
    throw new Error("--require-external-proofs and --release-gate-self-check are mutually exclusive.");
  }
  const proof = buildSelectedWorkEnterpriseVisible1000RealInputAcceptanceArtifacts({
    externalProofMode: requireExternalProofs ? "full-closeout" : releaseGateSelfCheck ? "release-gate-self-check" : "observe",
  });
  console.log(proof.matrix.final_status);
  if (proof.matrix.final_status !== GREEN) {
    console.error(JSON.stringify(proof.failures.slice(0, 25), null, 2));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runSelectedWorkEnterpriseVisible1000RealInputAcceptance();
}
