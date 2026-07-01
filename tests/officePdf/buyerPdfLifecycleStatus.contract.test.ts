import {
  buildBuyerProcurementPdfView,
  renderBuyerProcurementPdfHtml,
} from "../../src/features/office/buyerProcurementPdf";
import type { BuyerInboxRow } from "../../src/lib/api/types";

describe("buyer procurement PDF lifecycle status", () => {
  it("renders supplier, price, amount, ordered, received, remaining, and financial status", () => {
    const rows: BuyerInboxRow[] = [
      {
        request_id: "request-buyer-pdf-status",
        request_item_id: "item-ordered",
        rik_code: "MAT-ORDERED",
        name_human: "Кабель",
        qty: 10,
        uom: "linear_m",
        status: "approved",
        note: "",
      },
    ];
    const view = buildBuyerProcurementPdfView({
      requestId: "request-buyer-pdf-status",
      requestLabel: "REQ-BUYER-PDF",
      items: rows,
      generatedAt: "01.07.2026, 18:30:00",
      metaByRequestItemId: {
        "item-ordered": {
          supplier: "ОсОО Электро",
          price: "35",
          qtyOrdered: 10,
          qtyExpected: 10,
          qtyReceived: 4,
          qtyLeft: 6,
          proposalItemId: "proposal-item-ordered",
          purchaseItemId: "purchase-item-ordered",
          invoiceAmount: 350,
          totalPaid: 100,
          outstandingAmount: 250,
          paymentStatus: "Частично оплачено",
        },
      },
    });
    const html = renderBuyerProcurementPdfHtml(view);

    expect(view.items[0]?.orderedText).toBe("10");
    expect(html).toContain("Поставщик");
    expect(html).toContain("Заказано");
    expect(html).toContain("Принято на склад");
    expect(html).toContain("Остаток к приёмке");
    expect(html).toContain("Финансовый статус");
    expect(html).toContain("ОсОО Электро");
    expect(html).toContain("350 сом");
    expect(html).toContain("10");
    expect(html).toContain("4 из 10");
    expect(html).toContain(">6<");
    expect(html).toContain("Частично оплачено");
    expect(html).not.toMatch(/canonical_v3|source-of-truth|allocation-level|invoice-level|undefined|null|NaN|\?/i);
  });
});
