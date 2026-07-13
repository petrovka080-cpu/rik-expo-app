import { professionalSnapshots } from "./professionalEstimateTestHelpers";

describe("professional estimate honest missing price behavior", () => {
  it("keeps unit price and line total null for missing prices", () => {
    const missing = professionalSnapshots()
      .flatMap((snapshot) => snapshot.lines)
      .filter((line) => line.price.price_status === "PRICE_MISSING");
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.filter((line) => line.price.unit_price !== null || line.price.line_total !== null)).toHaveLength(0);
  });
});
