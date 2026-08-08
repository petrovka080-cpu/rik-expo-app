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
    `quantity_display=${line.quantity.toFixed(2)} ${line.unit}`,
    `quantity_raw=${line.quantity}`,
    line.priceState,
    line.unitPrice == null ? "unit_price=missing_price" : `unit_price=${money(line.unitPrice, line.currency)}`,
    line.lineSubtotal == null ? "subtotal=null" : `subtotal=${money(line.lineSubtotal, line.currency)}`,
    line.priceSourceId ? `source=${line.priceSourceId}` : "source=null",
    line.priceRetrievedAt ? `price_date=${line.priceRetrievedAt}` : "price_date=null",
    line.priceRegion ? `price_region=${line.priceRegion}` : "price_region=null",
  ].join("; ");
}

export function renderProfessionalCostSection(input: {
  summary: ProfessionalCostSummary;
  lines: readonly ProfessionalCostLine[];
  includePriceSources?: boolean;
}): string {
  const missing = input.lines.filter((line) => line.priceState === "missing_price");
  const priceSources = [...new Set(input.lines.flatMap((line) => line.priceSourceId ? [line.priceSourceId] : []))];
  const priceDates = [...new Set(input.lines.flatMap((line) => line.priceRetrievedAt ? [line.priceRetrievedAt] : []))];
  const priceRegions = [...new Set(input.lines.flatMap((line) => line.priceRegion ? [line.priceRegion] : []))];
  const section = [
    "Cost summary",
    `costing_mode=${input.summary.costingMode}`,
    `double_counting=${input.summary.doubleCountingCount}`,
    `unknown_cost_treatment=${input.summary.unknownCostTreatmentCount}`,
    `price_coverage=${input.summary.pricedRequiredRowsPercent}%`,
    `priced_rows=${input.summary.pricedRowsCount}`,
    `unpriced_rows=${input.summary.missingPriceRowsCount}`,
    `missing_price_count=${input.summary.missingPriceRowsCount}`,
    `currency=${input.summary.currency}`,
    `region=${priceRegions.length > 0 ? priceRegions.join(",") : "not_provided"}`,
    `price_date=${priceDates.length > 0 ? priceDates.join(",") : "not_provided"}`,
    `price_source=${priceSources.length > 0 ? priceSources.join(",") : "not_provided"}`,
    "vat_mode=not_provided",
    "manual_override_owner=none",
    input.summary.missingPriceRowsCount > 0
      ? `Количественная ведомость рассчитана. Полная стоимость не рассчитана: отсутствуют цены по ${input.summary.missingPriceRowsCount} позициям.`
      : "Количественная ведомость и предварительная стоимость рассчитаны по указанным источникам цен.",
    `materials=${categoryMoney(input.lines, (line) => line.rowType === "material", input.summary.materialsSubtotal, input.summary.currency)}`,
    `labor=${categoryMoney(input.lines, (line) => line.rowType === "labor" || line.rowType === "work", input.summary.laborSubtotal, input.summary.currency)}`,
    `services=${categoryMoney(input.lines, (line) => line.rowType === "service", input.summary.servicesSubtotal, input.summary.currency)}`,
    `equipment=${categoryMoney(input.lines, (line) => line.rowType === "equipment", input.summary.equipmentSubtotal, input.summary.currency)}`,
    `transport=${categoryMoney(input.lines, (line) => line.rowType === "transport", input.summary.transportSubtotal, input.summary.currency)}`,
    `overhead_mobilization=${categoryMoney(input.lines, (line) => line.rowType === "overhead" || line.rowType === "mobilization", input.summary.overheadMobilizationSubtotal, input.summary.currency)}`,
    input.summary.resolution === "PARTIAL_PRELIMINARY_COST_PRICE_INPUT_REQUIRED"
      ? `preliminary_priced_subtotal=${money(input.summary.preliminaryTotal, input.summary.currency)}`
      : `preliminary_total=${money(input.summary.preliminaryTotal, input.summary.currency)}`,
    "Price coverage policy",
    `cost_resolution=${input.summary.resolution}`,
    `preliminary_total_allowed=${input.summary.preliminaryTotalAllowed}`,
    `required_price_input_rows=${input.summary.requiredPriceInputRowIds.length}`,
    ...input.summary.requiredPriceInputRowIds.map((rowId) => `required_price_input=${rowId}`),
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
