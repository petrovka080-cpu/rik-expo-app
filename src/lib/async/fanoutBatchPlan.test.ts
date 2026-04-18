import { planFanoutBatch } from "./fanoutBatchPlan";

describe("planFanoutBatch", () => {
  it("dedupes repeated work while preserving source-to-result mapping", () => {
    const plan = planFanoutBatch(
      ["cement", "brick", "cement", "sand", "brick"],
      {
        maxItems: 10,
        getKey: (item) => item,
      },
    );

    expect(plan.resolveItems).toEqual(["cement", "brick", "sand"]);
    expect(plan.sourceToResolveIndex).toEqual([0, 1, 0, 2, 1]);
    expect(plan.duplicateCount).toBe(2);
    expect(plan.cappedCount).toBe(0);
    expect(plan.skipped).toEqual([]);
  });

  it("caps new unique work but still maps later duplicates to already selected items", () => {
    const plan = planFanoutBatch(
      ["a", "b", "c", "a", "d", "b"],
      {
        maxItems: 2,
        getKey: (item) => item,
      },
    );

    expect(plan.resolveItems).toEqual(["a", "b"]);
    expect(plan.sourceToResolveIndex).toEqual([0, 1, null, 0, null, 1]);
    expect(plan.duplicateCount).toBe(2);
    expect(plan.cappedCount).toBe(2);
    expect(plan.skipped.map((item) => item.index)).toEqual([2, 4]);
  });

  it("normalizes invalid limits to one selected work item", () => {
    const plan = planFanoutBatch(["a", "b"], {
      maxItems: Number.NaN,
      getKey: (item) => item,
    });

    expect(plan.resolveItems).toEqual(["a"]);
    expect(plan.sourceToResolveIndex).toEqual([0, null]);
    expect(plan.cappedCount).toBe(1);
  });
});
