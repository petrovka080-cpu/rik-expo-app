import { buildStockFinanceActualsView } from "../../src/features/office/stockFinanceActuals";

describe("plan fact mapper", () => {
  it("reconciles planned vs actual quantities and money deltas", () => {
    const view = buildStockFinanceActualsView({
      requestId: "request-plan-fact",
      expectedCompanyId: "company-1",
      items: [
        {
          requestId: "request-plan-fact",
          requestItemId: "item-overrun",
          companyId: "company-1",
          materialId: "material-overrun",
          name: "Профиль",
          uom: "m",
          plannedQty: 10,
          qtyExpected: 12,
          qtyReceived: 12,
          qtyIssued: 11,
          qtyOnHand: 1,
          proposalItemId: "proposal-item-overrun",
          purchaseItemId: "purchase-item-overrun",
          warehouseUserId: "warehouse-user-1",
          objectName: "Объект",
          plannedAmount: 1000,
          procurementAmount: 1200,
          invoiceAmount: 1200,
          totalPaid: 700,
        },
        {
          requestId: "request-plan-fact",
          requestItemId: "item-saving",
          companyId: "company-1",
          materialId: "material-saving",
          name: "Крепеж",
          uom: "pcs",
          plannedQty: 100,
          qtyExpected: 90,
          qtyReceived: 90,
          qtyIssued: 80,
          qtyOnHand: 10,
          proposalItemId: "proposal-item-saving",
          purchaseItemId: "purchase-item-saving",
          warehouseUserId: "warehouse-user-1",
          objectName: "Объект",
          plannedAmount: 500,
          procurementAmount: 450,
          invoiceAmount: 450,
          totalPaid: 450,
        },
      ],
    });

    expect(view.estimatePlannedQtyVsActualQtyReconciled).toBe(true);
    expect(view.estimatePlannedAmountVsActualAmountReconciled).toBe(true);
    expect(view.items[0]?.planFact.qtyDelta).toBe(1);
    expect(view.items[0]?.planFact.amountDelta).toBe(200);
    expect(view.items[0]?.planFact.deviationKind).toBe("overrun");
    expect(view.items[1]?.planFact.qtyDelta).toBe(-20);
    expect(view.items[1]?.planFact.amountDelta).toBe(-50);
    expect(view.items[1]?.planFact.deviationKind).toBe("saving");
  });
});
