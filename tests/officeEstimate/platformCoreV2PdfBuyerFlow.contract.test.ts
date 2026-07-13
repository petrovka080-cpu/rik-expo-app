import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";

describe("platform core v2 office PDF buyer flow", () => {
  it("builds PDF snapshot and buyer package from the latest runtime revision", () => {
    const runtime = createAiEstimateRuntime();
    const draft = runtime.createDraft({
      estimateDraftId: "office-platform-core-v2",
      rawInput: "демонтаж плитки 98 м2",
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const changed = runtime.applyParameterOverride({
      revision: draft.revision,
      operation: "update_param",
      paramKey: "q",
      rawValue: "130",
      createdAt: "2026-07-09T00:01:00.000Z",
      revisionIndex: 2,
    });
    const pdf = runtime.buildPdfSnapshot({ revision: changed.revision });
    const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });

    expect(pdf.pdf.revisionId).toBe(changed.revision.revisionId);
    expect(buyer.buyerPackage.revisionId).toBe(changed.revision.revisionId);
    expect(buyer.buyerPackage.forbiddenWorkRowsPresent).toBe(false);
  });
});
