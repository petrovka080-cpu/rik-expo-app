import {
  canonicalArtifactMoney,
  canonicalArtifactParameterValue,
  canonicalArtifactQuantity,
  canonicalArtifactUnit,
  canonicalArtifactVisibleRowTitle,
  escapeCanonicalArtifactHtml,
  type CanonicalArtifactRevision,
  type CanonicalArtifactRow,
} from "./canonicalEstimateArtifactContract";

export const CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION =
  "canonical-professional-pdf.r4-a6" as const;

export const CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER = [
  "material",
  "work",
  "equipment",
  "service",
  "transport",
] as const;

export type CanonicalProfessionalPdfCategory =
  (typeof CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER)[number];

export type CanonicalProfessionalPdfGrandTotalStatus =
  | "COMPLETE"
  | "PARTIAL_NEEDS_PRICE";

export type CanonicalProfessionalPdfProjection = {
  html: string;
  footerTemplate: string;
  rowCount: number;
  pricedRowCount: number;
  missingPriceRowCount: number;
  grandTotalStatus: CanonicalProfessionalPdfGrandTotalStatus;
  currencyCode: string;
  categoryTotals: Record<CanonicalProfessionalPdfCategory, number>;
  definitionVersionId: string | null;
};

const CATEGORY_TITLES: Record<CanonicalProfessionalPdfCategory, string> = {
  material: "Материалы",
  work: "Работы",
  equipment: "Механизмы",
  service: "Услуги",
  transport: "Доставка",
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nullableText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function categoryIdentity(row: Record<string, unknown>): string {
  return `${String(row.category ?? "")} ${String(row.section ?? "")}`
    .trim()
    .toLocaleLowerCase("ru-RU");
}

export function canonicalProfessionalPdfCategory(
  row: Record<string, unknown>,
): CanonicalProfessionalPdfCategory {
  const identity = categoryIdentity(row);
  if (/delivery|transport|logistic|достав|логист/u.test(identity)) return "transport";
  if (/equipment|machine|machinery|mechanism|механ|техник|оборуд/u.test(identity)) return "equipment";
  if (/material|product|waste|материал|издел/u.test(identity)) return "material";
  if (/service|test|quality|control|document|услуг|испыт|контрол|пнр/u.test(identity)) return "service";
  return "work";
}

export function canonicalProfessionalPdfCategoryTitle(
  category: CanonicalProfessionalPdfCategory,
): string {
  return CATEGORY_TITLES[category];
}

function numericAmount(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function specificationRu(row: Record<string, unknown>): string | null {
  const trace = objectValue(row.calculation_trace);
  const legacy = objectValue(row.legacy_row_payload);
  return nullableText(
    trace.specificationRu
      ?? trace.specification_ru
      ?? legacy.specificationRu
      ?? legacy.specification_ru,
  );
}

function technicalTrace(row: Record<string, unknown>): string {
  const trace = objectValue(row.calculation_trace);
  const formula = nullableText(
    trace.formulaExplanationRu
      ?? trace.formula_expression
      ?? trace.expressionSource
      ?? trace.formulaId,
  );
  const inputs = Array.isArray(trace.inputParameterIds)
    ? trace.inputParameterIds.map(String).join(", ")
    : nullableText(trace.input_parameter_ids);
  const inclusion = trace.inclusionRule ?? trace.inclusion_rule ?? null;
  return [
    formula ? `Формула: ${formula}` : null,
    inputs ? `Параметры: ${inputs}` : null,
    inclusion ? `Применимость: ${JSON.stringify(inclusion)}` : null,
  ].filter(Boolean).join(" · ") || "Расчётная трасса сохранена в revision";
}

function normativeTrace(row: Record<string, unknown>): string {
  if (!Array.isArray(row.normative_trace) || row.normative_trace.length === 0) {
    return "Источник нормы не указан";
  }
  return row.normative_trace.map((entry) => {
    const source = objectValue(entry);
    return [source.sourceId, source.titleRu, source.locator, source.postRowLocator]
      .map(nullableText)
      .filter(Boolean)
      .join(" · ");
  }).filter(Boolean).join("; ") || "Источник нормы не указан";
}

function assertSingleCurrency(
  revision: CanonicalArtifactRevision,
  rows: CanonicalArtifactRow[],
): string {
  const currencies = new Set(
    [nullableText(revision.currency_code), ...rows.map((row) => nullableText(row.currency_code))]
      .filter((value): value is string => Boolean(value)),
  );
  if (currencies.size > 1) {
    throw Object.assign(new Error("professional PDF contains multiple currencies"), {
      code: "ARTIFACT_MULTI_CURRENCY_UNSUPPORTED",
    });
  }
  return [...currencies][0] ?? nullableText(revision.currency_code) ?? "KGS";
}

function renderClientRow(row: CanonicalArtifactRow): string {
  const category = canonicalProfessionalPdfCategory(row);
  const specification = specificationRu(row);
  const unitPrice = row.unit_price == null
    ? "Требуется цена"
    : canonicalArtifactMoney(row.unit_price, row.currency_code);
  const amount = row.amount == null
    ? "—"
    : canonicalArtifactMoney(row.amount, row.currency_code);
  return `<tr>
    <td class="number">${Number(row.ordinal) + 1}</td>
    <td class="name"><strong>${escapeCanonicalArtifactHtml(canonicalArtifactVisibleRowTitle(row))}</strong>${specification ? `<span>${escapeCanonicalArtifactHtml(specification)}</span>` : ""}</td>
    <td>${escapeCanonicalArtifactHtml(CATEGORY_TITLES[category])}</td>
    <td class="unit">${escapeCanonicalArtifactHtml(canonicalArtifactUnit(row))}</td>
    <td class="numeric">${escapeCanonicalArtifactHtml(canonicalArtifactQuantity(row.quantity))}</td>
    <td class="money">${escapeCanonicalArtifactHtml(unitPrice)}</td>
    <td class="money">${escapeCanonicalArtifactHtml(amount)}</td>
  </tr>`;
}

function renderTechnicalRow(row: CanonicalArtifactRow): string {
  return `<tr>
    <td>${Number(row.ordinal) + 1}</td>
    <td>${escapeCanonicalArtifactHtml(canonicalArtifactVisibleRowTitle(row))}</td>
    <td>${escapeCanonicalArtifactHtml(technicalTrace(row))}</td>
    <td>${escapeCanonicalArtifactHtml(normativeTrace(row))}</td>
    <td class="checksum">${escapeCanonicalArtifactHtml(row.row_sha256 ?? "—")}</td>
  </tr>`;
}

function renderParameters(parameters: Record<string, unknown>): string {
  const entries = Object.entries(parameters).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) return "<p>Параметры не сохранены.</p>";
  return `<table class="parameters"><thead><tr><th>Параметр</th><th>Значение</th></tr></thead><tbody>${entries
    .map(([key, value]) => `<tr><td>${escapeCanonicalArtifactHtml(key)}</td><td>${escapeCanonicalArtifactHtml(canonicalArtifactParameterValue(value))}</td></tr>`)
    .join("")}</tbody></table>`;
}

function shortIdentity(value: unknown): string {
  const text = String(value ?? "").trim();
  return text.length <= 12 ? text : text.slice(0, 12);
}

export function buildCanonicalProfessionalPdfProjection(input: {
  revision: CanonicalArtifactRevision;
  rows: CanonicalArtifactRow[];
  workTitleRu: string;
  definitionVersionId?: string | null;
}): CanonicalProfessionalPdfProjection {
  const { revision, rows } = input;
  const revisionTotals = objectValue(revision.totals);
  const expectedEstimateRowCount = Number(
    revisionTotals.includedRowCount ?? revision.row_count,
  );
  if (rows.length !== expectedEstimateRowCount) {
    throw Object.assign(new Error("professional PDF row count differs from immutable revision"), {
      code: "ARTIFACT_ROW_PARITY_FAILED",
    });
  }
  const currencyCode = assertSingleCurrency(revision, rows);
  const pricedRows = rows.filter((row) => row.unit_price != null && row.amount != null);
  const missingPriceRowCount = rows.length - pricedRows.length;
  const grandTotalStatus: CanonicalProfessionalPdfGrandTotalStatus = missingPriceRowCount === 0
    ? "COMPLETE"
    : "PARTIAL_NEEDS_PRICE";
  const categoryTotals = Object.fromEntries(
    CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER.map((category) => [
      category,
      pricedRows
        .filter((row) => canonicalProfessionalPdfCategory(row) === category)
        .reduce((sum, row) => sum + numericAmount(row.amount), 0),
    ]),
  ) as Record<CanonicalProfessionalPdfCategory, number>;
  const pricedSubtotal = pricedRows.reduce((sum, row) => sum + numericAmount(row.amount), 0);
  const revisionNumber = Number(revision.revision_number);
  const generatedAt = nullableText(revision.created_at) ?? new Date(0).toISOString();
  const generatedDate = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(generatedAt));
  const primaryValue = canonicalArtifactQuantity(revision.primary_measure_value);
  const primaryUnit = canonicalArtifactUnit({ unit_id: revision.primary_measure_unit_id });
  const currencyLabel = currencyCode === "KGS" ? "сом" : currencyCode;
  const totalRows = CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER.map((category) => `
    <tr><th>${CATEGORY_TITLES[category]}</th><td>${canonicalArtifactMoney(categoryTotals[category], currencyCode)}</td></tr>`).join("");
  const grandTotal = grandTotalStatus === "COMPLETE"
    ? `<strong>${canonicalArtifactMoney(pricedSubtotal, currencyCode)}</strong>`
    : "<strong>требуется уточнение цен</strong>";
  const priceNotice = grandTotalStatus === "COMPLETE"
    ? "Все строки имеют подтверждённую цену."
    : `<strong>Оценено частично.</strong> Строк без подтверждённой цены: ${missingPriceRowCount}. Полный итог: требуется уточнение цен.`;
  const documentNumber = Number.isFinite(revisionNumber) ? String(revisionNumber) : shortIdentity(revision.id);
  const technicalIdentity = [
    ["Revision", revision.id],
    ["Definition version", input.definitionVersionId ?? "—"],
    ["Release", revision.release_id],
    ["Checksum", revision.checksum_sha256],
  ].map(([label, value]) => `<div><strong>${label}:</strong> ${escapeCanonicalArtifactHtml(value)}</div>`).join("");

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
    @page{size:A4 portrait;margin:15mm 10mm 17mm}*{box-sizing:border-box}html{font-family:"Arial","DejaVu Sans",sans-serif;color:#172033;font-size:9px;line-height:1.35}
    body{margin:0}header{border-bottom:2px solid #176b45;padding-bottom:8px;margin-bottom:10px}h1{font-size:21px;margin:0 0 5px;color:#10253d}h2{font-size:13px;color:#176b45;margin:14px 0 6px;break-after:avoid}h3{font-size:10px;margin:10px 0 4px}.subtitle{font-size:13px;font-weight:700}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;margin-top:8px}.meta-grid div,.identity div{overflow-wrap:anywhere}
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}.summary div{background:#eef7f2;border-radius:4px;padding:7px}.notice{margin:8px 0 12px;padding:8px;border:1px solid #d5dde6;border-radius:4px;color:#39485b;break-inside:avoid}
    table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tfoot{display:table-footer-group}tr{break-inside:avoid;page-break-inside:avoid}td,th{border:1px solid #cbd4df;padding:4px;vertical-align:top;overflow-wrap:anywhere;word-break:normal;hyphens:none}th{background:#e7edf4;text-align:left}.client th:nth-child(1){width:4%}.client th:nth-child(2){width:35%}.client th:nth-child(3){width:12%}.client th:nth-child(4){width:8%}.client th:nth-child(5){width:11%}.client th:nth-child(6),.client th:nth-child(7){width:15%}.name span{display:block;color:#526174;font-size:8px;margin-top:2px}.number,.unit{text-align:center}.numeric,.money{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
    .totals{width:62%;margin:12px 0 0 auto}.totals th{width:55%}.totals td{text-align:right;font-variant-numeric:tabular-nums}.grand th,.grand td{background:#e5f2ea}.technical-appendix{break-before:page;page-break-before:always}.technical{font-size:7px}.technical th:nth-child(1){width:4%}.technical th:nth-child(2){width:22%}.technical th:nth-child(3){width:30%}.technical th:nth-child(4){width:27%}.technical th:nth-child(5){width:17%}.checksum{word-break:break-all}.parameters{font-size:8px}.identity{border:1px solid #d5dde6;background:#f7f9fb;padding:7px;margin:7px 0;word-break:break-all}
    .signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px;break-inside:avoid}.signature{border:1px solid #cbd4df;padding:7px;min-height:84px}.signature strong{display:block;margin-bottom:7px}.signature div{border-bottom:1px solid #758195;margin-top:13px;color:#526174}.organization{margin-top:12px;border-bottom:1px solid #758195;padding-bottom:3px;break-inside:avoid}
  </style></head><body>
    <header><h1>Профессиональная смета</h1><div class="subtitle">${escapeCanonicalArtifactHtml(input.workTitleRu || "Строительно-монтажные работы")}</div>
      <div class="meta-grid"><div><strong>Номер:</strong> ${escapeCanonicalArtifactHtml(documentNumber)}</div><div><strong>Статус:</strong> Предварительная</div><div><strong>Сформировано:</strong> ${escapeCanonicalArtifactHtml(generatedDate)}</div><div><strong>Валюта:</strong> ${escapeCanonicalArtifactHtml(currencyLabel)}</div><div><strong>Объект:</strong> ${escapeCanonicalArtifactHtml(input.workTitleRu)}</div><div><strong>Первичная мера:</strong> ${escapeCanonicalArtifactHtml(`${primaryValue} ${primaryUnit}`)}</div><div><strong>Версия:</strong> ${escapeCanonicalArtifactHtml(String(Number.isFinite(revisionNumber) ? revisionNumber : 1))}</div></div>
    </header>
    <div class="summary"><div><strong>Позиций</strong><br>${rows.length}</div><div><strong>С подтверждённой ценой</strong><br>${pricedRows.length} из ${rows.length}</div><div><strong>Оценено</strong><br>${canonicalArtifactMoney(pricedSubtotal, currencyCode)}</div></div>
    <div class="notice">${priceNotice}</div>
    <table class="client"><thead><tr><th>№</th><th>Наименование и спецификация</th><th>Категория</th><th>Ед.</th><th>Количество</th><th>Цена за единицу</th><th>Сумма</th></tr></thead><tbody>${rows.map(renderClientRow).join("")}</tbody></table>
    <table class="totals"><tbody>${totalRows}<tr><th>Неполные цены</th><td>${missingPriceRowCount}</td></tr><tr class="grand"><th>Итого</th><td>${grandTotal}</td></tr></tbody></table>
    <div class="notice"><strong>Основание.</strong> Документ отображает строки, параметры, объёмы и цены сохранённой immutable revision. PDF не пересчитывает количества и не подменяет отсутствующую цену нулём.</div>
    <div class="organization">Организация: __________________________________________</div>
    <div class="signatures"><div class="signature"><strong>Составил</strong><div>ФИО / должность</div><div>Дата / подпись</div></div><div class="signature"><strong>Проверил</strong><div>ФИО / должность</div><div>Дата / подпись</div></div><div class="signature"><strong>Утвердил</strong><div>ФИО / должность</div><div>Дата / подпись</div></div></div>
    <section class="technical-appendix"><h1>Техническое приложение</h1><p>Приложение является второй проекцией той же immutable revision; quantities и prices не пересчитываются.</p><div class="identity">${technicalIdentity}</div><h2>Параметры</h2>${renderParameters(objectValue(revision.input_parameters))}<h2>Формулы, источники и audit identity строк</h2><table class="technical"><thead><tr><th>№</th><th>Позиция</th><th>Формула и применимость</th><th>Норма / источник</th><th>Checksum строки</th></tr></thead><tbody>${rows.map(renderTechnicalRow).join("")}</tbody></table></section>
  </body></html>`;

  return {
    html,
    footerTemplate: `<div style="width:100%;font-size:8px;color:#667487;text-align:center;font-family:Arial,sans-serif">Страница <span class="pageNumber"></span> из <span class="totalPages"></span> · revision ${escapeCanonicalArtifactHtml(shortIdentity(revision.id))} · checksum ${escapeCanonicalArtifactHtml(shortIdentity(revision.checksum_sha256))}</div>`,
    rowCount: rows.length,
    pricedRowCount: pricedRows.length,
    missingPriceRowCount,
    grandTotalStatus,
    currencyCode,
    categoryTotals,
    definitionVersionId: input.definitionVersionId ?? null,
  };
}
