import {
  buildBuyerProcurementPdfView,
  renderBuyerProcurementPdfHtml,
} from "../../src/features/office/buyerProcurementPdf";
import type { BuyerInboxRow } from "../../src/lib/api/types";

const rows: BuyerInboxRow[] = [
  {
    request_id: "request-1",
    request_item_id: "item-1",
    rik_code: "MAT-1",
    name_human: "Плитка",
    qty: 12,
    uom: "sq_m",
    status: "approved",
    note:
      "Объект: Общежитие / вахтовый городок; Этаж / уровень: -2 этаж; Система: Весь раздел; Зона: Без детализации",
    object_name: null,
  },
  {
    request_id: "request-1",
    request_item_id: "item-2",
    rik_code: "MAT-2",
    name_human: "Саморез",
    qty: 100,
    uom: "pcs",
    status: "approved",
    note: "",
    object_name: null,
  },
  {
    request_id: "request-1",
    request_item_id: "item-3",
    rik_code: "MAT-3",
    name_human: "Мешок цемента",
    qty: 3,
    uom: "bag",
    status: "approved",
    note: "",
    object_name: null,
  },
];

describe("buyer procurement PDF", () => {
  it("renders procurement sheet title, full context, all items, localized units, and unknown UX", () => {
    const view = buildBuyerProcurementPdfView({
      requestId: "request-1",
      requestLabel: "REQ-0653/2026",
      items: rows,
      metaByRequestItemId: {
        "item-2": { price: "15", supplier: "ОсОО Поставщик", note: "Доставка завтра" },
      },
      generatedAt: "01.07.2026, 12:00:00",
    });
    const html = renderBuyerProcurementPdfHtml(view);

    expect(view.title).toBe("Закупочный лист REQ-0653/2026");
    expect(view.items).toHaveLength(3);
    expect(view.contextLines).toEqual(
      expect.arrayContaining([
        "Объект: Общежитие / вахтовый городок",
        "Этаж / уровень: -2 этаж",
        "Система / раздел: Весь раздел",
        "Зона: Без детализации",
      ]),
    );
    expect(html).toContain("Закупочный лист REQ-0653/2026");
    expect(html).toContain("Плитка");
    expect(html).toContain("Саморез");
    expect(html).toContain("Мешок&#160;<wbr>цемента");
    expect(html).toContain("м²");
    expect(html).toContain("шт.");
    expect(html).toContain("меш.");
    expect(html).toContain("Не заполнено");
    expect(html).toContain("Не выбран");
    expect(html).toContain("появится после цены");
    expect(html).not.toMatch(/\bsq_m\b|\bpcs\b|\bbag\b|\?/);
  });

  it("uses enriched request context fields when buyer item notes are empty", () => {
    const view = buildBuyerProcurementPdfView({
      requestId: "request-2",
      requestLabel: "REQ-0701/2026",
      items: [
        {
          request_id: "request-2",
          request_item_id: "item-10",
          rik_code: "MAT-10",
          name_human: "Кабель",
          qty: 5,
          uom: "linear_m",
          status: "approved",
          note: "",
          object_name: "Административное здание",
          level_code: "LVL-01",
          system_code: "SYS-EL",
          zone_code: "ZONE-101",
        },
      ],
      generatedAt: "01.07.2026, 12:30:00",
    });

    expect(view.contextLines).toEqual(
      expect.arrayContaining([
        "Объект: Административное здание",
        "Этаж / уровень: LVL-01",
        "Система / раздел: SYS-EL",
        "Зона: ZONE-101",
        "Локация: LVL-01",
      ]),
    );
  });

  it("renders long procurement sheets without dropping late waste/support rows", () => {
    const longRows: BuyerInboxRow[] = Array.from({ length: 34 }, (_value, index) => ({
      request_id: "request-long",
      request_item_id: `item-long-${index + 1}`,
      rik_code: `MAT-LONG-${index + 1}`,
      name_human:
        index === 32
          ? "Запас материалов на подрезку"
          : `Материал закупки ${index + 1}`,
      qty: index + 1,
      uom: index === 32 ? "bag" : "pcs",
      status: "approved",
      note:
        index === 0
          ? "Объект: Административное здание; Этаж / уровень: 3 этаж; Система: Отделка; Зона: Правое крыло"
          : "",
      object_name: index === 0 ? "Административное здание" : null,
      kind: index === 32 ? "waste" : "material",
    }));

    const view = buildBuyerProcurementPdfView({
      requestId: "request-long",
      requestLabel: "REQ-0702/2026",
      items: longRows,
      generatedAt: "01.07.2026, 13:00:00",
    });
    const html = renderBuyerProcurementPdfHtml(view);

    expect(view.items).toHaveLength(34);
    expect(view.items[32]?.name).toBe("Запас материалов на подрезку");
    expect(html).toContain("Позиций: 34");
    expect(html).toContain("Материал&#160;<wbr>закупки&#160;<wbr>1");
    expect(html).toContain("Материал&#160;<wbr>закупки&#160;<wbr>34");
    expect(html).toContain("Запас&#160;<wbr>материалов&#160;<wbr>на&#160;<wbr>подрезку");
    expect(html).toContain("меш.");
  });

  it("preserves Russian word boundaries in item text when the browser extracts PDF text", () => {
    const view = buildBuyerProcurementPdfView({
      requestId: "request-word-boundaries",
      requestLabel: "REQ-0703/2026",
      items: [
        {
          request_id: "request-word-boundaries",
          request_item_id: "item-floor",
          rik_code: "MAT-FLOOR",
          name_human: "Проверка перепадов пола",
          qty: 100,
          uom: "sq_m",
          status: "approved",
          note: "",
          object_name: "Административное здание",
        },
        {
          request_id: "request-word-boundaries",
          request_item_id: "item-locks",
          rik_code: "MAT-LOCKS",
          name_human: "Проверка зазоров и замков",
          qty: 100,
          uom: "sq_m",
          status: "approved",
          note: "",
          object_name: "Административное здание",
        },
      ],
      generatedAt: "01.07.2026, 13:30:00",
    });
    const html = renderBuyerProcurementPdfHtml(view);

    expect(view.items.map((item) => item.name)).toEqual([
      "Проверка перепадов пола",
      "Проверка зазоров и замков",
    ]);
    expect(html).toContain("Проверка&#160;<wbr>перепадов&#160;<wbr>пола");
    expect(html).toContain("Проверка&#160;<wbr>зазоров&#160;<wbr>и&#160;<wbr>замков");
  });
});
