import { buildProfessionalExpandedGlobalEstimate } from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";
import { buildConsumerRepairAiDraftFromGlobalEstimate } from "../../src/lib/consumerRequests";

describe("request estimate norm trace", () => {
  it("keeps norm id, source and version in request structured rows and draft items", () => {
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
    const draft = buildConsumerRepairAiDraftFromGlobalEstimate(estimate);
    const payload = draft.structuredEstimatePayload!;

    expect(payload.rows.length).toBeGreaterThan(0);
    expect(payload.rows.every((row) => row.normId && row.normSourceId && row.normVersion)).toBe(true);
    expect(payload.rows.every((row) => row.calculationTrace?.includes("normId="))).toBe(true);
    expect(draft.items.every((item) => item.normId && item.normSourceId && item.normVersion)).toBe(true);
  });
});
