import { carpetSnapshot, collectMissingMarketPricesForSnapshotLines } from "./marketPricebookTestHelpers";

describe("market pricebook missing line totals", () => {
  it("does not calculate line totals for missing prices", () => {
    const snapshot = carpetSnapshot();
    const missing = collectMissingMarketPricesForSnapshotLines({
      selected_work_key: snapshot.selected_work_key,
      lines: snapshot.lines,
    });
    expect(missing.length).toBeGreaterThan(0);
    expect(snapshot.lines.filter((line) => line.price.price_status === "PRICE_MISSING" && line.price.line_total !== null)).toHaveLength(0);
  });
});
