import { missingRateQueuesRefresh } from "../../src/lib/ai/globalEstimate";

describe("missing rate queues refresh", () => {
  it("creates a source refresh queue item instead of inventing a price", () => {
    const queued = missingRateQueuesRefresh({
      normalizedKey: "custom_entry_group_repair",
      detectedCategory: "facade",
      originalText: "смета на ремонт входной группы 120 м2",
    });

    expect(queued.status).toBe("queued");
    expect(queued.reason).toBe("missing_rate");
    expect(queued.originalText).toContain("входной группы");
  });
});
