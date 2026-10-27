import {
  applyBatchReliabilityPlan,
  classifyBatchReliabilityOutcome,
  createBatchReliabilityPlan,
  normalizeBatchReliabilityError,
  planFanoutBatch,
} from "./fanoutBatchPlan";

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

describe("batch reliability helpers", () => {
  it("classifies a batch with no failures as full success", () => {
    const plan = createBatchReliabilityPlan([
      { key: "primary", critical: true },
      { key: "secondary", critical: false },
    ] as const);

    expect(classifyBatchReliabilityOutcome(plan, [])).toBe("full_success");
  });

  it("classifies only optional failures as degraded success", () => {
    const plan = createBatchReliabilityPlan([
      { key: "primary", critical: true },
      { key: "secondary", critical: false },
    ] as const);

    expect(classifyBatchReliabilityOutcome(plan, ["secondary"])).toBe("degraded_success");
  });

  it("classifies any critical failure as hard failure", () => {
    const plan = createBatchReliabilityPlan([
      { key: "primary", critical: true },
      { key: "secondary", critical: false },
    ] as const);

    expect(classifyBatchReliabilityOutcome(plan, ["primary"])).toBe("hard_failure");
  });

  it("rejects duplicate member keys", () => {
    expect(() =>
      createBatchReliabilityPlan([
        { key: "primary", critical: true },
        { key: "primary", critical: false },
      ] as const),
    ).toThrow("Duplicate batch reliability member: primary");
  });

  it("normalizes runtime errors while preserving usable messages", () => {
    const nativeError = new Error("network down");
    const preserved = normalizeBatchReliabilityError(nativeError, "fallback message");
    expect(preserved.error).toBe(nativeError);
    expect(preserved.message).toBe("network down");

    const fromString = normalizeBatchReliabilityError("transport failed", "fallback message");
    expect(fromString.error).toBeInstanceOf(Error);
    expect(fromString.message).toBe("transport failed");

    const fallback = normalizeBatchReliabilityError({ code: "boom" }, "fallback message");
    expect(fallback.error.message).toBe("fallback message");
  });

  it("keeps useful values when only optional members fail", () => {
    const plan = createBatchReliabilityPlan([
      { key: "primary", critical: true },
      { key: "secondary", critical: false },
    ] as const);

    const result = applyBatchReliabilityPlan({
      plan,
      settled: {
        primary: { status: "fulfilled", value: "ok" },
        secondary: { status: "rejected", reason: new Error("secondary failed") },
      },
      getFallbackValue: () => "fallback",
      getFallbackMessage: (key) => `fallback:${key}`,
    });

    expect(result.status).toBe("degraded_success");
    expect(result.values).toEqual({
      primary: "ok",
      secondary: "fallback",
    });
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toEqual(
      expect.objectContaining({
        key: "secondary",
        critical: false,
      }),
    );
    expect(result.firstCriticalFailure).toBeNull();
  });

  it("classifies critical failures as hard failure", () => {
    const plan = createBatchReliabilityPlan([
      { key: "primary", critical: true },
      { key: "secondary", critical: false },
    ] as const);

    const result = applyBatchReliabilityPlan({
      plan,
      settled: {
        primary: { status: "rejected", reason: new Error("primary failed") },
        secondary: { status: "fulfilled", value: "extra" },
      },
      getFallbackValue: () => "fallback",
    });

    expect(result.status).toBe("hard_failure");
    expect(result.values).toEqual({
      primary: "fallback",
      secondary: "extra",
    });
    expect(result.firstCriticalFailure).toEqual(
      expect.objectContaining({
        key: "primary",
        critical: true,
      }),
    );
  });
});
