import fs from "node:fs";
import path from "node:path";

import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "./selectedWorkEnterprise1000Cases";
import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
} from "../../src/lib/ai/globalEstimate";
import { buildStructuredEstimatePayload } from "../../src/lib/estimateStructuredPipeline";
import {
  buildProjectExecutionDraftFromEstimate,
  buildProjectExecutionPdfExportViewModel,
} from "../../src/lib/projectExecution";
import {
  extractEstimatePdfText,
  renderTextPdfDocument,
} from "../../src/lib/estimatePdf";

const WAVE = "S_ESTIMATE_TO_PROJECT_EXECUTION_PROCUREMENT_HANDOFF";
const GREEN = "GREEN_ESTIMATE_TO_PROJECT_EXECUTION_PROCUREMENT_HANDOFF_PDF_PROOF_READY";
const BLOCKED = "BLOCKED_ESTIMATE_TO_PROJECT_EXECUTION_PROCUREMENT_HANDOFF_PDF_PROOF";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", WAVE);
const FORBIDDEN = /foundation_concrete|\bwarning\b|material_key|work_key|\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b|undefined|NaN|\[object Object\]|(?:Р [\u0080-\u00bf]|РЎ[\u0080-\u00bf]|РІР‚|Гђ|Г‘|пїЅ)/i;
const REQUIRED_TEXT = ["Смета", "Этапы работ", "Список закупки", "Материалы"];

type Failure = {
  id: string;
  code: string;
  details?: unknown;
};

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildExportForCase(testCase: (typeof SELECTED_WORK_ENTERPRISE_1000_CASES)[number]) {
  const selectedWork = buildGlobalSelectedWorkBinding({
    selectedWorkKey: testCase.selectedWorkKey,
    rawInput: testCase.rawEstimateInput,
  });
  const estimate = calculateGlobalConstructionEstimateSync(
    buildGlobalEstimateInputWithSelectedWork(
      {
        text: testCase.rawEstimateInput,
        language: "ru",
        countryCode: "KG",
        city: "Bishkek",
        volume: testCase.volume,
        unit: testCase.unit,
      },
      selectedWork,
    ),
  );
  const payload = buildStructuredEstimatePayload(estimate, { source: "request", selectedWork });
  const draft = buildProjectExecutionDraftFromEstimate(payload, {
    source: "request_estimate",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
    generatedAt: "2026-06-11T00:00:00.000Z",
    sourceRequestId: `pdf_${testCase.id}`,
  });
  return buildProjectExecutionPdfExportViewModel(payload, draft);
}

function linesForExport(viewModel: ReturnType<typeof buildExportForCase>): string[] {
  return [
    viewModel.title,
    ...viewModel.sections.flatMap((section) => [
      section.title,
      ...section.rows.map((row) => [row.label, row.quantity, row.unit, row.sourceLabel].filter(Boolean).join(" - ")),
    ]),
  ];
}

export function runEstimateToProjectExecutionProcurementHandoffPdfProof(): void {
  const failures: Failure[] = [];
  const pdfReadyRows = SELECTED_WORK_ENTERPRISE_1000_CASES.slice(0, 250).map((testCase) => {
    const viewModel = buildExportForCase(testCase);
    const text = linesForExport(viewModel).join("\n");
    const requiredPresent = REQUIRED_TEXT.every((item) => text.includes(item));
    if (!requiredPresent) failures.push({ id: testCase.id, code: "PDF_READY_REQUIRED_TEXT_MISSING" });
    if (FORBIDDEN.test(text)) failures.push({ id: testCase.id, code: "PDF_READY_FORBIDDEN_TEXT", details: text.match(FORBIDDEN)?.[0] });
    return {
      id: testCase.id,
      sourcePayloadHash: viewModel.sourcePayloadHash,
      sectionCount: viewModel.sections.length,
      requiredPresent,
      forbiddenFound: FORBIDDEN.test(text),
    };
  });
  const actualPdfRows = SELECTED_WORK_ENTERPRISE_1000_CASES.slice(0, 50).map((testCase) => {
    const viewModel = buildExportForCase(testCase);
    const pdf = renderTextPdfDocument({
      pdfId: `project_execution_${testCase.id}`,
      title: viewModel.title,
      fileName: `project_execution_${testCase.id}.pdf`,
      lines: linesForExport(viewModel),
    });
    const text = extractEstimatePdfText(pdf.body);
    const requiredPresent = REQUIRED_TEXT.every((item) => text.includes(item));
    const forbidden = text.match(FORBIDDEN)?.[0] ?? null;
    if (!requiredPresent) failures.push({ id: testCase.id, code: "ACTUAL_PDF_REQUIRED_TEXT_MISSING" });
    if (forbidden) failures.push({ id: testCase.id, code: "ACTUAL_PDF_FORBIDDEN_TEXT", details: forbidden });
    return {
      id: testCase.id,
      binaryHeader: pdf.body.slice(0, 5),
      textLength: text.length,
      requiredPresent,
      forbidden,
    };
  });
  const result = {
    final_status: failures.length === 0 ? GREEN : BLOCKED,
    pdf_ready_payloads_total: pdfReadyRows.length,
    pdf_ready_payloads_passed: pdfReadyRows.filter((row) => row.requiredPresent && !row.forbiddenFound).length,
    actual_pdfs_total: actualPdfRows.length,
    actual_pdfs_passed: actualPdfRows.filter((row) => row.requiredPresent && !row.forbidden).length,
    required_text: REQUIRED_TEXT,
    failures,
    fake_green_claimed: false,
  };
  writeJson("pdf_results.json", result);
  console.log(result.final_status);
  if (failures.length > 0) {
    console.error(JSON.stringify(failures.slice(0, 25), null, 2));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runEstimateToProjectExecutionProcurementHandoffPdfProof();
}
