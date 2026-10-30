import {
  buildBuyerProcurementPdfView,
  renderBuyerProcurementPdfHtml,
} from "../../src/features/office/buyerProcurementPdf";
import type { BuyerInboxRow } from "../../src/lib/api/types";

const rows: BuyerInboxRow[] = [
  {
    request_id: "request-pdf-lifecycle",
    request_item_id: "item-1",
    rik_code: "MAT-1",
    name_human: "Кабель",
    qty: 10,
    uom: "linear_m",
    status: "approved",
    note: "Объект: Административное здание; Этаж / уровень: 2 этаж; Система: Электрика; Зона: Щитовая",
  },
  {
    request_id: "request-pdf-lifecycle",
    request_item_id: "item-2",
    rik_code: "MAT-2",
    name_human: "Крепёж",
    qty: 100,
    uom: "pcs",
    status: "approved",
    note: "",
  },
];

describe("buyer procurement lifecycle PDF", () => {
  it("renders lifecycle section with status, supplier, prices, warehouse receipt, remaining qty, and finance status", () => {
    const view = buildBuyerProcurementPdfView({
      requestId: "request-pdf-lifecycle",
      requestLabel: "REQ-0801/2026",
      items: rows,
      metaByRequestItemId: {
        "item-1": {
          proposalId: "proposal-1",
          proposalItemId: "proposal-item-1",
          purchaseItemId: "purchase-item-1",
          supplier: "ОсОО Электро",
          price: "35",
          note: "Доставка завтра",
          qtyExpected: 10,
          qtyReceived: 4,
          qtyLeft: 6,
          invoiceAmount: 350,
          paymentStatus: "К оплате",
        },
        "item-2": {
          tenderState: "Торги / запрос цены",
        },
      },
      generatedAt: "01.07.2026, 15:00:00",
    });
    const html = renderBuyerProcurementPdfHtml(view);

    expect(view.items).toHaveLength(2);
    expect(html).toContain("Жизненный цикл закупки");
    expect(html).toContain("Принято частично");
    expect(html).toContain("Торги / запрос цены");
    expect(html).toContain("ОсОО Электро");
    expect(html).toContain("350 сом");
    expect(html).toContain("4 из 10");
    expect(html).toContain(">6<");
    expect(html).toContain("Оплата запланирована");
    expect(html).toContain("пог. м");
    expect(html).toContain("шт.");
    expect(html).not.toMatch(/\?|canonical_v3|source-of-truth|allocation-level|invoice-level/);
  });
});
