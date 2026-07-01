import { buildStockFinanceActualsView } from "../../src/features/office/stockFinanceActuals";

describe("foreman material status", () => {
  it("shows procurement, received, issued, and remaining material status from the same stock view", () => {
    const view = buildStockFinanceActualsView({
      requestId: "request-foreman-material",
      expectedCompanyId: "company-1",
      items: [
        {
          requestId: "request-foreman-material",
          requestItemId: "item-foreman",
          companyId: "company-1",
          materialId: "material-foreman",
          name: "Штукатурка",
          uom: "bag",
          plannedQty: 20,
          qtyExpected: 20,
          qtyReceived: 12,
          qtyIssued: 7,
          qtyOnHand: 5,
          proposalItemId: "proposal-item-foreman",
          purchaseItemId: "purchase-item-foreman",
          warehouseUserId: "warehouse-user-1",
          objectName: "Объект",
          issuedToName: "Прораб",
          plannedAmount: 2000,
          procurementAmount: 2000,
          invoiceAmount: 2000,
          totalPaid: 1000,
        },
      ],
    });

    const item = view.items[0];

    expect(view.foremanPlanFactVisible).toBe(true);
    expect(view.foremanReceivesMaterialsOrSeesStock).toBe(true);
    expect(item?.planFact.actualProcuredQty).toBe(20);
    expect(item?.planFact.actualReceivedQty).toBe(12);
    expect(item?.planFact.actualIssuedQty).toBe(7);
    expect(item?.stock.remainingAfterIssueQty).toBe(5);
  });
});
