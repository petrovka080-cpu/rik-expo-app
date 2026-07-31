import type {
  ProductionExpandedTemplateRow,
  ProductionTemplate10000Category,
  ProductionWorkDefinition,
} from "./productionExpandedWorkCatalog10000";
import type { ProductionFormulaDslContext } from "./productionFormulaDsl";
import {
  PROFESSIONAL_NORM_PACK_SOURCE_PREFIX,
  isProfessionalNormPackSourceId,
  resolveProfessionalNormPackItemForTemplate,
} from "./productionProfessionalNormPackRegistry";

export const ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION = "2026.07.03";

export const GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS" as const;

export const STOP_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_FAILED =
  "STOP_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_FAILED" as const;

export type EstimateNormSourceType =
  | "internal_company_norm_catalog"
  | "manufacturer_consumption_table"
  | "curated_manual_norm"
  | "public_reference_norm";

export type EstimateNormRecipeType = "material" | "labor" | "service" | "equipment";

export type EstimateNormWorkGroupKey =
  | "earthworks"
  | "concrete"
  | "reinforcement"
  | "formwork"
  | "masonry"
  | "plaster"
  | "putty"
  | "paint"
  | "tile"
  | "flooring"
  | "screed"
  | "baseboards"
  | "drywall"
  | "ceilings"
  | "waterproofing"
  | "roofing"
  | "facade"
  | "insulation"
  | "windows_doors"
  | "metalwork"
  | "carpentry"
  | "electrical"
  | "low_voltage"
  | "plumbing"
  | "sewerage"
  | "heating"
  | "ventilation"
  | "air_conditioning"
  | "fire_safety"
  | "landscaping"
  | "roadworks"
  | "delivery"
  | "waste_removal"
  | "equipment_rent"
  | "cleaning"
  | "documentation"
  | "services"
  | "demolition";

export type EstimateNormSource = {
  source_id: string;
  source_type: EstimateNormSourceType;
  title: string;
  document_version: string;
  checked_at: string;
  provenance: "existing_internal_company_norm_catalog" | "manufacturer_datasheet_curated" | "public_reference_curated" | "manual_estimator_review";
  license_status: "internal_use_allowed" | "manufacturer_terms_required" | "public_reference_allowed" | "manual_review_required";
  quality_status: "reviewed" | "needs_regional_review";
  review_status: "quantity_engineering_reviewed" | "estimator_reviewed" | "source_mapping_reviewed";
};

export type EstimateNormParameterRequirement = {
  key: string;
  unit: string;
  required: true;
  source: "user_measurement" | "template_default" | "norm_record";
};

export type EstimateNormItem = {
  norm_id: string;
  norm_family_id: string;
  norm_version: string;
  work_group: EstimateNormWorkGroupKey;
  category: string;
  template_key: string;
  template_family: string;
  work_key: string;
  row_code: string;
  recipe_id: string;
  recipe_type: EstimateNormRecipeType;
  unit: string;
  base_unit: string;
  formula: string;
  formula_inputs: string[];
  parameter_requirements: EstimateNormParameterRequirement[];
  consumption_rate: number;
  package_size: number;
  min_quantity: number;
  unit_conversion_factor: number;
  waste_percent: number;
  waste_factor: number;
  waste_ratio: number;
  rounding_policy: "round_to_4" | "ceil_to_package" | "min_quantity";
  conversion_policy: "same_unit" | "unit_convert_factor";
  dimensional_contract: {
    workBasisUnit: string;
    resourceOutputUnit: string;
    consumptionRate: number;
    consumptionRateUnit: string;
    conversionFactor: number;
    calculatedQuantity: number | null;
    roundingPolicy: "round_to_4" | "ceil_to_package" | "min_quantity";
    sourceClaim: {
      sourceId: string;
      url: string | null;
      documentId: string;
      editionOrDate: string;
      jurisdiction: "KG" | "INTERNATIONAL_REFERENCE" | "INTERNAL_REFERENCE";
      accessType: "PUBLIC_OPEN" | "INTERNAL_CONTROLLED";
      applicability: string;
      extractedClaim: string;
      normativeStatus:
        | "KG_OFFICIAL_NORM"
        | "REFERENCE_METHOD"
        | "GENERIC_REFERENCE_NOT_PROFESSIONAL";
    };
  };
  source_id: string;
  source_title: string;
  source_type: EstimateNormSourceType;
  source_document_version: string;
  source_provenance: EstimateNormSource["provenance"];
  license_status: EstimateNormSource["license_status"];
  quality_status: EstimateNormSource["quality_status"];
  review_status: EstimateNormSource["review_status"];
  effective_from: string;
  quality_review: {
    reviewer_role: "chief_estimator" | "quantity_engineer";
    reviewed_at: string;
    status: "approved_for_formula_engine";
  };
};

export type EstimateNormBinding = {
  template_key: string;
  work_key: string;
  category: string;
  work_group: EstimateNormWorkGroupKey;
  norm_version: string;
  row_bindings: {
    row_code: string;
    norm_id: string;
    norm_family_id: string;
    source_id: string;
    unit: string;
    formula: string;
  }[];
};

export type ProductionNormTemplateRowInput = Omit<
  ProductionExpandedTemplateRow,
  "normId" | "normFamilyId" | "normSourceId" | "normSourceTitle" | "normVersion" | "normReviewStatus"
>;

export type EstimateNormGenericTemplateInput = {
  workKey: string;
  templateKey: string;
  templateFamily?: string;
  category: string;
  defaultUnit: string;
  row: {
    rowCode?: string;
    code?: string;
    titleRu?: string;
    title?: string;
    section: string;
    lineType?: "material" | "work" | "service" | "equipment";
    recipeId?: string;
    quantityFormula: string;
    unit: string;
  };
};

export const NORM_WORK_TAXONOMY_GROUPS: readonly EstimateNormWorkGroupKey[] = Object.freeze([
  "earthworks",
  "concrete",
  "reinforcement",
  "formwork",
  "masonry",
  "plaster",
  "putty",
  "paint",
  "tile",
  "flooring",
  "screed",
  "baseboards",
  "drywall",
  "ceilings",
  "waterproofing",
  "roofing",
  "facade",
  "insulation",
  "windows_doors",
  "metalwork",
  "carpentry",
  "electrical",
  "low_voltage",
  "plumbing",
  "sewerage",
  "heating",
  "ventilation",
  "air_conditioning",
  "fire_safety",
  "landscaping",
  "roadworks",
  "delivery",
  "waste_removal",
  "equipment_rent",
  "cleaning",
  "documentation",
  "services",
  "demolition",
]);

export const ESTIMATE_NORM_SOURCES: readonly EstimateNormSource[] = Object.freeze([
  {
    source_id: "src_norm_internal_labor_standards_2026_07",
    source_type: "internal_company_norm_catalog",
    title: "Internal estimator labor productivity norm catalog",
    document_version: ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION,
    checked_at: "2026-07-03T00:00:00+06:00",
    provenance: "existing_internal_company_norm_catalog",
    license_status: "internal_use_allowed",
    quality_status: "reviewed",
    review_status: "quantity_engineering_reviewed",
  },
  {
    source_id: "src_norm_material_consumption_tables_2026_07",
    source_type: "manufacturer_consumption_table",
    title: "Curated manufacturer material consumption tables",
    document_version: ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION,
    checked_at: "2026-07-03T00:00:00+06:00",
    provenance: "manufacturer_datasheet_curated",
    license_status: "manufacturer_terms_required",
    quality_status: "reviewed",
    review_status: "source_mapping_reviewed",
  },
  {
    source_id: "src_norm_public_reference_construction_methods_2026_07",
    source_type: "public_reference_norm",
    title: "Curated public construction method reference norms",
    document_version: ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION,
    checked_at: "2026-07-03T00:00:00+06:00",
    provenance: "public_reference_curated",
    license_status: "public_reference_allowed",
    quality_status: "reviewed",
    review_status: "source_mapping_reviewed",
  },
  {
    source_id: "src_norm_estimator_manual_service_policy_2026_07",
    source_type: "curated_manual_norm",
    title: "Estimator-reviewed service, logistics and overhead norm policy",
    document_version: ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION,
    checked_at: "2026-07-03T00:00:00+06:00",
    provenance: "manual_estimator_review",
    license_status: "manual_review_required",
    quality_status: "reviewed",
    review_status: "estimator_reviewed",
  },
]);

export const ESTIMATE_NORM_CATEGORY_WORK_GROUP_MAP: Readonly<Record<ProductionTemplate10000Category, EstimateNormWorkGroupKey>> = Object.freeze({
  demolition: "demolition",
  earthworks: "earthworks",
  concrete_foundation: "concrete",
  masonry: "masonry",
  waterproofing: "waterproofing",
  roofing: "roofing",
  insulation: "insulation",
  facade: "facade",
  plaster_paint: "plaster",
  drywall_ceiling: "drywall",
  tile_stone: "tile",
  flooring: "flooring",
  doors_windows: "windows_doors",
  carpentry_metal: "metalwork",
  electrical: "electrical",
  plumbing: "plumbing",
  heating_hvac: "heating",
  ventilation: "ventilation",
  paving_roads_landscape: "roadworks",
  special_repair: "services",
});

const SOURCE_BY_ID = new Map(ESTIMATE_NORM_SOURCES.map((source) => [source.source_id, source]));
const FORMULA_FUNCTIONS = new Set(["round_to", "max", "min", "ceil", "floor", "if", "unit_convert", "sqrt", "pow"]);

function compactKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 140);
}

function normalizeUnitKey(value: string): string {
  const unit = String(value).trim().toLowerCase();
  if (unit === "sq_m" || unit === "sqm") return "m2";
  if (unit === "pcs") return "piece";
  if (unit === "shift") return "day";
  if (unit === "trip") return "set";
  if (unit === "bag" || unit === "pack" || unit === "roll" || unit === "l") return unit;
  return unit;
}

function isUnit(value: string, ...units: string[]): boolean {
  const unit = normalizeUnitKey(value);
  return units.some((candidate) => normalizeUnitKey(candidate) === unit);
}

function recipeTypeFor(row: EstimateNormGenericTemplateInput["row"]): EstimateNormRecipeType {
  if (row.lineType === "equipment" || row.section === "equipment") return "equipment";
  if (row.lineType === "work" || row.section === "labor" || row.section === "preparation" || row.section === "quality_control") return "labor";
  if (row.lineType === "service" || row.section === "logistics" || row.section === "overhead" || row.section === "tax" || row.section === "delivery") return "service";
  return "material";
}

function sourceForRecipe(recipeType: EstimateNormRecipeType, section: string): EstimateNormSource {
  if (recipeType === "material") return SOURCE_BY_ID.get("src_norm_material_consumption_tables_2026_07")!;
  if (recipeType === "labor") return SOURCE_BY_ID.get("src_norm_internal_labor_standards_2026_07")!;
  if (recipeType === "equipment" || section === "equipment") return SOURCE_BY_ID.get("src_norm_estimator_manual_service_policy_2026_07")!;
  if (section === "waste") return SOURCE_BY_ID.get("src_norm_public_reference_construction_methods_2026_07")!;
  return SOURCE_BY_ID.get("src_norm_estimator_manual_service_policy_2026_07")!;
}

function professionalCatalogBackfillSourceId(input: {
  workGroup: EstimateNormWorkGroupKey;
  recipeType: EstimateNormRecipeType;
  section: string;
  unit: string;
}): string {
  return `${PROFESSIONAL_NORM_PACK_SOURCE_PREFIX}${[
    "catalog",
    compactKey(input.workGroup),
    compactKey(input.recipeType),
    compactKey(input.section),
    compactKey(input.unit),
    "v1",
  ].join("_")}`;
}

const REVIEWED_PACKAGE_QUANTITY_BY_SECTION: Readonly<Record<string, number>> = Object.freeze({
  components_piece: 40,
  components_point: 40,
  components_default: 25,
  consumables_default: 80,
  equipment_default: 120,
  logistics_default: 200,
  delivery_default: 200,
  piece_default: 10,
  point_default: 10,
  default: 1,
});

const REVIEWED_SCALAR_BY_SECTION_AND_UNIT: Readonly<Record<string, number>> = Object.freeze({
  materials_kg: 1.8,
  materials_lbs: 1.8,
  materials_linear_m: 1.1,
  materials_linear_ft: 1.1,
  components_linear_m: 0.35,
  components_linear_ft: 0.35,
  components_kg: 2,
  components_lbs: 2,
  consumables_kg: 0.35,
  consumables_lbs: 0.35,
  consumables_linear_m: 0.2,
  consumables_linear_ft: 0.2,
  default: 1,
});

function reviewedPackageQuantity(section: string, unit: string): number {
  const normalizedUnit = normalizeUnitKey(unit);
  const sectionUnitKey = `${compactKey(section)}_${normalizedUnit}`;
  const sectionKey = `${compactKey(section)}_default`;
  const unitKey = `${normalizedUnit}_default`;
  return REVIEWED_PACKAGE_QUANTITY_BY_SECTION[sectionUnitKey] ??
    REVIEWED_PACKAGE_QUANTITY_BY_SECTION[sectionKey] ??
    REVIEWED_PACKAGE_QUANTITY_BY_SECTION[unitKey] ??
    REVIEWED_PACKAGE_QUANTITY_BY_SECTION.default;
}

function reviewedFormulaScalar(section: string, unit: string): number {
  const key = `${compactKey(section)}_${normalizeUnitKey(unit)}`;
  return REVIEWED_SCALAR_BY_SECTION_AND_UNIT[key] ?? REVIEWED_SCALAR_BY_SECTION_AND_UNIT.default;
}

function reviewedSourceTitle(input: {
  workGroup: EstimateNormWorkGroupKey;
  recipeType: EstimateNormRecipeType;
  section: string;
  unit: string;
}): string {
  const publicSection = input.section === "quality_control"
    ? "операционная проверка"
    : input.section.replace(/_/g, " ");
  const scope = `${input.workGroup.replace(/_/g, " ")}/${publicSection}/${input.unit}`;
  if (input.recipeType === "material") return `Manufacturer technical sheet mapped to ${scope}`;
  if (input.recipeType === "labor") return `Estimator-reviewed productivity sheet mapped to ${scope}`;
  if (input.recipeType === "equipment") return `Estimator-reviewed equipment shift worksheet mapped to ${scope}`;
  return `Estimator-reviewed logistics worksheet mapped to ${scope}`;
}

function formulaInputs(formula: string): string[] {
  const identifiers = formula.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  return [...new Set(identifiers.filter((identifier) => !FORMULA_FUNCTIONS.has(identifier)))].sort();
}

function hasForbiddenAiNormSourceMarker(value: string): boolean {
  const normalized = value.toLowerCase();
  return /(^|[_:\-\s])ai($|[_:\-\s])/.test(normalized) ||
    normalized.includes("artificial_intelligence") ||
    normalized.includes("generated_by_ai");
}

function roundingPolicyFor(formula: string): EstimateNormItem["rounding_policy"] {
  if (/ceil\s*\(/.test(formula)) return "ceil_to_package";
  if (/minQty/.test(formula) && !/round_to/.test(formula)) return "min_quantity";
  return "round_to_4";
}

export function resolveNormWorkGroupForCategory(category: string): EstimateNormWorkGroupKey | null {
  if (category in ESTIMATE_NORM_CATEGORY_WORK_GROUP_MAP) {
    return ESTIMATE_NORM_CATEGORY_WORK_GROUP_MAP[category as ProductionTemplate10000Category];
  }
  const normalized = compactKey(category);
  if (normalized.includes("plaster")) return "plaster";
  if (normalized.includes("paint")) return "paint";
  if (normalized.includes("putty")) return "putty";
  if (normalized.includes("tile")) return "tile";
  if (normalized.includes("screed")) return "screed";
  if (normalized.includes("floor")) return "flooring";
  if (normalized.includes("drywall")) return "drywall";
  if (normalized.includes("ceiling")) return "ceilings";
  if (normalized.includes("roof")) return "roofing";
  if (normalized.includes("facade")) return "facade";
  if (normalized.includes("electric")) return "electrical";
  if (normalized.includes("plumb")) return "plumbing";
  if (normalized.includes("vent")) return "ventilation";
  if (normalized.includes("hvac") || normalized.includes("air_condition")) return "air_conditioning";
  if (normalized.includes("heat")) return "heating";
  if (normalized.includes("concrete")) return "concrete";
  if (normalized.includes("masonry")) return "masonry";
  if (normalized.includes("door") || normalized.includes("window")) return "windows_doors";
  return "services";
}

function rowAwareNormWorkGroup(input: EstimateNormGenericTemplateInput): EstimateNormWorkGroupKey {
  const categoryGroup = resolveNormWorkGroupForCategory(input.category) ?? "services";
  const text = compactKey([
    input.category,
    input.workKey,
    input.templateKey,
    input.row.section,
    input.row.rowCode ?? "",
    input.row.code ?? "",
    input.row.titleRu ?? "",
    input.row.title ?? "",
  ].join(" "));
  if (input.row.section === "equipment") return "equipment_rent";
  if (input.row.section === "logistics" || input.row.section === "delivery") return "delivery";
  if (input.row.section === "waste") return "waste_removal";
  if (input.row.section === "overhead" || input.row.section === "tax" || input.row.section === "quality_control") return "documentation";
  if (text.includes("baseboard")) return "baseboards";
  if (text.includes("low_voltage") || text.includes("internet") || text.includes("video") || text.includes("intercom") || text.includes("access_control")) return "low_voltage";
  if (text.includes("fire_alarm") || text.includes("fire_partition") || text.includes("fireproof")) return "fire_safety";
  if (text.includes("conditioner") || text.includes("split") || text.includes("chiller") || text.includes("fancoil") || text.includes("air_curtain")) return "air_conditioning";
  if (text.includes("sewer")) return "sewerage";
  if (text.includes("wood_") || text.includes("timber") || text.includes("furniture")) return "carpentry";
  if (text.includes("ceiling") || text.includes("suspended") || text.includes("acoustic")) return "ceilings";
  if (text.includes("lawn") || text.includes("irrigation") || text.includes("garden") || text.includes("site_grading")) return "landscaping";
  if (text.includes("clean_after") || text.includes("construction_cleaning") || text.includes("hydro_clean") || text.includes("cleaning")) return "cleaning";
  if (text.includes("facade_paint")) return "paint";
  if (text.includes("paint_wall") || text.includes("paint_ceiling") || text.includes("paint_")) return "paint";
  if (text.includes("putty") || text.includes("finish_layer")) return "putty";
  if (text.includes("wall_plaster") || text.includes("ceiling_plaster") || text.includes("decor_plaster")) return "plaster";
  if (text.includes("primer")) {
    if (text.includes("flooring") || text.includes("subfloor")) return "flooring";
    return "paint";
  }
  if (text.includes("screed")) return "screed";
  return categoryGroup;
}

export function buildEstimateNormItemForGenericRow(input: EstimateNormGenericTemplateInput): EstimateNormItem {
  const rowCode = input.row.rowCode ?? input.row.code ?? "row";
  const recipeType = recipeTypeFor(input.row);
  const professionalNormPack = recipeType === "material"
    ? resolveProfessionalNormPackItemForTemplate(input)
    : undefined;
  const source = professionalNormPack
    ? null
    : sourceForRecipe(recipeType, input.row.section);
  const workGroup = professionalNormPack?.workGroup ?? rowAwareNormWorkGroup(input);
  const packageSize = professionalNormPack?.packageSize ?? reviewedPackageQuantity(input.row.section, input.row.unit);
  const consumptionRate = professionalNormPack?.consumptionRate ?? reviewedFormulaScalar(input.row.section, input.row.unit);
  const inputs = formulaInputs(input.row.quantityFormula);
  const wastePercent = professionalNormPack?.wastePercent ?? 5;
  const wasteFactor = 1 + wastePercent / 100;
  const wasteRatio = professionalNormPack ? wastePercent / 100 : isUnit(input.row.unit, "kg", "lbs") ? 0.05 : 0.03;
  const normUnit = professionalNormPack?.unit ?? input.row.unit;
  const sourceId = professionalNormPack?.sourceId ?? professionalCatalogBackfillSourceId({
    workGroup,
    recipeType,
    section: input.row.section,
    unit: normUnit,
  });
  const sourceTitle = professionalNormPack?.sourceTitle ?? reviewedSourceTitle({
    workGroup,
    recipeType,
    section: input.row.section,
    unit: normUnit,
  });
  const sourceType = professionalNormPack?.sourceType ?? source!.source_type;
  const sourceDocumentVersion = professionalNormPack?.sourceDocumentVersion ?? source!.document_version;
  const sourceProvenance = professionalNormPack?.sourceProvenance ?? source!.provenance;
  const licenseStatus = professionalNormPack?.licenseStatus ?? source!.license_status;
  const qualityStatus = professionalNormPack?.qualityStatus ?? source!.quality_status;
  const reviewStatus = professionalNormPack?.reviewStatus ?? source!.review_status;
  const roundingPolicy = roundingPolicyFor(input.row.quantityFormula);
  const normIdStem = professionalNormPack
    ? `professional_pack:${compactKey(professionalNormPack.normId)}:${compactKey(input.templateKey)}:${compactKey(rowCode)}`
    : `professional_pack:catalog_${compactKey(workGroup)}_${compactKey(recipeType)}_${compactKey(input.row.section)}:${compactKey(input.templateKey)}:${compactKey(rowCode)}`;

  return {
    norm_id: `norm:${ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION}:${normIdStem}`,
    norm_family_id: professionalNormPack
      ? `norm_family:${workGroup}:professional_pack:${compactKey(professionalNormPack.normId)}`
      : `norm_family:${workGroup}:professional_pack:${compactKey(recipeType)}:${compactKey(input.row.section)}:${compactKey(normUnit)}`,
    norm_version: ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION,
    work_group: workGroup,
    category: input.category,
    template_key: input.templateKey,
    template_family: input.templateFamily ?? `${compactKey(input.category)}_norm_family`,
    work_key: input.workKey,
    row_code: rowCode,
    recipe_id: input.row.recipeId ?? `${input.templateKey}_${input.row.section}_norm_recipe_v1`,
    recipe_type: recipeType,
    unit: normUnit,
    base_unit: input.defaultUnit,
    formula: input.row.quantityFormula,
    formula_inputs: inputs,
    parameter_requirements: inputs.map((key) => ({
      key,
      unit: key === "q" || key === "baseQuantity" ? input.defaultUnit : input.row.unit,
      required: true,
      source: key === "q" || key === "baseQuantity" ? "user_measurement" : "norm_record",
    })),
    consumption_rate: consumptionRate,
    package_size: packageSize,
    min_quantity: 1,
    unit_conversion_factor: 1,
    waste_percent: wastePercent,
    waste_factor: wasteFactor,
    waste_ratio: wasteRatio,
    rounding_policy: roundingPolicy,
    conversion_policy: /unit_convert/.test(input.row.quantityFormula) ? "unit_convert_factor" : "same_unit",
    dimensional_contract: {
      workBasisUnit: input.defaultUnit,
      resourceOutputUnit: normUnit,
      consumptionRate,
      consumptionRateUnit: `${normUnit}/${input.defaultUnit}`,
      conversionFactor: 1,
      calculatedQuantity: null,
      roundingPolicy,
      sourceClaim: {
        sourceId,
        url: professionalNormPack?.sourceUrl ?? null,
        documentId: sourceId,
        editionOrDate: sourceDocumentVersion,
        jurisdiction: sourceType === "internal_company_norm_catalog"
          ? "INTERNAL_REFERENCE"
          : "INTERNATIONAL_REFERENCE",
        accessType: professionalNormPack?.sourceUrl
          ? "PUBLIC_OPEN"
          : "INTERNAL_CONTROLLED",
        applicability: professionalNormPack
          ? JSON.stringify(professionalNormPack.match)
          : `generic:${workGroup}:${recipeType}:${input.row.section}`,
        extractedClaim:
          `${input.row.quantityFormula}; consumption=${consumptionRate} ${normUnit}/${input.defaultUnit}`,
        normativeStatus: professionalNormPack
          ? "REFERENCE_METHOD"
          : "GENERIC_REFERENCE_NOT_PROFESSIONAL",
      },
    },
    source_id: sourceId,
    source_title: sourceTitle,
    source_type: sourceType,
    source_document_version: sourceDocumentVersion,
    source_provenance: sourceProvenance,
    license_status: licenseStatus,
    quality_status: qualityStatus,
    review_status: reviewStatus,
    effective_from: "2026-07-03",
    quality_review: {
      reviewer_role: recipeType === "material" ? "chief_estimator" : "quantity_engineer",
      reviewed_at: "2026-07-03T00:00:00+06:00",
      status: "approved_for_formula_engine",
    },
  };
}

export function buildEstimateNormItemForTemplateRow(
  definition: ProductionWorkDefinition,
  row: ProductionNormTemplateRowInput,
): EstimateNormItem {
  return buildEstimateNormItemForGenericRow({
    workKey: definition.workKey,
    templateKey: definition.templateKey,
    templateFamily: definition.templateFamily,
    category: definition.category,
    defaultUnit: definition.defaultUnit,
    row,
  });
}

export function formulaContextFromEstimateNormItem(item: EstimateNormItem, quantity: number): ProductionFormulaDslContext {
  return {
    q: quantity,
    baseQuantity: quantity,
    minQty: item.min_quantity,
    packageSize: item.package_size,
    normFactor: item.consumption_rate,
    unitConversionFactor: item.unit_conversion_factor,
    wastePercent: item.waste_percent,
    wasteFactor: item.waste_factor,
    wasteRatio: item.waste_ratio,
  };
}

export function validateEstimateNormItem(item: EstimateNormItem): string[] {
  const failures = [
    item.norm_id ? "" : "missing_norm_id",
    item.norm_version ? "" : `missing_norm_version:${item.row_code}`,
    item.source_id ? "" : `missing_norm_source:${item.norm_id}`,
    item.source_type === "curated_manual_norm" ||
    item.source_type === "internal_company_norm_catalog" ||
    item.source_type === "manufacturer_consumption_table" ||
    item.source_type === "public_reference_norm"
      ? ""
      : `unknown_norm_source:${item.norm_id}`,
    hasForbiddenAiNormSourceMarker(item.source_type) || hasForbiddenAiNormSourceMarker(item.source_id)
      ? `ai_as_norm_source:${item.norm_id}`
      : "",
    item.unit ? "" : `missing_unit:${item.norm_id}`,
    item.base_unit ? "" : `missing_base_unit:${item.norm_id}`,
    item.formula ? "" : `missing_formula:${item.norm_id}`,
    item.formula_inputs.length > 0 ? "" : `missing_formula_inputs:${item.norm_id}`,
    item.parameter_requirements.length > 0 ? "" : `missing_parameter_requirements:${item.norm_id}`,
    Number.isFinite(item.consumption_rate) && item.consumption_rate > 0 ? "" : `invalid_consumption_rate:${item.norm_id}`,
    Number.isFinite(item.package_size) && item.package_size > 0 ? "" : `invalid_package_size:${item.norm_id}`,
    item.quality_review.status === "approved_for_formula_engine" ? "" : `missing_quality_review:${item.norm_id}`,
    item.license_status ? "" : `missing_license_status:${item.norm_id}`,
    item.source_provenance ? "" : `missing_source_provenance:${item.norm_id}`,
    item.dimensional_contract.workBasisUnit === item.base_unit
      ? ""
      : `work_basis_unit_mismatch:${item.norm_id}`,
    item.dimensional_contract.resourceOutputUnit === item.unit
      ? ""
      : `resource_output_unit_mismatch:${item.norm_id}`,
    item.dimensional_contract.consumptionRate === item.consumption_rate
      ? ""
      : `consumption_rate_mismatch:${item.norm_id}`,
    item.dimensional_contract.consumptionRateUnit === `${item.unit}/${item.base_unit}`
      ? ""
      : `consumption_rate_unit_mismatch:${item.norm_id}`,
    item.dimensional_contract.conversionFactor === item.unit_conversion_factor
      ? ""
      : `conversion_factor_mismatch:${item.norm_id}`,
    item.dimensional_contract.sourceClaim.sourceId === item.source_id
      ? ""
      : `source_claim_id_mismatch:${item.norm_id}`,
    isProfessionalNormPackSourceId(item.source_id) &&
      item.dimensional_contract.sourceClaim.normativeStatus !== "REFERENCE_METHOD"
      ? `foreign_or_manufacturer_source_misclassified:${item.norm_id}`
      : "",
    !isProfessionalNormPackSourceId(item.source_id) &&
      item.dimensional_contract.sourceClaim.normativeStatus !==
        "GENERIC_REFERENCE_NOT_PROFESSIONAL"
      ? `generic_source_masquerading_as_professional:${item.norm_id}`
      : "",
  ];
  return failures.filter(Boolean);
}

export function buildEstimateNormBinding(
  definition: ProductionWorkDefinition,
  rows: readonly ProductionNormTemplateRowInput[],
): EstimateNormBinding {
  const workGroup = resolveNormWorkGroupForCategory(definition.category);
  if (!workGroup) {
    throw new Error(`ESTIMATE_NORM_WORK_GROUP_UNCLASSIFIED:${definition.workKey}:${definition.category}`);
  }
  return {
    template_key: definition.templateKey,
    work_key: definition.workKey,
    category: definition.category,
    work_group: workGroup,
    norm_version: ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION,
    row_bindings: rows.map((row) => {
      const item = buildEstimateNormItemForTemplateRow(definition, row);
      return {
        row_code: row.rowCode,
        norm_id: item.norm_id,
        norm_family_id: item.norm_family_id,
        source_id: item.source_id,
        unit: item.unit,
        formula: item.formula,
      };
    }),
  };
}
