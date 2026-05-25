import fs from "node:fs";

describe("request state no duplicate draft logic", () => {
  it("keeps the new feature state as an adapter over existing consumer request services", () => {
    const featureSources = [
      "src/features/consumerRepair/requestEstimateStateMachine.ts",
      "src/features/consumerRepair/requestEstimateDraftReducer.ts",
      "src/features/consumerRepair/buildRequestEstimatePayload.ts",
      "src/features/consumerRepair/validateRequestEstimateDraft.ts",
    ].map((file) => fs.readFileSync(file, "utf8")).join("\n");
    const screen = fs.readFileSync("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx", "utf8");

    expect(featureSources).not.toMatch(/createConsumerRepairRequestDraft\s*\(/);
    expect(featureSources).not.toMatch(/sendConsumerRepairRequestToMarketplace\s*\(/);
    expect(screen).toContain("addConsumerRepairRequestItem");
    expect(screen).toContain("generateConsumerRepairRequestPdfForDraft");
  });
});
