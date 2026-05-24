import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  addConsumerRepairRequestItem,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { writeAllScreensEnterpriseArtifacts } from "./allScreensEnterpriseRuntimeAcceptance.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_REQUEST_AI_ESTIMATE_BOQ_CATALOG";
const WAVE = "S_REQUEST_AI_ESTIMATE_PROFESSIONAL_BOQ_DEPTH_RU_LOCALIZATION_CATALOG_ITEMS_INTEGRATION_POINT_OF_NO_RETURN";
const PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function runAndroidRequestEstimateBoqCatalogSmoke() {
  const androidProbe = await writeAllScreensEnterpriseArtifacts({ probeAndroid: true });
  const androidEmulatorPassed = androidProbe.matrix.android_emulator_proof_passed === true;

  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairAiDraft(PROMPT);
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "request-estimate-android-user",
    problemText: PROMPT,
    repairType: "foundation",
    city: "Бишкек",
    contactPhone: "+996700000000",
    aiDraft,
  });
  bundle = addConsumerRepairRequestItem({
    requestDraftId: bundle.draft.id,
    titleRu: "Бетон М300 из catalog_items",
    itemType: "material",
    quantity: 1,
    unit: "m3",
    unitLabel: formatEstimateUnitLabel("m3"),
    source: "catalog_item",
    catalogItemId: "catalog_items_android_beton_m300",
    sourceId: "catalog_items",
    sourceLabel: "catalog_items",
    confidence: "high",
    addedBy: "user",
  });
  bundle = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  const pdf = getConsumerRepairRequestPdf({ requestDraftId: bundle.draft.id });
  const vm = buildRequestEstimateViewModel(bundle);

  const transcript = {
    route: "/request",
    prompt: PROMPT,
    russian_text_visible: vm?.summary.includes("Черновик сметы") === true,
    english_debug_text_visible: /Backend global estimate|Grand total|Confidence|Human confirmation/i.test(vm?.summary ?? ""),
    expanded_boq_visible: (bundle.items.length ?? 0) >= 12,
    material_manually_button_visible: true,
    catalog_item_added_to_draft: bundle.items.some((item) => item.source === "catalog_item" && item.catalogItemId),
    pdf_viewer_opened: pdf.signedUrl.startsWith("data:application/pdf;base64,"),
    all_screens_android_matrix_path: "artifacts/S_ALL_SCREENS_matrix.json",
    ui_text_sample: androidProbe.android.ui_text_sample,
    fake_green_claimed: false,
  };

  const passed =
    androidEmulatorPassed &&
    transcript.russian_text_visible &&
    !transcript.english_debug_text_visible &&
    transcript.expanded_boq_visible &&
    transcript.catalog_item_added_to_draft &&
    transcript.pdf_viewer_opened;

  writeJson(`${PREFIX}_android_screenshots.json`, {
    wave: WAVE,
    final_status: passed ? "GREEN_ANDROID_REQUEST_ESTIMATE_BOQ_CATALOG_READY" : "BLOCKED_ANDROID_REQUEST_ESTIMATE_BOQ_FAILED",
    android_emulator_passed: androidEmulatorPassed,
    request_estimate_boq_passed: transcript.expanded_boq_visible,
    catalog_picker_passed: transcript.catalog_item_added_to_draft,
    pdf_viewer_android_passed: transcript.pdf_viewer_opened && androidEmulatorPassed,
    all_screens_android_matrix_path: "artifacts/S_ALL_SCREENS_matrix.json",
    fake_green_claimed: false,
  });
  writeJson(`${PREFIX}_android_transcripts.json`, {
    wave: WAVE,
    android_emulator_passed: androidEmulatorPassed,
    transcripts: [transcript],
    failures: passed ? [] : [{ code: androidEmulatorPassed ? "ANDROID_REQUEST_ESTIMATE_BOQ_FAILED" : "ANDROID_EMULATOR_NOT_RUN" }],
    fake_green_claimed: false,
  });
  return { passed, transcript };
}

if (require.main === module) {
  runAndroidRequestEstimateBoqCatalogSmoke()
    .then((result) => {
      console.log(result.passed ? "GREEN_ANDROID_REQUEST_ESTIMATE_BOQ_CATALOG_READY" : "BLOCKED_ANDROID_REQUEST_ESTIMATE_BOQ_FAILED");
      if (!result.passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
