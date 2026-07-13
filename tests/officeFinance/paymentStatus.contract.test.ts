import { buildStockFinanceActualsItemView } from "../../src/features/office/stockFinanceActuals";

const base = {
  requestId: "request-payment-status",
  requestItemId: "item-payment",
  companyId: "company-1",
  materialId: "material-payment",
  name: "Материал",
  uom: "pcs",
  plannedQty: 2,
  qtyExpected: 2,
  qtyReceived: 2,
  qtyIssued: 1,
  qtyOnHand: 1,
  proposalItemId: "proposal-item-payment",
  purchaseItemId: "purchase-item-payment",
  warehouseUserId: "warehouse-user-1",
  objectName: "Объект",
  price: 100,
  plannedAmount: 200,
  invoiceAmount: 200,
};

describe("accounting payment status", () => {
  it("maps planned, partial, and paid statuses without debug vocabulary", () => {
    const planned = buildStockFinanceActualsItemView({
      ...base,
      totalPaid: 0,
      outstandingAmount: 200,
      paymentStatus: "К оплате",
    });
    const partial = buildStockFinanceActualsItemView({
      ...base,
      totalPaid: 50,
      outstandingAmount: 150,
      paymentStatus: "Частично оплачено",
    });
    const paid = buildStockFinanceActualsItemView({
      ...base,
      totalPaid: 200,
      outstandingAmount: 0,
      paymentStatus: "Оплачено",
    });

    expect(planned.finance.paymentStatus).toBe("payment_planned");
    expect(partial.finance.paymentStatus).toBe("partially_paid");
    expect(paid.finance.paymentStatus).toBe("paid");
    expect(JSON.stringify([planned.finance, partial.finance, paid.finance])).not.toMatch(
      /canonical_v3|source-of-truth|allocation-level|invoice-level|undefined|NaN/i,
    );
  });
});
