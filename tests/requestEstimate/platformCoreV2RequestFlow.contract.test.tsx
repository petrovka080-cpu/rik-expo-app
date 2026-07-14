import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { buildAiEstimateRuntimeViewModel } from "../../src/lib/estimate/runtime/buildAiEstimateRuntimeViewModel";

describe("platform core v2 request flow", () => {
  it("creates a draft, exposes parameter cards and recalculates through runtime", () => {
    const runtime = createAiEstimateRuntime();
    const draft = runtime.createDraft({
      estimateDraftId: "request-platform-core-v2",
      rawInput: "демонтаж плитки 98 м2",
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const viewModel = buildAiEstimateRuntimeViewModel({ revision: draft.revision, includeMissing: true });
    const result = runtime.applyParameterOverride({
      revision: draft.revision,
      operation: "update_param",
      paramKey: "q",
      rawValue: "120",
      createdAt: "2026-07-09T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(viewModel.cards.length).toBeGreaterThan(0);
    expect(result.diff.changedRowsCount).toBeGreaterThan(0);
    expect(result.pdfBuyerPackageStale).toBe(true);
  });
});
