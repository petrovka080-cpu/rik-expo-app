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

function sourceId(normId: string): string {
  return `${PROFESSIONAL_NORM_PACK_SOURCE_PREFIX}${normId}`;
}

const commonSource = {
  sourceType: "manufacturer_consumption_table",
  sourceProvenance: "manufacturer_datasheet_curated",
  licenseStatus: "manufacturer_terms_required",
  qualityStatus: "needs_regional_review",
  reviewStatus: "source_mapping_reviewed",
} as const;

type ProfessionalNormPackRegistryItemInput = Omit<
  ProfessionalNormPackRegistryItem,
  "sourceDocumentVersion"
>;

const PROFESSIONAL_NORM_PACK_REGISTRY_ITEM_INPUTS: readonly ProfessionalNormPackRegistryItemInput[] = Object.freeze([
  {
    normId: "carpentry_sikagard_wood_preserver_l_m2_preventative_v1",
    workGroup: "carpentry",
    workBasisUnit: "m2",
    unit: "l",
    consumptionRate: 0.25,
    wastePercent: 0,
    packageSize: 1,
    sourceId: sourceId("carpentry_sikagard_wood_preserver_l_m2_preventative_v1"),
    sourceTitle: "Sikagard Wood Preserver Product Data Sheet",
    sourceUrl: "https://gbr.sika.com/dam/dms/gb01/c/sikagard_wood_preserver.pdf",
    sourcePage: "PDS July 2026, version 02.01, page 1, preventative treatment 250 ml/m2; packaging 1 L and 5 L tins",
    match: {
      categories: ["carpentry_metal"],
      workKeyIncludes: ["carpentry_metal_interior_wood_frame_finish_standard"],
      sections: ["materials"],
      rowNumber: [3],
    },
    ...commonSource,
  },
  {
    normId: "roofing_sarnafil_at18_field_overlap_m2_m2_v1",
    workGroup: "roofing",
    workBasisUnit: "m2",
    unit: "m2",
    consumptionRate: 1.0416667,
    wastePercent: 0,
    packageSize: 30,
    sourceId: sourceId("roofing_sarnafil_at18_field_overlap_m2_m2_v1"),
    sourceTitle: "Sika Sarnafil AT-18 product data and application instructions",
    sourceUrl: "https://gbr.sika.com/en/construction/roofing/flat-roof-productsandsystems/single-ply-roofing/fpo-roof-membranes/sarnafil-at-18.html",
    sourcePage: "PDS August 2025, version 06.01, pages 2 and 4: standard roll 2 m x 15 m; field and ballasted overlap 80 mm",
    match: {
      categories: ["roofing"],
      workKeyIncludes: ["roofing_interior_flat_roof_install_standard"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...commonSource,
  },
  {
    normId: "facade_rockwool_fixrock_conventional_fixings_piece_m2_v1",
    workGroup: "facade",
    workBasisUnit: "m2",
    unit: "piece",
    consumptionRate: 5,
    wastePercent: 0,
    packageSize: 1,
    quantityFormulaOverride: "ceil(q * normFactor)",
    sourceId: sourceId("facade_rockwool_fixrock_conventional_fixings_piece_m2_v1"),
    sourceTitle: "ROCKWOOL Austria: fixing insulation boards for ventilated facades",
    sourceUrl: "https://www.rockwool.com/at/rat-und-tat/vertiefendes-wissen/produktwissen/vhf-befestigung/",
    sourcePage: "Variant 1 conventional fixing: average five insulation holders per m2; adhesive and one-dowel variants are separate",
    match: {
      categories: ["facade"],
      workKeyIncludes: ["facade_interior_vent_facade_install_standard"],
      sections: ["components"],
      rowNumber: [7],
    },
    ...commonSource,
  },
  {
    normId: "insulation_rockwool_comfortboard80_r63_38mm_m2_m2_v1",
    workGroup: "insulation",
    workBasisUnit: "m2",
    unit: "m2",
    consumptionRate: 1,
    wastePercent: 0,
    packageSize: 4.45,
    sourceId: sourceId("insulation_rockwool_comfortboard80_r63_38mm_m2_m2_v1"),
    sourceTitle: "ROCKWOOL Residential Product Guide: Building Insulation",
    sourceUrl: "https://brandportal.rockwool.com/original/gallery/39052/files/original/13225669-1028-49f5-85e4-6dd3f8bb0b9b.pdf",
    sourcePage: "page 16, Comfortboard 80 table: R6.3, 38 mm, six 1219 x 610 mm boards, 4.45 m2 per pack",
    match: {
      categories: ["insulation"],
      workKeyIncludes: ["insulation_interior_facade_install_standard"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...commonSource,
  },
  {
    normId: "metalwork_jotun_hardtop_xp_l_m2_100um_v1",
    workGroup: "metalwork",
    workBasisUnit: "m2",
    unit: "l",
    consumptionRate: 0.15873016,
    wastePercent: 0,
    packageSize: 5,
    sourceId: sourceId("metalwork_jotun_hardtop_xp_l_m2_100um_v1"),
    sourceTitle: "Jotun Hardtop XP Technical Data Sheet",
    sourceUrl: "https://www.jotun.com/api/v1/datasheets/download/merged?selectedFiles=4378",
    sourcePage: "TDS issued 24 June 2026; page 2: 100 um DFT, 160 um WFT and 6.3 m2/l theoretical spreading; pages 3-4: 10:1 mixing and typical 5/20 L kits",
    match: {
      categories: ["carpentry_metal"],
      workKeyIncludes: ["carpentry_metal_interior_metal_frame_paint_standard"],
      sections: ["materials"],
      rowNumber: [3],
    },
    ...commonSource,
  },
  {
    normId: "ceilings_knauf_d112_standard_board_m2_m2_v1",
    workGroup: "ceilings",
    workBasisUnit: "m2",
    unit: "m2",
    consumptionRate: 1,
    wastePercent: 0,
    packageSize: 1,
    sourceId: sourceId("ceilings_knauf_d112_standard_board_m2_m2_v1"),
    sourceTitle: "Knauf D11: листовая обшивка D112, вариант 1",
    sourceUrl: "https://knauf.com/api/download-center/v1/assets/2d411a5d-3b6d-45e3-ab8e-a13b0f0b54bd?download=true",
    sourcePage: "page 28, Consumption of Material, Knauf Boards, D112 variant 1",
    match: {
      categories: ["drywall_ceiling"],
      workKeyIncludes: ["drywall_ceiling_install_standard"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...commonSource,
  },
  {
    normId: "ceilings_knauf_d112_standard_ud_runner_linear_m_m2_v1",
    workGroup: "ceilings",
    workBasisUnit: "m2",
    unit: "linear_m",
    consumptionRate: 0.4,
    wastePercent: 0,
    packageSize: 3,
    sourceId: sourceId("ceilings_knauf_d112_standard_ud_runner_linear_m_m2_v1"),
    sourceTitle: "Knauf D11: пристенный профиль UD 28/27 системы D112, вариант 1",
    sourceUrl: "https://knauf.com/api/download-center/v1/assets/2d411a5d-3b6d-45e3-ab8e-a13b0f0b54bd?download=true",
    sourcePage: "page 28, Consumption of Material, connection to wall, D112 variant 1",
    match: {
      categories: ["drywall_ceiling"],
      workKeyIncludes: ["drywall_ceiling_install_standard"],
      sections: ["materials"],
      rowNumber: [2],
    },
    ...commonSource,
  },
  {
    normId: "ceilings_knauf_d112_standard_uniflott_kg_m2_v1",
    workGroup: "ceilings",
    workBasisUnit: "m2",
    unit: "kg",
    consumptionRate: 0.3,
    wastePercent: 0,
    packageSize: 5,
    sourceId: sourceId("ceilings_knauf_d112_standard_uniflott_kg_m2_v1"),
    sourceTitle: "Knauf D11: смесь Uniflott для швов D112, вариант 1",
    sourceUrl: "https://knauf.com/api/download-center/v1/assets/2d411a5d-3b6d-45e3-ab8e-a13b0f0b54bd?download=true",
    sourcePage: "page 28, Jointing, Knauf Uniflott, D112 variant 1",
    match: {
      categories: ["drywall_ceiling"],
      workKeyIncludes: ["drywall_ceiling_install_standard"],
      sections: ["materials"],
      rowNumber: [5],
    },
    ...commonSource,
  },
  {
    normId: "ceilings_knauf_d112_standard_joint_tape_linear_m_m2_v1",
    workGroup: "ceilings",
    workBasisUnit: "m2",
    unit: "linear_m",
    consumptionRate: 0.45,
    wastePercent: 0,
    packageSize: 1,
    sourceId: sourceId("ceilings_knauf_d112_standard_joint_tape_linear_m_m2_v1"),
    sourceTitle: "Knauf D11: армирующая лента резаных кромок D112, вариант 1",
    sourceUrl: "https://knauf.com/api/download-center/v1/assets/2d411a5d-3b6d-45e3-ab8e-a13b0f0b54bd?download=true",
    sourcePage: "page 28, Joint Tape for cut edges, D112 variant 1",
    match: {
      categories: ["drywall_ceiling"],
      workKeyIncludes: ["drywall_ceiling_install_standard"],
      sections: ["materials"],
      rowNumber: [6],
    },
    ...commonSource,
  },
  {
    normId: "ceilings_knauf_d112_standard_tn25_screw_piece_m2_v1",
    workGroup: "ceilings",
    workBasisUnit: "m2",
    unit: "piece",
    consumptionRate: 17,
    wastePercent: 0,
    packageSize: 1,
    quantityFormulaOverride: "ceil(q * normFactor)",
    sourceId: sourceId("ceilings_knauf_d112_standard_tn25_screw_piece_m2_v1"),
    sourceTitle: "Knauf D11: саморез TN 3,5 × 25 мм для D112, вариант 1",
    sourceUrl: "https://knauf.com/api/download-center/v1/assets/2d411a5d-3b6d-45e3-ab8e-a13b0f0b54bd?download=true",
    sourcePage: "page 28, Screw attachment, D112 variant 1",
    match: {
      categories: ["drywall_ceiling"],
      workKeyIncludes: ["drywall_ceiling_install_standard"],
      sections: ["components"],
      rowNumber: [7],
    },
    ...commonSource,
  },
  {
    normId: "ceilings_knauf_d112_standard_substructure_anchor_piece_m2_v1",
    workGroup: "ceilings",
    workBasisUnit: "m2",
    unit: "piece",
    consumptionRate: 1.2,
    wastePercent: 0,
    packageSize: 1,
    quantityFormulaOverride: "ceil(q * normFactor)",
    sourceId: sourceId("ceilings_knauf_d112_standard_substructure_anchor_piece_m2_v1"),
    sourceTitle: "Knauf D11: анкер или подвес каркаса D112, вариант 1",
    sourceUrl: "https://knauf.com/api/download-center/v1/assets/2d411a5d-3b6d-45e3-ab8e-a13b0f0b54bd?download=true",
    sourcePage: "page 28, substructure and D112 variant 1 spacing notes",
    match: {
      categories: ["drywall_ceiling"],
      workKeyIncludes: ["drywall_ceiling_install_standard"],
      sections: ["components"],
      rowNumber: [8],
    },
    ...commonSource,
  },
  {
    normId: "baseboards_gerflor_design_skirting_linear_m_perimeter_v1",
    workGroup: "baseboards",
    workBasisUnit: "linear_m",
    unit: "linear_m",
    consumptionRate: 1,
    wastePercent: 0,
    packageSize: 2,
    sourceId: sourceId("baseboards_gerflor_design_skirting_linear_m_perimeter_v1"),
    sourceTitle: "Gerflor Design Skirting 6086: плинтус секциями по 2 м",
    sourceUrl: "https://cdn.gerflor.com/media/2/56198/design%20skirting%20-%20installation%20guidelines.pdf",
    sourcePage: "page 1, Packaging; sections 2 and 3",
    match: {
      categories: ["flooring"],
      workKeyIncludes: ["baseboard_install_standard"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...commonSource,
  },
  {
    normId: "waterproofing_ceresit_cl51_two_coats_kg_m2_v1",
    workGroup: "waterproofing",
    workBasisUnit: "m2",
    unit: "kg",
    consumptionRate: 1.3,
    wastePercent: 0,
    packageSize: 5,
    sourceId: sourceId("waterproofing_ceresit_cl51_two_coats_kg_m2_v1"),
    sourceTitle: "Технический паспорт эластичной гидроизоляционной мастики Ceresit CL 51 Express 1-K",
    sourceUrl: "https://datasheets.tdx.henkel.com/CERESIT-CL-51-en_GL.pdf",
    sourcePage: "TDS 03/2024, pages 1-2: indoor wet-area scope, two coats, exclusions and minimum 1.3 kg/m2; product page: 5 kg and 15 kg buckets",
    match: {
      categories: ["waterproofing"],
      workKeyIncludes: [
        "waterproofing_interior_bathroom_apply_standard",
        "waterproofing_interior_wet_zone_apply_standard",
      ],
      sections: ["materials"],
      rowNumber: [3],
    },
    ...commonSource,
  },
  {
    normId: "screed_cement_sand_mix_kg_m2_50mm_v1",
    workGroup: "screed",
    workBasisUnit: "m2",
    unit: "kg",
    consumptionRate: 100,
    wastePercent: 0,
    packageSize: 25,
    sourceId: sourceId("screed_cement_sand_mix_kg_m2_50mm_v1"),
    sourceTitle: "Технический паспорт сухой смеси Ceresit CN 87 для стяжки 50 мм",
    sourceUrl: "https://datasheets.tdx.henkel.com/CERESIT-CN-87-en_GL.pdf",
    sourcePage: "TDS CN_87_KT_10.21, pages 1-2: applicable thickness ranges; page 2: approximately 2.0 kg/m2 per mm and 25 kg bag",
    match: {
      categories: ["flooring"],
      workKeyIncludes: ["subfloor_lay_standard"],
      sections: ["materials"],
      rowNumber: [1],
    },
    ...commonSource,
  },
]);

export const PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS: readonly ProfessionalNormPackRegistryItem[] = Object.freeze(
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEM_INPUTS.map((item) => Object.freeze({
    ...item,
    sourceDocumentVersion: PROFESSIONAL_NORM_PACK_SOURCE_VERSION_BY_GROUP[item.workGroup],
  })),
);

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

function normalizeWorkBasisUnit(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "sq_m" || normalized === "sqm") return "m2";
  if (normalized === "pcs") return "piece";
  if (normalized === "shift") return "day";
  if (normalized === "trip") return "set";
  return normalized;
}

function professionalItemMatches(input: ProfessionalNormPackTemplateInput, item: ProfessionalNormPackRegistryItem): boolean {
  if (input.row.lineType && input.row.lineType !== "material") return false;
  if (normalizeWorkBasisUnit(input.defaultUnit) !== item.workBasisUnit) return false;
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
