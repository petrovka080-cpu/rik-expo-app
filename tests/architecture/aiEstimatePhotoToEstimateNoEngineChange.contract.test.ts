import fs from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("AI estimate photo to estimate no engine change", () => {
  it("keeps photo material ingestion on existing UI, runtime, catalog and revision boundaries", () => {
    const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const actions = read("src/features/consumerRepair/requestEstimateScreenActions.ts");
    const captureController = read("src/features/consumerRepair/useConsumerRepairPhotoCaptureController.tsx");
    const recognition = read("src/lib/ai/photoMaterialDraftRecognition.ts");
    const revisionBridge = read("src/lib/consumerRequests/consumerRequestEditableEstimateSnapshot.ts");

    expect(screen).toContain("addConsumerRepairPhotoMaterialPlaceholder");
    expect(screen).toContain("recognizeConsumerRepairPhotoMaterial");
    expect(screen).toContain("catalogPickerTargetItemId: result.targetItemId");
    expect(screen).not.toMatch(/requestAiGeneratedText|ServerAiModelProvider|gemini|inlineData|attachConsumerRepairMedia/);

    expect(actions).toContain("addConsumerRepairRequestItem");
    expect(actions).toContain("addConsumerRepairPhotoMaterialPlaceholder");
    expect(actions).not.toMatch(/buildEstimateFromInlineWorkPrompt|buildProfessionalBoqDraft|createAiEstimateRuntime|calculateExpandedComplexEstimate/);

    expect(captureController).toContain("createPhotoMaterialScanSession");
    expect(captureController).toContain("ensureConsumerRepairBundleEstimateRevisionState");
    expect(captureController).toContain("queueUploadOnUse={false}");
    expect(captureController).not.toMatch(/requestAiGeneratedText|ServerAiModelProvider|attachConsumerRepairMedia/);

    expect(recognition).toContain('sourcePath: "photo_material_recognition"');
    expect(recognition).toContain("requestAiGeneratedText");
    expect(recognition).toContain("automatic_estimate_mutations: 0");
    expect(recognition).toContain("automatic_catalog_mutations: 0");

    expect(revisionBridge).toContain("archiveStaleGeneratedPdfs");
    expect(revisionBridge).toContain("archiveStaleGeneratedPdfs(input.nextBundle.pdfs");
  });
});
