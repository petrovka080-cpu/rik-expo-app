import type { CatalogItemForEstimate } from "./catalogItemTypes";

export type CatalogEstimateRowSearchInput = {
  name: string;
  unit: string;
  materialKey?: string;
  rateKey?: string;
};

const SEARCH_TERMS_BY_KEY: Record<string, string[]> = {
  strip_foundation_concrete_m300: ["бетон м300", "бетон", "concrete m300"],
  strip_foundation_longitudinal_rebar: ["арматура", "rebar"],
  strip_foundation_stirrups_rebar: ["арматура хомуты", "поперечная арматура"],
  strip_foundation_binding_wire: ["вязальная проволока"],
  strip_foundation_rebar_spacers: ["фиксаторы арматуры"],
  strip_foundation_formwork_material: ["опалубка"],
  strip_foundation_sand_cushion: ["песок"],
  strip_foundation_crushed_stone_base: ["щебень"],
  strip_foundation_waterproofing_material: ["гидроизоляция", "битумная мастика"],
  brick_masonry_material: ["кирпич", "кладочный кирпич"],
  gable_roof_installation_material: ["кровля", "металлочерепица"],
  asphalt_paving_material: ["асфальтобетон", "асфальт"],
  ceramic_tile_floor_laying_material: ["кафельная плитка", "плитка"],
  carpet_laying_material: ["ковролин"],
  drywall_wall_cladding_material: ["гипсокартон", "гкл"],
};

export function normalizeCatalogItemSearchText(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function deriveMaterialKeyFromRateKey(rateKey?: string): string | undefined {
  if (!rateKey) return undefined;
  if (rateKey.includes("labor") || rateKey.includes("install") || rateKey.includes("delivery")) return undefined;
  if (rateKey.includes("excavation") || rateKey.includes("pour") || rateKey.includes("vibration")) return undefined;
  if (rateKey.includes("curing") || rateKey.includes("backfill") || rateKey.includes("pump")) return undefined;
  return rateKey
    .replace(/^strip_foundation_/, "")
    .replace(/_material$/, "")
    .replace(/_auxiliary$/, "");
}

export function buildCatalogSearchQueriesForEstimateRow(row: CatalogEstimateRowSearchInput): string[] {
  const keys = [row.rateKey, row.materialKey].filter((value): value is string => Boolean(value));
  const mapped = keys.flatMap((key) => SEARCH_TERMS_BY_KEY[key] ?? []);
  const fallback = [row.materialKey, row.rateKey, row.name]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/_/g, " "));
  return [...new Set([...mapped, ...fallback].map(normalizeCatalogItemSearchText).filter(Boolean))].slice(0, 4);
}

export function isCatalogUnitCompatible(estimateUnit: string, catalogUnit: string): boolean {
  if (estimateUnit === catalogUnit) return true;
  const compatible = new Set([
    "m3:м3",
    "sq_m:м2",
    "sq_m:м²",
    "linear_m:пог. м",
    "pcs:шт",
    "set:компл.",
    "kg:кг",
    "ton:т",
  ]);
  return compatible.has(`${estimateUnit}:${catalogUnit}`) || compatible.has(`${catalogUnit}:${estimateUnit}`);
}

export function rankCatalogCandidatesForEstimateRow(
  row: CatalogEstimateRowSearchInput,
  candidates: CatalogItemForEstimate[],
): CatalogItemForEstimate[] {
  const normalizedName = normalizeCatalogItemSearchText(row.name);
  const normalizedMaterialKey = normalizeCatalogItemSearchText(row.materialKey ?? "");
  return [...candidates]
    .map((candidate) => {
      const candidateName = normalizeCatalogItemSearchText(candidate.name);
      const unitBonus = isCatalogUnitCompatible(row.unit, candidate.unit) ? 4 : 0;
      const rateBonus = candidate.rateKey && candidate.rateKey === row.rateKey ? 4 : 0;
      const materialBonus = candidate.materialKey && candidate.materialKey === row.materialKey ? 3 : 0;
      const nameBonus = normalizedName && candidateName.includes(normalizedName.split(" ")[0] ?? "") ? 2 : 0;
      const keyBonus = normalizedMaterialKey && candidateName.includes(normalizedMaterialKey.split(" ")[0] ?? "") ? 2 : 0;
      return { candidate, score: unitBonus + rateBonus + materialBonus + nameBonus + keyBonus };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.candidate);
}
