import { buildStockFinanceActualsItemView } from "../../src/features/office/stockFinanceActuals";

describe("stock balance invariants", () => {
  it("blocks negative stock unless an explicit policy allows it", () => {
    const strict = buildStockFinanceActualsItemView({
      requestId: "request-negative",
      requestItemId: "item-negative",
      companyId: "company-1",
      materialId: "material-negative",
      name: "Материал",
      uom: "pcs",
      plannedQty: 2,
      qtyExpected: 2,
      qtyReceived: 2,
      qtyIssued: 3,
      qtyOnHand: -1,
      proposalItemId: "proposal-item-negative",
      purchaseItemId: "purchase-item-negative",
      warehouseUserId: "warehouse-user-1",
      objectName: "Объект",
      price: 10,
      plannedAmount: 20,
      invoiceAmount: 20,
    });
    const allowed = buildStockFinanceActualsItemView({
      ...strict.source,
      allowNegativeStock: true,
    });

    expect(strict.stock.noNegativeStockWithoutPolicy).toBe(false);
    expect(allowed.stock.noNegativeStockWithoutPolicy).toBe(true);
  });

  it("detects unit and company scope mismatches instead of hiding them", () => {
    const item = buildStockFinanceActualsItemView({
      requestId: "request-scope",
      requestItemId: "item-scope",
      companyId: "company-2",
      expectedCompanyId: "company-1",
      materialId: "material-scope",
      name: "Материал",
      uom: "pcs",
      stockUom: "kg",
      plannedQty: 10,
      qtyExpected: 10,
      qtyReceived: 4,
      qtyIssued: 1,
      qtyOnHand: 3,
      proposalItemId: "proposal-item-scope",
      purchaseItemId: "purchase-item-scope",
      warehouseUserId: "warehouse-user-1",
      objectName: "Объект",
      price: 10,
      plannedAmount: 100,
      invoiceAmount: 100,
    });

    expect(item.stock.unitMatchesRequestItem).toBe(false);
    expect(item.stock.noCrossCompanyLeak).toBe(false);
    expect(item.stock.itemScopeEnforced).toBe(true);
  });
});
