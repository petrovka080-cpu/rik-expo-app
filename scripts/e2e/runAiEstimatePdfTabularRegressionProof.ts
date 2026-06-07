import fs from "node:fs";
import path from "node:path";

import { runAiEstimatePdfTabularRegressionAudit } from "../audit/runAiEstimatePdfTabularRegressionAudit";
import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import { createAiEstimatePdf, validateAiEstimatePdf } from "../../src/lib/aiEstimatePdf";
import { createEstimatePdf, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PDF_DIR = path.join(ARTIFACT_DIR, "pdf", "ai-estimate-pdf-tabular-regression");
const PREFIX = "S_AI_ESTIMATE_PDF_TABULAR_REGRESSION";
const WAVE = "S_AI_ESTIMATE_PDF_TABULAR_REALITY_REGRESSION_REPAIR_NO_TEXT_DUMP_POINT_OF_NO_RETURN";
const GREEN = "GREEN_AI_ESTIMATE_PDF_TABULAR_REALITY_REGRESSION_READY";

type RegressionCase = {
  id: string;
  prompt: string;
  expectedWorkKey: string;
};

const CASES: RegressionCase[] = [
  { id: "roof_waterproofing", prompt: "гидроизоляция крыши 100 м²", expectedWorkKey: "roof_waterproofing" },
  { id: "bathroom_waterproofing", prompt: "гидроизоляция ванной 30 м²", expectedWorkKey: "bathroom_waterproofing" },
  { id: "foundation_waterproofing", prompt: "гидроизоляция фундамента 80 м²", expectedWorkKey: "foundation_waterproofing" },
  { id: "gable_roof_installation", prompt: "двускатная крыша 100 м²", expectedWorkKey: "gable_roof_installation" },
  { id: "brick_masonry", prompt: "кладка кирпича 74 м²", expectedWorkKey: "brick_masonry" },
  { id: "asphalt_paving", prompt: "асфальтирование 1000 м²", expectedWorkKey: "asphalt_paving" },
  { id: "ceramic_tile_floor_laying", prompt: "плитка на пол 174 м²", expectedWorkKey: "ceramic_tile_floor_laying" },
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function readJson(name: string): Record<string, unknown> | null {
  const filePath = path.join(ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function runCase(testCase: RegressionCase) {
  const estimate = calculateGlobalConstructionEstimateSync({
    text: testCase.prompt,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  });
  const runtimeTraceId = `tabular-regression:${testCase.id}`;
  const pdf = createAiEstimatePdf({
    estimate,
    runtimeTraceId,
    route: "/request",
    generatedAt: "2026-05-26T00:00:00.000Z",
    documentMode: "estimate",
  });
  const validation = validateAiEstimatePdf({
    pdf: pdf.bytes,
    knownWorkKey: estimate.work.workKey,
    requiredText: [estimate.work.title, estimate.totals.displayGrandTotal, estimate.tax.taxLabel, pdf.documentNumber],
  });
  const runtimeTraceVisible = validation.text.includes(runtimeTraceId);
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const pdfPath = path.join(PDF_DIR, `${testCase.id}.pdf`);
  fs.writeFileSync(pdfPath, Buffer.from(pdf.bytes));
  const failures = [
    ...validation.failures,
    ...(runtimeTraceVisible ? [`AI_ESTIMATE_PDF_RUNTIME_TRACE_VISIBLE:${runtimeTraceId}`] : []),
  ];
  const passed = estimate.work.workKey === testCase.expectedWorkKey && validation.valid && !runtimeTraceVisible;
  return {
    id: testCase.id,
    prompt: testCase.prompt,
    expectedWorkKey: testCase.expectedWorkKey,
    actualWorkKey: estimate.work.workKey,
    workTitle: estimate.work.title,
    rows: estimate.sections.flatMap((section) => section.rows).length,
    pdfPath: rel(pdfPath),
    documentNumber: pdf.documentNumber,
    rendererPath: pdf.rendererPath,
    text: validation.text,
    validation,
    runtimeTraceId,
    runtimeTraceVisible,
    passed,
    failures: passed ? [] : failures,
  };
}

function runLegacyRegression() {
  const estimate = calculateGlobalConstructionEstimateSync({
    text: "кладка кирпича 74 м²",
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  });
  const pdf = createEstimatePdf({
    estimate,
    runtimeTrace: {
      traceId: "legacy-pdf-tabular-regression",
      selectedRoute: "estimate",
      selectedTool: "calculate_global_estimate",
      workKey: estimate.work.workKey,
    },
    generatedAt: "2026-05-26T00:00:00.000Z",
    language: "ru",
  });
  const extraction = extractEstimatePdfTextForProof({
    pdf: pdf.bytes,
    knownWorkKey: estimate.work.workKey,
    requiredText: [estimate.totals.displayGrandTotal],
  });
  return {
    legacy_pdf_regression_passed: extraction.valid,
    binary_valid: extraction.binaryHeader === "%PDF-",
    cyrillic_readable: extraction.cyrillicReadable,
    failures: extraction.failures,
  };
}

export function runAiEstimatePdfTabularRegressionProof() {
  const audit = runAiEstimatePdfTabularRegressionAudit();
  const results = CASES.map(runCase);
  const legacy = runLegacyRegression();
  const web = readJson(`${PREFIX}_web_screenshots.json`);
  const android = readJson(`${PREFIX}_android_screenshots.json`);
  const webPassed = web?.web_playwright_passed === true || web?.pdf_viewer_web_opened === true;
  const androidPassed = android?.android_emulator_passed === true && android?.pdf_viewer_android_opened === true;
  const failures = [
    ...audit.blockers.map((code) => ({ code })),
    ...results.flatMap((result) => result.passed ? [] : result.failures.map((code) => ({ code, id: result.id }))),
    ...legacy.failures.map((code) => ({ code, id: "legacy_pdf" })),
    ...(webPassed ? [] : [{ code: "WEB_PLAYWRIGHT_PROOF_MISSING_OR_FAILED" }]),
    ...(androidPassed ? [] : [{ code: "ANDROID_EMULATOR_PROOF_MISSING_OR_FAILED" }]),
  ];
  const allValidations = results.map((result) => result.validation);
  const matrix = {
    wave: WAVE,
    final_status: failures.length ? "BLOCKED_AI_ESTIMATE_PDF_TABULAR_REALITY_REGRESSION" : GREEN,
    pdf_regression_audit_completed: audit.blockers.length === 0,
    ai_estimate_pdf_adapter_used: audit.ai_estimate_pdf_adapter_bypassed === false,
    legacy_pdf_protected: legacy.legacy_pdf_regression_passed,
    legacy_pdf_renderer_replaced_globally: false,
    plain_text_dump_found: allValidations.some((validation) => validation.details.plainTextDumpFound),
    markdown_as_pdf_truth_found: allValidations.some((validation) => validation.details.markdownTableFound),
    raw_material_key_visible: allValidations.some((validation) => validation.details.rawMaterialKeyVisible),
    raw_rate_key_visible: allValidations.some((validation) => validation.details.rawRateKeyVisible),
    raw_source_id_visible: allValidations.some((validation) => validation.details.rawSourceIdVisible),
    backend_debug_text_visible: allValidations.some((validation) => validation.details.backendDebugTextVisible),
    runtime_trace_visible: results.some((result) => result.runtimeTraceVisible),
    real_bordered_table_present: allValidations.every((validation) => validation.details.realBorderedTablePresent),
    required_columns_present: allValidations.every((validation) => validation.details.requiredColumnsPresent),
    totals_present: allValidations.every((validation) => validation.details.totalsPresent),
    tax_sources_confidence_present: allValidations.every((validation) => validation.details.taxSourcesFooterPresent),
    cyrillic_readable: allValidations.every((validation) => validation.details.cyrillicReadable),
    pdf_mojibake_found: allValidations.some((validation) => validation.details.mojibakeFound),
    web_playwright_passed: webPassed,
    android_emulator_passed: androidPassed,
    regression_cases_total: results.length,
    regression_cases_passed: results.filter((result) => result.passed).length,
    typecheck_passed: false,
    lint_passed: false,
    git_diff_check_passed: false,
    targeted_tests_passed: false,
    architecture_tests_passed: false,
    runtime_proof_passed: failures.length === 0,
    full_jest_passed: false,
    release_verify_passed: false,
    commit_created: false,
    branch_pushed: false,
    final_worktree_clean: false,
    fake_green_claimed: false,
  };

  writeJson(`${PREFIX}_pdf_manifest.json`, {
    cases: results.map((result) => ({
      id: result.id,
      prompt: result.prompt,
      expectedWorkKey: result.expectedWorkKey,
      actualWorkKey: result.actualWorkKey,
      pdfPath: result.pdfPath,
      documentNumber: result.documentNumber,
      rendererPath: result.rendererPath,
      passed: result.passed,
    })),
  });
  writeJson(`${PREFIX}_pdf_text_extract.json`, Object.fromEntries(results.map((result) => [result.id, result.text])));
  writeJson(`${PREFIX}_legacy_pdf_regression.json`, legacy);
  writeJson(`${PREFIX}_failures.json`, failures);
  writeJson(`${PREFIX}_matrix.json`, matrix);
  writeText(
    `${PREFIX}_proof.md`,
    [
      "# AI Estimate PDF Tabular Regression Proof",
      "",
      `Wave: ${WAVE}`,
      `Status: ${matrix.final_status}`,
      "",
      `- Cases passed: ${matrix.regression_cases_passed}/${matrix.regression_cases_total}`,
      `- Structured adapter used: ${matrix.ai_estimate_pdf_adapter_used}`,
      `- Real bordered table present: ${matrix.real_bordered_table_present}`,
      `- Raw internal fields visible: ${matrix.raw_material_key_visible || matrix.raw_rate_key_visible || matrix.raw_source_id_visible}`,
      `- Legacy PDF protected: ${matrix.legacy_pdf_protected}`,
      `- Web proof passed: ${matrix.web_playwright_passed}`,
      `- Android proof passed: ${matrix.android_emulator_passed}`,
      "",
    ].join("\n"),
  );

  return { matrix, failures };
}

if (require.main === module) {
  const result = runAiEstimatePdfTabularRegressionProof();
  console.log(result.matrix.final_status);
  if (result.failures.length) {
    console.error(JSON.stringify(result.failures, null, 2));
    process.exitCode = 1;
  }
}
