import fs from "node:fs";
import path from "node:path";

import { SELECTED_WORK_ENTERPRISE_1000_CASES, SELECTED_WORK_ENTERPRISE_1000_WAVE } from "./selectedWorkEnterprise1000Cases";
import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
  type GlobalSelectedWorkBinding,
} from "../../src/lib/ai/globalEstimate";
import {
  createConsumerRepairDraftFromGlobalEstimate,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairPdfStorageObject,
  __resetConsumerRepairRequestStoreForTests,
  type ConsumerRepairSelectedWork,
} from "../../src/lib/consumerRequests";
import { estimatePdfInputToBytes, extractEstimatePdfText } from "../../src/lib/estimatePdf";
import {
  buildStructuredEstimatePayload,
  buildStructuredEstimatePdfViewModel,
  stableStructuredEstimateHash,
} from "../../src/lib/estimateStructuredPipeline";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE");
const PDF_DIR = path.join(ARTIFACT_DIR, "pdf_samples");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function toConsumerSelectedWork(binding: GlobalSelectedWorkBinding): ConsumerRepairSelectedWork {
  return {
    selectedWorkKey: binding.selectedWorkKey,
    selectedWorkTitleRu: binding.selectedTitleRu,
    selectedWorkCategoryKey: binding.selectedCategoryKey,
    selectedWorkCategoryTitleRu: binding.selectedCategoryTitleRu,
    selectedWorkRawInput: binding.rawInput,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
}

const MOJIBAKE_PATTERN = /(?:Р[\u0080-\u00bf]|С[\u0080-\u00bf]|Р |РЎ|РЃ|РЅ|Рѕ|Р°|Рµ|Рё|СЃ|С‚|СЂ|СЌ|СЋ|СЏ|вЂ|Гђ|Г‘|пїЅ)/u;
const INTERNAL_OR_ENGLISH_FALLBACK = /\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b|\b(?:fallback|debug|warning|generic row)\b/i;

function buildReadySample(testCase: typeof SELECTED_WORK_ENTERPRISE_1000_CASES[number]) {
  const binding = buildGlobalSelectedWorkBinding({
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
      binding,
    ),
  );
  const payload = buildStructuredEstimatePayload(estimate, { source: "request", selectedWork: binding });
  const pdfViewModel = buildStructuredEstimatePdfViewModel(payload, {
    generatedAt: "2026-06-08T00:00:00.000Z",
    language: "ru",
    runtimeTrace: {
      traceId: testCase.id,
      selectedRoute: "/request",
      selectedTool: "selected_work_pdf_ready",
      selectedWorkKey: binding.selectedWorkKey,
    },
  });
  const uiRows = payload.presentation.rows.map((row) => row.name);
  const pdfRows = pdfViewModel.sections.flatMap((section) => section.rows.map((row) => row.name));
  const failures = [
    ...(estimate.work.workKey === binding.selectedWorkKey ? [] : ["WORK_KEY_REGUESSED"]),
    ...(payload.selectedWork?.selectedWorkKey === binding.selectedWorkKey ? [] : ["PAYLOAD_SELECTED_WORK_MISSING"]),
    ...(payload.selectedWork?.resolverReGuessed === false ? [] : ["PAYLOAD_SELECTED_WORK_REGUESSED"]),
    ...(uiRows.length > 0 && JSON.stringify(uiRows) === JSON.stringify(pdfRows) ? [] : ["UI_PDF_READY_ROWS_MISMATCH"]),
    ...(pdfViewModel.runtimeTrace.workKey === payload.workKey ? [] : ["PDF_RUNTIME_TRACE_WORK_KEY_MISMATCH"]),
  ];
  return {
    id: testCase.id,
    scenario: testCase.scenario,
    selectedWorkKey: binding.selectedWorkKey,
    selectedTitleRu: binding.selectedTitleRu,
    estimate,
    selectedWork: toConsumerSelectedWork(binding),
    rawInput: testCase.rawEstimateInput,
    uiRows,
    pdfRows,
    pdfReady: failures.length === 0,
    rowsFingerprint: stableStructuredEstimateHash(uiRows),
    failures,
    fake_green_claimed: false,
  };
}

export function runSelectedWorkEnterprise1000PdfProof() {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const readySamples = SELECTED_WORK_ENTERPRISE_1000_CASES.map(buildReadySample);
  const failures: Array<{ id: string; code: string; details?: unknown }> = readySamples.flatMap((sample) =>
    sample.failures.map((code) => ({ id: sample.id, code })),
  );
  const rendered = readySamples.slice(0, 250).map((sample, index) => {
    try {
      __resetConsumerRepairRequestStoreForTests();
      let bundle = createConsumerRepairDraftFromGlobalEstimate({
        consumerUserId: `selected-work-1000-pdf-${sample.id}`,
        estimate: sample.estimate,
        originalText: sample.rawInput,
        city: "Bishkek",
        contactPhone: "+996700000000",
        selectedWork: sample.selectedWork,
      });
      bundle = generateConsumerRepairRequestPdfForDraft({
        requestDraftId: bundle.draft.id,
        userId: bundle.draft.consumerUserId,
        generatedAt: "2026-06-08T00:00:00.000Z",
      });
      const pdf = bundle.pdfs[0];
      const object = getConsumerRepairPdfStorageObject({ storageBucket: pdf.storageBucket, storageKey: pdf.storageKey });
      if (!object) {
        failures.push({ id: sample.id, code: "PDF_STORAGE_OBJECT_MISSING" });
        return { id: sample.id, rendered: false, failures: ["PDF_STORAGE_OBJECT_MISSING"], fake_green_claimed: false };
      }
      const text = extractEstimatePdfText(object.body);
      const pdfPath = path.join(PDF_DIR, `${String(index + 1).padStart(3, "0")}_${sample.selectedWork.selectedWorkKey}.pdf`);
      fs.writeFileSync(pdfPath, Buffer.from(estimatePdfInputToBytes(object.body)));
      const missingRows = sample.uiRows.filter((row) => !text.includes(row));
      const sampleFailures = [
        ...(text.includes(sample.selectedWork.selectedWorkTitleRu) ? [] : ["PDF_SELECTED_WORK_TITLE_MISSING"]),
        ...(missingRows.length === 0 ? [] : ["PDF_ROWS_MISSING_FROM_TEXT"]),
        ...(MOJIBAKE_PATTERN.test(text) ? ["PDF_MOJIBAKE_FOUND"] : []),
        ...(INTERNAL_OR_ENGLISH_FALLBACK.test(text) ? ["PDF_INTERNAL_OR_ENGLISH_FALLBACK_FOUND"] : []),
      ];
      failures.push(...sampleFailures.map((code) => ({ id: sample.id, code, details: code === "PDF_ROWS_MISSING_FROM_TEXT" ? missingRows.slice(0, 10) : undefined })));
      return {
        id: sample.id,
        selectedWorkKey: sample.selectedWork.selectedWorkKey,
        selectedTitleRu: sample.selectedWork.selectedWorkTitleRu,
        rendered: sampleFailures.length === 0,
        pdfPath: rel(pdfPath),
        rowsFingerprint: sample.rowsFingerprint,
        textSample: text.slice(0, 800),
        failures: sampleFailures,
        fake_green_claimed: false,
      };
    } catch (error) {
      const code = "PDF_RENDER_EXCEPTION";
      const message = error instanceof Error ? error.message : String(error);
      failures.push({
        id: sample.id,
        code,
        details: {
          selectedWorkKey: sample.selectedWork.selectedWorkKey,
          selectedTitleRu: sample.selectedWork.selectedWorkTitleRu,
          message,
        },
      });
      return {
        id: sample.id,
        selectedWorkKey: sample.selectedWork.selectedWorkKey,
        selectedTitleRu: sample.selectedWork.selectedWorkTitleRu,
        rendered: false,
        failures: [code],
        errorMessage: message,
        fake_green_claimed: false,
      };
    }
  });

  const pdfReadyMatrix = {
    wave: SELECTED_WORK_ENTERPRISE_1000_WAVE,
    final_status: readySamples.every((sample) => sample.pdfReady)
      ? "GREEN_SELECTED_WORK_ENTERPRISE_1000_PDF_READY_PAYLOADS_READY"
      : "BLOCKED_SELECTED_WORK_ENTERPRISE_1000_PDF_READY_PAYLOADS_FAILED",
    pdf_ready_payloads_total: readySamples.length,
    pdf_ready_payloads_passed: readySamples.filter((sample) => sample.pdfReady).length,
    rows: readySamples.map((sample) => ({
      id: sample.id,
      scenario: sample.scenario,
      selectedWorkKey: sample.selectedWorkKey,
      selectedTitleRu: sample.selectedTitleRu,
      pdfReady: sample.pdfReady,
      rowsFingerprint: sample.rowsFingerprint,
      failures: sample.failures,
    })),
    fake_green_claimed: false,
  };
  const actualPdfMatrix = {
    wave: SELECTED_WORK_ENTERPRISE_1000_WAVE,
    final_status: rendered.every((sample) => sample.rendered)
      ? "GREEN_SELECTED_WORK_ENTERPRISE_1000_ACTUAL_PDF_250_READY"
      : "BLOCKED_SELECTED_WORK_ENTERPRISE_1000_ACTUAL_PDF_250_FAILED",
    actual_pdf_samples_total: rendered.length,
    actual_pdf_samples_passed: rendered.filter((sample) => sample.rendered).length,
    rendered_samples: rendered,
    pdf_no_mojibake: !rendered.some((sample) => sample.failures.includes("PDF_MOJIBAKE_FOUND")),
    pdf_rows_match_ui: !rendered.some((sample) => sample.failures.includes("PDF_ROWS_MISSING_FROM_TEXT")),
    fake_green_claimed: false,
  };
  writeJson("pdf_ready_1000_matrix.json", pdfReadyMatrix);
  writeJson("actual_pdf_250_matrix.json", actualPdfMatrix);
  writeJson("pdf_failures.json", failures);
  if (failures.length > 0 || pdfReadyMatrix.final_status.includes("BLOCKED") || actualPdfMatrix.final_status.includes("BLOCKED")) {
    throw new Error(`BLOCKED_SELECTED_WORK_ENTERPRISE_1000_PDF_PROOF_FAILED:${failures.slice(0, 20).map((failure) => `${failure.id}:${failure.code}`).join("|")}`);
  }
  return { pdfReadyMatrix, actualPdfMatrix };
}

if (require.main === module) {
  try {
    runSelectedWorkEnterprise1000PdfProof();
    console.log("GREEN_SELECTED_WORK_ENTERPRISE_1000_PDF_PROOF_READY");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
