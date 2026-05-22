import type { GlobalEstimateResult } from "./globalEstimateTypes";

function isRu(result: GlobalEstimateResult): boolean {
  return result.locale.language === "ru";
}

function taxText(result: GlobalEstimateResult): string {
  if (result.tax.taxType === "unknown") {
    return result.tax.warning ?? (isRu(result) ? "Точный местный налог не рассчитан." : "Precise local tax was not calculated.");
  }
  const rate = result.tax.taxRate !== undefined ? `${Math.round(result.tax.taxRate * 10000) / 100}%` : "";
  const mode = result.tax.included
    ? (isRu(result) ? "включен в цену" : "included in price")
    : (isRu(result) ? "добавлен к итогу" : "added to subtotal");
  return `${result.tax.taxLabel}${rate ? ` (${rate})` : ""}: ${mode}.`;
}

export function formatGlobalEstimateAnswer(result: GlobalEstimateResult): string {
  const ru = isRu(result);
  const intro = ru
    ? `Вот ориентировочная смета на "${result.work.title}" для объема ${result.input.volume} ${result.input.unit}. Расчет выполнен backend-движком по региональным ставкам, локальным единицам и налоговым правилам.`
    : `Here is an approximate estimate for "${result.work.title}" for ${result.input.volume} ${result.input.unit}. The backend engine calculated quantities, regional rates, local units, and tax status.`;
  const assumptionsTitle = ru ? "## Допущения" : "## Assumptions";
  const tableTitle = ru ? `## Смета: ${result.work.title}` : `## Estimate: ${result.work.title}`;
  const headers = ru
    ? "| № | Наименование материалов и работ | Кол-во / Объем | Цена за ед. | Всего |"
    : "| No. | Materials and work | Qty / Volume | Unit price | Total |";
  const divider = "|---|---|---:|---:|---:|";
  const tableRows = result.sections.flatMap((section) => [
    `| ${section.sectionNumber} | ${section.title} |  |  |  |`,
    ...section.rows.map((row) => `| ${row.rowNumber} | ${row.name} | ${row.displayQuantity} | ${row.displayUnitPrice} | ${row.displayTotal} |`),
  ]);
  const totalsTitle = ru ? "## Итого" : "## Totals";
  const taxTitle = ru ? "## Налог / VAT / GST / sales tax" : "## Tax / VAT / GST / sales tax";
  const regionalRisksTitle = ru ? "## Региональные и технические риски" : "## Regional and technical risks";
  const risksTitle = ru ? "## Что может увеличить стоимость" : "## What may increase cost";
  const questionsTitle = ru ? "## Чтобы сделать расчет точнее, уточните" : "## To make this more precise, please clarify";
  const safetyLine = result.requiresReview
    ? [
      "",
      ru
        ? "Статус: требуется проверка специалистом перед договором или оплатой."
        : "Status: specialist review is required before contract or payment.",
    ]
    : [];

  return [
    intro,
    "",
    assumptionsTitle,
    ...result.assumptions.map((item) => `- ${item}`),
    "",
    tableTitle,
    "",
    headers,
    divider,
    ...tableRows,
    `|  | ${ru ? "ИТОГО" : "TOTAL"} |  |  | ${result.totals.displayGrandTotal} |`,
    "",
    totalsTitle,
    `- ${ru ? "Материалы" : "Materials"}: ${result.totals.displayMaterialsTotal}`,
    `- ${ru ? "Работы" : "Labor"}: ${result.totals.displayLaborTotal}`,
    `- ${ru ? "Налог" : "Tax"}: ${result.totals.displayTaxTotal}`,
    `- ${ru ? "Общий итог" : "Grand total"}: ${result.totals.displayGrandTotal}`,
    "",
    taxTitle,
    taxText(result),
    "",
    regionalRisksTitle,
    ...result.regionalRisks.map((risk) => `- ${risk.title}: ${risk.text}`),
    "",
    risksTitle,
    ...result.costIncreaseFactors.map((item) => `- ${item}`),
    "",
    questionsTitle,
    ...result.clarifyingQuestions.map((item) => `- ${item}`),
    ...safetyLine,
  ].join("\n");
}
