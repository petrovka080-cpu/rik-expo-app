import {
  mergeIncomingSeedRows,
  type IncomingSeedRow,
} from "../../src/screens/warehouse/warehouse.seed";

const buildRow = (overrides?: Partial<IncomingSeedRow>): IncomingSeedRow => ({
  incoming_id: "incoming-1",
  purchase_item_id: "purchase-1",
  qty_expected: 5,
  qty_received: 0,
  rik_code: "MAT-001",
  name_human: "Material 1",
  uom: "pcs",
  ...overrides,
});

describe("warehouse.seed strict-null prep", () => {
  it("merges duplicate purchase item rows deterministically", () => {
    const rows = mergeIncomingSeedRows([
      buildRow({ purchase_item_id: "purchase-1", qty_expected: 5 }),
      buildRow({ purchase_item_id: "purchase-1", qty_expected: 7 }),
      buildRow({ purchase_item_id: "purchase-2", qty_expected: 3, rik_code: "MAT-002" }),
    ]);

    expect(rows).toEqual([
      buildRow({ purchase_item_id: "purchase-1", qty_expected: 12 }),
      buildRow({ purchase_item_id: "purchase-2", qty_expected: 3, rik_code: "MAT-002" }),
    ]);
  });

  it("falls back to rik code when purchase item id is absent", () => {
    const rows = mergeIncomingSeedRows([
      buildRow({ purchase_item_id: "", rik_code: "MAT-001", qty_expected: 2 }),
      buildRow({ purchase_item_id: "", rik_code: "MAT-001", qty_expected: 4 }),
      buildRow({ purchase_item_id: "", rik_code: "MAT-003", qty_expected: 1 }),
    ]);

    expect(rows).toEqual([
      buildRow({ purchase_item_id: "", rik_code: "MAT-001", qty_expected: 6 }),
      buildRow({ purchase_item_id: "", rik_code: "MAT-003", qty_expected: 1 }),
    ]);
  });
});
