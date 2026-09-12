import type {
  EstimateNormSource,
  EstimateNormWorkGroupKey,
} from "./productionNormKnowledgeBaseCore";
import type {
  ProductionDefaultUnit,
  ProductionTemplate10000Category,
  ProductionTemplateSection,
} from "./productionExpandedWorkCatalog10000";

export const PROFESSIONAL_NORM_PACK_SOURCE_PREFIX = "src_professional_norm_pack_" as const;
export const PROFESSIONAL_NORM_PACK_REGISTRY_VERSION = "2026.09-source-pack-lineage-r1" as const;

export const PROFESSIONAL_NORM_PACK_SOURCE_VERSION_BY_GROUP: Readonly<
  Record<EstimateNormWorkGroupKey, string>
> = Object.freeze({
  air_conditioning: "2026.09-daikin-3mxs-k-additional-charge-r2",
  baseboards: "2026.09-gerflor-forbo-source-review-r2",
  carpentry: "2026.09-sikagard-wood-preserver-primary-review-r2",
  ceilings: "2026.09-knauf-d11-d112-primary-review-r2",
  cleaning: "2026.09-tennant-t350-productivity-primary-review-r2",
  concrete: "2026.09-nrmca-cip31-order-quantity-primary-review-r2",
  delivery: "2026.09-ford-transit-25-5my-primary-review-r2",
  demolition: "2026.09-krer46-official-scope-primary-review-r2",
  documentation: "2026.09-kg-design-price-official-routing-review-r2",
  drywall: "2026.09-knauf-k462-primary-review-r2",
  earthworks: "2026.09-fhwa-fp24-section208-primary-review-r2",
  electrical: "2026.09-legrand-p31-primary-review-r2",
  equipment_rent: "2026.09-united-rentals-ca-2026-09-02-primary-review-r2",
  facade: "2026.09-rockwool-vhf-fixings-primary-review-r2",
  fire_safety: "2026.09-siemens-fdb221-primary-review-r2",
  flooring: "2026.09-ceresit-cn69-ct17-global-primary-review-r2",
  formwork: "2026.09-rics-nrm2-formwork-measurement-primary-review-r2",
  heating: "2026.09-uponor-ufh-pipe-spacing-r2",
  insulation: "2026.09-rockwool-comfortboard80-primary-review-r2",
  landscaping: "2026.09-rain-bird-xfd-d39717e-primary-review-r2",
  low_voltage: "2026.09-legrand-049272-bus-scs-primary-review-r2",
  masonry: "2026.09-bia-tn10-selected-table-primary-review-r2",
  metalwork: "2026.09-jotun-hardtop-xp-primary-review-r2",
  paint: "2026.09-ceresit-ct54-ct17-primary-review-r2",
  plaster: "2026.09-ceresit-ct29-global-primary-review-r2",
  plumbing: "2026.09-wavin-hep2o-primary-review-r2",
  putty: "2026.09-ceresit-ct126-ct127-primary-review-r2",
  reinforcement: "2026.09-rics-fhwa-rebar-schedule-primary-review-r2",
  roadworks: "2026.09-krer27-table-27-06-020-primary-review-r2",
  roofing: "2026.09-sika-sarnafil-at18-primary-review-r2",
  screed: "2026.09-ceresit-cn87-primary-review-r2",
  services: "2026.09-kg-author-supervision-cost-primary-review-r2",
  sewerage: "2026.09-wavin-osma-c3766bk-primary-review-r2",
  tile: "2026.09-ceresit-cm11-plus-ct17-global-primary-review-r2",
  ventilation: "2026.09-lindab-vsr-exact-sizes-r2",
  waste_removal: "2026.09-us-epa-cd-volume-weight-primary-review-r2",
  waterproofing: "2026.09-ceresit-cl51-global-primary-review-r2",
  windows_doors: "2026.09-soudal-9900539-tds-2026-primary-review-r2",
});

export type ProfessionalNormPackRegistryItem = {
  normId: string;
  workGroup: EstimateNormWorkGroupKey;
  workBasisUnit: ProductionDefaultUnit;
  unit: ProductionDefaultUnit;
  consumptionRate: number;
  wastePercent: number;
  packageSize: number;
  quantityFormulaOverride?: string;
  sourceId: string;
  sourceTitle: string;
  sourceDocumentVersion: string;
  sourceType: EstimateNormSource["source_type"];
  sourceProvenance: EstimateNormSource["provenance"];
  licenseStatus: EstimateNormSource["license_status"];
  qualityStatus: EstimateNormSource["quality_status"];
  reviewStatus: EstimateNormSource["review_status"];
  sourceUrl: string;
  sourcePage: string;
  match: {
    categories?: readonly ProductionTemplate10000Category[];
    workKeyIncludes?: readonly string[];
    sections?: readonly ProductionTemplateSection[];
    rowNumber?: readonly number[];
    rowCodeIncludes?: readonly string[];
    rowTitleIncludes?: readonly string[];
  };
};

export type ProfessionalNormPackTemplateInput = {
  workKey: string;
  templateKey: string;
  category: string;
  defaultUnit: string;
  row: {
    rowCode?: string;
    code?: string;
    section: string;
    lineType?: "material" | "work" | "service" | "equipment";
    unit: string;
    titleRu?: string;
    title?: string;
  };
};

// The generated 10k catalog does not carry the product, system and project
// applicability parameters required by the reviewed physical packs. Product-
// specific quantities therefore remain source-only here. Executable bindings
// live in professionalPhysicalNormApplicabilityV1 and validate every required
// canonical parameter before producing a quantity.
export const PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS: readonly ProfessionalNormPackRegistryItem[] =
  Object.freeze([]);

export const PROFESSIONAL_NORM_PACK_GROUPS: readonly EstimateNormWorkGroupKey[] = Object.freeze([]);

export function isProfessionalNormPackSourceId(sourceIdValue: string | null | undefined): boolean {
  const normalized = String(sourceIdValue ?? "");
  return normalized.startsWith(PROFESSIONAL_NORM_PACK_SOURCE_PREFIX) &&
    !normalized.startsWith(`${PROFESSIONAL_NORM_PACK_SOURCE_PREFIX}catalog_`);
}

export function isRegisteredProfessionalNormPackSourceId(sourceIdValue: string | null | undefined): boolean {
  const normalized = String(sourceIdValue ?? "");
  return PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.some((item) => item.sourceId === normalized);
}

function rowCodeFor(input: ProfessionalNormPackTemplateInput): string {
  return String(input.row.rowCode ?? input.row.code ?? "").toLowerCase();
}

function rowNumberFor(input: ProfessionalNormPackTemplateInput): number | null {
  const match = rowCodeFor(input).match(/_(\d+)$/);
  return match ? Number(match[1]) : null;
}

function matchesAny(value: string, candidates: readonly string[] | undefined): boolean {
  if (!candidates?.length) return true;
  return candidates.some((candidate) => value.includes(candidate));
}

function normalizeWorkBasisUnit(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "sq_m" || normalized === "sqm") return "m2";
  if (normalized === "pcs") return "piece";
  if (normalized === "shift") return "day";
  if (normalized === "trip") return "set";
  return normalized;
}

function professionalItemMatches(
  input: ProfessionalNormPackTemplateInput,
  item: ProfessionalNormPackRegistryItem,
): boolean {
  if (input.row.lineType && input.row.lineType !== "material") return false;
  if (normalizeWorkBasisUnit(input.defaultUnit) !== item.workBasisUnit) return false;
  if (!item.match.sections?.includes(input.row.section as ProductionTemplateSection)) return false;
  if (item.match.categories?.length &&
    !item.match.categories.includes(input.category as ProductionTemplate10000Category)) {
    return false;
  }
  const workKey = input.workKey.toLowerCase();
  if (!matchesAny(workKey, item.match.workKeyIncludes)) return false;
  const rowNumber = rowNumberFor(input);
  if (item.match.rowNumber?.length && (rowNumber === null || !item.match.rowNumber.includes(rowNumber))) {
    return false;
  }
  const rowCode = rowCodeFor(input);
  if (!matchesAny(rowCode, item.match.rowCodeIncludes)) return false;
  const rowTitle = String(input.row.titleRu ?? input.row.title ?? "").toLowerCase();
  if (!matchesAny(rowTitle, item.match.rowTitleIncludes)) return false;
  return true;
}

export function resolveProfessionalNormPackItemForTemplate(
  input: ProfessionalNormPackTemplateInput,
): ProfessionalNormPackRegistryItem | undefined {
  return PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.find((item) => professionalItemMatches(input, item));
}
