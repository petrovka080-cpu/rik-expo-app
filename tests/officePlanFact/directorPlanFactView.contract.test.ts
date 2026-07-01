import { buildStockFinanceActualsView } from "../../src/features/office/stockFinanceActuals";

describe("director plan fact view", () => {
  it("exposes summary, stock progress, financial progress, and budget deviation", () => {
    const view = buildStockFinanceActualsView({
      requestId: "request-director-plan-fact",
      expectedCompanyId: "company-1",
      items: [
        {
          requestId: "request-director-plan-fact",
          requestItemId: "item-1",
          companyId: "company-1",
          materialId: "material-1",
          name: "ГКЛ",
          uom: "pcs",
          plannedQty: 50,
          qtyExpected: 55,
          qtyReceived: 55,
          qtyIssued: 40,
          qtyOnHand: 15,
          proposalItemId: "proposal-item-1",
          purchaseItemId: "purchase-item-1",
          warehouseUserId: "warehouse-user-1",
          objectName: "Объект",
          plannedAmount: 5000,
          procurementAmount: 5500,
          invoiceAmount: 5500,
          totalPaid: 3000,
          outstandingAmount: 2500,
        },
      ],
    });

    expect(view.directorPlanFactVisible).toBe(true);
    expect(view.directorBudgetDeviationVisible).toBe(true);
    expect(view.totals).toMatchObject({
      plannedQty: 50,
      procuredQty: 55,
      receivedQty: 55,
      issuedQty: 40,
      plannedAmount: 5000,
      procurementAmount: 5500,
      paidAmount: 3000,
      amountDelta: 500,
    });
    expect(view.items[0]?.planFact.directorVisible).toBe(true);
  });
});
