import { formatEstimateUnitLabel } from "./formatEstimateUnitLabel";
import type { GlobalEstimateResult } from "./globalEstimateTypes";

function isRu(result: GlobalEstimateResult): boolean {
  return result.locale.language === "ru";
}

function localizeUnitText(text: string): string {
  return text
    .replace(/\blinear_m\b/g, "\u043f\u043e\u0433. \u043c")
    .replace(/\bsq_m\b/g, "\u043c\u00b2")
    .replace(/\bcubic_m\b/g, "\u043c\u00b3")
    .replace(/\bpcs\b/g, "\u0448\u0442")
    .replace(/\bset\b/g, "\u043a\u043e\u043c\u043f\u043b.");
}

function sourceLabelRu(label: string): string {
  if (/configured backend regional reference rate/i.test(label)) {
    return "\u0421\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u0440\u0435\u0433\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 \u0441\u0442\u0430\u0432\u043e\u043a";
  }
  if (/backend|pricebook|reference rate/i.test(label)) {
    return "\u0421\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u0441\u0442\u0430\u0432\u043e\u043a";
  }
  return label;
}

function freshnessRu(value: string): string {
  if (value === "fresh") return "\u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u044b\u0439";
  if (value === "aging") return "\u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f";
  if (value === "stale") return "\u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0430\u0435\u0442";
  if (value === "expired") return "\u0438\u0441\u0442\u0435\u043a";
  return "\u043d\u0435 \u0443\u0442\u043e\u0447\u043d\u0435\u043d";
}

function confidenceRu(value: string): string {
  if (value === "high") return "\u0432\u044b\u0441\u043e\u043a\u0430\u044f";
  if (value === "medium") return "\u0441\u0440\u0435\u0434\u043d\u044f\u044f";
  return "\u043d\u0438\u0437\u043a\u0430\u044f";
}

function taxText(result: GlobalEstimateResult): string {
  if (result.tax.taxType === "unknown") {
    return result.tax.warning ?? (isRu(result)
      ? "\u0422\u043e\u0447\u043d\u044b\u0439 \u043c\u0435\u0441\u0442\u043d\u044b\u0439 \u043d\u0430\u043b\u043e\u0433 \u043d\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d."
      : "Precise local tax was not calculated.");
  }
  const rate = result.tax.taxRate !== undefined ? `${Math.round(result.tax.taxRate * 10000) / 100}%` : "";
  const mode = result.tax.included
    ? (isRu(result) ? "\u0432\u043a\u043b\u044e\u0447\u0435\u043d \u0432 \u0446\u0435\u043d\u0443" : "included in price")
    : (isRu(result) ? "\u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u043a \u0438\u0442\u043e\u0433\u0443" : "added to subtotal");
  return `${result.tax.taxLabel}${rate ? ` (${rate})` : ""}: ${mode}.`;
}

function sourceEvidenceLines(result: GlobalEstimateResult, ru: boolean): string[] {
  const lines = result.sections
    .flatMap((section) => section.rows)
    .flatMap((row) => row.sourceEvidence.map((evidence) => {
      const checkedDate = evidence.checkedAt.slice(0, 10);
      return ru
        ? `- ${row.rowNumber} ${row.name}: ${sourceLabelRu(evidence.label)}, \u043f\u0440\u043e\u0432\u0435\u0440\u0435\u043d\u043e ${checkedDate}, \u0441\u0442\u0430\u0442\u0443\u0441 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0430: ${freshnessRu(evidence.freshness)}, \u0442\u043e\u0447\u043d\u043e\u0441\u0442\u044c: ${confidenceRu(evidence.confidence)}.`
        : `- ${row.rowNumber} ${row.name}: ${evidence.label}, checked ${checkedDate}, freshness ${evidence.freshness}, confidence ${evidence.confidence}.`;
    }));

  return lines.length > 0
    ? lines
    : [ru
      ? "- \u041d\u0435\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043d\u044b\u0445 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u043e\u0432 \u0434\u043b\u044f \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d\u043d\u044b\u0445 \u0441\u0442\u0440\u043e\u043a; \u0443\u0432\u0435\u0440\u0435\u043d\u043d\u0430\u044f \u0446\u0435\u043d\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430."
      : "- No approved source evidence is attached to priced rows; confident pricing is unavailable."
    ];
}

function inputQuantityText(result: GlobalEstimateResult): string {
  return `${result.input.volume} ${formatEstimateUnitLabel(result.input.unit)}`;
}

function ruOr(ru: boolean, ruText: string, enText: string): string {
  return ru ? ruText : enText;
}

function countryLabel(result: GlobalEstimateResult): string {
  const ru = isRu(result);
  const labels: Record<string, { ru: string; en: string }> = {
    KG: { ru: "\u041a\u044b\u0440\u0433\u044b\u0437\u0441\u0442\u0430\u043d", en: "Kyrgyzstan" },
    KZ: { ru: "\u041a\u0430\u0437\u0430\u0445\u0441\u0442\u0430\u043d", en: "Kazakhstan" },
    US: { ru: "\u0421\u0428\u0410", en: "United States" },
    GB: { ru: "\u0412\u0435\u043b\u0438\u043a\u043e\u0431\u0440\u0438\u0442\u0430\u043d\u0438\u044f", en: "United Kingdom" },
    DE: { ru: "\u0413\u0435\u0440\u043c\u0430\u043d\u0438\u044f", en: "Germany" },
    FR: { ru: "\u0424\u0440\u0430\u043d\u0446\u0438\u044f", en: "France" },
  };
  const label = labels[result.locale.countryCode];
  return label ? (ru ? label.ru : label.en) : result.locale.countryCode;
}

function cityLabel(result: GlobalEstimateResult): string | null {
  const city = result.locale.city;
  if (!city) return null;
  const ru = isRu(result);
  const normalized = city.toLowerCase();
  if (result.locale.countryCode === "KG" && normalized === "bishkek") return ru ? "\u0411\u0438\u0448\u043a\u0435\u043a" : "Bishkek";
  if (result.locale.countryCode === "KZ" && normalized === "almaty") return ru ? "\u0410\u043b\u043c\u0430\u0442\u044b" : "Almaty";
  if (result.locale.countryCode === "KZ" && normalized === "astana") return ru ? "\u0410\u0441\u0442\u0430\u043d\u0430" : "Astana";
  return city;
}

function regionLabel(result: GlobalEstimateResult): string | null {
  const region = result.locale.stateOrRegion;
  const city = result.locale.city?.toLowerCase();
  const ru = isRu(result);
  if (region === "TX" || (result.locale.countryCode === "US" && city === "austin")) return ru ? "\u0422\u0435\u0445\u0430\u0441 / Texas" : "Texas";
  if (region === "CA") return ru ? "\u041a\u0430\u043b\u0438\u0444\u043e\u0440\u043d\u0438\u044f / California" : "California";
  if (region === "Chuy") return ru ? "\u0427\u0443\u0439\u0441\u043a\u0430\u044f \u043e\u0431\u043b\u0430\u0441\u0442\u044c" : "Chuy";
  return region ?? null;
}

function taxProfileLabel(result: GlobalEstimateResult): string {
  if (result.locale.taxMode === "nds") return "\u041d\u0414\u0421";
  if (result.locale.taxMode === "sales_tax") return "sales tax";
  if (result.locale.taxMode === "vat") return "VAT";
  if (result.locale.taxMode === "gst") return "GST";
  return isRu(result) ? "\u043d\u0430\u043b\u043e\u0433 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u044f" : "tax requires clarification";
}

function localContextLines(result: GlobalEstimateResult): string[] {
  const ru = isRu(result);
  const location = [countryLabel(result), regionLabel(result), cityLabel(result)]
    .filter((item): item is string => Boolean(item))
    .join(", ");
  const precision = result.locale.addressPrecision === "unknown"
    ? ruOr(ru, "\u0440\u0435\u0433\u0438\u043e\u043d \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d", "location missing")
    : result.locale.addressPrecision;
  return [
    ruOr(ru, "## \u041b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442", "## Local context"),
    `- ${ruOr(ru, "\u0420\u0435\u0433\u0438\u043e\u043d", "Location")}: ${location}; ${precision}.`,
    `- ${ruOr(ru, "\u0412\u0430\u043b\u044e\u0442\u0430", "Currency")}: ${result.totals.currency}.`,
    `- ${ruOr(ru, "\u041d\u0430\u043b\u043e\u0433\u043e\u0432\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c", "Tax profile")}: ${taxProfileLabel(result)}.`,
    `- ${ruOr(ru, "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0441\u0442\u0430\u0432\u043e\u043a", "Rate source")}: ${ruOr(ru, "\u0441\u043c\u0435\u0442\u043d\u043e\u0435 \u044f\u0434\u0440\u043e / source evidence", "estimate engine / source evidence")}; ${ruOr(ru, "\u0442\u043e\u0447\u043d\u043e\u0441\u0442\u044c", "confidence")}: ${ru ? confidenceRu(result.confidence) : result.confidence}.`,
  ];
}

export function formatGlobalEstimateAnswer(result: GlobalEstimateResult): string {
  const ru = isRu(result);
  const intro = ru
    ? `\u0412\u043e\u0442 \u043e\u0440\u0438\u0435\u043d\u0442\u0438\u0440\u043e\u0432\u043e\u0447\u043d\u0430\u044f \u0441\u043c\u0435\u0442\u0430 \u043d\u0430 "${result.work.title}" \u0434\u043b\u044f \u043e\u0431\u044a\u0435\u043c\u0430 ${inputQuantityText(result)}. \u0420\u0430\u0441\u0447\u0435\u0442 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d \u0435\u0434\u0438\u043d\u044b\u043c \u0441\u043c\u0435\u0442\u043d\u044b\u043c \u044f\u0434\u0440\u043e\u043c \u043f\u043e \u0440\u0435\u0433\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u043c \u0441\u0442\u0430\u0432\u043a\u0430\u043c, \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u043c \u0435\u0434\u0438\u043d\u0438\u0446\u0430\u043c \u0438 \u043d\u0430\u043b\u043e\u0433\u043e\u0432\u044b\u043c \u043f\u0440\u0430\u0432\u0438\u043b\u0430\u043c.`
    : `Here is an approximate estimate for "${result.work.title}" for ${result.input.volume} ${result.input.unit}. The estimate engine calculated quantities, regional rates, local units, and tax status.`;
  const tableRows = result.sections.flatMap((section) => [
    `| ${section.sectionNumber} | ${section.title} |  |  |  |`,
    ...section.rows.map((row) =>
      `| ${row.rowNumber} | ${row.name} | ${localizeUnitText(row.displayQuantity)} | ${localizeUnitText(row.displayUnitPrice)} | ${localizeUnitText(row.displayTotal)} |`,
    ),
  ]);
  const safetyLine = result.requiresReview
    ? [
      "",
      ru
        ? "\u0421\u0442\u0430\u0442\u0443\u0441: \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u043e\u043c \u043f\u0435\u0440\u0435\u0434 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u043e\u043c \u0438\u043b\u0438 \u043e\u043f\u043b\u0430\u0442\u043e\u0439."
        : "Status: specialist review is required before contract or payment.",
    ]
    : [];

  return [
    intro,
    "",
    ...localContextLines(result),
    "",
    ruOr(ru, "## \u0414\u043e\u043f\u0443\u0449\u0435\u043d\u0438\u044f", "## Assumptions"),
    ...result.assumptions.map((item) => `- ${item}`),
    "",
    ruOr(ru, `## \u0421\u043c\u0435\u0442\u0430: ${result.work.title}`, `## Estimate: ${result.work.title}`),
    "",
    ru
      ? "| \u2116 | \u041d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432 \u0438 \u0440\u0430\u0431\u043e\u0442 | \u041a\u043e\u043b-\u0432\u043e / \u041e\u0431\u044a\u0435\u043c | \u0426\u0435\u043d\u0430 \u0437\u0430 \u0435\u0434. | \u0412\u0441\u0435\u0433\u043e |"
      : "| No. | Materials and work | Qty / Volume | Unit price | Total |",
    "|---|---|---:|---:|---:|",
    ...tableRows,
    `|  | ${ruOr(ru, "\u0418\u0422\u041e\u0413\u041e", "TOTAL")} |  |  | ${result.totals.displayGrandTotal} |`,
    "",
    ruOr(ru, "## \u0418\u0442\u043e\u0433\u043e", "## Totals"),
    `- ${ruOr(ru, "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b", "Materials")}: ${result.totals.displayMaterialsTotal}`,
    `- ${ruOr(ru, "\u0420\u0430\u0431\u043e\u0442\u044b", "Labor")}: ${result.totals.displayLaborTotal}`,
    `- ${ruOr(ru, "\u041d\u0430\u043b\u043e\u0433", "Tax")}: ${result.totals.displayTaxTotal}`,
    `- ${ruOr(ru, "\u041e\u0431\u0449\u0438\u0439 \u0438\u0442\u043e\u0433", "Grand total")}: ${result.totals.displayGrandTotal}`,
    "",
    ruOr(ru, "## \u041d\u0430\u043b\u043e\u0433\u043e\u0432\u044b\u0439 \u0441\u0442\u0430\u0442\u0443\u0441", "## Tax / VAT / GST / sales tax"),
    taxText(result),
    "",
    ruOr(ru, "## \u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0438 \u0438 \u0442\u043e\u0447\u043d\u043e\u0441\u0442\u044c", "## Sources and accuracy"),
    ...sourceEvidenceLines(result, ru),
    "",
    ruOr(ru, "## \u0420\u0435\u0433\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0435 \u0438 \u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0440\u0438\u0441\u043a\u0438", "## Regional and technical risks"),
    ...result.regionalRisks.map((risk) => `- ${risk.title}: ${risk.text}`),
    "",
    ruOr(ru, "## \u0427\u0442\u043e \u043c\u043e\u0436\u0435\u0442 \u0443\u0432\u0435\u043b\u0438\u0447\u0438\u0442\u044c \u0441\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c", "## What may increase cost"),
    ...result.costIncreaseFactors.map((item) => `- ${item}`),
    "",
    ruOr(ru, "## \u0427\u0442\u043e\u0431\u044b \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0440\u0430\u0441\u0447\u0435\u0442 \u0442\u043e\u0447\u043d\u0435\u0435, \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u0435", "## To make this more precise, please clarify"),
    ...result.clarifyingQuestions.map((item) => `- ${item}`),
    "",
    ruOr(ru, "## \u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f", "## Actions"),
    ...[
      ruOr(ru, "\u0421\u0434\u0435\u043b\u0430\u0442\u044c PDF", "Make PDF"),
      ruOr(ru, "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0432 \u0441\u043c\u0435\u0442\u044b", "Save estimate"),
      ruOr(ru, "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443", "Create request"),
      ruOr(ru, "\u0423\u0442\u043e\u0447\u043d\u0438\u0442\u044c \u0433\u043e\u0440\u043e\u0434", "Clarify city"),
      ruOr(ru, "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0446\u0435\u043d\u044b", "Refresh prices"),
    ].map((item) => `- ${item}`),
    ...safetyLine,
  ].join("\n");
}
