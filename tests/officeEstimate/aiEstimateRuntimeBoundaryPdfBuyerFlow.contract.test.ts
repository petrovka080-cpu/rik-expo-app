import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";

describe("AI estimate runtime boundary office PDF buyer flow", () => {
  it("generates PDF and buyer package from the latest runtime revision", () => {
    const runtime = createAiEstimateRuntime();
    const draft = runtime.createDraft({
      estimateDraftId: "runtime-boundary-office",
      rawInput: "facade 1500 m2",
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      createdAt: "2026-07-10T00:00:00.000Z",
    });
    const changed = runtime.applyParameterOverride({
      revision: draft.revision,
      operation: "update_param",
      paramKey: "q",
      rawValue: "1500",
      createdAt: "2026-07-10T00:01:00.000Z",
      revisionIndex: 2,
    });
    const pdf = runtime.buildPdfSnapshot({ revision: changed.revision });
    const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });

    expect(pdf.pdf.revisionId).toBe(changed.revision.revisionId);
    expect(buyer.buyerPackage.revisionId).toBe(changed.revision.revisionId);
    expect(buyer.buyerPackage.forbiddenWorkRowsPresent).toBe(false);
  });
});
