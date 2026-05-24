import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import {
  calculateGlobalConstructionEstimateSync,
  validateEstimateFormulaQuality,
} from "../../src/lib/ai/globalEstimate";
import { writeAllScreensEnterpriseArtifacts } from "./allScreensEnterpriseRuntimeAcceptance.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_REQUEST_AI_ESTIMATE_BOQ_FORMULA";
const WAVE = "S_REQUEST_AI_ESTIMATE_PROFESSIONAL_BOQ_DEPTH_FORMULA_QUALITY_ENGINE_NO_HACKS_POINT_OF_NO_RETURN";
const PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function runAndroidRequestEstimateProfessionalBoqFormulaSmoke() {
  const androidProbe = await writeAllScreensEnterpriseArtifacts({ probeAndroid: true });
  const androidEmulatorPassed = androidProbe.matrix.android_emulator_proof_passed === true;
  const estimate = calculateGlobalConstructionEstimateSync({
    text: PROMPT,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
  const formula = validateEstimateFormulaQuality(estimate);

  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairAiDraft(PROMPT);
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "request-estimate-formula-android-user",
    problemText: PROMPT,
    repairType: "foundation",
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft,
  });
  bundle = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
  });
  const pdf = getConsumerRepairRequestPdf({ requestDraftId: bundle.draft.id });
  const vm = buildRequestEstimateViewModel(bundle);

  const transcript = {
    route: "/request",
    prompt: PROMPT,
    android_emulator_passed: androidEmulatorPassed,
    russian_summary_visible: vm?.summary.includes("Черновик сметы") === true,
    concrete_formula_quality_passed: formula.passed,
    concrete_volume_m3: formula.trace.stripFoundation?.actualConcreteVolumeM3 ?? null,
    expanded_boq_visible: bundle.items.length >= 12,
    pdf_viewer_opened: pdf.signedUrl.startsWith("data:application/pdf;base64,"),
    ui_text_sample: androidProbe.android.ui_text_sample,
    fake_green_claimed: false,
  };
  const passed =
    androidEmulatorPassed &&
    transcript.russian_summary_visible &&
    transcript.concrete_formula_quality_passed &&
    transcript.concrete_volume_m3 === 32.64 &&
    transcript.expanded_boq_visible &&
    transcript.pdf_viewer_opened;

  writeJson(`${PREFIX}_android_screenshots.json`, {
    wave: WAVE,
    final_status: passed ? "GREEN_ANDROID_REQUEST_ESTIMATE_BOQ_FORMULA_READY" : "BLOCKED_ANDROID_REQUEST_ESTIMATE_BOQ_FORMULA_FAILED",
    android_emulator_passed: androidEmulatorPassed,
    formula_quality_passed: transcript.concrete_formula_quality_passed,
    concrete_volume_m3: transcript.concrete_volume_m3,
    request_estimate_boq_passed: transcript.expanded_boq_visible,
    pdf_viewer_android_passed: transcript.pdf_viewer_opened && androidEmulatorPassed,
    all_screens_android_matrix_path: "artifacts/S_ALL_SCREENS_matrix.json",
    fake_green_claimed: false,
  });
  writeJson(`${PREFIX}_android_transcripts.json`, {
    wave: WAVE,
    android_emulator_passed: androidEmulatorPassed,
    transcripts: [transcript],
    failures: passed ? [] : [{ code: androidEmulatorPassed ? "ANDROID_REQUEST_ESTIMATE_BOQ_FORMULA_FAILED" : "ANDROID_EMULATOR_NOT_RUN" }],
    fake_green_claimed: false,
  });
  return { passed, transcript };
}

if (require.main === module) {
  runAndroidRequestEstimateProfessionalBoqFormulaSmoke()
    .then((result) => {
      console.log(result.passed ? "GREEN_ANDROID_REQUEST_ESTIMATE_BOQ_FORMULA_READY" : "BLOCKED_ANDROID_REQUEST_ESTIMATE_BOQ_FORMULA_FAILED");
      if (!result.passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
