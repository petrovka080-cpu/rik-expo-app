import type {
  ProfessionalCostLine,
  ProfessionalCostSummary,
} from "../../lib/estimate/professionalCostingContract";
import { renderProfessionalPriceSourcesSection } from "./renderProfessionalPriceSourcesSection";

function money(value: number | null, currency: string): string {
  if (value == null || !Number.isFinite(value)) return "not calculated";
  return `${value.toFixed(2)} ${currency}`;
}

function categoryMoney(
  lines: readonly ProfessionalCostLine[],
  match: (line: ProfessionalCostLine) => boolean,
  subtotal: number,
  currency: string,
): string {
  const matched = lines.filter(match);
  if (matched.length === 0) return "not applicable";
  if (matched.some((line) => line.priceState === "missing_price")) return "not calculated";
  return money(subtotal, currency);
}

function lineText(line: ProfessionalCostLine): string {
  return [
    line.rowId,
    line.name,
    `${line.quantity} ${line.unit}`,
    line.priceState,
    line.unitPrice == null ? "unit_price=missing_price" : `unit_price=${money(line.unitPrice, line.currency)}`,
    line.lineSubtotal == null ? "subtotal=null" : `subtotal=${money(line.lineSubtotal, line.currency)}`,
    line.priceSourceId ? `source=${line.priceSourceId}` : "source=null",
  ].join("; ");
}

export function renderProfessionalCostSection(input: {
  summary: ProfessionalCostSummary;
  lines: readonly ProfessionalCostLine[];
  includePriceSources?: boolean;
}): string {
  const missing = input.lines.filter((line) => line.priceState === "missing_price");
  const section = [
    "Cost summary",
    `price_coverage=${input.summary.pricedRequiredRowsPercent}%`,
    `materials=${categoryMoney(input.lines, (line) => line.rowType === "material", input.summary.materialsSubtotal, input.summary.currency)}`,
    `labor=${categoryMoney(input.lines, (line) => line.rowType === "labor" || line.rowType === "work", input.summary.laborSubtotal, input.summary.currency)}`,
    `services=${categoryMoney(input.lines, (line) => line.rowType === "service", input.summary.servicesSubtotal, input.summary.currency)}`,
    `equipment=${categoryMoney(input.lines, (line) => line.rowType === "equipment", input.summary.equipmentSubtotal, input.summary.currency)}`,
    `transport=${categoryMoney(input.lines, (line) => line.rowType === "transport", input.summary.transportSubtotal, input.summary.currency)}`,
    `overhead_mobilization=${categoryMoney(input.lines, (line) => line.rowType === "overhead" || line.rowType === "mobilization", input.summary.overheadMobilizationSubtotal, input.summary.currency)}`,
    `preliminary_total=${money(input.summary.preliminaryTotal, input.summary.currency)}`,
    "Price coverage policy",
    `preliminary_total_allowed=${input.summary.preliminaryTotalAllowed}`,
    "contract_total_claimed=false",
    "Contract total not claimed",
    "Line unit price/subtotal",
    ...input.lines.map(lineText),
    "Missing price rows",
    ...(missing.length > 0 ? missing.map(lineText) : ["none"]),
  ];
  if (input.includePriceSources !== false) {
    section.push(renderProfessionalPriceSourcesSection({ lines: input.lines }));
  }
  return section.join("\n");
}
