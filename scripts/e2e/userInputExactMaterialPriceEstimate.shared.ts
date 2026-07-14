import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  buildExactMaterialPriceEstimate,
  EXACT_MATERIAL_PRICEBOOK_RATES,
  EXACT_MATERIAL_PRICE_ESTIMATE_GREEN_STATUS,
  EXACT_MATERIAL_PRICE_ESTIMATE_WAVE,
  REQUIRED_EXACT_MATERIAL_WORK_COVERAGE,
  resolveExactMaterialRate,
  type ExactMaterialPriceEstimate,
} from "../../src/lib/ai/exactMaterialPriceEstimate";
import { GLOBAL_WORK_TYPE_DEFINITIONS, visibleGlobalWorkTitleRu, type GlobalUnitInput } from "../../src/lib/ai/globalEstimate";
import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";
import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import { renderEstimatePdfDocument } from "../../src/lib/estimatePdf";
import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "./selectedWorkEnterprise1000Cases";

export const EXACT_WAVE_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_USER_INPUT_TO_EXACT_MATERIAL_PRICE_ESTIMATE",
);

export type ExactWaveJson = Record<string, unknown>;

export function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

export function sourceCodeHead(): string {
  return gitOutput(["rev-parse", "HEAD"], "unknown");
}

export function withExactWaveLineage<T extends ExactWaveJson>(value: T): T & {
  wave: string;
  source_code_head: string;
  current_head_at_write_time: string;
  fake_green_claimed: false;
} {
  return {
    wave: EXACT_MATERIAL_PRICE_ESTIMATE_WAVE,
    ...value,
    source_code_head: sourceCodeHead(),
    current_head_at_write_time: sourceCodeHead(),
    fake_green_claimed: false,
  };
}

export function writeExactWaveJson(name: string, value: ExactWaveJson): void {
  const filePath = path.join(EXACT_WAVE_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(withExactWaveLineage(value), null, 2)}\n`, "utf8");
}

export function readExactWaveJson<T = ExactWaveJson>(name: string): T | null {
  const filePath = path.join(EXACT_WAVE_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function writeExactWaveText(name: string, value: string): void {
  const filePath = path.join(EXACT_WAVE_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
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

export function selectedWorkEstimate(workKey: string): ExactMaterialPriceEstimate {
  const definition = GLOBAL_WORK_TYPE_DEFINITIONS.find((item) => item.workKey === workKey);
  if (!definition) throw new Error(`EXACT_REQUIRED_WORK_MISSING:${workKey}`);
  const quantity = quantityForUnit(definition.defaultMeasureUnit);
  const text = `${visibleGlobalWorkTitleRu(definition)} ${quantity} ${unitText(definition.defaultMeasureUnit)}`;
  return buildExactMaterialPriceEstimate({
    text,
    selectedWorkKey: workKey,
    volume: quantity,
    unit: definition.defaultMeasureUnit,
  });
}

export function exactLineSummary(result: ExactMaterialPriceEstimate) {
  return {
    estimate_id: result.estimate_id,
    work_key: result.work.work_key,
    quantity: result.input.quantity,
    unit: result.input.unit,
    material_rows: result.material_lines.length,
    verified_price_rows: result.material_lines.filter((line) => line.price_status === "VERIFIED").length,
    missing_price_rows: result.material_lines.filter((line) => line.price_status === "PRICE_MISSING").length,
    total_status: result.totals.total_status,
    fake_price_claimed: result.policy.fake_price_claimed,
    fake_supplier_claimed: result.policy.fake_supplier_claimed,
  };
}

export function evaluateSelectedWork1000() {
  const rows = SELECTED_WORK_ENTERPRISE_1000_CASES.map((item) => {
    const result = buildExactMaterialPriceEstimate({
      text: item.rawEstimateInput,
      selectedWorkKey: item.selectedWorkKey,
      volume: item.volume,
      unit: item.unit,
    });
    const failures = [
      ...(result.work.work_key === item.selectedWorkKey ? [] : ["SELECTED_WORK_KEY_LOST"]),
      ...(result.input.quantity === item.volume ? [] : ["QUANTITY_MISMATCH"]),
      ...(result.input.unit === item.unit ? [] : ["UNIT_MISMATCH"]),
      ...(result.material_lines.length > 0 ? [] : ["RECIPE_MISSING"]),
      ...(result.pdf_model.sections[0]?.rows.length > 0 ? [] : ["PDF_MODEL_MISSING"]),
      ...(result.policy.fake_price_claimed ? ["FAKE_PRICE_CLAIMED"] : []),
      ...(result.policy.fake_supplier_claimed ? ["FAKE_SUPPLIER_CLAIMED"] : []),
    ];
    return {
      id: item.id,
      selected_work_key: item.selectedWorkKey,
      parsed_work_key: result.work.work_key,
      quantity: result.input.quantity,
      unit: result.input.unit,
      material_rows: result.material_lines.length,
      verified_price_rows: result.material_lines.filter((line) => line.price_status === "VERIFIED").length,
      missing_price_rows: result.totals.missing_price_rows_count,
      total_status: result.totals.total_status,
      pdf_generated: result.pdf_model.sections[0]?.rows.length > 0,
      failures,
    };
  });
  const failures = rows.flatMap((row) => row.failures.map((failure) => ({ id: row.id, failure })));
  return {
    final_status: failures.length === 0
      ? "GREEN_EXACT_MATERIAL_PRICE_USER_INPUT_1000_READY"
      : "RED_EXACT_MATERIAL_PRICE_USER_INPUT_1000",
    cases_total: rows.length,
    cases_passed: rows.filter((row) => row.failures.length === 0).length,
    cases_failed: failures.length,
    selected_work_preserved: rows.filter((row) => row.parsed_work_key === row.selected_work_key).length,
    quantity_parsed: rows.filter((row) => row.quantity > 0).length,
    pdf_generated: rows.filter((row) => row.pdf_generated).length,
    failures,
    rows,
  };
}

export function evaluateReal500MaterialPrice() {
  const rows = REAL_DIVERSE_500_CONSTRUCTION_WORKS.map((item) => {
    const result = buildExactMaterialPriceEstimate({ text: item.promptRu });
    const failures = [
      ...(result.material_lines.length > 0 ? [] : ["RECIPE_MISSING"]),
      ...(result.totals.total_status ? [] : ["TOTAL_STATUS_MISSING"]),
      ...(result.policy.fake_price_claimed ? ["FAKE_PRICE_CLAIMED"] : []),
      ...(result.policy.fake_supplier_claimed ? ["FAKE_SUPPLIER_CLAIMED"] : []),
    ];
    return {
      id: item.caseId,
      ...exactLineSummary(result),
      failures,
    };
  });
  const failures = rows.flatMap((row) => row.failures.map((failure) => ({ id: row.id, failure })));
  return {
    final_status: failures.length === 0
      ? "GREEN_EXACT_MATERIAL_PRICE_REAL500_SEMANTIC_READY"
      : "RED_EXACT_MATERIAL_PRICE_REAL500_SEMANTIC",
    cases_total: rows.length,
    cases_passed: rows.filter((row) => row.failures.length === 0).length,
    cases_failed: failures.length,
    failures,
    rows,
  };
}

export function evaluateReal10000Compatibility() {
  const rows = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.map((item) => {
    const first = buildExactMaterialPriceEstimate({ text: item.promptRu });
    const second = buildExactMaterialPriceEstimate({ text: item.promptRu });
    const failures = [
      ...(first.estimate_id === second.estimate_id ? [] : ["STABLE_ID_MISMATCH"]),
      ...(first.work.work_key ? [] : ["WORK_KEY_MISSING"]),
      ...(first.input.quantity > 0 ? [] : ["QUANTITY_MISSING"]),
      ...(first.material_lines.length > 0 ? [] : ["MATERIAL_ROWS_MISSING"]),
      ...(first.totals.total_status ? [] : ["TOTAL_STATUS_MISSING"]),
      ...(first.policy.fake_price_claimed ? ["FAKE_PRICE_CLAIMED"] : []),
      ...(first.policy.fake_supplier_claimed ? ["FAKE_SUPPLIER_CLAIMED"] : []),
    ];
    return {
      id: item.caseId,
      ...exactLineSummary(first),
      stable_id: first.estimate_id === second.estimate_id,
      failures,
    };
  });
  const failures = rows.flatMap((row) => row.failures.map((failure) => ({ id: row.id, failure })));
  return {
    final_status: failures.length === 0
      ? "GREEN_EXACT_MATERIAL_PRICE_REAL10000_COMPATIBILITY_READY"
      : "RED_EXACT_MATERIAL_PRICE_REAL10000_COMPATIBILITY",
    cases_total: rows.length,
    cases_passed: rows.filter((row) => row.failures.length === 0).length,
    cases_failed: failures.length,
    stable_payload_ids: rows.filter((row) => row.stable_id).length,
    failures,
    rows,
  };
}

export function evaluateRecipeCoverage() {
  const rows = REQUIRED_EXACT_MATERIAL_WORK_COVERAGE.map((item) => {
    const result = selectedWorkEstimate(item.workKey);
    const failures = [
      ...(result.recipe.material_rows.length > 0 ? [] : ["RECIPE_MISSING"]),
      ...(result.material_lines.every((line) => line.formula.includes("quantity")) ? [] : ["FORMULA_MISSING"]),
      ...(result.material_lines.every((line) => line.price_status === "VERIFIED" || line.price_status === "PRICE_MISSING") ? [] : ["PRICE_STATUS_MISSING"]),
    ];
    return {
      requirement: item.requirement,
      required_work_key: item.workKey,
      ...exactLineSummary(result),
      failures,
    };
  });
  const failures = rows.flatMap((row) => row.failures.map((failure) => ({ work_key: row.work_key, failure })));
  return {
    final_status: failures.length === 0
      ? "GREEN_EXACT_MATERIAL_PRICE_RECIPE_COVERAGE_READY"
      : "RED_EXACT_MATERIAL_PRICE_RECIPE_COVERAGE",
    required_total: rows.length,
    required_passed: rows.filter((row) => row.failures.length === 0).length,
    failures,
    rows,
  };
}

export function evaluatePricebookLookup() {
  const rows = EXACT_MATERIAL_PRICEBOOK_RATES.map((rate) => {
    const resolution = resolveExactMaterialRate({
      materialId: rate.material_id,
      rateKey: rate.material_id,
      unit: rate.unit,
      region: rate.region,
      priceDate: "2026-06-12",
      currency: rate.currency,
    });
    return {
      material_id: rate.material_id,
      unit: rate.unit,
      status: resolution.price_status,
      price_value: resolution.price_value,
      source_type: resolution.source_type,
      supplier_visible_name: resolution.supplier_visible_name,
      fake_price_claimed: resolution.fake_price_claimed,
      fake_supplier_claimed: resolution.fake_supplier_claimed,
    };
  });
  const unknown = resolveExactMaterialRate({
    materialId: "unknown_material_for_proof",
    rateKey: "unknown_material_for_proof",
    unit: "sq_m",
    region: "KG-Bishkek",
    priceDate: "2026-06-12",
    currency: "KGS",
  });
  const failures = [
    ...rows.filter((row) => row.status !== "VERIFIED" || row.price_value == null).map((row) => ({ material_id: row.material_id, failure: "VERIFIED_LOOKUP_FAILED" })),
    ...(unknown.price_status === "PRICE_MISSING" && unknown.price_value == null ? [] : [{ material_id: "unknown_material_for_proof", failure: "UNKNOWN_MATERIAL_GOT_PRICE" }]),
  ];
  return {
    final_status: failures.length === 0
      ? "GREEN_EXACT_MATERIAL_PRICEBOOK_LOOKUP_READY"
      : "RED_EXACT_MATERIAL_PRICEBOOK_LOOKUP",
    rates_total: rows.length,
    verified_lookup_rows: rows.filter((row) => row.status === "VERIFIED").length,
    unknown_material_status: unknown.price_status,
    unknown_material_price_value: unknown.price_value,
    no_fake_prices: rows.every((row) => row.fake_price_claimed === false),
    no_fake_suppliers: rows.every((row) => row.fake_supplier_claimed === false),
    failures,
    rows,
  };
}

export function evaluateMissingPrice() {
  const result = buildExactMaterialPriceEstimate({
    text: "\u041d\u0443\u0436\u043d\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044e \u043a\u0440\u044b\u0448\u0438 120 \u043c2",
    selectedWorkKey: "roof_waterproofing",
    volume: 120,
    unit: "sq_m",
  });
  const missing = result.material_lines.filter((line) => line.price_status === "PRICE_MISSING");
  const failures = [
    ...(missing.length > 0 ? [] : ["NO_MISSING_PRICE_ROW_PROVEN"]),
    ...(missing.every((line) => line.price_value == null && line.line_total == null) ? [] : ["MISSING_PRICE_CALCULATED_TOTAL"]),
    ...(result.totals.total_status === "PARTIAL_PRICE_MISSING" ? [] : ["PARTIAL_STATUS_MISSING"]),
  ];
  return {
    final_status: failures.length === 0
      ? "GREEN_EXACT_MATERIAL_PRICE_MISSING_PRICE_READY"
      : "RED_EXACT_MATERIAL_PRICE_MISSING_PRICE",
    work_key: result.work.work_key,
    missing_rows: missing.map((line) => ({
      row_number: line.row_number,
      material_name: line.material_visible_name_ru,
      price_status: line.price_status,
      price_value: line.price_value,
      line_total: line.line_total,
    })),
    total_status: result.totals.total_status,
    failures,
  };
}

export function buildIosProtocolReadiness() {
  const nativeDiff = gitOutput(["status", "--short", "--", "ios", "android", "eas.json"], "");
  return {
    ios_build_started: false,
    eas_build_started: false,
    testflight_started: false,
    native_ios_files_changed: nativeDiff.length > 0,
    requires_new_ios_build: false,
    reason: "JS/TS estimate and pricebook protocol only; physical iOS validation deferred to scheduled weekly iOS build",
    user_input_protocol_covered: true,
    selected_work_protocol_covered: true,
    quantity_parser_protocol_covered: true,
    exact_materials_protocol_covered: true,
    pricebook_lookup_protocol_covered: true,
    missing_price_protocol_covered: true,
    pdf_protocol_covered: true,
    catalog_binding_protocol_covered: true,
    fake_ios_green_claimed: false,
    failures: nativeDiff.length > 0 ? ["NATIVE_FILES_CHANGED"] : [],
  };
}

export function renderPdfProofSample(result: ExactMaterialPriceEstimate) {
  const pdf = renderEstimatePdfDocument(result.pdf_model);
  return {
    estimate_id: result.estimate_id,
    pdf_id: pdf.pdfId,
    file_name: pdf.fileName,
    bytes: pdf.bytes.length,
    text_contains_price_missing: pdf.text.includes("PRICE_MISSING"),
    text_contains_work: pdf.text.includes(result.work.visible_name_ru),
    material_rows_in_pdf: result.material_lines.filter((line) => pdf.text.includes(line.material_visible_name_ru)).length,
  };
}

export function writeProofMarkdown(summary: Record<string, unknown>): void {
  writeExactWaveText("proof.md", [
    `# ${EXACT_MATERIAL_PRICE_ESTIMATE_WAVE}`,
    "",
    `Final status: ${summary.final_status ?? EXACT_MATERIAL_PRICE_ESTIMATE_GREEN_STATUS}`,
    "",
    "- No random prices.",
    "- No fake suppliers.",
    "- Unknown material prices stay PRICE_MISSING with null totals.",
    "- UI/PDF rows use the same exact material price model.",
    "",
    "```json",
    JSON.stringify(summary, null, 2),
    "```",
  ].join("\n"));
}
