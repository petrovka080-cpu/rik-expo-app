import fs from "node:fs";
import path from "node:path";

import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import { buildEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import {
  createEstimatePdf,
  extractEstimatePdfTextForProof,
  validateNoPdfMojibake,
} from "../../src/lib/estimatePdf";
import {
  failureSummary,
  MOJIBAKE_PATTERN,
  REAL_WORK_READING_SMOKE_CASES,
  writeWaveJson,
} from "./aiEstimateCoreReal10000Hardening.shared";

type Failure = {
  id: string;
  code: string;
  details?: unknown;
};

const PDF_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_CORE_REAL_10000_WORK_READING_EXACT_BOQ_HARDENING",
  "pdf",
);

function writePdf(name: string, bytes: Uint8Array): string {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const relative = path.join(
    "artifacts",
    "S_AI_ESTIMATE_CORE_REAL_10000_WORK_READING_EXACT_BOQ_HARDENING",
    "pdf",
    name,
  ).replace(/\\/g, "/");
  fs.writeFileSync(path.join(process.cwd(), relative), bytes);
  return relative;
}

function addFailure(failures: Failure[], condition: boolean, id: string, code: string, details?: unknown): void {
  if (!condition) failures.push({ id, code, details });
}

export function runAiEstimateCoreReal10000PdfProof() {
  const failures: Failure[] = [];
  const rows = REAL_WORK_READING_SMOKE_CASES.map((item) => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: item.text,
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const viewModel = buildEstimatePresentationViewModel(estimate);
    const pdf = createEstimatePdf({
      estimate,
      generatedAt: "2026-06-11T00:00:00.000Z",
      language: "ru",
      runtimeTrace: {
        traceId: `ai-estimate-core-real10000-${item.id}`,
        input: item.text,
        selectedRoute: "/request",
        selectedTool: "calculate_global_estimate",
        backendCalled: true,
        detectedIntent: "estimate",
      },
    });
    const pdfText = extractEstimatePdfTextForProof({
      pdf: pdf.bytes,
      knownWorkKey: estimate.work.workKey,
    }).text;
    const file = writePdf(`${item.id}.pdf`, pdf.bytes);
    const noPdfMojibake = validateNoPdfMojibake(pdfText).passed && !MOJIBAKE_PATTERN.test(pdfText);
    const visibleRows = viewModel.rows.map((row) => row.name);
    const rowsMissingFromPdf = visibleRows.filter((row) => !pdfText.includes(row));
    const passed =
      pdf.validation.valid &&
      pdf.pdfTrace.pdf_uses_structured_global_estimate_result &&
      !pdf.pdfTrace.markdown_parsed_as_pdf_truth &&
      noPdfMojibake &&
      rowsMissingFromPdf.length === 0;

    addFailure(failures, pdf.validation.valid, item.id, "PDF_VALIDATION_FAILED", pdf.validation.failures);
    addFailure(failures, pdf.pdfTrace.pdf_uses_structured_global_estimate_result, item.id, "PDF_NOT_USING_STRUCTURED_ESTIMATE", pdf.pdfTrace);
    addFailure(failures, !pdf.pdfTrace.markdown_parsed_as_pdf_truth, item.id, "MARKDOWN_PARSED_AS_PDF_TRUTH", pdf.pdfTrace);
    addFailure(failures, noPdfMojibake, item.id, "PDF_MOJIBAKE_FOUND");
    addFailure(failures, rowsMissingFromPdf.length === 0, item.id, "PDF_UI_PARITY_FAILED", rowsMissingFromPdf.slice(0, 10));

    return {
      id: item.id,
      text: item.text,
      workKey: estimate.work.workKey,
      workTitle: estimate.work.title,
      pdfFile: file,
      visibleRows: visibleRows.length,
      rowsMissingFromPdf,
      pdfValid: pdf.validation.valid,
      pdfUsesStructuredEstimate: pdf.pdfTrace.pdf_uses_structured_global_estimate_result,
      markdownParsedAsPdfTruth: pdf.pdfTrace.markdown_parsed_as_pdf_truth,
      noPdfMojibake,
      passed,
    };
  });

  const passed = failures.length === 0;
  const result = {
    final_status: passed
      ? "GREEN_AI_ESTIMATE_CORE_REAL_10000_PDF_PARITY_READY"
      : "BLOCKED_AI_ESTIMATE_CORE_REAL_10000_PDF_PARITY",
    pdf_cases_total: rows.length,
    pdf_cases_passed: rows.filter((row) => row.passed).length,
    pdf_uses_structured_payload: rows.every((row) => row.pdfUsesStructuredEstimate),
    pdf_rows_match_ui_rows: rows.every((row) => row.rowsMissingFromPdf.length === 0),
    markdown_parsed_as_pdf_truth: rows.some((row) => row.markdownParsedAsPdfTruth),
    pdf_mojibake_found: rows.some((row) => !row.noPdfMojibake),
    rows,
    failures,
  };
  writeWaveJson("pdf_results.json", result);
  console.log(result.final_status);
  if (!passed) {
    console.error(JSON.stringify(failureSummary(failures), null, 2));
    process.exitCode = 1;
  }
  return result;
}

if (require.main === module) {
  runAiEstimateCoreReal10000PdfProof();
}
