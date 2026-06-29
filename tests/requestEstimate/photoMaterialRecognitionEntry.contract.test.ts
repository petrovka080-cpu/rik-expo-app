import fs from "node:fs";
import path from "node:path";

function read(filePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

describe("request estimate photo material recognition entry", () => {
  it("keeps the AI estimate photo button as recognition and catalog selection, not draft media attachment", () => {
    const draftPanel = read("src/features/consumerRepair/ConsumerRepairDraftPanel.tsx");
    const captureController = read("src/features/consumerRepair/useConsumerRepairPhotoCaptureController.tsx");
    const container = read("src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx");
    const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const recognitionService = read("src/lib/ai/photoMaterialDraftRecognition.ts");
    const aiRepository = read("src/lib/ai/aiRepository.ts");
    const geminiGateway = read("src/lib/ai/geminiGateway.ts");
    const geminiEdge = read("supabase/functions/gemini-generate-content/index.ts");

    expect(draftPanel).toContain('testID="consumer-repair-add-photo-draft"');
    expect(draftPanel).toContain('accessibilityLabel="Распознать материал по фото"');
    expect(draftPanel).toContain("onOpenPhoto={onOpenPhotoForEstimateItem}");
    expect(draftPanel).toContain("showPhotoButtons={Boolean(onOpenPhotoForEstimateItem)}");

    expect(captureController).toContain("onMaterialPhotoCaptured");
    expect(captureController).toContain("createPhotoMaterialScanSession");
    expect(captureController).toContain("ensureConsumerRepairBundleEstimateRevisionState");
    expect(captureController).toContain("getCurrentEstimateRevision");
    expect(captureController).toContain("targetItemId");
    expect(captureController).toContain("queueUploadOnUse={false}");
    expect(captureController).not.toContain("photo_material_search");
    expect(captureController).not.toContain("Date.now()");
    expect(captureController).not.toContain("onPhotoCaptured");

    expect(container).toContain("openMaterialCatalogFromCapturedPhoto");
    expect(container).not.toContain("attachCapturedPhotoToDraft");

    expect(screen).toContain("openMaterialCatalogFromCapturedPhoto");
    expect(screen).toContain("openPhotoForEstimateItem");
    expect(screen).toContain("recognizeConsumerRepairPhotoMaterial");
    expect(screen).toContain('itemType === "material"');
    expect(screen).toContain("targetItemId: targetItem.id");
    expect(screen).toContain("catalogPickerVisible: true");
    expect(screen).toContain("catalogPickerTargetItemId: result.targetItemId");
    expect(screen).toContain("catalogPickerTargetItemId: null");
    expect(screen).toContain("Смета изменится только после выбора.");
    expect(screen).not.toContain("attachConsumerRepairMedia");

    expect(recognitionService).toContain('sourcePath: "photo_material_recognition"');
    expect(recognitionService).toContain("inlineData");
    expect(recognitionService).toContain("object itself, shape, texture, packaging, label text, barcode, QR code, and price tag");
    expect(recognitionService).toContain("Do not limit the answer to barcode or price-tag OCR");
    expect(recognitionService).toContain("runPhotoMaterialRecognition");
    expect(recognitionService).toContain("searchCatalogItemsForPicker");
    expect(recognitionService).toContain("automatic_estimate_mutations: 0");
    expect(recognitionService).not.toContain("attachConsumerRepairMedia");

    expect(aiRepository).toContain('"photo_material_recognition"');
    expect(aiRepository).toContain("AiModelMessagePart");
    expect(geminiGateway).toContain("inlineData");
    expect(geminiEdge).toContain("normalizeInlineData");
  });
});
