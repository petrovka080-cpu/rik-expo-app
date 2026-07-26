import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";

describe("AI estimate runtime boundary foreman flow", () => {
  it("rebuilds field quantity changes through runtime instead of screen-local calculation", () => {
    const runtime = createAiEstimateRuntime();
    const draft = runtime.createDraft({
      estimateDraftId: "runtime-boundary-foreman",
      rawInput: "remove interior tile 45 m2",
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      createdAt: "2026-07-10T00:00:00.000Z",
    });
    const changed = runtime.applyParameterOverride({
      revision: draft.revision,
      operation: "update_param",
      paramKey: "area_m2",
      rawValue: "55 m2",
      createdAt: "2026-07-10T00:01:00.000Z",
      revisionIndex: 2,
    });
    const validation = runtime.validate({ revision: changed.revision });

    expect(changed.pdfBuyerPackageStale).toBe(true);
    expect(validation.ok).toBe(true);
  });
});
