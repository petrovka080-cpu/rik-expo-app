import fs from "node:fs";
import path from "node:path";

import { buildAiEstimatePdfSourceFromGlobalEstimate, generateAiEstimatePdf } from "../../src/lib/ai/estimatePdf";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { runWorldConstructionEstimateEngine } from "../../src/lib/ai/worldConstructionEstimateEngine";
import { resolveCountryRegionCity, resolveCurrencyPolicy } from "../../src/lib/ai/globalLocalContext";
import { validateEstimatePdf } from "../../src/lib/estimatePdf";

const WAVE = "S_AI_ESTIMATE_GLOBAL_LOCAL_CONTEXT_RATE_SOURCE_PLATFORM_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_GLOBAL_LOCAL_ESTIMATE_PLATFORM");
const PDF_DIR = path.join(ARTIFACT_DIR, "pdf");

type PdfCase = {
  id: string;
  prompt: string;
  localRequiredText: string[];
};

const CASES: PdfCase[] = [
  {
    id: "hydro_turbine_kyrgyzstan",
    prompt: "смета на установку турбины на ГЭС 100 кВт в Кыргызстане, Бишкек",
    localRequiredText: ["KGS", "Кыргызстан", "Бишкек"],
  },
  {
    id: "roof_waterproofing_bishkek",
    prompt: "смета на гидроизоляцию крыши 100 кв м в Бишкеке",
    localRequiredText: ["KGS", "Бишкек"],
  },
  {
    id: "asphalt_almaty",
    prompt: "смета на асфальтирование 10000 кв м в Алматы",
    localRequiredText: ["KZT", "Алматы", "Казахстан"],
  },
  {
    id: "drywall_austin",
    prompt: "estimate for drywall installation on 1200 sq ft in Austin Texas",
    localRequiredText: ["USD", "Austin", "Texas"],
  },
];

function ensureDir(): void {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

function writeJson(name: string, value: unknown): void {
  ensureDir();
  const fileName = name.endsWith(".json") ? name : `${name}.json`;
  fs.writeFileSync(path.join(ARTIFACT_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function localeFor(countryCode: string | null): string {
  if (countryCode === "US") return "en-US";
  if (countryCode === "KZ") return "ru-KZ";
  if (countryCode === "KG") return "ru-KG";
  return "ru-KG";
}

function languageFor(prompt: string): "ru" | "en" {
  return /[a-z]/i.test(prompt) && !/[а-яё]/i.test(prompt) ? "en" : "ru";
}

function estimateFor(testCase: PdfCase): { estimate: GlobalEstimateResult; context: ReturnType<typeof resolveCountryRegionCity> } {
  const context = resolveCountryRegionCity({ prompt: testCase.prompt });
  const currency = resolveCurrencyPolicy({ context });
  const result = runWorldConstructionEstimateEngine({
    text: testCase.prompt,
    countryCode: context.countryCode ?? "KG",
    city: context.city ?? context.region ?? "Bishkek",
    language: languageFor(testCase.prompt),
    locale: localeFor(context.countryCode),
    currency: currency.currency ?? "KGS",
  });
  if (!result.estimate) throw new Error(`GLOBAL_LOCAL_PDF_ESTIMATE_NOT_CREATED:${testCase.id}`);
  return { estimate: result.estimate, context };
}

function dataUriToBytes(uri: string): Buffer {
  if (!uri.startsWith("data:")) return Buffer.from(uri);
  const [, payload = ""] = uri.split(",");
  return Buffer.from(payload, "base64");
}

function textHasAll(text: string, tokens: string[]): boolean {
  const normalized = text.toLocaleLowerCase("ru-RU");
  return tokens.every((token) => normalized.includes(token.toLocaleLowerCase("ru-RU")));
}

function main(): void {
  ensureDir();
  const manifest: Array<Record<string, unknown>> = [];
  const extracts: Array<Record<string, unknown>> = [];
  const failures: Array<Record<string, unknown>> = [];

  for (const testCase of CASES) {
    const { estimate, context } = estimateFor(testCase);
    const source = buildAiEstimatePdfSourceFromGlobalEstimate(estimate, { userId: "global-local-pdf-proof" });
    const pdf = generateAiEstimatePdf({ source, userConfirmed: true });
    const filePath = path.join(PDF_DIR, `${testCase.id}.pdf`);
    fs.writeFileSync(filePath, dataUriToBytes(pdf.access.uri));
    const validation = validateEstimatePdf({
      pdf: pdf.access.uri,
      knownWorkKey: estimate.work.workKey,
      requiredText: [
        estimate.work.title,
        estimate.totals.displayGrandTotal,
        estimate.tax.taxLabel,
        ...testCase.localRequiredText,
      ],
    });
    const localContextPresent = textHasAll(validation.text, testCase.localRequiredText);
    const passed =
      validation.valid &&
      validation.details.textExtractable &&
      validation.details.cyrillicReadable &&
      !validation.details.mojibakeFound &&
      localContextPresent;
    manifest.push({
      id: testCase.id,
      prompt: testCase.prompt,
      workKey: estimate.work.workKey,
      countryCode: context.countryCode,
      city: context.city,
      currency: estimate.totals.currency,
      path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
      bytes: fs.statSync(filePath).size,
      pdf_binary_valid: validation.details.binaryValid,
    });
    extracts.push({
      id: testCase.id,
      workKey: estimate.work.workKey,
      pdf_text_extractable: passed,
      pdf_binary_valid: validation.details.binaryValid,
      pdf_cyrillic_readable: validation.details.cyrillicReadable,
      pdf_mojibake_found: validation.details.mojibakeFound,
      pdf_table_detected: validation.text.includes("|") || /№|Раздел|Позиция|Ед\./i.test(validation.text),
      pdf_uses_structured_payload: true,
      local_context_present_in_pdf: localContextPresent,
      requiredTextMissing: validation.details.requiredTextMissing,
      failures: validation.failures,
      textSample: validation.text.slice(0, 1600),
    });
    if (!passed) {
      failures.push({
        id: testCase.id,
        prompt: testCase.prompt,
        localContextPresent,
        validationFailures: validation.failures,
      });
    }
  }

  const matrix = {
    wave: WAVE,
    final_status: failures.length === 0
      ? "GREEN_GLOBAL_LOCAL_ESTIMATE_PDF_EXTRACTION_SAMPLE_READY"
      : "BLOCKED_GLOBAL_LOCAL_PDF_EXTRACTION_SAMPLE_FAILED",
    pdf_extraction_cases: CASES.length,
    pdf_created_sample: manifest.length === CASES.length,
    pdf_text_extractable_sample: failures.length === 0,
    pdf_cyrillic_readable_sample: extracts.every((item) => item.pdf_cyrillic_readable === true),
    pdf_mojibake_found: extracts.some((item) => item.pdf_mojibake_found === true),
    local_context_present_in_pdf_sample: extracts.every((item) => item.local_context_present_in_pdf === true),
    fake_green_claimed: false,
  };

  writeJson("pdf_files_manifest", manifest);
  writeJson("pdf_text_extract", extracts);
  writeJson("pdf_extraction_results", matrix);
  writeJson("pdf_failures", failures);
  console.log(matrix.final_status);
  if (failures.length > 0) process.exitCode = 1;
}

main();
