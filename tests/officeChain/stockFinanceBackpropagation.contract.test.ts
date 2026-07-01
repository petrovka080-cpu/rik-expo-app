import { buildStockFinanceActualsView } from "../../src/features/office/stockFinanceActuals";

describe("stock finance backpropagation", () => {
  it("returns one actuals view for warehouse, accountant, director, and foreman", () => {
    const view = buildStockFinanceActualsView({
      requestId: "request-stock-finance-chain",
      expectedCompanyId: "company-1",
      items: [
        {
          requestId: "request-stock-finance-chain",
          requestItemId: "item-chain-1",
          companyId: "company-1",
          materialId: "material-chain-1",
          name: "Баллон кислород 40 л",
          uom: "l",
          plannedQty: 2,
          qtyExpected: 2,
          qtyReceived: 2,
          qtyIssued: 1,
          qtyOnHand: 1,
          proposalId: "proposal-chain",
          proposalItemId: "proposal-item-chain-1",
          purchaseItemId: "purchase-item-chain-1",
          warehouseUserId: "warehouse-user-1",
          objectName: "Объект",
          plannedAmount: 3400,
          procurementAmount: 3400,
          invoiceAmount: 3400,
          totalPaid: 3400,
          outstandingAmount: 0,
          paymentStatus: "Оплачено",
          hasInvoice: true,
        },
        {
          requestId: "request-stock-finance-chain",
          requestItemId: "item-chain-2",
          companyId: "company-1",
          materialId: "material-chain-2",
          name: "ГКЛ Гипрок Q4",
          uom: "m2",
          plannedQty: 100,
          qtyExpected: 100,
          qtyReceived: 60,
          qtyIssued: 40,
          qtyOnHand: 20,
          proposalId: "proposal-chain",
          proposalItemId: "proposal-item-chain-2",
          purchaseItemId: "purchase-item-chain-2",
          warehouseUserId: "warehouse-user-1",
          objectName: "Объект",
          plannedAmount: 1000,
          procurementAmount: 1000,
          invoiceAmount: 1000,
          totalPaid: 400,
          outstandingAmount: 600,
          paymentStatus: "Частично оплачено",
          hasInvoice: true,
        },
      ],
    });

    expect(view.warehouseStockLedgerCreated).toBe(true);
    expect(view.warehouseReceiptUpdatesStock).toBe(true);
    expect(view.warehouseIssueToProjectSupported).toBe(true);
    expect(view.accountantInvoicePaymentTiedToProcurement).toBe(true);
    expect(view.financialActualsWritten).toBe(true);
    expect(view.directorPlanFactVisible).toBe(true);
    expect(view.foremanPlanFactVisible).toBe(true);
    expect(view.estimatePlannedQtyVsActualQtyReconciled).toBe(true);
    expect(view.estimatePlannedAmountVsActualAmountReconciled).toBe(true);
    expect(view.noNegativeStockWithoutPolicy).toBe(true);
    expect(view.noFakeZeroAmount).toBe(true);
    expect(view.noQuestionMarkPlaceholders).toBe(true);
    expect(view.noCrossCompanyLeak).toBe(true);
    expect(view.noFakeGreen).toBe(true);
  });
});
