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
export const PROFESSIONAL_NORM_PACK_REGISTRY_VERSION = "2026.07-wave2a" as const;

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

const publicReferenceSource = {
  sourceDocumentVersion: PROFESSIONAL_NORM_PACK_REGISTRY_VERSION,
  sourceType: "public_reference_norm",
  sourceProvenance: "public_reference_curated",
  licenseStatus: "public_reference_allowed",
  qualityStatus: "needs_regional_review",
  reviewStatus: "source_mapping_reviewed",
} as const;

const internalCuratedSource = {
  sourceDocumentVersion: PROFESSIONAL_NORM_PACK_REGISTRY_VERSION,
  sourceType: "internal_company_norm_catalog",
  sourceProvenance: "existing_internal_company_norm_catalog",
  licenseStatus: "internal_use_allowed",
  qualityStatus: "needs_regional_review",
  reviewStatus: "quantity_engineering_reviewed",
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
      rowTitleIncludes: ["paint", "\u043a\u0440\u0430\u0441\u043a", "\u044d\u043c\u0443\u043b\u044c\u0441"],
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
      rowTitleIncludes: ["primer", "\u0433\u0440\u0443\u043d\u0442"],
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
  {
    normId: "masonry_aac_block_600_200_200_piece_m2_wall_v1",
    workGroup: "masonry",
    unit: "piece",
    consumptionRate: 8.33,
    wastePercent: 5,
    packageSize: 60,
    sourceId: sourceId("masonry_aac_block_600_200_200_piece_m2_wall_v1"),
    sourceTitle: "Autoclaved aerated concrete block layout engineering takeoff table",
    sourceUrl: "https://www.ytong-silka.de/",
    sourcePage: "block geometry 600 x 200 mm face area, reviewed estimator takeoff",
    match: {
      categories: ["masonry"],
      workKeyIncludes: ["gas_block", "block"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...publicReferenceSource,
  },
  {
    normId: "masonry_brick_250_120_65_piece_m2_half_brick_v1",
    workGroup: "masonry",
    unit: "piece",
    consumptionRate: 51,
    wastePercent: 5,
    packageSize: 500,
    sourceId: sourceId("masonry_brick_250_120_65_piece_m2_half_brick_v1"),
    sourceTitle: "Clay brick wall takeoff table 250 x 120 x 65 mm",
    sourceUrl: "https://www.gobrick.com/",
    sourcePage: "brick dimensions and estimator-reviewed wall consumption table",
    match: {
      categories: ["masonry"],
      workKeyIncludes: ["brick"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...publicReferenceSource,
  },
  {
    normId: "masonry_thin_bed_block_adhesive_kg_m2_200mm_v1",
    workGroup: "masonry",
    unit: "kg",
    consumptionRate: 5,
    wastePercent: 7,
    packageSize: 25,
    sourceId: sourceId("masonry_thin_bed_block_adhesive_kg_m2_200mm_v1"),
    sourceTitle: "Thin-bed block adhesive consumption table for AAC/block masonry",
    sourceUrl: "https://www.ytong-silka.de/",
    sourcePage: "thin-bed mortar / block adhesive estimator table",
    match: {
      categories: ["masonry"],
      workKeyIncludes: ["gas_block", "block"],
      sections: ["materials"],
      rowNumber: [2],
    },
    ...publicReferenceSource,
  },
  {
    normId: "masonry_cement_lime_mortar_m3_m2_brick_v1",
    workGroup: "masonry",
    unit: "m3",
    consumptionRate: 0.055,
    wastePercent: 7,
    packageSize: 1,
    sourceId: sourceId("masonry_cement_lime_mortar_m3_m2_brick_v1"),
    sourceTitle: "Brick masonry mortar quantity estimator table",
    sourceUrl: "https://www.gobrick.com/",
    sourcePage: "mortar volume by brick wall area, reviewed estimator takeoff",
    match: {
      categories: ["masonry"],
      workKeyIncludes: ["brick"],
      sections: ["materials"],
      rowNumber: [2],
    },
    ...publicReferenceSource,
  },
  {
    normId: "masonry_reinforcement_mesh_m2_m2_wall_v1",
    workGroup: "masonry",
    unit: "m2",
    consumptionRate: 1.05,
    wastePercent: 3,
    packageSize: 50,
    sourceId: sourceId("masonry_reinforcement_mesh_m2_m2_wall_v1"),
    sourceTitle: "Masonry reinforcement mesh reviewed method statement",
    sourceUrl: "https://www.concrete.org/",
    sourcePage: "masonry reinforcement allowance, reviewed estimator method statement",
    match: {
      categories: ["masonry"],
      workKeyIncludes: ["masonry", "brick", "block"],
      sections: ["materials"],
      rowNumber: [3],
    },
    ...publicReferenceSource,
  },
  {
    normId: "concrete_ready_mix_m3_m3_placed_v1",
    workGroup: "concrete",
    unit: "m3",
    consumptionRate: 1.02,
    wastePercent: 2,
    packageSize: 1,
    sourceId: sourceId("concrete_ready_mix_m3_m3_placed_v1"),
    sourceTitle: "Ready-mix concrete placed volume allowance",
    sourceUrl: "https://www.nrmca.org/",
    sourcePage: "ready-mixed concrete volume takeoff with placement waste allowance",
    match: {
      categories: ["concrete_foundation"],
      workKeyIncludes: ["pour", "concrete", "foundation", "slab", "strip"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...publicReferenceSource,
  },
  {
    normId: "reinforcement_rebar_kg_m3_concrete_element_v1",
    workGroup: "reinforcement",
    unit: "kg",
    consumptionRate: 95,
    wastePercent: 5,
    packageSize: 1000,
    sourceId: sourceId("reinforcement_rebar_kg_m3_concrete_element_v1"),
    sourceTitle: "Reinforcement steel estimator kg per m3 concrete element table",
    sourceUrl: "https://www.engineeringtoolbox.com/reinforcing-bars-d_1341.html",
    sourcePage: "reinforcing bar weights and estimator-reviewed kg per concrete volume allowance",
    match: {
      categories: ["concrete_foundation"],
      workKeyIncludes: ["reinforce", "reinforcement", "concrete", "foundation", "slab", "strip"],
      sections: ["materials"],
      rowNumber: [2],
    },
    ...publicReferenceSource,
  },
  {
    normId: "formwork_contact_area_m2_m3_concrete_element_v1",
    workGroup: "formwork",
    unit: "m2",
    consumptionRate: 2.4,
    wastePercent: 5,
    packageSize: 50,
    sourceId: sourceId("formwork_contact_area_m2_m3_concrete_element_v1"),
    sourceTitle: "Concrete formwork contact area estimator method statement",
    sourceUrl: "https://www.concrete.org/",
    sourcePage: "formwork contact area by concrete element, reviewed estimator method statement",
    match: {
      categories: ["concrete_foundation"],
      workKeyIncludes: ["form", "formwork", "concrete", "foundation", "slab", "strip"],
      sections: ["materials"],
      rowNumber: [3],
    },
    ...internalCuratedSource,
  },
  {
    normId: "screed_cement_sand_mix_kg_m2_50mm_v1",
    workGroup: "screed",
    unit: "kg",
    consumptionRate: 90,
    wastePercent: 7,
    packageSize: 25,
    sourceId: sourceId("screed_cement_sand_mix_kg_m2_50mm_v1"),
    sourceTitle: "Cement-sand screed dry mix estimator table for 50 mm layer",
    sourceUrl: "https://datasheets.tdx.henkel.com/CERESIT-CN-69-en_AE.pdf",
    sourcePage: "floor layer thickness scope with estimator-reviewed cement-sand dry mix density",
    match: {
      categories: ["flooring"],
      workKeyIncludes: ["subfloor_lay"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...commonSource,
  },
]);

export const PROFESSIONAL_NORM_PACK_GROUPS: readonly EstimateNormWorkGroupKey[] = Object.freeze(
  [...new Set(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item) => item.workGroup))].sort(),
);

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
  const rowTitle = String(input.row.titleRu ?? input.row.title ?? "").toLowerCase();
  if (!matchesAny(rowTitle, item.match.rowTitleIncludes)) return false;
  return true;
}

export function resolveProfessionalNormPackItemForTemplate(
  input: ProfessionalNormPackTemplateInput,
): ProfessionalNormPackRegistryItem | undefined {
  return PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.find((item) => professionalItemMatches(input, item));
}
