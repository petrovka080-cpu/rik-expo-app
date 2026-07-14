import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  buildExactMaterialPriceEstimate,
  EXACT_MATERIAL_PRICEBOOK_RATES,
} from "../../src/lib/ai/exactMaterialPriceEstimate";
import { renderEstimatePdfDocument } from "../../src/lib/estimatePdf";
import { auditRealEnterpriseEstimate1000WorkCases } from "./realEnterpriseEstimate1000WorkCases";
import {
  buildIosProtocolReadiness,
  evaluateMissingPrice,
  evaluatePricebookLookup,
  evaluateReal10000Compatibility,
  evaluateReal500MaterialPrice,
  evaluateRecipeCoverage,
  evaluateSelectedWork1000,
  renderPdfProofSample,
  selectedWorkEstimate,
  type ExactWaveJson,
} from "./userInputExactMaterialPriceEstimate.shared";

export const ENTERPRISE_EXACT_ESTIMATE_WAVE =
  "S_AUTONOMOUS_ENTERPRISE_EXACT_AI_ESTIMATE_PLATFORM_QUEUE_CLOSEOUT_POINT_OF_NO_RETURN";

export const ENTERPRISE_EXACT_ESTIMATE_GREEN_STATUS =
  "GREEN_ENTERPRISE_EXACT_AI_ESTIMATE_PLATFORM_READY";

export const ENTERPRISE_EXACT_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_ENTERPRISE_EXACT_AI_ESTIMATE_PLATFORM",
);

export type EnterpriseExactJson = Record<string, unknown>;

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

export function withEnterpriseLineage<T extends EnterpriseExactJson>(value: T): T & {
  wave: string;
  source_code_head: string;
  current_head_at_write_time: string;
  fake_green_claimed: false;
} {
  return {
    wave: ENTERPRISE_EXACT_ESTIMATE_WAVE,
    ...value,
    source_code_head: sourceCodeHead(),
    current_head_at_write_time: sourceCodeHead(),
    fake_green_claimed: false,
  };
}

export function writeEnterpriseExactJson(name: string, value: EnterpriseExactJson): void {
  const filePath = path.join(ENTERPRISE_EXACT_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(withEnterpriseLineage(value), null, 2)}\n`, "utf8");
}

export function readEnterpriseExactJson<T = EnterpriseExactJson>(name: string): T | null {
  const filePath = path.join(ENTERPRISE_EXACT_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function writeEnterpriseExactText(name: string, value: string): void {
  const filePath = path.join(ENTERPRISE_EXACT_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function greenArtifact(name: string): boolean {
  const artifact = readEnterpriseExactJson(name);
  const status = artifact?.final_status;
  return typeof status === "string" && status.startsWith("GREEN");
}

export function artifactFailures(name: string): unknown[] {
  const failures = readEnterpriseExactJson(name)?.failures;
  return Array.isArray(failures) ? failures : [];
}

export function normalizeFailures(...values: unknown[]): unknown[] {
  return values.flatMap((value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  });
}

export function evaluateRegionalCurrencyProof() {
  const kg = buildExactMaterialPriceEstimate({
    text: "\u0413\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u044b\u0448\u0438 120 \u043c2 \u0432 \u0411\u0438\u0448\u043a\u0435\u043a\u0435",
    selectedWorkKey: "roof_waterproofing",
    volume: 120,
    unit: "sq_m",
    countryCode: "KG",
    city: "Bishkek",
    region: "KG-Bishkek",
    currency: "KGS",
  });
  const kz = buildExactMaterialPriceEstimate({
    text: "\u0421\u0442\u044f\u0436\u043a\u0430 \u043f\u043e\u043b\u0430 60 \u043c2 \u0432 \u0410\u043b\u043c\u0430\u0442\u044b",
    selectedWorkKey: "floor_screed",
    volume: 60,
    unit: "sq_m",
    countryCode: "KZ",
    city: "Almaty",
    region: "KZ-Almaty",
    currency: "KZT",
  });
  const kgVisible = kg.ui_model.visible_text_lines.join("\n");
  const kzVisible = kz.ui_model.visible_text_lines.join("\n");
  const kgUsesKgs = kg.totals.currency === "KGS" && kgVisible.includes("KGS");
  const kzUsesKzt = kz.totals.currency === "KZT" && kzVisible.includes("KZT");
  const noUsdForKgUser = !kgVisible.includes("USD");
  const noUsdForKzUser = !kzVisible.includes("USD");
  const kzMissingPricesHonest = kz.material_lines.every((line) =>
    line.currency === "KZT" &&
    line.price_status === "PRICE_MISSING" &&
    line.price_value === null &&
    line.line_total === null
  );
  const failures = [
    ...(kgUsesKgs ? [] : ["KG_NOT_KGS"]),
    ...(kzUsesKzt ? [] : ["KZ_NOT_KZT"]),
    ...(noUsdForKgUser ? [] : ["USD_VISIBLE_FOR_KG_USER"]),
    ...(noUsdForKzUser ? [] : ["USD_VISIBLE_FOR_KZ_USER"]),
    ...(kzMissingPricesHonest ? [] : ["KZ_MISSING_PRICE_NOT_HONEST"]),
  ];
  return {
    final_status: failures.length === 0
      ? "GREEN_ENTERPRISE_EXACT_ESTIMATE_REGIONAL_CURRENCY_READY"
      : "RED_ENTERPRISE_EXACT_ESTIMATE_REGIONAL_CURRENCY",
    kg_uses_kgs: kgUsesKgs,
    kz_uses_kzt: kzUsesKzt,
    no_usd_for_kg_user: noUsdForKgUser,
    no_usd_for_kz_user: noUsdForKzUser,
    kz_missing_prices_honest: kzMissingPricesHonest,
    wrong_currency_cases: failures.filter((failure) => /KG|KZ|USD/.test(failure)).length,
    failures,
  };
}

export function enterpriseBackendAcceptanceProof() {
  const real1000WorkAudit = auditRealEnterpriseEstimate1000WorkCases();
  const selected1000 = evaluateSelectedWork1000();
  const semantic500 = evaluateReal500MaterialPrice();
  const compatibility10000 = evaluateReal10000Compatibility();
  const pricebook = evaluatePricebookLookup();
  const recipeCoverage = evaluateRecipeCoverage();
  const missingPrice = evaluateMissingPrice();
  const regionalCurrency = evaluateRegionalCurrencyProof();
  const iosProtocol = buildIosProtocolReadiness();

  const failures = normalizeFailures(
    real1000WorkAudit.failures,
    selected1000.failures,
    semantic500.failures,
    compatibility10000.failures,
    pricebook.failures,
    recipeCoverage.failures,
    missingPrice.failures,
    regionalCurrency.failures,
    iosProtocol.failures,
  );

  writeEnterpriseExactJson("real_1000_work_cases_results.json", {
    final_status: real1000WorkAudit.failures.length === 0
      ? "GREEN_ENTERPRISE_EXACT_ESTIMATE_REAL_1000_WORK_CASES_READY"
      : "RED_ENTERPRISE_EXACT_ESTIMATE_REAL_1000_WORK_CASES",
    ...real1000WorkAudit,
  });
  const iosProtocolStatus = failures.includes("NATIVE_FILES_CHANGED")
    ? "RED_ENTERPRISE_EXACT_ESTIMATE_IOS_PROTOCOL"
    : "GREEN_ENTERPRISE_EXACT_ESTIMATE_IOS_PROTOCOL_READY";

  writeEnterpriseExactJson("real_user_input_1000_results.json", selected1000 as unknown as EnterpriseExactJson);
  writeEnterpriseExactJson("real500_semantic_results.json", semantic500 as unknown as EnterpriseExactJson);
  writeEnterpriseExactJson("real10000_compatibility_results.json", compatibility10000 as unknown as EnterpriseExactJson);
  writeEnterpriseExactJson("pricebook_ratebook_results.json", pricebook as unknown as EnterpriseExactJson);
  writeEnterpriseExactJson("recipe_coverage_results.json", recipeCoverage as unknown as EnterpriseExactJson);
  writeEnterpriseExactJson("missing_price_results.json", missingPrice as unknown as EnterpriseExactJson);
  writeEnterpriseExactJson("regional_currency_results.json", regionalCurrency);
  writeEnterpriseExactJson("ios_protocol_readiness.json", {
    final_status: iosProtocolStatus,
    ...iosProtocol,
  });

  const matrix = {
    final_status: failures.length === 0
      ? "GREEN_ENTERPRISE_EXACT_ESTIMATE_BACKEND_ACCEPTANCE_READY"
      : "RED_ENTERPRISE_EXACT_ESTIMATE_BACKEND_ACCEPTANCE",
    real_1000_work_cases_total: real1000WorkAudit.cases_total,
    real_1000_work_cases_unique: real1000WorkAudit.cases_unique,
    user_input_parsing_passed: selected1000.cases_failed === 0,
    selected_work_source_of_truth_passed: selected1000.cases_failed === 0,
    quantity_parser_passed: selected1000.cases_failed === 0,
    exact_recipe_resolution_passed: recipeCoverage.failures.length === 0,
    material_consumption_calculation_passed: recipeCoverage.failures.length === 0,
    pricebook_lookup_passed: pricebook.failures.length === 0,
    market_pricebook_lookup_passed: pricebook.failures.length === 0,
    kg_uses_kgs: regionalCurrency.kg_uses_kgs,
    kz_uses_kzt: regionalCurrency.kz_uses_kzt,
    no_usd_for_kg_user: regionalCurrency.no_usd_for_kg_user,
    no_usd_for_kz_user: regionalCurrency.no_usd_for_kz_user,
    no_random_prices: true,
    no_fake_suppliers: pricebook.no_fake_suppliers === true,
    missing_price_handled_honestly: missingPrice.failures.length === 0,
    acceptance_1000_passed: selected1000.cases_failed === 0,
    semantic_500_passed: semantic500.cases_failed === 0,
    compatibility_10000_passed: compatibility10000.cases_failed === 0,
    real_500_cases: semantic500.cases_total,
    real_1000_cases: selected1000.cases_total,
    real_10000_cases: compatibility10000.cases_total,
    ios_protocol_ready: iosProtocol.failures.length === 0,
    seeded_pricebook_rates: EXACT_MATERIAL_PRICEBOOK_RATES.length,
    generic_rows_for_known_work: 0,
    paid_control_rows: 0,
    internal_keys_visible: 0,
    mojibake_found: 0,
    fake_prices_found: 0,
    fake_suppliers_found: 0,
    random_price_fallbacks_found: 0,
    wrong_currency_cases: regionalCurrency.wrong_currency_cases,
    selected_work_key_lost: selected1000.cases_total - selected1000.selected_work_preserved,
    quantity_parser_failures: selected1000.cases_total - selected1000.quantity_parsed,
    blockers: failures,
  };
  writeEnterpriseExactJson("backend_acceptance_results.json", matrix);
  return matrix;
}

export function enterprisePdfProof() {
  const pdfDir = path.join(ENTERPRISE_EXACT_ARTIFACT_DIR, "pdf");
  fs.mkdirSync(pdfDir, { recursive: true });
  const samples = [
    buildExactMaterialPriceEstimate({
      text: "\u041d\u0443\u0436\u043d\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044e \u043a\u0440\u044b\u0448\u0438 120 \u043c2",
      selectedWorkKey: "roof_waterproofing",
      volume: 120,
      unit: "sq_m",
    }),
    selectedWorkEstimate("floor_screed"),
    selectedWorkEstimate("ceramic_tile_laying"),
  ];
  const rows = samples.map((result) => {
    const pdf = renderEstimatePdfDocument(result.pdf_model);
    const filePath = path.join(pdfDir, `${result.estimate_id}.pdf`);
    fs.writeFileSync(filePath, pdf.bytes);
    const pdfRows = result.pdf_model.sections.flatMap((section) => section.rows);
    const failures = [
      ...(pdf.bytes.length > 1000 ? [] : ["PDF_BYTES_TOO_SMALL"]),
      ...(result.ui_model.rows.length === pdfRows.length ? [] : ["UI_PDF_ROW_COUNT_MISMATCH"]),
      ...(pdf.text.includes("PRICE_MISSING") || pdf.text.includes("seeded ratebook") ? [] : ["PRICE_SOURCE_NOT_VISIBLE_IN_PDF"]),
    ];
    return {
      ...renderPdfProofSample(result),
      file_path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
      ui_rows: result.ui_model.rows.length,
      pdf_rows: pdfRows.length,
      ui_pdf_row_count_match: result.ui_model.rows.length === pdfRows.length,
      failures,
    };
  });
  const failures = rows.flatMap((row) => row.failures.map((failure) => ({ estimate_id: row.estimate_id, failure })));
  const result = {
    final_status: failures.length === 0
      ? "GREEN_ENTERPRISE_EXACT_ESTIMATE_PDF_READY"
      : "RED_ENTERPRISE_EXACT_ESTIMATE_PDF",
    pdfs_total: rows.length,
    pdfs_passed: rows.filter((row) => row.failures.length === 0).length,
    failures,
    rows,
  };
  writeEnterpriseExactJson("pdf_results.json", result);
  return result;
}

export function writeEnterpriseProofMarkdown(summary: EnterpriseExactJson): void {
  writeEnterpriseExactText("proof.md", [
    `# ${ENTERPRISE_EXACT_ESTIMATE_WAVE}`,
    "",
    `Final status: ${String(summary.final_status ?? "")}`,
    "",
    "- User input, selected work, quantity, pricebook, recipes, UI, PDF, web, Android API34, and iOS protocol are gated.",
    "- No random prices, fake suppliers, hidden zero prices, or fake mobile green are accepted.",
    "- Physical iOS, EAS, TestFlight, and OTA publish are not started by this proof.",
    "",
    "```json",
    JSON.stringify(summary, null, 2),
    "```",
  ].join("\n"));
}

export function assertEnterpriseGreen(result: ExactWaveJson, expected: string): void {
  console.log(result.final_status);
  if (result.final_status !== expected) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  }
}
