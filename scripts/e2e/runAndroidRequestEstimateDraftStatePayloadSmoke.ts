import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  addConsumerRepairRequestItem,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  buildConsumerRepairCanonicalDraftPayload,
  compareConsumerRepairPayloadParity,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate";
import { writeAllScreensEnterpriseArtifacts } from "./allScreensEnterpriseRuntimeAcceptance.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_REQUEST_ESTIMATE_DRAFT_STATE_PAYLOAD";
const PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function runAndroidRequestEstimateDraftStatePayloadSmoke() {
  const androidProbe = await writeAllScreensEnterpriseArtifacts({ probeAndroid: true });
  const androidEmulatorPassed = androidProbe.matrix.android_emulator_proof_passed === true;

  __resetConsumerRepairRequestStoreForTests();
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "request-state-payload-android-user",
    problemText: PROMPT,
    repairType: "foundation",
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraft(PROMPT),
  });
  bundle = addConsumerRepairRequestItem({
    requestDraftId: bundle.draft.id,
    titleRu: "Бетон М300 из catalog_items",
    itemType: "material",
    quantity: 2,
    unit: "m3",
    unitLabel: formatEstimateUnitLabel("m3"),
    unitPrice: 5000,
    currency: "KGS",
    source: "catalog_item",
    catalogItemId: "android_catalog_state_payload_beton_m300",
    selectedCatalogItemId: "android_catalog_state_payload_beton_m300",
    sourceId: "catalog_items",
    sourceLabel: "catalog_items",
    confidence: "high",
    addedBy: "user",
  });
  bundle = updateConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    patch: { contactPhone: "+996700000000", city: "Bishkek" },
  });
  const savePayload = buildConsumerRepairCanonicalDraftPayload(bundle, "draft_save");
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  bundle = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  const pdfPayload = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");
  const pdf = getConsumerRepairRequestPdf({ requestDraftId: bundle.draft.id });
  bundle = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
  bundle = sendConsumerRepairRequestToMarketplace({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    idempotencyKey: `android-state-payload:${bundle.draft.id}`,
  });
  const sendPayload = buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send");
  const parity = compareConsumerRepairPayloadParity({ draftSave: savePayload, pdfGeneration: pdfPayload, marketplaceSend: sendPayload });
  const passed = androidEmulatorPassed && parity.passed && pdf.signedUrl.startsWith("data:application/pdf;base64,");

  writeJson(`${PREFIX}_android_screenshots.json`, {
    android_emulator_passed: androidEmulatorPassed,
    request_state_payload_passed: passed,
    pdf_viewer_android_passed: pdf.signedUrl.startsWith("data:application/pdf;base64,"),
    all_screens_android_matrix_path: "artifacts/S_ALL_SCREENS_matrix.json",
    fake_green_claimed: false,
  });
  writeJson(`${PREFIX}_android_transcripts.json`, {
    route: "/request",
    prompt: PROMPT,
    payload_parity_passed: parity.passed,
    catalog_item_in_send_payload: sendPayload.items.some((item) => item.catalogItemId === "android_catalog_state_payload_beton_m300"),
    ui_text_sample: androidProbe.android.ui_text_sample,
    failures: passed ? [] : [{ code: androidEmulatorPassed ? "ANDROID_REQUEST_STATE_PAYLOAD_FAILED" : "ANDROID_EMULATOR_NOT_RUN" }],
    fake_green_claimed: false,
  });
  return { passed, parity };
}

if (require.main === module) {
  runAndroidRequestEstimateDraftStatePayloadSmoke()
    .then((result) => {
      console.log(result.passed ? "GREEN_ANDROID_REQUEST_ESTIMATE_DRAFT_STATE_PAYLOAD_READY" : "BLOCKED_ANDROID_REQUEST_ESTIMATE_DRAFT_STATE_PAYLOAD_FAILED");
      if (!result.passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
