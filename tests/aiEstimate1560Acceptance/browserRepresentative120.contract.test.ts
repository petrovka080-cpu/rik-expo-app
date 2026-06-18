import { browserRepresentative120 } from "./aiEstimate1560AcceptanceTestHelpers";

describe("1560 acceptance browser representative model audit", () => {
  it("prepares 120 browser representative cases from the 1560 sample", () => {
    const audit = browserRepresentative120();
    expect(audit.browser_representative_cases).toBe(120);
    expect(audit.browser_representative_passed).toBe(120);
    expect(audit.failures).toEqual([]);
  });
});
