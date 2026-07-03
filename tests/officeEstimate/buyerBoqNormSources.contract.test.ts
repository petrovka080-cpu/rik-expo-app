import { buildProfessionalExpandedGlobalEstimate } from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";
import { buildConsumerRepairAiDraftFromGlobalEstimate } from "../../src/lib/consumerRequests";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";

describe("buyer BOQ norm sources", () => {
  it("keeps norm source evidence on procurement material rows", () => {
    const estimate = buildProfessionalExpandedGlobalEstimate({
      workKey: "laminate_laying",
      estimateInput: {
        text: "laminate laying 54 m2",
        estimateDetailLevel: "professional_expanded",
        countryCode: "KG",
        city: "Bishkek",
        currency: "KGS",
      },
    });
    const payload = buildConsumerRepairAiDraftFromGlobalEstimate(estimate).structuredEstimatePayload!;
    const buyerDraft = buildProjectExecutionDraftFromEstimate(payload, {
      source: "request_estimate",
      sourceRequestId: "buyer-boq-norm-sources",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      generatedAt: "2026-07-03T00:00:00.000Z",
    });

    expect(buyerDraft.procurementItems.length).toBeGreaterThan(0);
    expect(buyerDraft.procurementItems.every((item) => item.normId && item.normSourceId && item.normVersion)).toBe(true);
    expect(buyerDraft.procurementItems.every((item) => item.calculationTrace?.includes("normSource="))).toBe(true);
  });
});
