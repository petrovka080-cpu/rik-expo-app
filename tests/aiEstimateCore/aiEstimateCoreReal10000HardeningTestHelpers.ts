import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
  displayUnitFor,
  GLOBAL_WORK_TYPE_DEFINITIONS,
  visibleGlobalWorkTitleRu,
  type GlobalEstimateResult,
  type GlobalUnitInput,
} from "../../src/lib/ai/globalEstimate";
import { buildEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import { parseUniversalConstructionQuantities } from "../../src/lib/ai/constructionFormulas";
import {
  buildStructuredEstimateCatalogBinding,
  buildStructuredEstimatePayload,
  buildStructuredEstimatePdfViewModel,
  type StructuredEstimatePayload,
} from "../../src/lib/estimateStructuredPipeline";
import {
  createEstimatePdf,
  extractEstimatePdfTextForProof,
  validateNoPdfMojibake,
} from "../../src/lib/estimatePdf";
import {
  INTERNAL_VISIBLE_PATTERN,
  MOJIBAKE_PATTERN,
  PAID_CONTROL_ROW_PATTERN,
  QUANTITY_EDGE_CASES,
  REAL_WORK_READING_SMOKE_CASES,
  WEAK_GENERIC_ROW_PATTERN,
} from "../../scripts/e2e/aiEstimateCoreReal10000Hardening.shared";

export { QUANTITY_EDGE_CASES, REAL_WORK_READING_SMOKE_CASES };

export const KNOWN_EXACT_BOQ_WORK_KEYS = [
  "roof_waterproofing",
  "foundation_waterproofing",
  "bathroom_waterproofing",
  "wall_plastering",
  "floor_screed",
  "ceramic_tile_laying",
  "facade_painting",
  "socket_installation",
  "plumbing_basic",
  "heating_radiator_installation",
  "foundation_concrete_pour",
  "brick_masonry",
  "drywall_partition",
  "gable_roof_installation",
  "facade_insulation",
  "paving_stone_laying",
  "asphalt_paving",
  "window_installation",
  "door_installation",
] as const;

type KnownWorkPayload = {
  estimate: GlobalEstimateResult;
  payload: StructuredEstimatePayload;
};

export function estimateForText(text: string): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    text,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
}

export function payloadForText(text: string): StructuredEstimatePayload {
  return buildStructuredEstimatePayload(estimateForText(text), { source: "request" });
}

function quantityForUnit(unit: GlobalUnitInput["normalizedUnit"]): number {
  if (unit === "pcs") return 4;
  if (unit === "set") return 1;
  if (unit === "m3" || unit === "cu_ft") return 12;
  if (unit === "kg" || unit === "lbs") return 120;
  if (unit === "ton") return 5;
  return 42;
}

function unitText(unit: GlobalUnitInput["normalizedUnit"]): string {
  if (unit === "sq_m") return "\u043c2";
  if (unit === "linear_m") return "\u043f\u043e\u0433.\u043c";
  if (unit === "m3") return "\u043c3";
  if (unit === "pcs") return "\u0448\u0442";
  if (unit === "set") return "\u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442";
  if (unit === "kg") return "\u043a\u0433";
  if (unit === "ton") return "\u0442\u043e\u043d\u043d";
  return unit;
}

export function payloadForKnownWorkKey(workKey: string): KnownWorkPayload {
  const definition = GLOBAL_WORK_TYPE_DEFINITIONS.find((item) => item.workKey === workKey);
  if (!definition) throw new Error(`UNKNOWN_KNOWN_WORK:${workKey}`);
  const quantity = quantityForUnit(definition.defaultMeasureUnit);
  const title = visibleGlobalWorkTitleRu(definition);
  const rawInput = `${title} ${quantity} ${unitText(definition.defaultMeasureUnit)}`;
  const selectedWork = buildGlobalSelectedWorkBinding({ selectedWorkKey: workKey, rawInput });
  const estimate = calculateGlobalConstructionEstimateSync(
    buildGlobalEstimateInputWithSelectedWork(
      {
        text: rawInput,
        language: "ru",
        countryCode: "KG",
        city: "Bishkek",
        volume: quantity,
        unit: definition.defaultMeasureUnit,
      },
      selectedWork,
    ),
  );
  const payload = buildStructuredEstimatePayload(estimate, { source: "request", selectedWork });
  return { estimate, payload };
}

export function selectedWorkPayload(params: {
  selectedWorkKey: string;
  rawInput: string;
  volume: number;
  unit: GlobalUnitInput["normalizedUnit"];
}): KnownWorkPayload {
  const selectedWork = buildGlobalSelectedWorkBinding({
    selectedWorkKey: params.selectedWorkKey,
    rawInput: params.rawInput,
  });
  const estimate = calculateGlobalConstructionEstimateSync(
    buildGlobalEstimateInputWithSelectedWork(
      {
        text: params.rawInput,
        language: "ru",
        countryCode: "KG",
        city: "Bishkek",
        volume: params.volume,
        unit: params.unit,
      },
      selectedWork,
    ),
  );
  const payload = buildStructuredEstimatePayload(estimate, { source: "request", selectedWork });
  return { estimate, payload };
}

export function visibleValuesForPayload(payload: StructuredEstimatePayload): string[] {
  const catalog = buildStructuredEstimateCatalogBinding(payload);
  const pdf = buildStructuredEstimatePdfViewModel(payload, {
    generatedAt: "2026-06-11T00:00:00.000Z",
    language: "ru",
  });
  return [
    payload.workTitle,
    payload.presentation.workTitle,
    payload.presentation.localContext.displayLine,
    ...payload.presentation.rows.map((row) => row.name),
    ...payload.presentation.sourceLabels,
    ...payload.presentation.assumptions,
    ...catalog.rows.flatMap((row) => [row.visibleName, row.searchQuery, row.buttonLabel]),
    ...pdf.sections.flatMap((section) => [section.title, ...section.rows.map((row) => row.name)]),
    ...pdf.sources,
  ].filter(Boolean);
}

export function materialRows(payload: StructuredEstimatePayload) {
  return payload.rows.filter((row) => row.sectionType === "materials");
}

export function weakGenericRows(payload: StructuredEstimatePayload): string[] {
  return payload.rows.map((row) => row.visibleName).filter((name) => WEAK_GENERIC_ROW_PATTERN.test(name));
}

export function paidControlRows(payload: StructuredEstimatePayload): string[] {
  return payload.rows
    .filter((row) => row.sectionType === "labor" || row.sectionType === "equipment")
    .map((row) => row.visibleName)
    .filter((name) => PAID_CONTROL_ROW_PATTERN.test(name));
}

export function internalKeysVisible(payload: StructuredEstimatePayload): string[] {
  return visibleValuesForPayload(payload).filter((value) => INTERNAL_VISIBLE_PATTERN.test(value));
}

export function mojibakeVisible(payload: StructuredEstimatePayload): string[] {
  return visibleValuesForPayload(payload).filter((value) => MOJIBAKE_PATTERN.test(value));
}

export function pricedRowsWithoutEvidence(payload: StructuredEstimatePayload): string[] {
  return payload.rows
    .filter((row) => row.unitPrice > 0)
    .filter((row) => !row.sourceId || !row.rateKey || !row.visibleSourceLabel)
    .map((row) => row.visibleName);
}

export function fakeSupplierClaims(payload: StructuredEstimatePayload): string[] {
  return visibleValuesForPayload(payload).filter((value) => /\b(fake|mock|demo)_?(supplier|price|catalog)\b/i.test(value));
}

export function parsedQuantity(text: string) {
  return parseUniversalConstructionQuantities(text);
}

export function displayMetricUnit(unit: GlobalUnitInput["normalizedUnit"]): string {
  return displayUnitFor(unit, "metric");
}

export function pdfTextForEstimate(estimate: GlobalEstimateResult): { text: string; rowNames: string[] } {
  const viewModel = buildEstimatePresentationViewModel(estimate);
  const pdf = createEstimatePdf({
    estimate,
    generatedAt: "2026-06-11T00:00:00.000Z",
    language: "ru",
    runtimeTrace: {
      traceId: `ai-estimate-core-contract:${estimate.estimateId}`,
      input: estimate.input.originalText,
      selectedRoute: "/request",
      selectedTool: "calculate_global_estimate",
      backendCalled: true,
      detectedIntent: "estimate",
      workKey: estimate.work.workKey,
    },
  });
  expect(pdf.validation.valid).toBe(true);
  expect(pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
  expect(pdf.pdfTrace.markdown_parsed_as_pdf_truth).toBe(false);
  const text = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate.work.workKey }).text;
  expect(validateNoPdfMojibake(text).passed).toBe(true);
  return { text, rowNames: viewModel.rows.map((row) => row.name) };
}

export function gitOutput(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    timeout: 10_000,
  }).trim();
}

export function nativeEstimateCoreDiffPaths(): string[] {
  const names = [
    ...gitOutput(["diff", "--name-only", "HEAD", "--", "ios", "android", "eas.json"]).split(/\r?\n/),
    ...gitOutput(["status", "--short", "--", "ios", "android", "eas.json"]).split(/\r?\n/),
  ];
  return names.map((item) => item.trim()).filter(Boolean);
}

export function readWaveArtifact<T = Record<string, unknown>>(name: string): T | null {
  const filePath = path.join(
    process.cwd(),
    "artifacts",
    "S_AI_ESTIMATE_CORE_REAL_10000_WORK_READING_EXACT_BOQ_HARDENING",
    name,
  );
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}
