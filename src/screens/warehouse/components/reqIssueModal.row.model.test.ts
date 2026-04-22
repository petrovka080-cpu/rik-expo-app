// src/screens/warehouse/components/reqIssueModal.row.model.test.ts
import {
  selectReqIssueModalRowShape,
  selectReqIssueModalRowKey,
} from "./reqIssueModal.row.model";
import type { ReqItemUiRow } from "../warehouse.types";

function makeItem(overrides: Partial<ReqItemUiRow> = {}): ReqItemUiRow {
  return {
    request_id: "req-1",
    request_item_id: "item-1",
    display_no: "REQ-001",
    object_name: "Объект A",
    level_code: "L1",
    system_code: "S1",
    zone_code: "Z1",
    rik_code: "RIK-001",
    name_human: "Кирпич красный",
    uom: "шт",
    qty_limit: 100,
    qty_issued: 30,
    qty_left: 70,
    qty_available: 50,
    qty_can_issue_now: 40,
    ...overrides,
  };
}

describe("selectReqIssueModalRowShape", () => {
  it("computes maxUi as min(qty_available, qty_left)", () => {
    const item = makeItem({ qty_available: 50, qty_left: 70 });
    const shape = selectReqIssueModalRowShape(item, {}, false, "Иван");
    expect(shape.maxUi).toBe(50);
  });

  it("caps maxUi to qty_left when smaller than stock", () => {
    const item = makeItem({ qty_available: 100, qty_left: 20 });
    const shape = selectReqIssueModalRowShape(item, {}, false, "Иван");
    expect(shape.maxUi).toBe(20);
  });

  it("maxUi is 0 when qty_available is 0", () => {
    const item = makeItem({ qty_available: 0, qty_left: 50 });
    const shape = selectReqIssueModalRowShape(item, {}, false, "Иван");
    expect(shape.maxUi).toBe(0);
  });

  it("disabledByStock is true when issueBusy=true", () => {
    const item = makeItem({ qty_available: 50, qty_left: 50 });
    const shape = selectReqIssueModalRowShape(item, {}, true, "Иван");
    expect(shape.disabledByStock).toBe(true);
  });

  it("disabledByStock is true when maxUi=0", () => {
    const item = makeItem({ qty_available: 0, qty_left: 50 });
    const shape = selectReqIssueModalRowShape(item, {}, false, "Иван");
    expect(shape.disabledByStock).toBe(true);
  });

  it("disabledAdd is true when recipientText is empty", () => {
    const item = makeItem({ qty_available: 50, qty_left: 50 });
    const shape = selectReqIssueModalRowShape(item, {}, false, "");
    expect(shape.disabledAdd).toBe(true);
  });

  it("disabledAdd is true when recipientText is whitespace", () => {
    const item = makeItem({ qty_available: 50, qty_left: 50 });
    const shape = selectReqIssueModalRowShape(item, {}, false, "   ");
    expect(shape.disabledAdd).toBe(true);
  });

  it("disabledAdd is false when stock available and recipient present", () => {
    const item = makeItem({ qty_available: 50, qty_left: 50 });
    const shape = selectReqIssueModalRowShape(item, {}, false, "Иван");
    expect(shape.disabledAdd).toBe(false);
  });

  it("showStockZeroWarn is true when maxUi=0", () => {
    const item = makeItem({ qty_available: 0, qty_left: 50 });
    const shape = selectReqIssueModalRowShape(item, {}, false, "Иван");
    expect(shape.showStockZeroWarn).toBe(true);
    expect(shape.showReqZeroWarn).toBe(false);
  });

  it("showReqZeroWarn is true when stock > 0 but qty_can_issue_now = 0", () => {
    const item = makeItem({ qty_available: 50, qty_left: 50, qty_can_issue_now: 0 });
    const shape = selectReqIssueModalRowShape(item, {}, false, "Иван");
    expect(shape.showReqZeroWarn).toBe(true);
    expect(shape.showStockZeroWarn).toBe(false);
  });

  it("returns current qty input value from reqQtyInputByItem", () => {
    const item = makeItem();
    const shape = selectReqIssueModalRowShape(
      item,
      { "item-1": "15" },
      false,
      "Иван",
    );
    expect(shape.qtyValue).toBe("15");
  });

  it("returns empty string when item not in reqQtyInputByItem", () => {
    const item = makeItem();
    const shape = selectReqIssueModalRowShape(item, {}, false, "Иван");
    expect(shape.qtyValue).toBe("");
  });

  it("rowKey does not include positional index", () => {
    const item = makeItem({ request_item_id: "item-42", rik_code: "RIK-99", uom: "кг" });
    const shape = selectReqIssueModalRowShape(item, {}, false, "Иван");
    expect(shape.rowKey).toBe("item-42:RIK-99:кг");
  });

  it("nameHuman falls back to 'Позиция' when name_human is empty", () => {
    const item = makeItem({ name_human: "" });
    const shape = selectReqIssueModalRowShape(item, {}, false, "Иван");
    expect(shape.nameHuman).toBe("Позиция");
  });

  it("item reference is preserved in shape", () => {
    const item = makeItem();
    const shape = selectReqIssueModalRowShape(item, {}, false, "Иван");
    expect(shape.item).toBe(item);
  });
});

describe("selectReqIssueModalRowKey", () => {
  it("returns stable key without index", () => {
    const item = makeItem({ request_item_id: "id-1", rik_code: "RIK-1", uom: "шт" });
    expect(selectReqIssueModalRowKey(item)).toBe("id-1:RIK-1:шт");
  });

  it("handles null rik_code and uom gracefully", () => {
    const item = makeItem({ request_item_id: "id-2", rik_code: null, uom: null });
    expect(selectReqIssueModalRowKey(item)).toBe("id-2::");
  });
});
