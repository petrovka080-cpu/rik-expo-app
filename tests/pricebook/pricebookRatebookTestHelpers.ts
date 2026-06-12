import { execFileSync } from "node:child_process";

import {
  buildExactMaterialPriceEstimate,
  EXACT_MATERIAL_PRICEBOOK_DATE,
  EXACT_MATERIAL_PRICEBOOK_RATES,
  EXACT_MATERIAL_PRICEBOOK_REGION,
  EXACT_MATERIAL_PRICEBOOK_SOURCE_REFERENCE,
  EXACT_MATERIAL_PRICEBOOK_SUPPLIER_ID,
  resolveExactMaterialRate,
  type ExactMaterialPriceEstimate,
  type PricebookMaterialRate,
} from "../../src/lib/ai/exactMaterialPriceEstimate";
import {
  parsePricebookRatebookCsv,
  resolveGovernedRatebookPrice,
  validatePricebookRatebookEntry,
  validatePricebookRatebookImport,
  type PricebookRatebookImportRawRow,
} from "../../src/lib/ai/pricebookRatebookGovernance";
import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";
import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "../../scripts/e2e/selectedWorkEnterprise1000Cases";
import { renderEstimatePdfDocument } from "../../src/lib/estimatePdf";

export const PRICEBOOK_TEST_INPUT_RU =
  "\u041d\u0443\u0436\u043d\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044e \u043a\u0440\u044b\u0448\u0438 120 \u043c2";

export function buildPricebookRoofEstimate(): ExactMaterialPriceEstimate {
  return buildExactMaterialPriceEstimate({
    text: PRICEBOOK_TEST_INPUT_RU,
    selectedWorkKey: "roof_waterproofing",
    volume: 120,
    unit: "sq_m",
  });
}

export function baseGovernedRate(overrides: Partial<PricebookMaterialRate> = {}): PricebookMaterialRate {
  const base = EXACT_MATERIAL_PRICEBOOK_RATES.find((rate) => rate.material_id === "dynamic_universal_waterproofing")
    ?? EXACT_MATERIAL_PRICEBOOK_RATES[0];
  if (!base) throw new Error("PRICEBOOK_TEST_BASE_RATE_MISSING");
  return {
    ...base,
    material_id: "governed_test_material",
    material_visible_name_ru: "Governed test material",
    rate_key_aliases: ["governed_test_material"],
    supplier_id: EXACT_MATERIAL_PRICEBOOK_SUPPLIER_ID,
    supplier_visible_name: "KG Bishkek governed ratebook source",
    source_reference: EXACT_MATERIAL_PRICEBOOK_SOURCE_REFERENCE,
    region: EXACT_MATERIAL_PRICEBOOK_REGION,
    valid_from: "2026-06-01",
    valid_to: "2026-06-30",
    confidence: 0.78,
    ...overrides,
  };
}

export function validImportRow(overrides: PricebookRatebookImportRawRow = {}): PricebookRatebookImportRawRow {
  return {
    material_id: "imported_governed_material",
    material_visible_name_ru: "Imported governed material",
    category: "waterproofing",
    unit: "sq_m",
    visible_unit_ru: "\u043c2",
    price_value: 555,
    currency: "KGS",
    price_status: "VERIFIED",
    supplier_id: "kg_supplier_catalog_verified",
    supplier_visible_name: "KG supplier catalog verified source",
    region: EXACT_MATERIAL_PRICEBOOK_REGION,
    captured_at: "2026-06-12T00:00:00+06:00",
    valid_from: "2026-06-01",
    valid_to: "2026-06-30",
    source_type: "supplier_catalog",
    source_reference: "supplier-catalog-import-2026-06",
    confidence: 0.82,
    tax_included: false,
    delivery_included: false,
    ...overrides,
  };
}

export function expectNoFakeSupplierText(value: unknown): void {
  expect(JSON.stringify(value)).not.toMatch(/\b(?:fake|mock|demo|random)\s+(?:supplier|price|catalog|ratebook)\b/i);
}

export function directGovernedResolution(rate: PricebookMaterialRate = baseGovernedRate()) {
  return resolveGovernedRatebookPrice({
    materialId: rate.material_id,
    rateKey: rate.material_id,
    unit: rate.unit,
    region: rate.region,
    priceDate: EXACT_MATERIAL_PRICEBOOK_DATE,
    currency: rate.currency,
    rates: [rate],
  });
}

export function directExactResolution() {
  return resolveExactMaterialRate({
    materialId: "dynamic_universal_waterproofing",
    rateKey: "dynamic_universal_waterproofing",
    unit: "sq_m",
    region: EXACT_MATERIAL_PRICEBOOK_REGION,
    priceDate: EXACT_MATERIAL_PRICEBOOK_DATE,
    currency: "KGS",
  });
}

export function validateAllSeededRates() {
  return EXACT_MATERIAL_PRICEBOOK_RATES.map((rate, index) => ({
    index,
    rate,
    validation: validatePricebookRatebookEntry(rate, {
      asOfDate: EXACT_MATERIAL_PRICEBOOK_DATE,
      path: `EXACT_MATERIAL_PRICEBOOK_RATES.${index}`,
    }),
  }));
}

export function parseValidCsvImport() {
  const csv = [
    "material_id,material_visible_name_ru,category,unit,visible_unit_ru,price_value,currency,price_status,supplier_id,supplier_visible_name,region,captured_at,valid_from,valid_to,source_type,source_reference,confidence",
    "csv_material,Csv material,waterproofing,sq_m,m2,777,KGS,VERIFIED,csv_supplier,Csv supplier verified source,KG-Bishkek,2026-06-12T00:00:00+06:00,2026-06-01,2026-06-30,imported_csv,csv-import-2026-06,0.74",
  ].join("\n");
  return validatePricebookRatebookImport({
    format: "csv",
    rows: parsePricebookRatebookCsv(csv),
    asOfDate: EXACT_MATERIAL_PRICEBOOK_DATE,
  });
}

export function renderPricebookPdfText(result = buildPricebookRoofEstimate()): string {
  return renderEstimatePdfDocument(result.pdf_model).text;
}

export function real500Cases() {
  return REAL_DIVERSE_500_CONSTRUCTION_WORKS;
}

export function real1000Cases() {
  return SELECTED_WORK_ENTERPRISE_1000_CASES;
}

export function real10000Cases() {
  return REAL_DIVERSE_10000_CONSTRUCTION_WORKS;
}

export function gitStatusForNativeProtocol(): string {
  return execFileSync("git", ["status", "--short", "--", "ios", "android", "eas.json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
}
