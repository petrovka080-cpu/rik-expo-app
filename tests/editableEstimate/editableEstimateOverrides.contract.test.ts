import {
  applyEditableEstimateOverride,
  mergeEditableEstimateSnapshotWithAiRecalculation,
} from "../../src/lib/ai/editableEstimate";
import { editableRow, editableSnapshot } from "./editableEstimateTestHelpers";

describe("editable estimate overrides", () => {
  it("recalculates totals immediately after quantity edit", () => {
    const snapshot = applyEditableEstimateOverride(editableSnapshot(), {
      rowId: "row_1",
      quantity: 12,
      at: "2026-06-15T01:00:00.000Z",
    });

    expect(snapshot.rows[0].quantity).toBe(12);
    expect(snapshot.rows[0].quantitySource).toBe("user_override");
    expect(snapshot.rows[0].totalPrice).toBe(6000);
    expect(snapshot.totals.grandTotal).toBe(6000);
    expect(snapshot.auditTrail.some((event) => event.type === "quantity_overridden")).toBe(true);
  });

  it("marks changed trusted price as USER_PRICE_OVERRIDE without supplier source", () => {
    const snapshot = applyEditableEstimateOverride(editableSnapshot(), {
      rowId: "row_1",
      unitPrice: 777,
      actorUserId: "consumer-1",
      at: "2026-06-15T02:00:00.000Z",
    });

    expect(snapshot.rows[0].unitPrice).toBe(777);
    expect(snapshot.rows[0].priceStatus).toBe("USER_PRICE_OVERRIDE");
    expect(snapshot.rows[0].priceSource).toBe("user");
    expect(snapshot.rows[0].priceSourceId).toBeNull();
    expect(snapshot.rows[0].manualPrice?.actorUserId).toBe("consumer-1");
    expect(snapshot.totals.grandTotal).toBe(7770);
  });

  it("marks filled missing price as USER_ENTERED_PRICE", () => {
    const snapshot = applyEditableEstimateOverride(
      editableSnapshot([
        editableRow({
          unitPrice: null,
          totalPrice: null,
          priceStatus: "PRICE_MISSING",
          priceSource: "missing",
          priceSourceId: null,
        }),
      ]),
      { rowId: "row_1", unitPrice: 320 },
    );

    expect(snapshot.rows[0].priceStatus).toBe("USER_ENTERED_PRICE");
    expect(snapshot.rows[0].totalPrice).toBe(3200);
  });

  it("clears manual price back to honest missing price", () => {
    const priced = applyEditableEstimateOverride(editableSnapshot(), { rowId: "row_1", unitPrice: 777 });
    const cleared = applyEditableEstimateOverride(priced, { rowId: "row_1", unitPrice: null });

    expect(cleared.rows[0].unitPrice).toBeNull();
    expect(cleared.rows[0].totalPrice).toBeNull();
    expect(cleared.rows[0].priceStatus).toBe("PRICE_MISSING");
    expect(cleared.rows[0].manualPrice).toBeNull();
  });

  it("preserves user quantity and price overrides across AI recalculation", () => {
    const edited = applyEditableEstimateOverride(
      applyEditableEstimateOverride(editableSnapshot(), { rowId: "row_1", quantity: 9 }),
      { rowId: "row_1", unitPrice: 888 },
    );
    const aiRecalc = editableSnapshot([
      editableRow({ rowId: "row_1", quantity: 20, unitPrice: 100, totalPrice: 2000 }),
      editableRow({ rowId: "new_row", quantity: 1, unitPrice: 50, totalPrice: 50 }),
    ]);

    const merged = mergeEditableEstimateSnapshotWithAiRecalculation({
      previousSnapshot: edited,
      aiSnapshot: aiRecalc,
      at: "2026-06-15T03:00:00.000Z",
    });

    expect(merged.rows.find((row) => row.rowId === "row_1")).toMatchObject({
      quantity: 9,
      unitPrice: 888,
      totalPrice: 7992,
      priceStatus: "USER_PRICE_OVERRIDE",
    });
    expect(merged.rows.find((row) => row.rowId === "new_row")).toBeTruthy();
    expect(merged.auditTrail.some((event) => event.type === "ai_recalculated_user_overrides_preserved")).toBe(true);
  });
});
