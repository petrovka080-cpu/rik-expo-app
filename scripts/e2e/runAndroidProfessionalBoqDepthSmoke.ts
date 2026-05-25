import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  calculateGlobalConstructionEstimateSync,
  validateEstimateBoqDepth,
  validateProfessionalEstimateFormulaQuality,
} from "../../src/lib/ai/globalEstimate";
import { writeAllScreensEnterpriseArtifacts } from "./allScreensEnterpriseRuntimeAcceptance.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_GLOBAL_ESTIMATE_BOQ_DEPTH";
const WAVE = "S_GLOBAL_ESTIMATE_PROFESSIONAL_BOQ_DEPTH_FORMULA_QUALITY_ENGINE_NO_SHORT_ESTIMATES_POINT_OF_NO_RETURN";
const FOUNDATION_PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function backendEstimate(workKey: string, volume: number, unit = "sq_m") {
  const estimate = calculateGlobalConstructionEstimateSync({
    explicitWorkKey: workKey,
    volume,
    unit,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
  return {
    id: workKey,
    workKey,
    resolvedWorkKey: estimate.work.workKey,
    rowCount: estimate.sections.flatMap((section) => section.rows).length,
    depth: validateEstimateBoqDepth(estimate),
    formula: validateProfessionalEstimateFormulaQuality(estimate),
    passed: validateEstimateBoqDepth(estimate).passed && validateProfessionalEstimateFormulaQuality(estimate).passed,
  };
}

export async function runAndroidProfessionalBoqDepthSmoke() {
  const androidProbe = await writeAllScreensEnterpriseArtifacts({ probeAndroid: true });
  const androidEmulatorPassed = androidProbe.matrix.android_emulator_proof_passed === true;

  const foundation = calculateGlobalConstructionEstimateSync({
    text: FOUNDATION_PROMPT,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
  const foundationDepth = validateEstimateBoqDepth(foundation);
  const foundationFormula = validateProfessionalEstimateFormulaQuality(foundation);
  const brickAnswer = answerBuiltInAi({
    text: "дай смету на кладку кирпича 74 кв метров",
    route: "/chat",
    screenContext: "chat",
    role: "foreman",
    userId: "boq-depth-android-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const asphaltAnswer = answerBuiltInAi({
    text: "сделай смету на асфальтирование на 1000 кв м",
    route: "/ai?context=foreman",
    screenContext: "foreman",
    role: "foreman",
    userId: "boq-depth-android-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });

  __resetConsumerRepairRequestStoreForTests();
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "boq-depth-android-user",
    problemText: FOUNDATION_PROMPT,
    repairType: "foundation",
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraft(FOUNDATION_PROMPT),
  });
  const pdfBundle = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
  });
  const pdf = getConsumerRepairRequestPdf({ requestDraftId: pdfBundle.draft.id });

  const cases = [
    {
      id: "request_foundation",
      route: "/request",
      passed: foundation.work.workKey === "strip_foundation" && foundationDepth.passed && foundationFormula.passed,
      rowCount: foundationDepth.actualRows,
      concreteVolumeM3: foundation.input.dimensions?.concreteVolumeM3 ?? null,
    },
    {
      id: "chat_brick",
      route: "/chat",
      passed: brickAnswer.runtimeTrace.selectedTool === "calculate_global_estimate" && brickAnswer.runtimeTrace.workKey === "brick_masonry",
      trace: brickAnswer.runtimeTrace,
    },
    {
      id: "foreman_asphalt",
      route: "/ai?context=foreman",
      passed: asphaltAnswer.runtimeTrace.selectedTool === "calculate_global_estimate" && asphaltAnswer.runtimeTrace.workKey === "asphalt_paving",
      trace: asphaltAnswer.runtimeTrace,
    },
    {
      id: "pdf_action",
      route: "/pdf-viewer",
      passed: pdf.signedUrl.startsWith("data:application/pdf;base64,"),
      signedUrlPrefix: pdf.signedUrl.slice(0, 32),
    },
    backendEstimate("gable_roof_installation", 100),
    backendEstimate("ceramic_tile_floor_laying", 174),
    backendEstimate("drywall_partition", 352),
  ];

  const failures = cases
    .filter((item) => item.passed === false)
    .map((item) => ({ code: `ANDROID_BOQ_DEPTH_FAILED:${item.id}` }));
  if (!androidEmulatorPassed) failures.push({ code: "ANDROID_EMULATOR_NOT_RUN" });

  const passed = failures.length === 0;
  writeJson(`${PREFIX}_android_screenshots.json`, {
    wave: WAVE,
    final_status: passed ? "GREEN_ANDROID_PROFESSIONAL_BOQ_DEPTH_READY" : "BLOCKED_ANDROID_REQUEST_ESTIMATE_BOQ_FAILED",
    android_emulator_passed: androidEmulatorPassed,
    pdf_action_works: pdf.signedUrl.startsWith("data:application/pdf;base64,"),
    all_screens_android_matrix_path: "artifacts/S_ALL_SCREENS_matrix.json",
    fake_green_claimed: false,
  });
  writeJson(`${PREFIX}_android_transcripts.json`, {
    wave: WAVE,
    android_emulator_passed: androidEmulatorPassed,
    cases,
    ui_text_sample: androidProbe.android.ui_text_sample,
    failures,
    fake_green_claimed: false,
  });
  return { passed, failures };
}

if (require.main === module) {
  runAndroidProfessionalBoqDepthSmoke()
    .then((result) => {
      console.log(result.passed ? "GREEN_ANDROID_PROFESSIONAL_BOQ_DEPTH_READY" : "BLOCKED_ANDROID_REQUEST_ESTIMATE_BOQ_FAILED");
      if (!result.passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
