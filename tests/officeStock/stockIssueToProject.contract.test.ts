import { buildStockFinanceActualsView } from "../../src/features/office/stockFinanceActuals";

describe("stock issue to project actuals", () => {
  it("supports issue to object, persists issued qty in the ledger view, and exposes foreman material status", () => {
    const view = buildStockFinanceActualsView({
      requestId: "request-stock-issue",
      expectedCompanyId: "company-1",
      items: [
        {
          requestId: "request-stock-issue",
          requestItemId: "item-fastener",
          companyId: "company-1",
          materialId: "material-fastener",
          name: "Крепеж",
          uom: "pcs",
          plannedQty: 100,
          qtyExpected: 100,
          qtyReceived: 80,
          qtyIssued: 30,
          qtyOnHand: 50,
          proposalItemId: "proposal-item-fastener",
          purchaseItemId: "purchase-item-fastener",
          warehouseUserId: "warehouse-user-1",
          objectId: "object-1",
          objectName: "Объект Восток",
          issuedToUserId: "foreman-1",
          issuedToName: "Прораб",
          price: 5,
          plannedAmount: 500,
          invoiceAmount: 500,
          totalPaid: 500,
          paymentStatus: "Оплачено",
        },
      ],
    });

    const issue = view.ledgerEntries.find((entry) => entry.kind === "issue");

    expect(view.warehouseIssueToProjectSupported).toBe(true);
    expect(view.foremanReceivesMaterialsOrSeesStock).toBe(true);
    expect(issue).toMatchObject({
      qty: 30,
      signedQty: -30,
      targetObjectId: "object-1",
      targetObjectName: "Объект Восток",
      createdFrom: "warehouse_issue",
      hasRequiredScope: true,
    });
    expect(view.items[0]?.stock.remainingAfterIssueQty).toBe(50);
    expect(view.items[0]?.stock.noNegativeStockWithoutPolicy).toBe(true);
  });
});
