import { contamination1560 } from "./aiEstimate1560AcceptanceTestHelpers";

describe("1560 acceptance cross-work contamination audit", () => {
  it("keeps sampled work materials and rows in their own domains", () => {
    const audit = contamination1560();
    expect(audit.contamination_cases_total).toBe(1560);
    expect(audit.contamination_failures).toBe(0);
    expect(audit.cross_work_contamination_found).toBe(0);
    expect(audit.failures).toEqual([]);
  });
});
