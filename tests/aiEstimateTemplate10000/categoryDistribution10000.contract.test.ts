import {
  REQUIRED_CATEGORY_DISTRIBUTION_10000,
  buildProductionTemplate10000CategoryDistribution,
} from "../../src/lib/ai/estimateTemplate10000";

describe("category distribution 10000", () => {
  it("matches the CEO production distribution exactly", () => {
    const distribution = buildProductionTemplate10000CategoryDistribution();

    expect(distribution.total).toBe(10000);
    expect(distribution.actual).toEqual(REQUIRED_CATEGORY_DISTRIBUTION_10000);
    expect(distribution.matches).toBe(true);
    expect(distribution.fake_green_claimed).toBe(false);
  });
});
