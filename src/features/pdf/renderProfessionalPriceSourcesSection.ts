import type { ProfessionalCostLine } from "../../lib/estimate/professionalCostingContract";

export function renderProfessionalPriceSourcesSection(input: {
  lines: readonly ProfessionalCostLine[];
}): string {
  const uniqueSources = new Map<string, ProfessionalCostLine>();
  for (const line of input.lines) {
    if (line.priceSourceId) uniqueSources.set(line.priceSourceId, line);
  }
  const rows = [...uniqueSources.values()].map((line) => [
    line.priceSourceId,
    line.priceSourceLabel,
    line.priceRegion,
    line.priceRetrievedAt,
  ].filter(Boolean).join("; "));
  return [
    "Price source section",
    rows.length > 0 ? rows.join("\n") : "No accepted price source records; all affected rows stay missing_price.",
  ].join("\n");
}
