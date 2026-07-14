import { marketPricebookSnapshotIsImmutable, snapshotSummary } from "./marketPricebookTestHelpers";

describe("market pricebook snapshot freeze", () => {
  it("creates immutable pricebook snapshots", () => {
    expect(marketPricebookSnapshotIsImmutable("KG_BISHKEK")).toBe(true);
    expect(snapshotSummary().snapshot_prices_immutable).toBe(true);
  });
});
