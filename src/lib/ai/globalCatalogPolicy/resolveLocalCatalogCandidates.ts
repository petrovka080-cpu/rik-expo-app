import type { GlobalLocalContext } from "../globalLocalContext";
import { resolveCatalogRegion } from "./resolveCatalogRegion";
import type { GlobalCatalogCandidate } from "./globalCatalogPolicyTypes";

const MATERIAL_LABELS: Record<string, string> = {
  laminate_board: "Ламинат",
  waterproofing_membrane: "Кровельная гидроизоляционная мембрана",
  asphalt_top_fine: "Асфальтобетон верхнего слоя",
  gypsum_board: "Листы ГКЛ",
  brick: "Кирпич",
};

export function resolveLocalCatalogCandidates(params: {
  context: GlobalLocalContext;
  materialKey: string;
}): GlobalCatalogCandidate[] {
  if (params.context.completeness === "LOCAL_CONTEXT_MISSING" || params.context.completeness === "LOCAL_CONTEXT_UNSUPPORTED") {
    return [];
  }
  const label = MATERIAL_LABELS[params.materialKey] ?? params.materialKey.replace(/_/g, " ");
  const region = resolveCatalogRegion(params.context);
  return [
    {
      catalogItemId: `catalog:${region}:${params.materialKey}`,
      materialKey: params.materialKey,
      label,
      region,
    },
  ];
}
