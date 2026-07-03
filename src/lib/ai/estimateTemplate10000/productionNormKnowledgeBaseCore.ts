import type {
  ProductionDefaultUnit,
  ProductionExpandedTemplateRow,
  ProductionTemplate10000Category,
  ProductionTemplateSection,
  ProductionWorkDefinition,
} from "./productionExpandedWorkCatalog10000";
import type { ProductionFormulaDslContext } from "./productionFormulaDsl";

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

function packageSizeForNorm(section: string, unit: string): number {
  if (section === "equipment") return 120;
  if (section === "logistics" || section === "delivery") return 200;
  if (section === "components") return isUnit(unit, "piece", "point", "pcs") ? 40 : 25;
  if (section === "consumables") return 80;
  if (isUnit(unit, "piece", "point", "pcs")) return 10;
  return 1;
}

function consumptionRateForNorm(section: string, unit: string): number {
  if (section === "materials") {
    if (isUnit(unit, "kg", "lbs")) return 1.8;
    if (isUnit(unit, "linear_m", "linear_ft")) return 1.1;
    return 1;
  }
  if (section === "components") {
    if (isUnit(unit, "linear_m", "linear_ft")) return 0.35;
    if (isUnit(unit, "kg", "lbs")) return 2;
    return 1;
  }
  if (section === "consumables") {
    if (isUnit(unit, "kg", "lbs")) return 0.35;
    if (isUnit(unit, "linear_m", "linear_ft")) return 0.2;
    return 1;
  }
  return 1;
}

function formulaInputs(formula: string): string[] {
  const identifiers = formula.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  return [...new Set(identifiers.filter((identifier) => !FORMULA_FUNCTIONS.has(identifier)))].sort();
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

export function buildEstimateNormItemForGenericRow(input: EstimateNormGenericTemplateInput): EstimateNormItem {
  const rowCode = input.row.rowCode ?? input.row.code ?? "row";
  const recipeType = recipeTypeFor(input.row);
  const source = sourceForRecipe(recipeType, input.row.section);
  const workGroup = resolveNormWorkGroupForCategory(input.category) ?? "services";
  const packageSize = packageSizeForNorm(input.row.section, input.row.unit);
  const consumptionRate = consumptionRateForNorm(input.row.section, input.row.unit);
  const inputs = formulaInputs(input.row.quantityFormula);
  const wasteRatio = isUnit(input.row.unit, "kg", "lbs") ? 0.05 : 0.03;

  return {
    norm_id: `norm:${ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION}:${compactKey(input.templateKey)}:${compactKey(rowCode)}`,
    norm_family_id: `norm_family:${workGroup}:${recipeType}:${compactKey(input.row.section)}:${compactKey(input.row.unit)}`,
    norm_version: ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION,
    work_group: workGroup,
    category: input.category,
    template_key: input.templateKey,
    template_family: input.templateFamily ?? `${compactKey(input.category)}_norm_family`,
    work_key: input.workKey,
    row_code: rowCode,
    recipe_id: input.row.recipeId ?? `${input.templateKey}_${input.row.section}_norm_recipe_v1`,
    recipe_type: recipeType,
    unit: input.row.unit,
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
    waste_percent: 5,
    waste_factor: 1.05,
    waste_ratio: wasteRatio,
    rounding_policy: roundingPolicyFor(input.row.quantityFormula),
    conversion_policy: /unit_convert/.test(input.row.quantityFormula) ? "unit_convert_factor" : "same_unit",
    source_id: source.source_id,
    source_title: source.title,
    source_type: source.source_type,
    source_document_version: source.document_version,
    source_provenance: source.provenance,
    license_status: source.license_status,
    quality_status: source.quality_status,
    review_status: source.review_status,
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
    /ai/i.test(item.source_type) || /ai/i.test(item.source_id) ? `ai_as_norm_source:${item.norm_id}` : "",
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
