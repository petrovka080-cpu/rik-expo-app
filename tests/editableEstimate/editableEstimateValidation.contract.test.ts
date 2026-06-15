import { validateEditableEstimateSnapshot } from "../../src/lib/ai/editableEstimate";
import { editableRow, editableSnapshot } from "./editableEstimateTestHelpers";

describe("editable estimate validation", () => {
  it("blocks stale row totals", () => {
    const clean = editableSnapshot([editableRow({ quantity: 3, unitPrice: 100, totalPrice: 300 })]);
    const snapshot = { ...clean, rows: [{ ...clean.rows[0], totalPrice: 999 }] };
    const result = validateEditableEstimateSnapshot(snapshot);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("ROW_TOTAL_STALE");
  });

  it("blocks user price that still claims supplier source id", () => {
    const snapshot = editableSnapshot([
      editableRow({
        priceStatus: "USER_PRICE_OVERRIDE",
        priceSource: "user",
        priceSourceId: "supplier_1",
        manualPrice: {
          unitPrice: 500,
          currency: "KGS",
          status: "USER_PRICE_OVERRIDE",
          updatedAt: "2026-06-15T00:00:00.000Z",
        },
      }),
    ]);

    const result = validateEditableEstimateSnapshot(snapshot);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("USER_PRICE_SOURCE_ID_FORBIDDEN");
  });

  it("blocks trusted prices without source evidence", () => {
    const snapshot = editableSnapshot([
      editableRow({
        priceStatus: "CATALOG_PRICE_VERIFIED",
        priceSource: "catalog_item",
        sourceId: null,
        priceSourceId: null,
      }),
    ]);

    const result = validateEditableEstimateSnapshot(snapshot);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("TRUSTED_PRICE_SOURCE_REQUIRED");
  });

  it("blocks stale snapshot hash", () => {
    const snapshot = { ...editableSnapshot(), hash: "deadbeef" };
    const result = validateEditableEstimateSnapshot(snapshot);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("SNAPSHOT_HASH_STALE");
  });
});
