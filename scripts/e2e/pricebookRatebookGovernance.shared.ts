import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  buildExactMaterialPriceEstimate,
  EXACT_MATERIAL_PRICEBOOK_DATE,
  EXACT_MATERIAL_PRICEBOOK_RATES,
  EXACT_MATERIAL_PRICEBOOK_REGION,
  EXACT_MATERIAL_PRICEBOOK_SOURCE_REFERENCE,
  resolveExactMaterialRate,
  type ExactMaterialPriceEstimate,
  type PricebookMaterialRate,
} from "../../src/lib/ai/exactMaterialPriceEstimate";
import {
  parsePricebookRatebookCsv,
  PRICEBOOK_RATEBOOK_GOVERNANCE_GREEN_STATUS,
  PRICEBOOK_RATEBOOK_GOVERNANCE_WAVE,
  resolveGovernedRatebookPrice,
  validatePricebookRatebookEntry,
  validatePricebookRatebookImport,
  type PricebookRatebookImportRawRow,
} from "../../src/lib/ai/pricebookRatebookGovernance";
import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";
import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import { renderEstimatePdfDocument } from "../../src/lib/estimatePdf";
import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "./selectedWorkEnterprise1000Cases";

export const PRICEBOOK_WAVE_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_PRICEBOOK_RATEBOOK_GOVERNANCE_IMPORT_VALIDATION",
);

export { PRICEBOOK_RATEBOOK_GOVERNANCE_GREEN_STATUS, PRICEBOOK_RATEBOOK_GOVERNANCE_WAVE };

export type PricebookWaveJson = Record<string, unknown>;

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

export function withPricebookWaveLineage<T extends PricebookWaveJson>(value: T): T & {
  wave: string;
  source_code_head: string;
  current_head_at_write_time: string;
  fake_green_claimed: false;
} {
  return {
    wave: PRICEBOOK_RATEBOOK_GOVERNANCE_WAVE,
    ...value,
    source_code_head: sourceCodeHead(),
    current_head_at_write_time: sourceCodeHead(),
    fake_green_claimed: false,
  };
}

export function writePricebookWaveJson(name: string, value: PricebookWaveJson): void {
  const filePath = path.join(PRICEBOOK_WAVE_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(withPricebookWaveLineage(value), null, 2)}\n`, "utf8");
}

export function readPricebookWaveJson<T = PricebookWaveJson>(name: string): T | null {
  const filePath = path.join(PRICEBOOK_WAVE_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function writePricebookWaveText(name: string, value: string): void {
  const filePath = path.join(PRICEBOOK_WAVE_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function roofEstimate(): ExactMaterialPriceEstimate {
  return buildExactMaterialPriceEstimate({
    text: "\u041d\u0443\u0436\u043d\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044e \u043a\u0440\u044b\u0448\u0438 120 \u043c2",
    selectedWorkKey: "roof_waterproofing",
    volume: 120,
    unit: "sq_m",
  });
}

function importRow(overrides: PricebookRatebookImportRawRow = {}): PricebookRatebookImportRawRow {
  return {
    material_id: "governed_import_material",
    material_visible_name_ru: "Governed import material",
    category: "waterproofing",
    unit: "sq_m",
    visible_unit_ru: "m2",
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

function baseRate(overrides: Partial<PricebookMaterialRate> = {}): PricebookMaterialRate {
  const base = EXACT_MATERIAL_PRICEBOOK_RATES.find((rate) => rate.material_id === "dynamic_universal_waterproofing")
    ?? EXACT_MATERIAL_PRICEBOOK_RATES[0];
  if (!base) throw new Error("PRICEBOOK_BASE_RATE_MISSING");
  return {
    ...base,
    material_id: "governed_script_material",
    rate_key_aliases: ["governed_script_material"],
    source_reference: EXACT_MATERIAL_PRICEBOOK_SOURCE_REFERENCE,
    confidence: 0.78,
    ...overrides,
  };
}

export function runPricebookRatebookGovernanceAcceptanceProof() {
  const seededValidations = EXACT_MATERIAL_PRICEBOOK_RATES.map((rate, index) => ({
    index,
    material_id: rate.material_id,
    supplier_id: rate.supplier_id,
    source_reference: rate.source_reference,
    blockers: validatePricebookRatebookEntry(rate, { asOfDate: EXACT_MATERIAL_PRICEBOOK_DATE }).blockers.map((item) => item.code),
  }));
  const direct = resolveExactMaterialRate({
    materialId: "dynamic_universal_waterproofing",
    rateKey: "dynamic_universal_waterproofing",
    unit: "sq_m",
    region: EXACT_MATERIAL_PRICEBOOK_REGION,
    priceDate: EXACT_MATERIAL_PRICEBOOK_DATE,
    currency: "KGS",
  });
  const missing = resolveExactMaterialRate({
    materialId: "unknown_material_for_pricebook_governance",
    rateKey: "unknown_material_for_pricebook_governance",
    unit: "sq_m",
    region: EXACT_MATERIAL_PRICEBOOK_REGION,
    priceDate: EXACT_MATERIAL_PRICEBOOK_DATE,
    currency: "KGS",
  });
  const failures = [
    ...seededValidations.flatMap((row) => row.blockers.map((blocker) => `${row.material_id}:${blocker}`)),
    ...(direct.price_status === "VERIFIED" && direct.price_value === 545 ? [] : ["VERIFIED_LOOKUP_FAILED"]),
    ...(direct.price_source_audit?.supplier_id ? [] : ["SUPPLIER_AUDIT_MISSING"]),
    ...(missing.price_status === "PRICE_MISSING" && missing.price_value == null ? [] : ["MISSING_PRICE_NOT_HONEST"]),
    ...(JSON.stringify([direct, missing]).match(/\b(?:fake|mock|demo|random)\s+(?:price|supplier|catalog)\b/i) ? ["FAKE_TEXT_FOUND"] : []),
  ];
  const result = {
    final_status: failures.length === 0
      ? "GREEN_PRICEBOOK_RATEBOOK_GOVERNANCE_ACCEPTANCE_READY"
      : "RED_PRICEBOOK_RATEBOOK_GOVERNANCE_ACCEPTANCE",
    seeded_rates_total: EXACT_MATERIAL_PRICEBOOK_RATES.length,
    seeded_rates_with_source: seededValidations.filter((row) => row.source_reference).length,
    seeded_rates_with_supplier: seededValidations.filter((row) => row.supplier_id).length,
    direct_verified_status: direct.price_status,
    direct_verified_price: direct.price_value,
    missing_status: missing.price_status,
    random_prices_allowed: false,
    fake_suppliers_allowed: false,
    failures,
  };
  writePricebookWaveJson("governance_acceptance_results.json", result);
  return result;
}

export function runPricebookRatebookImportValidationProof() {
  const csv = [
    "material_id,material_visible_name_ru,category,unit,visible_unit_ru,price_value,currency,price_status,supplier_id,supplier_visible_name,region,captured_at,valid_from,valid_to,source_type,source_reference,confidence",
    "csv_material,Csv material,waterproofing,sq_m,m2,777,KGS,VERIFIED,csv_supplier,Csv supplier verified source,KG-Bishkek,2026-06-12T00:00:00+06:00,2026-06-01,2026-06-30,imported_csv,csv-import-2026-06,0.74",
  ].join("\n");
  const csvPreview = validatePricebookRatebookImport({
    format: "csv",
    rows: parsePricebookRatebookCsv(csv),
    asOfDate: EXACT_MATERIAL_PRICEBOOK_DATE,
  });
  const supplierPreview = validatePricebookRatebookImport({
    format: "supplier_catalog",
    rows: [importRow()],
    asOfDate: EXACT_MATERIAL_PRICEBOOK_DATE,
  });
  const invalidPreview = validatePricebookRatebookImport({
    format: "csv",
    rows: [
      importRow({ supplier_id: "", supplier_visible_name: "" }),
      importRow({ source_reference: "" }),
      importRow({ price_value: 0 }),
    ],
    asOfDate: EXACT_MATERIAL_PRICEBOOK_DATE,
  });
  const failures = [
    ...(csvPreview.accepted_rows === 1 ? [] : ["CSV_IMPORT_NOT_ACCEPTED"]),
    ...(supplierPreview.accepted_rows === 1 ? [] : ["SUPPLIER_IMPORT_NOT_ACCEPTED"]),
    ...(invalidPreview.blocked_rows === 3 ? [] : ["INVALID_IMPORT_NOT_BLOCKED"]),
  ];
  const result = {
    final_status: failures.length === 0
      ? "GREEN_PRICEBOOK_RATEBOOK_IMPORT_VALIDATION_READY"
      : "RED_PRICEBOOK_RATEBOOK_IMPORT_VALIDATION",
    csv_preview: csvPreview,
    supplier_preview: supplierPreview,
    invalid_preview: invalidPreview,
    dry_run_only: true,
    will_write_to_db: false,
    failures,
  };
  writePricebookWaveJson("import_validation_results.json", result);
  return result;
}

export function runPricebookEstimateIntegrationProof() {
  const estimate = roofEstimate();
  const mismatches = estimate.material_lines.flatMap((line) => {
    const direct = resolveExactMaterialRate({
      materialId: line.material_id,
      rateKey: line.source_rate_key,
      unit: line.unit,
      region: line.region,
      priceDate: line.price_source_audit.price_date,
      currency: line.currency,
    });
    return line.price_status === direct.price_status
      && line.price_value === direct.price_value
      && line.source_reference === direct.source_reference
      ? []
      : [`${line.row_number}:${line.material_id}`];
  });
  const real500Failures = REAL_DIVERSE_500_CONSTRUCTION_WORKS.flatMap((item) => {
    const result = buildExactMaterialPriceEstimate({ text: item.promptRu });
    return result.material_lines.length > 0 && !result.policy.fake_price_claimed && !result.policy.fake_supplier_claimed
      ? []
      : [item.caseId];
  });
  const selected1000Failures = SELECTED_WORK_ENTERPRISE_1000_CASES.flatMap((item) => {
    const result = buildExactMaterialPriceEstimate({
      text: item.rawEstimateInput,
      selectedWorkKey: item.selectedWorkKey,
      volume: item.volume,
      unit: item.unit,
    });
    return result.work.work_key === item.selectedWorkKey && result.material_lines.length > 0 ? [] : [item.id];
  });
  const real10000Failures = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.flatMap((item) => {
    const result = buildExactMaterialPriceEstimate({ text: item.promptRu });
    if (!result.estimate_id || result.material_lines.length === 0) return [item.caseId];
    if (result.material_lines.some((line) => line.price_value === 0)) return [`${item.caseId}:ZERO_PRICE`];
    if (result.policy.fake_price_claimed || result.policy.fake_supplier_claimed) return [`${item.caseId}:FAKE_CLAIM`];
    return [];
  });
  const failures = [
    ...mismatches.map((id) => `PRICEBOOK_LOOKUP_MISMATCH:${id}`),
    ...real500Failures.map((id) => `REAL500_FAILED:${id}`),
    ...selected1000Failures.map((id) => `REAL1000_FAILED:${id}`),
    ...real10000Failures.map((id) => `REAL10000_FAILED:${id}`),
  ];
  const result = {
    final_status: failures.length === 0
      ? "GREEN_PRICEBOOK_ESTIMATE_INTEGRATION_READY"
      : "RED_PRICEBOOK_ESTIMATE_INTEGRATION",
    estimate_id: estimate.estimate_id,
    work_key: estimate.work.work_key,
    material_rows: estimate.material_lines.length,
    verified_rows: estimate.material_lines.filter((line) => line.price_status === "VERIFIED").length,
    non_verified_rows: estimate.material_lines.filter((line) => line.price_status !== "VERIFIED").length,
    real500_cases: REAL_DIVERSE_500_CONSTRUCTION_WORKS.length,
    selected1000_cases: SELECTED_WORK_ENTERPRISE_1000_CASES.length,
    real10000_cases: REAL_DIVERSE_10000_CONSTRUCTION_WORKS.length,
    fake_price_claimed: false,
    fake_supplier_claimed: false,
    failures,
  };
  writePricebookWaveJson("estimate_integration_results.json", result);
  return result;
}

export function runPricebookUiPdfParityProof() {
  const estimate = roofEstimate();
  const pdf = renderEstimatePdfDocument(estimate.pdf_model);
  const rowMismatches = estimate.ui_model.rows.flatMap((row) => {
    const pdfRow = estimate.pdf_model.sections[0]?.rows.find((item) => item.rowNumber === row.row_number);
    return pdfRow?.sourceLabels?.[0] === row.source_label ? [] : [row.row_number];
  });
  const failures = [
    ...(pdf.bytes.length > 1000 ? [] : ["PDF_BYTES_TOO_SMALL"]),
    ...(pdf.text.includes("seeded ratebook") || pdf.text.includes("PRICE_MISSING") ? [] : ["PDF_SOURCE_TEXT_MISSING"]),
    ...rowMismatches.map((rowNumber) => `PDF_UI_SOURCE_MISMATCH:${rowNumber}`),
  ];
  const result = {
    final_status: failures.length === 0
      ? "GREEN_PRICEBOOK_UI_PDF_PARITY_READY"
      : "RED_PRICEBOOK_UI_PDF_PARITY",
    estimate_id: estimate.estimate_id,
    pdf_id: pdf.pdfId,
    pdf_bytes: pdf.bytes.length,
    ui_rows: estimate.ui_model.rows.length,
    pdf_rows: estimate.pdf_model.sections[0]?.rows.length ?? 0,
    source_labels_match: rowMismatches.length === 0,
    rendered_text_contains_source_status: pdf.text.includes("seeded ratebook") || pdf.text.includes("PRICE_MISSING"),
    failures,
  };
  writePricebookWaveJson("ui_pdf_parity_results.json", result);
  return result;
}

export function runPricebookReal10000CompatibilityProof() {
  const failures: string[] = [];
  for (const item of REAL_DIVERSE_10000_CONSTRUCTION_WORKS) {
    const result = buildExactMaterialPriceEstimate({ text: item.promptRu });
    if (!result.estimate_id || result.material_lines.length === 0) failures.push(item.caseId);
    if (result.material_lines.some((line) => line.price_value === 0)) failures.push(`${item.caseId}:ZERO_PRICE`);
    if (result.policy.fake_price_claimed || result.policy.fake_supplier_claimed) failures.push(`${item.caseId}:FAKE_CLAIM`);
  }
  const result = {
    final_status: failures.length === 0
      ? "GREEN_PRICEBOOK_REAL10000_COMPATIBILITY_READY"
      : "RED_PRICEBOOK_REAL10000_COMPATIBILITY",
    cases_total: REAL_DIVERSE_10000_CONSTRUCTION_WORKS.length,
    cases_passed: REAL_DIVERSE_10000_CONSTRUCTION_WORKS.length - failures.length,
    cases_failed: failures.length,
    failures,
  };
  writePricebookWaveJson("real10000_compatibility_results.json", result);
  return result;
}

export function runPricebookRatebookGovernanceCloseout() {
  const required = [
    ["governance_acceptance_results.json", "GREEN_PRICEBOOK_RATEBOOK_GOVERNANCE_ACCEPTANCE_READY"],
    ["import_validation_results.json", "GREEN_PRICEBOOK_RATEBOOK_IMPORT_VALIDATION_READY"],
    ["estimate_integration_results.json", "GREEN_PRICEBOOK_ESTIMATE_INTEGRATION_READY"],
    ["ui_pdf_parity_results.json", "GREEN_PRICEBOOK_UI_PDF_PARITY_READY"],
    ["android_api34_results.json", "GREEN_ANDROID_API34_PRICEBOOK_RATEBOOK_GOVERNANCE_READY"],
  ] as const;
  const rows = required.map(([file, expectedStatus]) => {
    const artifact = readPricebookWaveJson(file) as { final_status?: string } | null;
    return {
      file,
      expected_status: expectedStatus,
      actual_status: artifact?.final_status ?? null,
      passed: artifact?.final_status === expectedStatus,
    };
  });
  const requiredSourceFiles = [
    "src/lib/ai/pricebookRatebookGovernance/pricebookRatebookGovernance.ts",
    "src/lib/ai/pricebookRatebookGovernance/index.ts",
    "src/lib/ai/exactMaterialPriceEstimate/exactMaterialPricebook.ts",
    "src/lib/ai/exactMaterialPriceEstimate/buildExactMaterialPriceEstimate.ts",
  ];
  const requiredScripts = [
    "scripts/e2e/runPricebookRatebookGovernanceAcceptance.ts",
    "scripts/e2e/runPricebookRatebookImportValidationProof.ts",
    "scripts/e2e/runPricebookEstimateIntegrationProof.ts",
    "scripts/e2e/runPricebookUiPdfParityProof.ts",
    "scripts/e2e/runAndroidApi34PricebookRatebookGovernanceSmoke.ts",
    "scripts/e2e/runPricebookRatebookGovernanceCloseout.ts",
  ];
  const requiredTests = [
    "tests/pricebook/ratebookSchema.contract.test.ts",
    "tests/pricebook/ratebookImportValidation.contract.test.ts",
    "tests/pricebook/verifiedPriceLookup.contract.test.ts",
    "tests/pricebook/regionAwarePriceSelection.contract.test.ts",
    "tests/pricebook/stalePricePolicy.contract.test.ts",
    "tests/pricebook/conflictingPrices.contract.test.ts",
    "tests/pricebook/missingPriceHonestStatus.contract.test.ts",
    "tests/pricebook/noRandomFallbackPrices.contract.test.ts",
    "tests/pricebook/noFakeSuppliers.contract.test.ts",
    "tests/pricebook/noZeroAsFakeKnownPrice.contract.test.ts",
    "tests/pricebook/priceSourceAuditTrail.contract.test.ts",
    "tests/pricebook/estimateBuilderUsesPricebookOnly.contract.test.ts",
    "tests/pricebook/uiPdfPriceSourceParity.contract.test.ts",
    "tests/pricebook/real500PricebookSemantic.contract.test.ts",
    "tests/pricebook/real1000PricebookAcceptance.contract.test.ts",
    "tests/pricebook/real10000PricebookCompatibility.contract.test.ts",
    "tests/pricebook/iosProtocolReadiness.contract.test.ts",
  ];
  const missingFiles = [...requiredSourceFiles, ...requiredScripts, ...requiredTests]
    .filter((filePath) => !fs.existsSync(path.join(process.cwd(), filePath)));
  const failures = [
    ...rows.filter((row) => !row.passed).map((row) => `${row.file}:${row.actual_status ?? "missing"}`),
    ...missingFiles.map((filePath) => `MISSING_FILE:${filePath}`),
  ];
  const result = {
    final_status: failures.length === 0
      ? PRICEBOOK_RATEBOOK_GOVERNANCE_GREEN_STATUS
      : "RED_PRICEBOOK_RATEBOOK_GOVERNANCE_IMPORT_VALIDATION_CLOSEOUT",
    artifacts: rows,
    required_source_files: requiredSourceFiles,
    required_scripts: requiredScripts,
    required_tests: requiredTests,
    missing_files: missingFiles,
    git_status_short: gitOutput(["status", "--short", "--untracked-files=all"], ""),
    local_head: sourceCodeHead(),
    origin_head: gitOutput(["rev-parse", "origin/enterprise/catalog-work-platform-additive-ontology"], "unknown"),
    fake_price_claimed: false,
    fake_supplier_claimed: false,
    failures,
  };
  writePricebookWaveJson("closeout_results.json", result);
  writePricebookWaveText("proof.md", [
    `# ${PRICEBOOK_RATEBOOK_GOVERNANCE_WAVE}`,
    "",
    `Final status: ${result.final_status}`,
    "",
    "- Verified prices require governed source and supplier identity.",
    "- Missing, stale, zero, and conflicting prices do not calculate totals.",
    "- Import validation is dry-run only and requires approval outside this proof.",
    "- UI/PDF rows share the same source labels from the exact estimate model.",
    "",
    "```json",
    JSON.stringify(result, null, 2),
    "```",
  ].join("\n"));
  return result;
}

export function assertGreen(result: { final_status?: unknown }, expected: string): void {
  console.log(result.final_status);
  if (result.final_status !== expected) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  }
}
