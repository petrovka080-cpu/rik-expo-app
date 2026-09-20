import {
  buildCanonicalProfessionalPdfProjection,
  canonicalProfessionalPdfCategory,
  CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER,
  CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,
} from "./canonicalProfessionalPdf";
import type { CanonicalArtifactRow } from "./canonicalEstimateArtifactContract";

function revision(rowCount: number) {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    release_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    catalog_id: "canonical-work:roof",
    checksum_sha256: "f".repeat(64),
    row_count: rowCount,
    revision_number: 7,
    currency_code: "KGS",
    totals: { amount: "0" },
    input_parameters: { roof_area_m2: 216, confirmed: true },
    primary_measure_value: "216",
    primary_measure_unit_id: "m2",
    created_at: "2026-09-04T10:30:00.000Z",
  };
}

const categories = ["material", "labor", "equipment", "service", "transport"];

function rows(
  count: number,
  options: { missingAt?: number; longTitleAt?: number } = {},
): CanonicalArtifactRow[] {
  return Array.from({ length: count }, (_, index) => {
    const category = categories[index % categories.length];
    const missing = index === options.missingAt;
    return {
      row_id: `row-${index + 1}`,
      ordinal: index,
      section: category,
      category,
      title_ru: index === options.longTitleAt
        ? "Комплект фасонных деталей для устройства герметичного примыкания кровельного покрытия к парапету с защитой от атмосферных осадков"
        : `Профессиональная позиция ${index + 1}`,
      unit_id: index % 2 === 0 ? "m2" : "m3",
      quantity: index === 0 ? "12.3456" : "2",
      unit_price: missing ? null : "100",
      amount: missing ? null : "200",
      currency_code: "KGS",
      procurement_eligible: category === "material",
      included_in_estimate: true,
      included_in_procurement: category === "material",
      ownership_status: "OWNED",
      calculation_trace: index === options.longTitleAt
        ? { specificationRu: "Толщина и марка уточняются по проекту", inputParameterIds: ["roof_area_m2"] }
        : { formulaExplanationRu: "Количество принято из immutable revision" },
      normative_trace: [{ sourceId: "СП КР", locator: `таблица ${index + 1}` }],
      row_sha256: String(index + 1).padStart(64, "0"),
    };
  });
}

describe("R4-A6 canonical professional PDF", () => {
  it("renders the required client form and technical projection from one immutable revision", () => {
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: revision(45),
      rows: rows(45, { missingAt: 3, longTitleAt: 4 }),
      workTitleRu: "Монтаж кровельного покрытия",
      definitionVersionId: "99999999-8888-7777-6666-555555555555",
    });

    expect(CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION).toBe("canonical-professional-pdf.r4-a10");
    expect(projection).toMatchObject({
      rowCount: 45,
      pricedRowCount: 44,
      missingPriceRowCount: 1,
      grandTotalStatus: "PARTIAL_NEEDS_PRICE",
      currencyCode: "KGS",
    });
    expect(Object.keys(projection.categoryTotals)).toEqual(CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER);
    expect(projection.html).toContain("Наименование и спецификация");
    expect(projection.html).toContain("Категория");
    expect(projection.html).toContain("Цена за единицу");
    expect(projection.html).toContain("Материалы");
    expect(projection.html).toContain("Работы");
    expect(projection.html).toContain("Механизмы");
    expect(projection.html).toContain("Услуги");
    expect(projection.html).toContain("Доставка");
    expect(projection.html).toContain("Требуется цена");
    expect(projection.html).toContain("<strong>Статус:</strong> Предварительная");
    expect(projection.html).toContain("Оценено частично");
    expect(projection.html).toContain("Полный итог: требуется уточнение цен");
    expect(projection.html).toContain("Техническое приложение");
    expect(projection.html).toContain("roof_area_m2");
    expect(projection.html).toContain("м²");
    expect(projection.html).toContain("м³");
    expect(projection.html).toContain("Составил");
    expect(projection.html).toContain("Проверил");
    expect(projection.html).toContain("Утвердил");
    expect(projection.html).not.toContain("developer mode");
    expect(projection.html).not.toContain("email");
  });

  it.each([1, 45, 100, 500, 1001])("preserves all %i rows without a fixed 45-row limit", (rowCount) => {
    const sourceRows = rows(rowCount, { longTitleAt: rowCount - 1 });
    const startedAt = Date.now();
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: revision(rowCount),
      rows: sourceRows,
      workTitleRu: "Производственная смета",
    });
    expect(projection.rowCount).toBe(rowCount);
    expect(projection.missingPriceRowCount).toBe(0);
    expect(projection.grandTotalStatus).toBe("COMPLETE");
    expect(projection.html).toContain("<strong>Статус:</strong> Полная");
    expect(projection.html).toContain(String(sourceRows[sourceRows.length - 1]?.title_ru));
    expect(projection.html).toContain("break-inside:avoid");
    expect(projection.html).toContain("display:table-header-group");
    expect(projection.footerTemplate).toContain("Страница");
    expect(projection.footerTemplate).toContain('class="pageNumber"');
    expect(projection.footerTemplate).toContain('class="totalPages"');
    expect(Date.now() - startedAt).toBeLessThan(5_000);
  });

  it("keeps zero distinct from null and blocks mixed currencies", () => {
    const zeroRows = rows(1);
    zeroRows[0]!.unit_price = "0";
    zeroRows[0]!.amount = "0";
    const zero = buildCanonicalProfessionalPdfProjection({
      revision: revision(1), rows: zeroRows, workTitleRu: "Нулевая цена",
    });
    expect(zero.grandTotalStatus).toBe("COMPLETE");
    expect(zero.html).toContain("0,00 сом");

    const mixed = rows(2);
    mixed[1]!.currency_code = "USD";
    expect(() => buildCanonicalProfessionalPdfProjection({
      revision: revision(2), rows: mixed, workTitleRu: "Смешанная валюта",
    })).toThrow("multiple currencies");

    const mixedWithoutPrice = rows(2);
    mixedWithoutPrice[1]!.unit_price = null;
    mixedWithoutPrice[1]!.amount = null;
    mixedWithoutPrice[1]!.currency_code = "USD";
    expect(() => buildCanonicalProfessionalPdfProjection({
      revision: revision(2), rows: mixedWithoutPrice, workTitleRu: "Смешанная валюта без цены",
    })).toThrow("multiple currencies");
  });

  it("prints unresolved server-owned needs without inventing quantities or totals", () => {
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: revision(1),
      rows: rows(1),
      preliminaryNeeds: [{
        row_id: "primer",
        ordinal: 1,
        section: "materials",
        category: "material",
        title_ru: "Совместимая грунтовка",
        unit_id: "kg",
        quantity: null,
        unit_price: null,
        included_in_estimate: false,
        included_in_procurement: false,
        procurement_eligible: false,
        ownership_status: "PRELIMINARY_NEED",
        row_sha256: "9".repeat(64),
        missing_parameter_ids: ["primer_consumption_kg_m2"],
      }],
      workTitleRu: "Подготовка потолка из ГКЛ",
    });

    expect(projection.preliminaryNeedCount).toBe(1);
    expect(projection.grandTotalStatus).toBe("PARTIAL_NEEDS_PRICE");
    expect(projection.html).toContain("Совместимая грунтовка");
    expect(projection.html).toContain("Количество нужно уточнить");
    expect(projection.html).toContain("В сумму и закупку позиция не включена");
    expect(projection.html).not.toContain(">0 kg<");
  });

  it("keeps non-payable canonical composition beside unresolved needs", () => {
    const compositionRows = rows(2);
    compositionRows[0]!.included_in_estimate = false;
    compositionRows[0]!.included_in_procurement = false;
    compositionRows[0]!.unit_price = null;
    compositionRows[0]!.amount = null;
    compositionRows[0]!.ownership_status = "OWNED_EXCLUDED";
    compositionRows[0]!.calculation_trace = {
      resourceGraph: { costTreatment: "INCLUDED_IN_RESOURCE_ROWS" },
    };
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: {
        ...revision(2),
        totals: { amount: "200", includedRowCount: 1 },
      },
      rows: compositionRows,
      expectedProjectedRowCount: 2,
      preliminaryNeeds: [{
        ...rows(1)[0]!,
        row_id: "need-3",
        ordinal: 2,
        quantity: null,
        unit_price: null,
        amount: null,
        included_in_estimate: false,
        included_in_procurement: false,
        ownership_status: "PRELIMINARY_NEED",
      }],
      workTitleRu: "Уплотнение покрытия",
    });

    expect(projection).toMatchObject({
      rowCount: 3,
      pricedRowCount: 1,
      missingPriceRowCount: 0,
      nonPayableRowCount: 1,
      preliminaryNeedCount: 1,
    });
    expect(projection.html).toContain("Отдельно не оплачивается");
    expect(projection.html).toContain("Не применяется");
    expect(projection.html).toContain("Не суммируется");
    expect(projection.html.indexOf("Профессиональная позиция 1"))
      .toBeLessThan(projection.html.indexOf("Профессиональная позиция 2"));
  });

  it("fails closed when projected rows differ from revision truth", () => {
    expect(() => buildCanonicalProfessionalPdfProjection({
      revision: revision(2), rows: rows(1), workTitleRu: "Несовпадение",
    })).toThrow("row count differs");
  });

  it("escapes title and specification markup without creating embedded links", () => {
    const maliciousRows = rows(1);
    maliciousRows[0]!.title_ru = '<script>alert("row")</script><a href="javascript:alert(1)">link</a>';
    maliciousRows[0]!.calculation_trace = {
      specificationRu: '<img src=x onerror="alert(2)">',
      inputParameterIds: ["safe_parameter"],
    };
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: revision(1),
      rows: maliciousRows,
      workTitleRu: '<iframe src="https://attacker.invalid"></iframe>',
    });

    expect(projection.html).toContain("&lt;script&gt;");
    expect(projection.html).toContain("&lt;img src=x onerror=&quot;alert(2)&quot;&gt;");
    expect(projection.html).toContain("&lt;iframe src=&quot;https://attacker.invalid&quot;&gt;");
    expect(projection.html).not.toMatch(/<script|<iframe|<img\s|<a\s+href/iu);
    expect(projection.html).not.toMatch(/href=["']javascript:/iu);
  });

  it("maps every public row to one of the five accepted categories", () => {
    expect(canonicalProfessionalPdfCategory({ category: "material" })).toBe("material");
    expect(canonicalProfessionalPdfCategory({ category: "labor" })).toBe("work");
    expect(canonicalProfessionalPdfCategory({ category: "equipment" })).toBe("equipment");
    expect(canonicalProfessionalPdfCategory({ category: "quality_control" })).toBe("service");
    expect(canonicalProfessionalPdfCategory({ category: "Исполнительная документация" })).toBe("service");
    expect(canonicalProfessionalPdfCategory({
      category: "labor",
      calculation_trace: { resourceGraph: { costTreatment: "INFORMATIONAL_SCOPE" } },
    })).toBe("service");
    expect(canonicalProfessionalPdfCategory({ category: "delivery" })).toBe("transport");
  });
});
