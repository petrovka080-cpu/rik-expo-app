import fs from "node:fs";
import path from "node:path";

import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
} from "../../src/lib/ai/globalEstimate";
import { BUILT_IN_AI_1000_ESTIMATE_CASES } from "../../src/lib/ai/builtInAi1000/builtInAi1000ConstructionCases";
import {
  buildConsumerRepairAiDraftFromGlobalEstimate,
  createConsumerRepairDraftFromGlobalEstimate,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairPdfStorageObject,
  __resetConsumerRepairRequestStoreForTests,
  type ConsumerRepairSelectedWork,
} from "../../src/lib/consumerRequests";
import { estimatePdfInputToBytes, extractEstimatePdfText } from "../../src/lib/estimatePdf";

const WAVE = "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING");
const PDF_DIR = path.join(ARTIFACT_DIR, "pdf_samples");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function toConsumerSelectedWork(binding: ReturnType<typeof buildGlobalSelectedWorkBinding>): ConsumerRepairSelectedWork {
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

function sampleCasesAcrossManifestCategories(limit: number) {
  const grouped = new Map<string, typeof BUILT_IN_AI_1000_ESTIMATE_CASES[number][]>();
  for (const testCase of BUILT_IN_AI_1000_ESTIMATE_CASES) {
    const cases = grouped.get(testCase.category) ?? [];
    cases.push(testCase);
    grouped.set(testCase.category, cases);
  }
  const samples: typeof BUILT_IN_AI_1000_ESTIMATE_CASES[number][] = [];
  const categories = [...grouped.keys()].sort();
  for (let index = 0; samples.length < limit; index += 1) {
    for (const category of categories) {
      const next = grouped.get(category)?.[index];
      if (next) samples.push(next);
      if (samples.length >= limit) break;
    }
  }
  return samples;
}

function knownMojibakeFound(text: string): boolean {
  return /Р’РёРґ|Р—Р°СЏРІРєР°|Р РµРјРѕРЅС‚|РЎРјРµС‚Р°|РџРѕРґ|СЃРјРµС‚/u.test(text);
}

export function runConstructionWorkSmartSearchSelectedWorkPdfProof() {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const failures: Array<{ id: string; code: string }> = [];
  const pdfReadySamples = sampleCasesAcrossManifestCategories(50).map((testCase, index) => {
    const rawInput = `${testCase.promptRu} selected-work-proof`;
    const binding = buildGlobalSelectedWorkBinding({
      selectedWorkKey: testCase.workKey,
      rawInput,
    });
    const selectedWork = toConsumerSelectedWork(binding);
    const estimate = calculateGlobalConstructionEstimateSync(
      buildGlobalEstimateInputWithSelectedWork(
        {
          text: rawInput,
          language: "ru",
          countryCode: "KG",
          city: "Bishkek",
          volume: testCase.volume,
          unit: testCase.unit,
        },
        binding,
      ),
    );
    const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(estimate, undefined, selectedWork);
    const readyFailures = [
      ...(estimate.work.workKey === binding.selectedWorkKey ? [] : ["WORK_KEY_REGUESSED"]),
      ...(aiDraft.selectedWork?.selectedWorkKey === binding.selectedWorkKey ? [] : ["AI_DRAFT_SELECTED_WORK_MISSING"]),
      ...(aiDraft.items.length > 0 ? [] : ["AI_DRAFT_ITEMS_MISSING"]),
    ];
    failures.push(...readyFailures.map((code) => ({ id: testCase.id, code })));
    return {
      index: index + 1,
      id: testCase.id,
      category: testCase.category,
      selectedWorkKey: binding.selectedWorkKey,
      selectedTitleRu: binding.selectedTitleRu,
      estimateWorkKey: estimate.work.workKey,
      pdfReady: readyFailures.length === 0,
      failures: readyFailures,
      estimate,
      selectedWork,
      rawInput,
    };
  });

  const renderedPdfSamples = pdfReadySamples.slice(0, 10).map((sample) => {
    __resetConsumerRepairRequestStoreForTests();
    let bundle = createConsumerRepairDraftFromGlobalEstimate({
      consumerUserId: `selected-work-pdf-proof-${sample.id}`,
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
      return { id: sample.id, selectedWorkKey: sample.selectedWork.selectedWorkKey, rendered: false, failures: ["PDF_STORAGE_OBJECT_MISSING"] };
    }
    const text = extractEstimatePdfText(object.body);
    const pdfPath = path.join(PDF_DIR, `${sample.index}_${sample.selectedWork.selectedWorkKey}.pdf`);
    fs.writeFileSync(pdfPath, Buffer.from(estimatePdfInputToBytes(object.body)));
    const sampleFailures = [
      ...(text.includes(sample.selectedWork.selectedWorkTitleRu) ? [] : ["PDF_SELECTED_WORK_TITLE_MISSING"]),
      ...(knownMojibakeFound(text) ? ["PDF_MOJIBAKE_FOUND"] : []),
    ];
    failures.push(...sampleFailures.map((code) => ({ id: sample.id, code })));
    return {
      id: sample.id,
      selectedWorkKey: sample.selectedWork.selectedWorkKey,
      selectedTitleRu: sample.selectedWork.selectedWorkTitleRu,
      rendered: sampleFailures.length === 0,
      textSample: text.slice(0, 800),
      pdfPath: rel(pdfPath),
      failures: sampleFailures,
    };
  });

  const passed = failures.length === 0;
  const artifact = {
    wave: WAVE,
    final_status: passed
      ? "GREEN_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_PDF_READY"
      : "BLOCKED_PDF_SELECTED_WORK_PROOF_FAILED",
    pdf_ready_samples_total: pdfReadySamples.length,
    pdf_ready_samples_passed: pdfReadySamples.filter((sample) => sample.pdfReady).length,
    actual_rendered_pdf_samples_total: renderedPdfSamples.length,
    actual_rendered_pdf_samples_passed: renderedPdfSamples.filter((sample) => sample.rendered).length,
    pdf_no_mojibake: !renderedPdfSamples.some((sample) => sample.failures.includes("PDF_MOJIBAKE_FOUND")),
    pdf_selected_work_title_present: renderedPdfSamples.every((sample) => !sample.failures.includes("PDF_SELECTED_WORK_TITLE_MISSING")),
    ready_samples: pdfReadySamples.map((sample) => ({
      id: sample.id,
      category: sample.category,
      selectedWorkKey: sample.selectedWorkKey,
      selectedTitleRu: sample.selectedTitleRu,
      estimateWorkKey: sample.estimateWorkKey,
      pdfReady: sample.pdfReady,
      failures: sample.failures,
    })),
    rendered_samples: renderedPdfSamples,
    failures,
    fake_green_claimed: false,
  };
  writeJson("pdf_samples_matrix.json", artifact);
  if (!passed) throw new Error(`BLOCKED_PDF_SELECTED_WORK_PROOF_FAILED:${failures.map((failure) => `${failure.id}:${failure.code}`).join("|")}`);
  return artifact;
}

if (require.main === module) {
  try {
    runConstructionWorkSmartSearchSelectedWorkPdfProof();
    console.log("GREEN_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_PDF_READY");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
