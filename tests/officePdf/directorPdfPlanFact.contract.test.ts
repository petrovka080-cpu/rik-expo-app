import { buildStockFinanceActualsView } from "../../src/features/office/stockFinanceActuals";
import { renderDirectorPlanFactPdfHtml } from "../../src/lib/pdf/director/planFact";

describe("director plan fact PDF", () => {
  it("renders plan-fact actual quantities, amounts, paid value, and deviations without debug rows", () => {
    const view = buildStockFinanceActualsView({
      requestId: "REQ-PLAN-FACT",
      expectedCompanyId: "company-1",
      items: [
        {
          requestId: "REQ-PLAN-FACT",
          requestItemId: "item-pdf",
          companyId: "company-1",
          materialId: "material-pdf",
          name: "Кабель",
          uom: "linear_m",
          plannedQty: 10,
          qtyExpected: 12,
          qtyReceived: 12,
          qtyIssued: 8,
          qtyOnHand: 4,
          proposalItemId: "proposal-item-pdf",
          purchaseItemId: "purchase-item-pdf",
          warehouseUserId: "warehouse-user-1",
          objectName: "Объект",
          plannedAmount: 1000,
          procurementAmount: 1200,
          invoiceAmount: 1200,
          totalPaid: 600,
        },
      ],
    });

    const html = renderDirectorPlanFactPdfHtml(view);

    expect(html).toContain("План-факт");
    expect(html).toContain("Плановое количество");
    expect(html).toContain("Закуплено");
    expect(html).toContain("Принято");
    expect(html).toContain("Выдано");
    expect(html).toContain("Фактическая сумма");
    expect(html).toContain("Отклонение суммы");
    expect(html).toContain("1 200 KGS");
    expect(html).toContain("600 KGS");
    expect(html).not.toMatch(/canonical_v3|source-of-truth|allocation-level|invoice-level|undefined|null|NaN|\?/i);
  });
});
