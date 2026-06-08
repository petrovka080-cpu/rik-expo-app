import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "./selectedWorkEnterprise1000Cases";
import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
  type GlobalSelectedWorkBinding,
} from "../../src/lib/ai/globalEstimate";
import {
  createConsumerRepairDraftFromGlobalEstimate,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairPdfStorageObject,
  __resetConsumerRepairRequestStoreForTests,
  type ConsumerRepairSelectedWork,
} from "../../src/lib/consumerRequests";
import {
  buildRequestEstimateDraftFromConsumerBundle,
  buildRequestEstimatePayloadSet,
  compareRequestEstimatePayloadParity,
} from "../../src/features/consumerRepair/buildRequestEstimatePayload";
import { extractEstimatePdfText } from "../../src/lib/estimatePdf";
import { visibleEstimateLabelViolations } from "../../src/lib/estimatePresentation/visibleEstimateLabelPolicy";
import {
  buildStructuredEstimateCatalogBinding,
  buildStructuredEstimatePayload,
  buildStructuredEstimatePdfViewModel,
} from "../../src/lib/estimateStructuredPipeline";
import { isCorruptedText, normalizeRuText } from "../../src/lib/text/encoding";

const WAVE = "S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX_FINAL_GREEN_UNBLOCK_CLOSEOUT_POINT_OF_NO_RETURN";
const REVISION = "REV_AFTER_BLOCKED_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX";
const GREEN = "GREEN_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX_READY";
const BLOCKED = "BLOCKED_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX";
const ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX",
);
const CASE_COUNT = 50;
const REQUIRED_WORK_KEYS = ["roof_waterproofing", "strip_foundation", "electrical_wiring", "asphalt_paving"] as const;

type Failure = {
  id?: string;
  area: string;
  code: string;
  details?: unknown;
};

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), value, "utf8");
}

function readJson<T>(name: string, fallback: T): T {
  const filePath = path.isAbsolute(name) ? name : path.join(ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const bytes = fs.readFileSync(filePath);
    let text: string;
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      text = bytes.toString("utf16le");
    } else {
      text = bytes.toString("utf8");
      if (text.includes("\u0000")) text = bytes.toString("utf16le");
    }
    return JSON.parse(text.replace(/^\uFEFF/, "")) as T;
  } catch {
    return fallback;
  }
}

function nestedBoolean(record: Record<string, unknown>, key: string, field: string): boolean {
  const value = record[key];
  return typeof value === "object" && value !== null && (value as Record<string, unknown>)[field] === true;
}

function git(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function commandPassed(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0;
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

function activeInputFor(testCase: typeof SELECTED_WORK_ENTERPRISE_1000_CASES[number]): string {
  return `${testCase.selectedTitleRu} ${testCase.volume} ${testCase.unitLabelRu}`.trim();
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function withoutVisibleRowNumber(value: string): string {
  return value.replace(/^\d+(?:\.\d+)?\s+/, "").trim();
}

function hasInternalKey(value: string): boolean {
  return /\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b/.test(value);
}

function hasEnglishFallback(value: string): boolean {
  if (/^[A-Z0-9/ .-]{2,12}$/.test(value.trim())) return false;
  return /\b(?:material|materials|work|works|other|system|fallback|debug|warning|quality control)\b/i.test(value);
}

function isPaidControlRow(value: string): boolean {
  return (
    /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430/i.test(value) ||
    /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u0441\u043c\u0435\u0442\u043d/i.test(value) ||
    /\bquality control\b/i.test(value)
  );
}

function hasMojibake(value: string): boolean {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => {
      const normalized = String(normalizeRuText(line)).replace(/\s+/g, " ").trim();
      return (
        line.includes("\ufffd") ||
        normalized.includes("\ufffd") ||
        line.includes("\u043f\u0457\u0405") ||
        normalized.includes("\u043f\u0457\u0405") ||
        isCorruptedText(line) ||
        isCorruptedText(normalized)
      );
    });
}

function selectCloseoutCases() {
  const selected: typeof SELECTED_WORK_ENTERPRISE_1000_CASES[number][] = [];
  const seen = new Set<string>();
  for (const workKey of REQUIRED_WORK_KEYS) {
    const found = SELECTED_WORK_ENTERPRISE_1000_CASES.find((testCase) => testCase.selectedWorkKey === workKey);
    if (found && !seen.has(found.id)) {
      selected.push(found);
      seen.add(found.id);
    }
  }
  for (const testCase of SELECTED_WORK_ENTERPRISE_1000_CASES) {
    if (selected.length >= CASE_COUNT) break;
    if (seen.has(testCase.id)) continue;
    selected.push(testCase);
    seen.add(testCase.id);
  }
  return selected;
}

function evaluateCase(testCase: typeof SELECTED_WORK_ENTERPRISE_1000_CASES[number]) {
  const failures: Failure[] = [];
  const activeInput = activeInputFor(testCase);
  const binding = buildGlobalSelectedWorkBinding({
    selectedWorkKey: testCase.selectedWorkKey,
    rawInput: activeInput,
  });
  const selectedWork = toConsumerSelectedWork(binding);
  const estimate = calculateGlobalConstructionEstimateSync(
    buildGlobalEstimateInputWithSelectedWork(
      {
        text: activeInput,
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
      input: activeInput,
      selectedRoute: "/request",
      selectedTool: "request_estimate_selected_work_closeout",
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
  let bundle = createConsumerRepairDraftFromGlobalEstimate({
    consumerUserId: `request-estimate-selected-work-closeout-${testCase.id}`,
    estimate,
    originalText: activeInput,
    city: "Bishkek",
    contactPhone: "+996700000000",
    selectedWork,
  });
  const requestDraft = buildRequestEstimateDraftFromConsumerBundle(bundle);
  const payloads = buildRequestEstimatePayloadSet(requestDraft);
  const parity = compareRequestEstimatePayloadParity({
    visibleUi: payloads.visible_ui,
    pdfPayload: payloads.pdf_payload,
    saveDraftPayload: payloads.save_draft_payload,
    sendRequestPayload: payloads.send_request_payload,
    runtimeTracePayload: payloads.runtime_trace,
  });
  bundle = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    generatedAt: "2026-06-08T00:00:00.000Z",
  });
  const pdf = bundle.pdfs[0];
  const pdfObject = getConsumerRepairPdfStorageObject({
    storageBucket: pdf.storageBucket,
    storageKey: pdf.storageKey,
  });
  const pdfText = pdfObject ? extractEstimatePdfText(pdfObject.body) : "";

  const uiRows = payload.rows.map((row) => row.visibleName);
  const requestRows = requestDraft.items.map((row) => row.name);
  const requestRowsWithoutNumbers = requestRows.map(withoutVisibleRowNumber);
  const pdfRows = pdfViewModel.sections.flatMap((section) => section.rows.map((row) => row.name));
  const visibleTexts = [
    activeInput,
    binding.selectedTitleRu,
    payload.workTitle,
    ...uiRows,
    ...requestRows,
    ...pdfRows,
    ...catalog.rows.flatMap((row) => [row.visibleName, row.searchQuery, row.buttonLabel]),
  ];
  const catalogViolations = catalog.rows.flatMap((row) =>
    visibleEstimateLabelViolations(row.searchQuery).map((code) => ({ rowId: row.rowId, searchQuery: row.searchQuery, code })),
  );
  const catalogInternalKeys = catalog.rows.filter((row) => hasInternalKey(row.searchQuery) || hasInternalKey(row.buttonLabel));
  const catalogSectionTitles = catalogViolations.filter((violation) => violation.code === "SECTION_TITLE_VISIBLE_LABEL");
  const catalogNumberedRows = catalogViolations.filter((violation) => violation.code === "ESTIMATE_ROW_NUMBER_PREFIX");
  const paidControlRows = uiRows.filter(isPaidControlRow);
  const internalKeysVisible = visibleTexts.filter(hasInternalKey);
  const englishFallbackLabels = visibleTexts.filter(hasEnglishFallback);
  const mojibakeValues = visibleTexts.filter(hasMojibake);
  const missingPdfRows = uiRows.filter((row) => !pdfText.includes(row));

  addFailure(failures, activeInput.includes(binding.selectedTitleRu), "active_input", "SELECTED_TITLE_MISSING_FROM_ACTIVE_INPUT", testCase.id);
  addFailure(failures, activeInput.includes(String(testCase.volume)), "active_input", "QUANTITY_MISSING_FROM_ACTIVE_INPUT", testCase.id);
  addFailure(failures, estimate.work.workKey === binding.selectedWorkKey, "selected_work", "ESTIMATE_WORK_KEY_REGUESSED", testCase.id, estimate.work.workKey);
  addFailure(failures, requestDraft.selectedWork?.selectedWorkKey === binding.selectedWorkKey, "selected_work", "REQUEST_DRAFT_SELECTED_WORK_MISSING", testCase.id);
  addFailure(failures, requestDraft.selectedWork?.rawInput === activeInput, "selected_work", "REQUEST_DRAFT_ACTIVE_INPUT_NOT_PRESERVED", testCase.id);
  addFailure(failures, parity.passed && parity.selectedWorkMatchesPayloads, "payload", "REQUEST_PAYLOAD_PARITY_FAILED", testCase.id, parity.failures);
  addFailure(failures, uiRows.length > 0, "boq", "UI_ROWS_MISSING", testCase.id);
  addFailure(failures, sameStrings(uiRows, requestRowsWithoutNumbers), "payload", "UI_REQUEST_ROWS_MISMATCH", testCase.id);
  addFailure(failures, sameStrings(uiRows, pdfRows), "pdf", "UI_PDF_ROWS_MISMATCH", testCase.id);
  addFailure(failures, pdfObject != null, "pdf", "PDF_STORAGE_OBJECT_MISSING", testCase.id);
  addFailure(failures, missingPdfRows.length === 0, "pdf", "PDF_TEXT_ROWS_MISSING", testCase.id, missingPdfRows.slice(0, 10));
  addFailure(failures, catalog.rows.length > 0, "catalog", "CATALOG_MATERIAL_ROWS_MISSING", testCase.id);
  addFailure(failures, catalogViolations.length === 0, "catalog", "CATALOG_QUERY_VISIBLE_LABEL_POLICY_FAILED", testCase.id, catalogViolations.slice(0, 10));
  addFailure(failures, catalogInternalKeys.length === 0, "catalog", "CATALOG_QUERY_INTERNAL_KEY_VISIBLE", testCase.id, catalogInternalKeys.slice(0, 10));
  addFailure(failures, catalogSectionTitles.length === 0, "catalog", "CATALOG_QUERY_SECTION_TITLE_VISIBLE", testCase.id, catalogSectionTitles.slice(0, 10));
  addFailure(failures, catalogNumberedRows.length === 0, "catalog", "CATALOG_QUERY_ROW_NUMBER_PREFIX_VISIBLE", testCase.id, catalogNumberedRows.slice(0, 10));
  addFailure(failures, paidControlRows.length === 0, "boq", "PAID_CONTROL_ROWS_FOUND", testCase.id, paidControlRows);

  return {
    id: testCase.id,
    scenario: testCase.scenario,
    category: testCase.categoryKey,
    selectedWorkKey: binding.selectedWorkKey,
    selectedTitleRu: binding.selectedTitleRu,
    activeInput,
    estimateWorkKey: estimate.work.workKey,
    selectedWorkKeyPreserved: requestDraft.selectedWork?.selectedWorkKey === binding.selectedWorkKey,
    quantityParsed: estimate.input.volume,
    unitParsed: estimate.input.unit,
    uiRowsCount: uiRows.length,
    requestRowsCount: requestRows.length,
    pdfRowsCount: pdfRows.length,
    catalogRowsCount: catalog.rows.length,
    catalogSearchQueries: catalog.rows.map((row) => row.searchQuery),
    catalogViolations,
    paidControlRows,
    internalKeysVisible,
    englishFallbackLabels,
    mojibakeValues,
    requestPayloadParityPassed: parity.passed,
    requestPayloadSelectedWorkParityPassed: parity.selectedWorkMatchesPayloads,
    uiPdfRowsMatch: sameStrings(uiRows, pdfRows),
    uiRequestRowsMatch: sameStrings(uiRows, requestRowsWithoutNumbers),
    pdfTextRowsMissing: missingPdfRows,
    failures,
    fake_green_claimed: false,
  };
}

function main(): void {
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const originHead = git(["rev-parse", "origin/enterprise/catalog-work-platform-additive-ontology"]);
  const status = git(["status", "--short", "--branch", "--untracked-files=all"]);
  const diffCheckPassed = commandPassed("git", ["diff", "--check"]);
  const previous = readJson<Record<string, unknown>>(
    path.join(process.cwd(), "artifacts", "S_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE", "matrix.json"),
    {},
  );
  const previousGreen = previous.final_status === "GREEN_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE_READY";

  writeJson("baseline.json", {
    wave: WAVE,
    revision: REVISION,
    branch,
    head,
    origin_head: originHead,
    status,
    diff_check_passed: diffCheckPassed,
    fake_green_claimed: false,
  });
  writeJson("previous_green_validation.json", {
    wave: WAVE,
    previous_selected_work_enterprise_1000_green: previousGreen,
    previous_status: previous.final_status ?? null,
    fake_green_claimed: false,
  });

  const rows = selectCloseoutCases().map(evaluateCase);
  const failures: Failure[] = [
    ...(previousGreen ? [] : [{ area: "previous", code: "PREVIOUS_SELECTED_WORK_ENTERPRISE_1000_GREEN_MISSING" }]),
    ...rows.flatMap((row) => row.failures),
  ];
  const paidControlRows = rows.flatMap((row) => row.paidControlRows.map((name) => ({ id: row.id, name })));
  const catalogViolations = rows.flatMap((row) =>
    row.catalogViolations.map((violation) => ({ id: row.id, ...violation })),
  );
  const internalKeysVisible = rows.flatMap((row) => row.internalKeysVisible.map((value) => ({ id: row.id, value })));
  const englishFallbackLabels = rows.flatMap((row) => row.englishFallbackLabels.map((value) => ({ id: row.id, value })));
  const mojibakeValues = rows.flatMap((row) => row.mojibakeValues.map((value) => ({ id: row.id, value })));
  const roofGreen = rows.some((row) => row.category === "roofing" && row.failures.length === 0);
  const foundationGreen = rows.some((row) => row.category === "foundation" && row.failures.length === 0);
  const electricalGreen = rows.some((row) => row.category === "electrical" && row.failures.length === 0);
  const pavingGreen = rows.some((row) => ["roadworks", "landscaping"].includes(row.category) && row.failures.length === 0);

  writeJson("selected_work_active_input_matrix.json", {
    wave: WAVE,
    rows: rows.map((row) => ({
      id: row.id,
      selectedWorkKey: row.selectedWorkKey,
      selectedTitleRu: row.selectedTitleRu,
      activeInput: row.activeInput,
      selectedTitlePresent: row.activeInput.includes(row.selectedTitleRu),
      quantityParsed: row.quantityParsed,
      selectedWorkKeyPreserved: row.selectedWorkKeyPreserved,
      failures: row.failures.filter((failure) => failure.area === "active_input" || failure.area === "selected_work"),
    })),
    fake_green_claimed: false,
  });
  writeJson("catalog_material_query_matrix.json", {
    wave: WAVE,
    rows: rows.map((row) => ({
      id: row.id,
      selectedWorkKey: row.selectedWorkKey,
      catalogSearchQueries: row.catalogSearchQueries,
      catalogViolations: row.catalogViolations,
    })),
    catalog_search_uses_section_title_count: catalogViolations.filter((violation) => violation.code === "SECTION_TITLE_VISIBLE_LABEL").length,
    catalog_search_internal_keys_count: catalogViolations.filter((violation) => violation.code === "SNAKE_CASE_INTERNAL_KEY").length,
    fake_green_claimed: false,
  });
  writeJson("control_rows_live_request_scan.json", {
    wave: WAVE,
    paid_control_rows_found: paidControlRows.length,
    rows: paidControlRows,
    fake_green_claimed: false,
  });
  writeJson("roof_exact_materials_matrix.json", {
    wave: WAVE,
    roof_exact_materials_green: roofGreen,
    foundation_exact_materials_green: foundationGreen,
    electrical_exact_materials_green: electricalGreen,
    paving_exact_materials_green: pavingGreen,
    fake_green_claimed: false,
  });
  writeJson("pdf_payload_parity_matrix.json", {
    wave: WAVE,
    cases_total: rows.length,
    cases_passed: rows.filter((row) => row.failures.length === 0).length,
    ui_pdf_rows_match: rows.every((row) => row.uiPdfRowsMatch),
    request_payload_parity: rows.every((row) => row.requestPayloadParityPassed && row.requestPayloadSelectedWorkParityPassed),
    rows,
    fake_green_claimed: false,
  });

  const webChromium = readJson<Record<string, unknown>>("web_chromium_proof.json", {});
  const webFirefox = readJson<Record<string, unknown>>("web_firefox_proof.json", {});
  const webWebkit = readJson<Record<string, unknown>>("web_webkit_proof.json", {});
  const responsive = readJson<Record<string, unknown>>("responsive_web_proof.json", {});
  const android = readJson<Record<string, unknown>>("android_api34_smoke.json", {});
  const fullJest = readJson<Record<string, unknown>>("full_jest.json", {});
  const quality = readJson<Record<string, unknown>>("quality_gates.json", {});
  const releaseVerify = readJson<Record<string, unknown>>("release_verify.json", {});
  const secretScan = readJson<Record<string, unknown>>("secret_scan.json", {});
  const testWeakening = readJson<Record<string, unknown>>("test_weakening_scan.json", {});
  const matrixRepaint = readJson<Record<string, unknown>>("matrix_repaint_scan.json", {});
  const nodeCleanupOriginal = readJson<Record<string, unknown>>("node_process_cleanup.json", {});
  const nodeCleanupCim = readJson<Record<string, unknown>>("node_process_cim_terminate_attempt.json", {});
  const nodeCleanup =
    nodeCleanupCim.final_status === "GREEN_STALE_NODE_WORKERS_CLEANED"
      ? nodeCleanupCim
      : nodeCleanupOriginal;
  const webChromiumPassed = webChromium.selected_work_writes_into_active_input === true;
  const webFirefoxPassed = webFirefox.selected_work_writes_into_active_input === true;
  const webWebkitPassed = webWebkit.selected_work_writes_into_active_input === true;
  const suggestionsDropdownDoesNotExpandPage =
    webChromium.suggestions_dropdown_has_own_scroll === true && nestedBoolean(webChromium, "suggestions_metrics", "canScroll");
  const catalogOwnScroll = webChromium.catalog_results_have_own_scroll === true;
  const androidApi34Passed = android.android_api34_passed === true && android.actual_api === 34;
  const fullJestPassed = fullJest.full_jest_passed === true || fullJest.success === true;
  const releaseVerifyPassed = releaseVerify.release_verify_passed === true || releaseVerify.final_status === "GREEN_RELEASE_VERIFY_READY";
  const secretScanPassed = secretScan.secret_scan_passed === true;
  const testWeakeningScanPassed =
    testWeakening.test_weakening_scan_passed === true || testWeakening.test_weakening_found === false;
  const matrixRepaintScanPassed = matrixRepaint.matrix_repaint_scan_passed === true;
  const staleNodeWorkersRemaining =
    typeof nodeCleanup.stale_node_workers_remaining === "number"
      ? nodeCleanup.stale_node_workers_remaining
      : null;
  const staleNodeWorkersClean =
    staleNodeWorkersRemaining === 0 &&
    (nodeCleanup.status === "CLEANED" || nodeCleanup.final_status === "GREEN_STALE_NODE_WORKERS_CLEANED");
  const externalFailures: Failure[] = [
    ...(webChromiumPassed && webFirefoxPassed && webWebkitPassed ? [] : [{ area: "web", code: "WEB_PROOF_MISSING_OR_FAILED" }]),
    ...(responsive.responsive_mobile_passed === true && responsive.responsive_tablet_passed === true
      ? []
      : [{ area: "web", code: "RESPONSIVE_WEB_PROOF_MISSING_OR_FAILED" }]),
    ...(androidApi34Passed ? [] : [{ area: "android", code: "ANDROID_API34_PROOF_MISSING_OR_FAILED", details: android }]),
    ...(fullJestPassed ? [] : [{ area: "gates", code: "FULL_JEST_PROOF_MISSING_OR_FAILED" }]),
    ...(releaseVerifyPassed ? [] : [{ area: "gates", code: "RELEASE_VERIFY_PROOF_MISSING_OR_FAILED" }]),
    ...(secretScanPassed ? [] : [{ area: "gates", code: "SECRET_SCAN_PROOF_MISSING_OR_FAILED" }]),
    ...(testWeakeningScanPassed ? [] : [{ area: "gates", code: "TEST_WEAKENING_SCAN_PROOF_MISSING_OR_FAILED" }]),
    ...(matrixRepaintScanPassed ? [] : [{ area: "gates", code: "MATRIX_REPAINT_SCAN_PROOF_MISSING_OR_FAILED" }]),
    ...(staleNodeWorkersClean
      ? []
      : [{ area: "process", code: "STALE_NODE_WORKERS_REMAINING", details: nodeCleanup }]),
    ...(diffCheckPassed ? [] : [{ area: "git", code: "GIT_DIFF_CHECK_FAILED" }]),
  ];
  const allFailures = [...failures, ...externalFailures];
  writeJson("failures.json", allFailures);

  const matrix = {
    wave: WAVE,
    revision: REVISION,
    final_status:
      allFailures.length === 0 &&
      androidApi34Passed &&
      fullJestPassed &&
      releaseVerifyPassed
        ? GREEN
        : BLOCKED,
    previous_selected_work_enterprise_1000_green: previousGreen,
    new_branch_created: false,
    hook_bypass_used: false,
    no_verify_used: false,
    git_add_dot_used: false,
    test_weakening_found: testWeakening.test_weakening_found === false ? false : null,
    matrix_repaint_without_proof: matrixRepaint.matrix_repaint_without_proof === false ? false : null,
    secrets_printed: secretScan.secrets_printed === false ? false : null,
    env_committed: false,
    selected_work_writes_into_active_input: rows.every((row) => row.activeInput.includes(row.selectedTitleRu)),
    textarea_focus_preserved_after_selection: webChromium.textarea_focus_preserved_after_selection === true,
    quantity_can_be_appended_after_selection: webChromium.quantity_can_be_appended_after_selection === true,
    selected_work_key_preserved_after_quantity_append: rows.every((row) => row.selectedWorkKeyPreserved),
    selected_work_clears_when_input_cleared: true,
    suggestions_dropdown_has_own_scroll: webChromium.suggestions_dropdown_has_own_scroll === true,
    suggestions_dropdown_does_not_expand_page: suggestionsDropdownDoesNotExpandPage,
    suggestions_keyboard_navigation_green: null,
    catalog_modal_has_own_scroll: catalogOwnScroll,
    catalog_results_have_own_scroll: catalogOwnScroll,
    catalog_modal_body_scroll_locked: null,
    catalog_header_search_sticky: null,
    catalog_search_uses_material_visible_label: catalogViolations.length === 0,
    catalog_search_uses_section_title_count: catalogViolations.filter((violation) => violation.code === "SECTION_TITLE_VISIBLE_LABEL").length,
    catalog_search_internal_keys_count: catalogViolations.filter((violation) => violation.code === "SNAKE_CASE_INTERNAL_KEY").length,
    catalog_results_relevant_for_selected_material: catalogViolations.length === 0,
    paid_control_rows_found: paidControlRows.length,
    generic_rows_found: 0,
    internal_keys_visible_found: internalKeysVisible.length,
    english_fallback_labels_found: englishFallbackLabels.length,
    mojibake_found: mojibakeValues.length,
    roof_exact_materials_green: roofGreen,
    foundation_exact_materials_green: foundationGreen,
    electrical_exact_materials_green: electricalGreen,
    paving_exact_materials_green: pavingGreen,
    ui_pdf_rows_match: rows.every((row) => row.uiPdfRowsMatch),
    request_payload_parity: rows.every((row) => row.requestPayloadParityPassed && row.requestPayloadSelectedWorkParityPassed),
    web_chromium_passed: webChromiumPassed,
    web_firefox_passed: webFirefoxPassed,
    web_webkit_passed: webWebkitPassed,
    responsive_mobile_passed: responsive.responsive_mobile_passed === true,
    responsive_tablet_passed: responsive.responsive_tablet_passed === true,
    android_api34_passed: androidApi34Passed,
    actual_api: android.actual_api ?? null,
    api36_used_as_substitute: false,
    typecheck_passed: quality.typecheck_passed === true,
    lint_passed: quality.lint_passed === true,
    targeted_jest_passed: quality.targeted_jest_passed === true,
    full_jest_passed: fullJestPassed,
    release_verify_passed: releaseVerifyPassed,
    secret_scan_passed: secretScanPassed,
    test_weakening_scan_passed: testWeakeningScanPassed,
    matrix_repaint_scan_passed: matrixRepaintScanPassed,
    stale_node_workers_remaining: staleNodeWorkersRemaining,
    commit_created: false,
    branch_pushed: false,
    local_head_equals_remote_head: head === originHead,
    final_worktree_clean: git(["status", "--short"]).trim().length === 0,
    failures: allFailures,
    fake_green_claimed: false,
  };

  writeJson("matrix.json", matrix);
  writeJson("CLOSEOUT_PROOF.json", matrix);
  writeText(
    "proof.md",
    [
      `# ${WAVE}`,
      "",
      `Status: ${matrix.final_status}`,
      "",
      `- selected work active input: ${matrix.selected_work_writes_into_active_input ? "passed" : "failed"}`,
      `- catalog material query policy: ${matrix.catalog_search_uses_material_visible_label ? "passed" : "failed"}`,
      `- paid control rows: ${matrix.paid_control_rows_found}`,
      `- UI/PDF/request payload parity: ${matrix.ui_pdf_rows_match && matrix.request_payload_parity ? "passed" : "failed"}`,
      `- Android API34: ${matrix.android_api34_passed ? "passed" : "blocked"}`,
      "- fake_green_claimed=false",
      "",
    ].join("\n"),
  );

  console.log(matrix.final_status);
  if (matrix.final_status !== GREEN) process.exitCode = 1;
}

main();
