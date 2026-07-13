import { buildProjectExecutionFixture } from "./projectExecutionTestHelpers";

describe("buildProjectExecutionDraftFromEstimate", () => {
  it("turns a structured estimate payload into a project execution draft", () => {
    const { payload, draft } = buildProjectExecutionFixture();

    expect(draft.sourceEstimateId).toBe(payload.estimateId);
    expect(draft.sourcePayloadHash).toHaveLength(8);
    expect(draft.metadata).toMatchObject({
      source: "request_estimate",
      language: "ru",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    expect(draft.workPackages).toHaveLength(1);
    expect(draft.tasks.length).toBeGreaterThan(0);
    expect(draft.procurementItems.length).toBeGreaterThan(0);
    expect(draft.handoffSummary.workPackageCount).toBe(draft.workPackages.length);
    expect(draft.handoffSummary.taskCount).toBe(draft.tasks.length);
    expect(draft.handoffSummary.procurementItemCount).toBe(draft.procurementItems.length);
    expect(draft.totals.grandTotal).toBe(payload.totals.grandTotal);
  });
});
