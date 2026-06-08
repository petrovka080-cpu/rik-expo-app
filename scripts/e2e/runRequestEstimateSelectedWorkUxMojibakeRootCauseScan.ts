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
  buildRequestEstimateDraftFromConsumerBundle,
  buildRequestEstimatePayloadSet,
} from "../../src/features/consumerRepair/buildRequestEstimatePayload";
import {
  createConsumerRepairDraftFromGlobalEstimate,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairPdfStorageObject,
  listConsumerRepairRequestHistory,
  __resetConsumerRepairRequestStoreForTests,
  type ConsumerRepairSelectedWork,
} from "../../src/lib/consumerRequests";
import { extractEstimatePdfText } from "../../src/lib/estimatePdf";
import {
  isWeakGenericVisibleEstimateLabel,
  visibleEstimateLabelViolations,
} from "../../src/lib/estimatePresentation/visibleEstimateLabelPolicy";
import {
  buildStructuredEstimateCatalogBinding,
  buildStructuredEstimateForemanBinding,
  buildStructuredEstimateHistoryBinding,
  buildStructuredEstimatePayload,
  buildStructuredEstimatePdfViewModel,
} from "../../src/lib/estimateStructuredPipeline";
import { isCorruptedText, normalizeRuText } from "../../src/lib/text/encoding";

export const REQUEST_ESTIMATE_SELECTED_WORK_UX_WAVE =
  "S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX_FINAL_GREEN_UNBLOCK_CLOSEOUT_POINT_OF_NO_RETURN";
export const REQUEST_ESTIMATE_SELECTED_WORK_UX_REVISION =
  "REV_AFTER_BLOCKED_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX";
export const REQUEST_ESTIMATE_SELECTED_WORK_UX_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX",
);

const CASE_COUNT = 50;
const REQUIRED_WORK_KEYS = ["roof_waterproofing", "strip_foundation", "electrical_wiring", "asphalt_paving"] as const;

type SelectedWorkCase = typeof SELECTED_WORK_ENTERPRISE_1000_CASES[number];
export type MojibakeScanSurface = "ui" | "pdf" | "catalog" | "request" | "history" | "foreman";

export type MojibakeScanRecord = {
  caseId: string;
  surface: MojibakeScanSurface;
  field: string;
  rawValue: string;
  sourceModule: string;
  rowLike: boolean;
};

export type MojibakeRootCauseSource = {
  caseId: string;
  surface: MojibakeScanSurface;
  field: string;
  rawValue: string;
  decodedCandidate: string;
  sourceModule: string;
};

export type MojibakeRootCauseScanResult = {
  wave: string;
  revision: string;
  cases_scanned: number;
  mojibake_found: number;
  generic_rows_created_by_repair: number;
  internal_keys_created_by_repair: number;
  surface_totals: Record<MojibakeScanSurface, number>;
  sources: MojibakeRootCauseSource[];
  generic_rows: MojibakeRootCauseSource[];
  internal_key_rows: MojibakeRootCauseSource[];
  fake_green_claimed: false;
};

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(REQUEST_ESTIMATE_SELECTED_WORK_UX_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(REQUEST_ESTIMATE_SELECTED_WORK_UX_ARTIFACT_DIR, name),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function clip(value: string): string {
  return value.length > 600 ? `${value.slice(0, 600)}...` : value;
}

function normalizeVisible(value: string): string {
  return String(normalizeRuText(value)).replace(/\s+/g, " ").trim();
}

export function hasVisibleMojibake(value: unknown): boolean {
  if (value == null) return false;
  const text = String(value);
  if (!text) return false;
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => {
      const normalized = normalizeVisible(line);
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

function hasInternalKey(value: string): boolean {
  return /\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b/.test(normalizeVisible(value));
}

function toSource(record: MojibakeScanRecord): MojibakeRootCauseSource {
  const rawValue = clip(record.rawValue);
  return {
    caseId: record.caseId,
    surface: record.surface,
    field: record.field,
    rawValue,
    decodedCandidate: clip(normalizeVisible(record.rawValue)),
    sourceModule: record.sourceModule,
  };
}

function addRecord(
  records: MojibakeScanRecord[],
  input: {
    caseId: string;
    surface: MojibakeScanSurface;
    field: string;
    value: unknown;
    sourceModule: string;
    rowLike?: boolean;
  },
): void {
  if (input.value == null) return;
  const rawValue = String(input.value);
  if (!rawValue.trim()) return;
  records.push({
    caseId: input.caseId,
    surface: input.surface,
    field: input.field,
    rawValue,
    sourceModule: input.sourceModule,
    rowLike: input.rowLike === true,
  });
}

function addObjectStrings(
  records: MojibakeScanRecord[],
  input: {
    caseId: string;
    surface: MojibakeScanSurface;
    fieldPrefix: string;
    value: unknown;
    sourceModule: string;
  },
): void {
  const visit = (value: unknown, field: string): void => {
    if (typeof value === "string") {
      addRecord(records, {
        caseId: input.caseId,
        surface: input.surface,
        field,
        value,
        sourceModule: input.sourceModule,
      });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${field}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        visit(item, `${field}.${key}`);
      }
    }
  };
  visit(input.value, input.fieldPrefix);
}

function activeInputFor(testCase: SelectedWorkCase): string {
  return `${testCase.selectedTitleRu} ${testCase.volume} ${testCase.unitLabelRu}`.trim();
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

export function selectRequestEstimateSelectedWorkUxMojibakeScanCases(caseCount = CASE_COUNT): SelectedWorkCase[] {
  const selected: SelectedWorkCase[] = [];
  const seen = new Set<string>();
  for (const workKey of REQUIRED_WORK_KEYS) {
    if (selected.length >= caseCount) break;
    const found = SELECTED_WORK_ENTERPRISE_1000_CASES.find((testCase) => testCase.selectedWorkKey === workKey);
    if (found && !seen.has(found.id)) {
      selected.push(found);
      seen.add(found.id);
    }
  }
  for (const testCase of SELECTED_WORK_ENTERPRISE_1000_CASES) {
    if (selected.length >= caseCount) break;
    if (seen.has(testCase.id)) continue;
    selected.push(testCase);
    seen.add(testCase.id);
  }
  return selected;
}

export function collectRequestEstimateSelectedWorkUxVisibleRecords(testCase: SelectedWorkCase): MojibakeScanRecord[] {
  const caseId = testCase.id;
  const records: MojibakeScanRecord[] = [];
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
      traceId: caseId,
      input: activeInput,
      selectedRoute: "/request",
      selectedTool: "request_estimate_selected_work_mojibake_scan",
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
    consumerUserId: `request-estimate-selected-work-mojibake-${caseId}`,
    estimate,
    originalText: activeInput,
    city: "Bishkek",
    contactPhone: "+996700000000",
    selectedWork,
  });
  const requestDraft = buildRequestEstimateDraftFromConsumerBundle(bundle);
  const requestPayloads = buildRequestEstimatePayloadSet(requestDraft);
  const historyBinding = buildStructuredEstimateHistoryBinding({ payload, bundle });
  const history = listConsumerRepairRequestHistory(bundle.draft.consumerUserId);
  const foreman = buildStructuredEstimateForemanBinding(payload, `request-estimate-selected-work-mojibake-${caseId}`);

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

  addRecord(records, {
    caseId,
    surface: "ui",
    field: "activeInput",
    value: activeInput,
    sourceModule: "scripts/e2e/selectedWorkEnterprise1000Cases",
  });
  addRecord(records, {
    caseId,
    surface: "ui",
    field: "selectedWork.titleRu",
    value: binding.selectedTitleRu,
    sourceModule: "src/lib/ai/globalEstimate/globalWorkSmartSearch",
  });
  addRecord(records, {
    caseId,
    surface: "ui",
    field: "workTitle",
    value: payload.workTitle,
    sourceModule: "src/lib/estimateStructuredPipeline/buildStructuredEstimatePayload",
  });
  payload.rows.forEach((row, index) => {
    addRecord(records, {
      caseId,
      surface: "ui",
      field: `rows[${index}].visibleName`,
      value: row.visibleName,
      sourceModule: "src/lib/estimateStructuredPipeline/buildStructuredEstimatePayload",
      rowLike: true,
    });
  });

  catalog.rows.forEach((row, index) => {
    addRecord(records, {
      caseId,
      surface: "catalog",
      field: `rows[${index}].visibleName`,
      value: row.visibleName,
      sourceModule: "src/lib/estimateStructuredPipeline/structuredEstimateCatalogBinding",
      rowLike: true,
    });
    addRecord(records, {
      caseId,
      surface: "catalog",
      field: `rows[${index}].searchQuery`,
      value: row.searchQuery,
      sourceModule: "src/lib/estimateStructuredPipeline/structuredEstimateCatalogBinding",
      rowLike: true,
    });
    addRecord(records, {
      caseId,
      surface: "catalog",
      field: `rows[${index}].buttonLabel`,
      value: row.buttonLabel,
      sourceModule: "src/lib/estimateStructuredPipeline/structuredEstimateCatalogBinding",
    });
  });

  addObjectStrings(records, {
    caseId,
    surface: "request",
    fieldPrefix: "draft",
    value: {
      title: requestDraft.title,
      description: requestDraft.description,
      selectedWork: requestDraft.selectedWork,
      items: requestDraft.items.map((item) => ({ name: item.name, unitLabel: item.unitLabel })),
      visibleUi: requestPayloads.visible_ui.draft.items.map((item) => ({ name: item.name, unitLabel: item.unitLabel })),
      pdfPayload: requestPayloads.pdf_payload.draft.items.map((item) => ({ name: item.name, unitLabel: item.unitLabel })),
      saveDraftPayload: requestPayloads.save_draft_payload.draft.items.map((item) => ({ name: item.name, unitLabel: item.unitLabel })),
      sendRequestPayload: requestPayloads.send_request_payload.draft.items.map((item) => ({ name: item.name, unitLabel: item.unitLabel })),
    },
    sourceModule: "src/features/consumerRepair/buildRequestEstimatePayload",
  });

  pdfViewModel.sections.forEach((section, sectionIndex) => {
    addRecord(records, {
      caseId,
      surface: "pdf",
      field: `sections[${sectionIndex}].title`,
      value: section.title,
      sourceModule: "src/lib/estimateStructuredPipeline/buildStructuredEstimatePdfViewModel",
    });
    section.rows.forEach((row, rowIndex) => {
      addRecord(records, {
        caseId,
        surface: "pdf",
        field: `sections[${sectionIndex}].rows[${rowIndex}].name`,
        value: row.name,
        sourceModule: "src/lib/estimateStructuredPipeline/buildStructuredEstimatePdfViewModel",
        rowLike: true,
      });
    });
  });
  addObjectStrings(records, {
    caseId,
    surface: "pdf",
    fieldPrefix: "requestMetaFields",
    value: pdfViewModel.requestMetaFields,
    sourceModule: "src/lib/estimateStructuredPipeline/buildStructuredEstimatePdfViewModel",
  });
  addRecord(records, {
    caseId,
    surface: "pdf",
    field: "extractedText",
    value: pdfText,
    sourceModule: "src/lib/estimatePdf",
  });

  addObjectStrings(records, {
    caseId,
    surface: "history",
    fieldPrefix: "history",
    value: { historyBinding, history },
    sourceModule: "src/lib/estimateStructuredPipeline/structuredEstimateHistoryBinding",
  });
  addObjectStrings(records, {
    caseId,
    surface: "foreman",
    fieldPrefix: "foreman",
    value: {
      rows: foreman.rows.map((row) => ({ name: row.name })),
      presentation: {
        workTitle: foreman.presentation.workTitle,
        localContext: foreman.presentation.localContext,
        assumptions: foreman.presentation.assumptions,
        clarifyingQuestions: foreman.presentation.clarifyingQuestions,
      },
      actions: foreman.actions.map((action) => ({ label: action.label })),
    },
    sourceModule: "src/lib/estimateStructuredPipeline/structuredEstimateForemanBinding",
  });

  return records;
}

export function collectRequestEstimateSelectedWorkUxMojibakeScan(input: {
  caseCount?: number;
  cases?: readonly SelectedWorkCase[];
} = {}): MojibakeRootCauseScanResult {
  const cases = [...(input.cases ?? selectRequestEstimateSelectedWorkUxMojibakeScanCases(input.caseCount ?? CASE_COUNT))];
  const records = cases.flatMap(collectRequestEstimateSelectedWorkUxVisibleRecords);
  const surface_totals = records.reduce<Record<MojibakeScanSurface, number>>(
    (totals, record) => {
      totals[record.surface] += 1;
      return totals;
    },
    { ui: 0, pdf: 0, catalog: 0, request: 0, history: 0, foreman: 0 },
  );
  const sources = records.filter((record) => hasVisibleMojibake(record.rawValue)).map(toSource);
  const genericRows = records
    .filter((record) => record.rowLike && isWeakGenericVisibleEstimateLabel(record.rawValue))
    .map(toSource);
  const internalKeyRows = records
    .filter((record) => record.rowLike && (hasInternalKey(record.rawValue) || visibleEstimateLabelViolations(record.rawValue).includes("SNAKE_CASE_INTERNAL_KEY")))
    .map(toSource);

  return {
    wave: REQUEST_ESTIMATE_SELECTED_WORK_UX_WAVE,
    revision: REQUEST_ESTIMATE_SELECTED_WORK_UX_REVISION,
    cases_scanned: cases.length,
    mojibake_found: sources.length,
    generic_rows_created_by_repair: genericRows.length,
    internal_keys_created_by_repair: internalKeyRows.length,
    surface_totals,
    sources,
    generic_rows: genericRows,
    internal_key_rows: internalKeyRows,
    fake_green_claimed: false,
  };
}

export function writeRequestEstimateSelectedWorkUxMojibakeArtifacts(result: MojibakeRootCauseScanResult): void {
  writeJson("mojibake_root_cause_scan.json", {
    mojibake_found: result.mojibake_found,
    sources: result.sources,
  });
  writeJson("mojibake_repair_matrix.json", result);
}

function main(): void {
  const result = collectRequestEstimateSelectedWorkUxMojibakeScan();
  writeRequestEstimateSelectedWorkUxMojibakeArtifacts(result);
  console.log(JSON.stringify({
    mojibake_found: result.mojibake_found,
    generic_rows_created_by_repair: result.generic_rows_created_by_repair,
    internal_keys_created_by_repair: result.internal_keys_created_by_repair,
  }));
  if (
    result.mojibake_found > 0 ||
    result.generic_rows_created_by_repair > 0 ||
    result.internal_keys_created_by_repair > 0
  ) {
    process.exitCode = 1;
  }
}

if (typeof require !== "undefined" && require.main === module) {
  main();
}
