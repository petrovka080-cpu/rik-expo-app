import fs from "node:fs";
import path from "node:path";

import {
  buildExactMaterialPriceEstimate,
  EXACT_MATERIAL_PRICEBOOK_RATES,
  REQUIRED_EXACT_MATERIAL_WORK_COVERAGE,
  resolveExactMaterialRate,
  type ExactMaterialPriceEstimate,
} from "../../src/lib/ai/exactMaterialPriceEstimate";
import {
  GLOBAL_WORK_TYPE_DEFINITIONS,
  visibleGlobalWorkTitleRu,
  type GlobalUnitInput,
} from "../../src/lib/ai/globalEstimate";
import { renderEstimatePdfDocument } from "../../src/lib/estimatePdf";
import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "../../scripts/e2e/selectedWorkEnterprise1000Cases";

export const ROOF_INPUT_RU =
  "\u041d\u0443\u0436\u043d\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044e \u043a\u0440\u044b\u0448\u0438 120 \u043c2";
export const WALL_PLASTER_INPUT_RU =
  "\u041d\u0443\u0436\u043d\u0430 \u0448\u0442\u0443\u043a\u0430\u0442\u0443\u0440\u043a\u0430 \u0441\u0442\u0435\u043d 85 \u043c2";

export const GENERIC_ROW_PATTERN =
  /^(?:material|materials|generic|\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b|\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b|\u043e\u0441\u043d\u043e\u0432\u043d\u043e\u0439\s+\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b|\u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435\s+\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b)\b/i;

export const CONTROL_ROW_PATTERN =
  /(?:\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430|\u043f\u0440\u0438\u0435\u043c\u043a\u0430|paid\s+control)/i;

const FORBIDDEN_VISIBLE_PATTERN =
  /\b(?:work_key|material_id|source_row_code|rateKey|materialKey|selectedWorkKey|dynamic_universal|undefined|NaN)\b|[a-z][a-z0-9]+_[a-z0-9_]+/i;

export function buildRoofExactEstimate(): ExactMaterialPriceEstimate {
  return buildExactMaterialPriceEstimate({
    text: ROOF_INPUT_RU,
    selectedWorkKey: "roof_waterproofing",
    volume: 120,
    unit: "sq_m",
  });
}

export function unitText(unit: GlobalUnitInput["normalizedUnit"]): string {
  if (unit === "sq_m") return "\u043c2";
  if (unit === "linear_m") return "\u043f\u043e\u0433.\u043c";
  if (unit === "m3") return "\u043c3";
  if (unit === "pcs") return "\u0448\u0442";
  if (unit === "set") return "\u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442";
  if (unit === "kg") return "\u043a\u0433";
  if (unit === "ton") return "\u0442\u043e\u043d\u043d";
  return unit;
}

export function quantityForUnit(unit: GlobalUnitInput["normalizedUnit"]): number {
  if (unit === "pcs") return 3;
  if (unit === "set") return 1;
  if (unit === "m3" || unit === "cu_ft") return 12;
  if (unit === "linear_m" || unit === "linear_ft") return 30;
  if (unit === "kg" || unit === "lbs") return 120;
  if (unit === "ton") return 5;
  return 42;
}

export function buildSelectedExactEstimate(workKey: string): ExactMaterialPriceEstimate {
  const definition = GLOBAL_WORK_TYPE_DEFINITIONS.find((item) => item.workKey === workKey);
  if (!definition) throw new Error(`UNKNOWN_TEST_WORK:${workKey}`);
  const quantity = quantityForUnit(definition.defaultMeasureUnit);
  const text = `${visibleGlobalWorkTitleRu(definition)} ${quantity} ${unitText(definition.defaultMeasureUnit)}`;
  return buildExactMaterialPriceEstimate({
    text,
    selectedWorkKey: workKey,
    volume: quantity,
    unit: definition.defaultMeasureUnit,
  });
}

export function visibleTextForExactEstimate(result: ExactMaterialPriceEstimate): string {
  return [
    ...result.ui_model.visible_text_lines,
    ...result.catalog_binding.flatMap((row) => [row.visible_material_name, row.search_query, row.source_label]),
    result.pdf_model.title,
    result.pdf_model.workTitle,
    result.pdf_model.originalText ?? "",
    ...result.pdf_model.requestMetaFields.flatMap((field) => [field.label, field.value]),
    ...result.pdf_model.sections.flatMap((section) => [
      section.title,
      ...section.rows.flatMap((row) => [row.name, row.quantity, row.unitPrice, row.total, ...row.sourceLabels]),
    ]),
    ...result.pdf_model.sources,
  ].join("\n");
}

export function expectVisibleClean(result: ExactMaterialPriceEstimate): void {
  const visible = visibleTextForExactEstimate(result)
    .replace(/PRICE_MISSING/g, "")
    .replace(/PARTIAL_PRICE_MISSING/g, "")
    .replace(/GREEN_USER_INPUT_TO_EXACT_MATERIAL_PRICE_ESTIMATE_READY/g, "");
  expect(visible).not.toMatch(FORBIDDEN_VISIBLE_PATTERN);
  expect(visible).not.toMatch(/\b(?:fake|mock|demo)\s+(?:price|supplier|catalog)\b/i);
  expect(visible).not.toMatch(/\uFFFD/);
}

export function expectExactEstimateCoreInvariants(result: ExactMaterialPriceEstimate): void {
  expect(result.policy.fake_price_claimed).toBe(false);
  expect(result.policy.fake_supplier_claimed).toBe(false);
  expect(result.material_lines.length).toBeGreaterThan(0);
  expect(result.material_lines.every((line) => line.price_status === "VERIFIED" || line.price_status === "PRICE_MISSING")).toBe(true);
  for (const line of result.material_lines) {
    expect(line.material_visible_name_ru).toBeTruthy();
    expect(line.quantity).toBeGreaterThan(0);
    expect(line.consumption_per_unit).toBeGreaterThan(0);
    expect(line.formula).toContain("quantity");
    expect(line.fake_price_claimed).toBe(false);
    expect(line.fake_supplier_claimed).toBe(false);
    if (line.price_status === "PRICE_MISSING") {
      expect(line.price_value).toBeNull();
      expect(line.line_total).toBeNull();
    }
  }
  expectVisibleClean(result);
}

export function renderExactPdfText(result: ExactMaterialPriceEstimate): string {
  const pdf = renderEstimatePdfDocument(result.pdf_model);
  expect(pdf.bytes.length).toBeGreaterThan(1000);
  return pdf.text;
}

export function exactEstimateSourceFiles(): string[] {
  const root = path.join(process.cwd(), "src", "lib", "ai", "exactMaterialPriceEstimate");
  return fs.readdirSync(root)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => path.join(root, name));
}

export function selectedWorkAcceptanceCases() {
  return SELECTED_WORK_ENTERPRISE_1000_CASES;
}

export function requiredCoverageWorkKeys(): string[] {
  return REQUIRED_EXACT_MATERIAL_WORK_COVERAGE.map((item) => item.workKey);
}

export function directKnownRate() {
  const rate = EXACT_MATERIAL_PRICEBOOK_RATES.find((item) => item.material_id === "dynamic_universal_waterproofing");
  if (!rate) throw new Error("TEST_PRICEBOOK_RATE_MISSING");
  return resolveExactMaterialRate({
    materialId: rate.material_id,
    rateKey: rate.material_id,
    unit: rate.unit,
    region: rate.region,
    priceDate: "2026-06-12",
    currency: rate.currency,
  });
}
