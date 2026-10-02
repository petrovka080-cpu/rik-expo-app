import { CanonicalEstimateApiError } from "../../src/lib/estimate/backendPlatform/contracts";
import { recalculateAndPersistConsumerCanonicalEstimate } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";

describe("consumer canonical formula refinement failure rollback", () => {
  it("does not persist or expose a child quantity when backend formula recalculation fails", async () => {
    const visibleParent = Object.freeze({
      revisionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      quantity: 98,
      checksumSha256: "a".repeat(64),
    });
    const parentBefore = JSON.stringify(visibleParent);
    const persist = jest.fn();
    const recalculate = jest.fn().mockRejectedValue(new CanonicalEstimateApiError(
      "Formula evaluation failed; parent revision remains current.",
      { code: "FORMULA_EVALUATION_FAILED", httpStatus: 422 },
    ));

    await expect(recalculateAndPersistConsumerCanonicalEstimate({
      revisionId: visibleParent.revisionId,
      draftId: "consumer-formula-failure-draft",
      problemText: "Refine the exact measured area without replacing the parent on failure.",
      patches: [{ operation: "update_param", paramKey: "area_m2", rawValue: "120" }],
      persist,
      recalculate,
    })).rejects.toMatchObject({ code: "FORMULA_EVALUATION_FAILED" });

    expect(recalculate).toHaveBeenCalledTimes(1);
    expect(persist).not.toHaveBeenCalled();
    expect(JSON.stringify(visibleParent)).toBe(parentBefore);
    expect(visibleParent).toEqual(expect.objectContaining({
      revisionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      quantity: 98,
    }));
  });
});
