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
export const PROFESSIONAL_NORM_PACK_REGISTRY_VERSION = "2026.07-wave1" as const;

export type ProfessionalNormPackRegistryItem = {
  normId: string;
  workGroup: EstimateNormWorkGroupKey;
  unit: ProductionDefaultUnit;
  consumptionRate: number;
  wastePercent: number;
  packageSize: number;
  sourceId: string;
  sourceTitle: string;
  sourceDocumentVersion: typeof PROFESSIONAL_NORM_PACK_REGISTRY_VERSION;
  sourceType: "manufacturer_consumption_table";
  sourceProvenance: Extract<EstimateNormSource["provenance"], "manufacturer_datasheet_curated">;
  licenseStatus: Extract<EstimateNormSource["license_status"], "manufacturer_terms_required">;
  qualityStatus: EstimateNormSource["quality_status"];
  reviewStatus: Extract<EstimateNormSource["review_status"], "source_mapping_reviewed">;
  sourceUrl: string;
  sourcePage: string;
  match: {
    categories?: readonly ProductionTemplate10000Category[];
    workKeyIncludes?: readonly string[];
    sections?: readonly ProductionTemplateSection[];
    rowNumber?: readonly number[];
    rowCodeIncludes?: readonly string[];
  };
};

export type ProfessionalNormPackTemplateInput = {
  workKey: string;
  templateKey: string;
  category: string;
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

function sourceId(normId: string): string {
  return `${PROFESSIONAL_NORM_PACK_SOURCE_PREFIX}${normId}`;
}

const commonSource = {
  sourceDocumentVersion: PROFESSIONAL_NORM_PACK_REGISTRY_VERSION,
  sourceType: "manufacturer_consumption_table",
  sourceProvenance: "manufacturer_datasheet_curated",
  licenseStatus: "manufacturer_terms_required",
  qualityStatus: "needs_regional_review",
  reviewStatus: "source_mapping_reviewed",
} as const;

export const PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS: readonly ProfessionalNormPackRegistryItem[] = Object.freeze([
  {
    normId: "tile_ceresit_cm11_plus_adhesive_kg_m2_notch_4_12_v1",
    workGroup: "tile",
    unit: "kg",
    consumptionRate: 2,
    wastePercent: 7,
    packageSize: 25,
    sourceId: sourceId("tile_ceresit_cm11_plus_adhesive_kg_m2_notch_4_12_v1"),
    sourceTitle: "Ceresit CM 11 PLUS technical data sheet",
    sourceUrl: "https://datasheets.tdx.henkel.com/CERESIT-CM-11-PLUS-en_GL.pdf",
    sourcePage: "technical data, approximate consumption table",
    match: {
      categories: ["tile_stone"],
      workKeyIncludes: ["tile_stone"],
      sections: ["materials"],
      rowNumber: [2],
    },
    ...commonSource,
  },
  {
    normId: "tile_ceresit_ct17_primer_l_m2_absorbent_substrate_v1",
    workGroup: "tile",
    unit: "l",
    consumptionRate: 0.1,
    wastePercent: 5,
    packageSize: 5,
    sourceId: sourceId("tile_ceresit_ct17_primer_l_m2_absorbent_substrate_v1"),
    sourceTitle: "Ceresit CT 17 Profi primer technical data sheet",
    sourceUrl: "https://datasheets.tdx.henkel.com/CERESIT-CT-17-en_GL.pdf",
    sourcePage: "technical data, consumption",
    match: {
      categories: ["tile_stone"],
      workKeyIncludes: ["tile_stone"],
      sections: ["materials"],
      rowNumber: [4],
    },
    ...commonSource,
  },
  {
    normId: "plaster_ceresit_ct29_kg_m2_mm_v1",
    workGroup: "plaster",
    unit: "kg",
    consumptionRate: 1.8,
    wastePercent: 10,
    packageSize: 25,
    sourceId: sourceId("plaster_ceresit_ct29_kg_m2_mm_v1"),
    sourceTitle: "Ceresit CT 29 plaster filler technical data sheet",
    sourceUrl: "https://datasheets.tdx.henkel.com/CERESIT-CT-29-en_GL.pdf",
    sourcePage: "technical data, assumed consumption",
    match: {
      categories: ["plaster_paint"],
      workKeyIncludes: ["wall_plaster", "ceiling_plaster", "decor_plaster", "repair_layer"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...commonSource,
  },
  {
    normId: "putty_ceresit_ct126_kg_m2_mm_v1",
    workGroup: "putty",
    unit: "kg",
    consumptionRate: 1.2,
    wastePercent: 8,
    packageSize: 20,
    sourceId: sourceId("putty_ceresit_ct126_kg_m2_mm_v1"),
    sourceTitle: "Ceresit CT 126 technical data sheet",
    sourceUrl: "https://dm.henkel-dam.com/is/content/henkel/ceresit-ct126",
    sourcePage: "technical data, approximate consumption",
    match: {
      categories: ["plaster_paint"],
      workKeyIncludes: ["wall_putty"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...commonSource,
  },
  {
    normId: "putty_ceresit_ct127_finish_layer_max_2mm_v1",
    workGroup: "putty",
    unit: "kg",
    consumptionRate: 1,
    wastePercent: 8,
    packageSize: 20,
    sourceId: sourceId("putty_ceresit_ct127_finish_layer_max_2mm_v1"),
    sourceTitle: "Ceresit CT 127 technical data sheet",
    sourceUrl: "https://datasheets.tdx.henkel.com/CERESIT-CT-127-en_GL.pdf",
    sourcePage: "scope of use and layer thickness",
    match: {
      categories: ["plaster_paint"],
      workKeyIncludes: ["finish_layer"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...commonSource,
  },
  {
    normId: "paint_ceresit_ct54_silicate_two_coats_l_m2_v1",
    workGroup: "paint",
    unit: "l",
    consumptionRate: 0.3,
    wastePercent: 7,
    packageSize: 15,
    sourceId: sourceId("paint_ceresit_ct54_silicate_two_coats_l_m2_v1"),
    sourceTitle: "Ceresit CT 54 Silicate Aero technical data sheet",
    sourceUrl: "https://datasheets.tdx.henkel.com/CERESIT-CT-54-en_GR.pdf",
    sourcePage: "technical data, assumed consumption",
    match: {
      categories: ["plaster_paint", "facade"],
      workKeyIncludes: ["paint_wall", "paint_ceiling", "facade_paint"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...commonSource,
  },
  {
    normId: "paint_ceresit_ct17_primer_l_m2_before_paint_v1",
    workGroup: "paint",
    unit: "l",
    consumptionRate: 0.1,
    wastePercent: 5,
    packageSize: 5,
    sourceId: sourceId("paint_ceresit_ct17_primer_l_m2_before_paint_v1"),
    sourceTitle: "Ceresit CT 17 Profi primer technical data sheet",
    sourceUrl: "https://datasheets.tdx.henkel.com/CERESIT-CT-17-en_GL.pdf",
    sourcePage: "technical data, consumption",
    match: {
      categories: ["plaster_paint", "facade"],
      workKeyIncludes: ["paint_wall", "paint_ceiling", "primer", "facade_paint"],
      sections: ["materials"],
      rowNumber: [2],
    },
    ...commonSource,
  },
  {
    normId: "flooring_ceresit_cn69_self_leveling_scope_2_10mm_v1",
    workGroup: "flooring",
    unit: "kg",
    consumptionRate: 1.5,
    wastePercent: 7,
    packageSize: 25,
    sourceId: sourceId("flooring_ceresit_cn69_self_leveling_scope_2_10mm_v1"),
    sourceTitle: "Ceresit CN 69 floor levelling compound technical data sheet",
    sourceUrl: "https://datasheets.tdx.henkel.com/CERESIT-CN-69-en_AE.pdf",
    sourcePage: "scope of use and layer thickness",
    match: {
      categories: ["flooring"],
      workKeyIncludes: ["subfloor_finish"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...commonSource,
  },
  {
    normId: "flooring_ceresit_ct17_primer_flooring_l_m2_v1",
    workGroup: "flooring",
    unit: "l",
    consumptionRate: 0.1,
    wastePercent: 5,
    packageSize: 5,
    sourceId: sourceId("flooring_ceresit_ct17_primer_flooring_l_m2_v1"),
    sourceTitle: "Ceresit CT 17 Profi primer technical data sheet",
    sourceUrl: "https://datasheets.tdx.henkel.com/CERESIT-CT-17-en_GL.pdf",
    sourcePage: "technical data, consumption",
    match: {
      categories: ["flooring"],
      workKeyIncludes: ["subfloor"],
      sections: ["materials"],
      rowNumber: [3],
    },
    ...commonSource,
  },
  {
    normId: "drywall_knauf_fugenfueller_leicht_jointing_kg_m2_v1",
    workGroup: "drywall",
    unit: "kg",
    consumptionRate: 0.3,
    wastePercent: 8,
    packageSize: 25,
    sourceId: sourceId("drywall_knauf_fugenfueller_leicht_jointing_kg_m2_v1"),
    sourceTitle: "Knauf Fugenfuller Leicht technical data sheet",
    sourceUrl: "https://knauf.com/api/download-center/v1/assets/c049f893-809e-4387-a0e6-4917b162989c?download=true",
    sourcePage: "material requirement consumption table",
    match: {
      categories: ["drywall_ceiling"],
      workKeyIncludes: ["drywall"],
      sections: ["materials"],
      rowNumber: [5],
    },
    ...commonSource,
  },
  {
    normId: "drywall_knauf_fugenfueller_perimeter_joint_kg_linear_m_v1",
    workGroup: "drywall",
    unit: "kg",
    consumptionRate: 0.15,
    wastePercent: 8,
    packageSize: 25,
    sourceId: sourceId("drywall_knauf_fugenfueller_perimeter_joint_kg_linear_m_v1"),
    sourceTitle: "Knauf Fugenfuller Leicht technical data sheet",
    sourceUrl: "https://knauf.com/api/download-center/v1/assets/c049f893-809e-4387-a0e6-4917b162989c?download=true",
    sourcePage: "perimeter connection jointing consumption",
    match: {
      categories: ["drywall_ceiling"],
      workKeyIncludes: ["drywall"],
      sections: ["materials"],
      rowNumber: [6],
    },
    ...commonSource,
  },
  {
    normId: "waterproofing_ceresit_cl51_two_coats_kg_m2_v1",
    workGroup: "waterproofing",
    unit: "kg",
    consumptionRate: 1.3,
    wastePercent: 8,
    packageSize: 15,
    sourceId: sourceId("waterproofing_ceresit_cl51_two_coats_kg_m2_v1"),
    sourceTitle: "Ceresit CL 51 Express 1-K technical data sheet",
    sourceUrl: "https://datasheets.tdx.henkel.com/CERESIT-CL-51-en_GL.pdf",
    sourcePage: "technical data, amount required for two coats",
    match: {
      categories: ["waterproofing"],
      workKeyIncludes: ["waterproofing"],
      sections: ["materials"],
      rowNumber: [1, 3],
    },
    ...commonSource,
  },
]);

export const PROFESSIONAL_NORM_PACK_GROUPS: readonly EstimateNormWorkGroupKey[] = Object.freeze(
  [...new Set(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item) => item.workGroup))].sort(),
);

export function isProfessionalNormPackSourceId(sourceIdValue: string | null | undefined): boolean {
  return String(sourceIdValue ?? "").startsWith(PROFESSIONAL_NORM_PACK_SOURCE_PREFIX);
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

function professionalItemMatches(input: ProfessionalNormPackTemplateInput, item: ProfessionalNormPackRegistryItem): boolean {
  if (input.row.lineType && input.row.lineType !== "material") return false;
  if (!item.match.sections?.includes(input.row.section as ProductionTemplateSection)) return false;
  if (item.match.categories?.length && !item.match.categories.includes(input.category as ProductionTemplate10000Category)) {
    return false;
  }
  const workKey = input.workKey.toLowerCase();
  if (!matchesAny(workKey, item.match.workKeyIncludes)) return false;
  const rowNumber = rowNumberFor(input);
  if (item.match.rowNumber?.length && (rowNumber === null || !item.match.rowNumber.includes(rowNumber))) return false;
  const rowCode = rowCodeFor(input);
  if (!matchesAny(rowCode, item.match.rowCodeIncludes)) return false;
  return true;
}

export function resolveProfessionalNormPackItemForTemplate(
  input: ProfessionalNormPackTemplateInput,
): ProfessionalNormPackRegistryItem | undefined {
  return PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.find((item) => professionalItemMatches(input, item));
}
