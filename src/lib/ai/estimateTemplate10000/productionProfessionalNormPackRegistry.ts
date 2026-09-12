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
  cleaning: "2026.09-tennant-t350-productivity-r1",
  concrete: "2026.07-wave2a",
  delivery: "2026.09-ford-transit-payload-reference-r1",
  demolition: "2026.09-krer46-applicability-routing-r1",
  documentation: "2026.09-kg-project-pricing-routing-r1",
  drywall: "2026.07-wave1",
  earthworks: "2026.09-fhwa-fp24-structural-backfill-r1",
  electrical: "2026.09-legrand-product-and-installation-r1",
  equipment_rent: "2026.09-united-rentals-shift-billing-reference-r1",
  facade: "2026.09-rockwool-vhf-fixings-primary-review-r2",
  fire_safety: "2026.09-siemens-sinteso-detector-base-r1",
  flooring: "2026.09-ceresit-cn69-ct17-global-primary-review-r2",
  formwork: "2026.07-wave2a",
  heating: "2026.09-uponor-ufh-pipe-spacing-r2",
  insulation: "2026.09-rockwool-comfortboard80-primary-review-r2",
  landscaping: "2026.09-rain-bird-xfd-dripline-r1",
  low_voltage: "2026.09-legrand-049272-signal-cable-r1",
  masonry: "2026.07-wave2a",
  metalwork: "2026.09-jotun-hardtop-xp-primary-review-r2",
  paint: "2026.07-wave1",
  plaster: "2026.07-wave1",
  plumbing: "2026.09-wavin-hep2o-primary-review-r2",
  putty: "2026.07-wave1",
  reinforcement: "2026.07-wave2a",
  roadworks: "2026.09-krer27-table-27-06-020-routing-r1",
  roofing: "2026.09-sika-sarnafil-at18-primary-review-r2",
  screed: "2026.09-ceresit-cn87-primary-review-r2",
  services: "2026.09-kg-author-supervision-trip-exclusion-r1",
  sewerage: "2026.09-wavin-osma-110mm-3m-pipe-r1",
  tile: "2026.07-wave1",
  ventilation: "2026.09-lindab-vsr-exact-sizes-r2",
  waste_removal: "2026.09-us-epa-cd-volume-weight-r1",
  waterproofing: "2026.09-ceresit-cl51-global-primary-review-r2",
  windows_doors: "2026.09-soudal-window-door-genius-linear-yield-r1",
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

const publicReferenceSource = {
  sourceType: "public_reference_norm",
  sourceProvenance: "public_reference_curated",
  licenseStatus: "public_reference_allowed",
  qualityStatus: "needs_regional_review",
  reviewStatus: "source_mapping_reviewed",
} as const;

const internalCuratedSource = {
  sourceType: "internal_company_norm_catalog",
  sourceProvenance: "existing_internal_company_norm_catalog",
  licenseStatus: "internal_use_allowed",
  qualityStatus: "needs_regional_review",
  reviewStatus: "quantity_engineering_reviewed",
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
    normId: "tile_ceresit_cm11_plus_adhesive_kg_m2_notch_4_12_v1",
    workGroup: "tile",
    workBasisUnit: "m2",
    unit: "kg",
    consumptionRate: 2,
    wastePercent: 7,
    packageSize: 25,
    sourceId: sourceId("tile_ceresit_cm11_plus_adhesive_kg_m2_notch_4_12_v1"),
    sourceTitle: "Технический паспорт плиточного клея Ceresit CM 11 Plus",
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
    workBasisUnit: "m2",
    unit: "l",
    consumptionRate: 0.1,
    wastePercent: 5,
    packageSize: 5,
    sourceId: sourceId("tile_ceresit_ct17_primer_l_m2_absorbent_substrate_v1"),
    sourceTitle: "Технический паспорт грунтовки глубокого проникновения Ceresit CT 17 Profi",
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
    workBasisUnit: "m2",
    unit: "kg",
    consumptionRate: 1.8,
    wastePercent: 10,
    packageSize: 25,
    sourceId: sourceId("plaster_ceresit_ct29_kg_m2_mm_v1"),
    sourceTitle: "Технический паспорт ремонтной штукатурно-шпаклёвочной смеси Ceresit CT 29",
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
    workBasisUnit: "m2",
    unit: "kg",
    consumptionRate: 1.2,
    wastePercent: 8,
    packageSize: 20,
    sourceId: sourceId("putty_ceresit_ct126_kg_m2_mm_v1"),
    sourceTitle: "Технический паспорт финишной шпаклёвки Ceresit CT 126",
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
    workBasisUnit: "m2",
    unit: "kg",
    consumptionRate: 1,
    wastePercent: 8,
    packageSize: 20,
    sourceId: sourceId("putty_ceresit_ct127_finish_layer_max_2mm_v1"),
    sourceTitle: "Технический паспорт финишной шпаклёвки Ceresit CT 127",
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
    workBasisUnit: "m2",
    unit: "l",
    consumptionRate: 0.3,
    wastePercent: 7,
    packageSize: 15,
    sourceId: sourceId("paint_ceresit_ct54_silicate_two_coats_l_m2_v1"),
    sourceTitle: "Технический паспорт силикатной краски Ceresit CT 54 Silicate Aero",
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
    workBasisUnit: "m2",
    unit: "l",
    consumptionRate: 0.1,
    wastePercent: 5,
    packageSize: 5,
    sourceId: sourceId("paint_ceresit_ct17_primer_l_m2_before_paint_v1"),
    sourceTitle: "Технический паспорт грунтовки глубокого проникновения Ceresit CT 17 Profi",
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
    normId: "drywall_knauf_fugenfueller_leicht_jointing_kg_m2_v1",
    workGroup: "drywall",
    workBasisUnit: "m2",
    unit: "kg",
    consumptionRate: 0.3,
    wastePercent: 8,
    packageSize: 25,
    sourceId: sourceId("drywall_knauf_fugenfueller_leicht_jointing_kg_m2_v1"),
    sourceTitle: "Технический паспорт гипсовой шпаклёвки Knauf Fugenfuller Leicht",
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
    normId: "masonry_aac_block_600_200_200_piece_m2_wall_v1",
    workGroup: "masonry",
    workBasisUnit: "m2",
    unit: "piece",
    consumptionRate: 8.33,
    wastePercent: 5,
    packageSize: 60,
    sourceId: sourceId("masonry_aac_block_600_200_200_piece_m2_wall_v1"),
    sourceTitle: "Расчётная ведомость раскладки блоков из автоклавного газобетона",
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
    workBasisUnit: "m2",
    unit: "piece",
    consumptionRate: 51,
    wastePercent: 5,
    packageSize: 500,
    sourceId: sourceId("masonry_brick_250_120_65_piece_m2_half_brick_v1"),
    sourceTitle: "Расчётная ведомость кладки из керамического кирпича 250 × 120 × 65 мм",
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
    workBasisUnit: "m2",
    unit: "kg",
    consumptionRate: 5,
    wastePercent: 7,
    packageSize: 25,
    sourceId: sourceId("masonry_thin_bed_block_adhesive_kg_m2_200mm_v1"),
    sourceTitle: "Таблица расхода тонкошовного клея для кладки блоков из автоклавного газобетона",
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
    workBasisUnit: "m2",
    unit: "m3",
    consumptionRate: 0.055,
    wastePercent: 7,
    packageSize: 1,
    sourceId: sourceId("masonry_cement_lime_mortar_m3_m2_brick_v1"),
    sourceTitle: "Расчётная таблица расхода кладочного раствора",
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
    workBasisUnit: "m2",
    unit: "m2",
    consumptionRate: 1.05,
    wastePercent: 3,
    packageSize: 50,
    sourceId: sourceId("masonry_reinforcement_mesh_m2_m2_wall_v1"),
    sourceTitle: "Проверенная технологическая карта армирования кладки сеткой",
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
    workBasisUnit: "m3",
    unit: "m3",
    consumptionRate: 1.02,
    wastePercent: 2,
    packageSize: 1,
    sourceId: sourceId("concrete_ready_mix_m3_m3_placed_v1"),
    sourceTitle: "Таблица учёта объёма уложенной товарной бетонной смеси",
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
    workBasisUnit: "m3",
    unit: "kg",
    consumptionRate: 95,
    wastePercent: 5,
    packageSize: 1000,
    sourceId: sourceId("reinforcement_rebar_kg_m3_concrete_element_v1"),
    sourceTitle: "Проверенная сметчиком таблица расхода арматурной стали на 1 м³ бетонной конструкции",
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
    workBasisUnit: "m3",
    unit: "m2",
    consumptionRate: 2.4,
    wastePercent: 5,
    packageSize: 50,
    sourceId: sourceId("formwork_contact_area_m2_m3_concrete_element_v1"),
    sourceTitle: "Проверенная сметчиком методика расчёта площади контакта опалубки",
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
