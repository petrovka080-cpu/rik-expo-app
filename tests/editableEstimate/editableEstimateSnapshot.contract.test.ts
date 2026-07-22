import {
  createEditableEstimateSnapshot,
  editableEstimateSnapshotHashBasis,
  recalculateEditableEstimateTotals,
  validateEditableEstimateSnapshot,
} from "../../src/lib/ai/editableEstimate";
import { applyEditableEstimateOverride } from "../../src/lib/ai/editableEstimate/applyEditableEstimateOverride";
import { editableRow, editableSnapshot } from "./editableEstimateTestHelpers";

describe("editable estimate snapshot core", () => {
  it("creates a hashed snapshot with recalculated totals", () => {
    const snapshot = editableSnapshot([
      editableRow({ rowId: "material", rowType: "material", quantity: 2, unitPrice: 1000, totalPrice: 2000 }),
      editableRow({ rowId: "labor", rowType: "work", quantity: 3, unitPrice: 500, totalPrice: 1500 }),
    ]);

    expect(snapshot.hash).toMatch(/^[a-f0-9]{8}$/);
    expect(snapshot.totals.materialsTotal).toBe(2000);
    expect(snapshot.totals.laborTotal).toBe(1500);
    expect(snapshot.totals.grandTotal).toBe(3500);
    expect(validateEditableEstimateSnapshot(snapshot).valid).toBe(true);
  });

  it("keeps PRICE_MISSING rows out of line totals", () => {
    const snapshot = editableSnapshot([
      editableRow({
        rowId: "missing",
        unitPrice: null,
        totalPrice: null,
        priceStatus: "PRICE_MISSING",
        priceSource: "missing",
        priceSourceId: null,
      }),
    ]);

    expect(snapshot.totals.pricedRows).toBe(0);
    expect(snapshot.totals.missingPriceRows).toBe(1);
    expect(snapshot.totals.grandTotal).toBe(0);
  });

  it("normalizes catalog prices as catalog verified only when a catalog source is present", () => {
    const snapshot = createEditableEstimateSnapshot({
      snapshotId: "snapshot_catalog",
      requestDraftId: "draft_catalog",
      rows: [
        editableRow({
          rowId: "catalog",
          rowSource: "catalog_item",
          catalogItemId: "catalog_laminate",
          selectedCatalogItemId: "catalog_laminate",
          sourceId: "catalog_items",
          sourceLabel: "catalog_items",
          priceStatus: "PRICE_MISSING",
          priceSource: "missing",
          priceSourceId: null,
        }),
      ],
      createdAt: "2026-06-15T00:00:00.000Z",
    });

    expect(snapshot.rows[0].priceStatus).toBe("CATALOG_PRICE_VERIFIED");
    expect(snapshot.rows[0].priceSource).toBe("catalog_item");
    expect(snapshot.rows[0].priceSourceId).toBe("catalog_items");
  });

  it("recalculates typed totals by row domain", () => {
    const totals = recalculateEditableEstimateTotals([
      editableRow({ rowId: "mat", rowType: "material", quantity: 1, unitPrice: 100, totalPrice: 100 }),
      editableRow({ rowId: "work", rowType: "work", quantity: 1, unitPrice: 200, totalPrice: 200 }),
      editableRow({ rowId: "svc", rowType: "service", quantity: 1, unitPrice: 300, totalPrice: 300 }),
      editableRow({ rowId: "other", rowType: "other", quantity: 1, unitPrice: 400, totalPrice: 400 }),
    ]);

    expect(totals).toMatchObject({
      materialsTotal: 100,
      laborTotal: 200,
      equipmentTotal: 300,
      otherTotal: 400,
      grandTotal: 1000,
    });
  });

  it("bounds diagnostic trace in the snapshot hash basis without hiding quantity changes", () => {
    const snapshot = editableSnapshot([
      editableRow({
        rowId: "heavy",
        calculationTrace: `formula=q; ${"trace".repeat(5000)}`,
        sourceParameters: {
          rowCode: "heavy_row",
          oversizedRuntimeTrace: "x".repeat(120_000),
        },
      }),
    ]);
    const edited = applyEditableEstimateOverride(snapshot, {
      rowId: "heavy",
      quantity: 12,
      at: "2026-06-15T01:00:00.000Z",
    });
    const { hash: _hash, ...snapshotWithoutHash } = snapshot;
    const basisText = JSON.stringify(editableEstimateSnapshotHashBasis(snapshotWithoutHash));

    expect(basisText.length).toBeLessThan(2_000);
    expect(snapshot.hash).not.toBe(edited.hash);
    expect(validateEditableEstimateSnapshot(snapshot).valid).toBe(true);
    expect(validateEditableEstimateSnapshot(edited).valid).toBe(true);
  });

  it("keeps override audit hashes valid without a second row refresh", () => {
    const snapshot = createEditableEstimateSnapshot({
      snapshotId: "editable_estimate:audit_hash",
      requestDraftId: "request_audit_hash",
      rows: [editableRow({ rowId: "row_1", quantity: 2, unitPrice: 10 })],
    });

    const edited = applyEditableEstimateOverride(snapshot, {
      rowId: "row_1",
      quantity: 3,
      actorUserId: "consumer-demo-user",
      reason: "contract_hash_validation",
    });

    expect(edited.auditTrail.at(-1)?.type).toBe("quantity_overridden");
    expect(edited.totals.grandTotal).toBe(30);
    expect(validateEditableEstimateSnapshot(edited).valid).toBe(true);
  });
});
