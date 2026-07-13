import { runProductionTemplate10000RowQualityAudit } from "../../src/lib/ai/estimateTemplate10000";

describe("missing price honest 10000", () => {
  it("does not invent fake prices and keeps missing price policy explicit", () => {
    const audit = runProductionTemplate10000RowQualityAudit();

    expect(audit.fakePricesFound).toBe(0);
    expect(audit.randomPricesFound).toBe(0);
    expect(audit.zeroAsKnownPriceFound).toBe(0);
    expect(audit.failures.filter((failure) => failure.blocker === "MISSING_PRICE_POLICY_MISSING")).toHaveLength(0);
  });
});
