import type { ProfessionalCostLine } from "../../lib/estimate/professionalCostingContract";

function visiblePriceSourceText(value: string | null): string {
  return String(value ?? "")
    .replace(/norm_family:expanded_complex:[a-z0-9_:-]+/gi, "нормативная группа работ")
    .replace(/kg_preliminary_[a-z0-9_:-]+/gi, "предварительный ценовой источник")
    .replace(/\s+/g, " ")
    .trim();
}

export function renderProfessionalPriceSourcesSection(input: {
  lines: readonly ProfessionalCostLine[];
}): string {
  const uniqueSources = new Map<string, ProfessionalCostLine>();
  for (const line of input.lines) {
    if (line.priceSourceId) uniqueSources.set(line.priceSourceId, line);
  }
  const rows = [...uniqueSources.values()].map((line) => [
    visiblePriceSourceText(line.priceSourceLabel) || "Источник цены",
    line.priceRegion,
    line.priceRetrievedAt,
  ].filter(Boolean).join("; "));
  return [
    "Price source section",
    rows.length > 0 ? rows.join("\n") : "No accepted price source records; all affected rows stay missing_price.",
  ].join("\n");
}
