import type {
  ProductionCompiledExpandedEstimate,
  ProductionCompiledExpandedRow,
  ProductionWorkDefinition,
} from "../../../lib/ai/estimateTemplate10000";
import type {
  ProfessionalRowCatalogBinding,
  ProfessionalTemplateCatalogBinding,
  ProfessionalTemplateDefinitionInput,
  ProfessionalWorkFamilyId,
} from "./professionalCatalogTypes";

const CATEGORY_FAMILY: Record<string, ProfessionalWorkFamilyId> = {
  demolition: "demolition",
  earthworks: "earthworks",
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
  heating_hvac: "hvac",
  ventilation: "hvac",
  paving_roads_landscape: "roadworks",
  special_repair: "cleaning_waste",
};

function compact(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

export function resolveProfessionalWorkFamily(
  definition: ProfessionalTemplateDefinitionInput | Pick<ProductionCompiledExpandedEstimate, "workKey" | "category">,
): ProfessionalWorkFamilyId {
  const workKey = "workKey" in definition ? definition.workKey : "";
  const category = String(definition.category);
  const key = `${workKey} ${category} ${"operationKey" in definition ? definition.operationKey ?? "" : ""} ${"elementKey" in definition ? definition.elementKey ?? "" : ""}`;
  if (/diamond|core_drill|core_drilling|drilling_hole/i.test(key)) return "diamond_concrete_drilling";
  if (/profile_sheet|prof_sheet|proflist|fence/i.test(key)) return "profile_sheet_fence";
  if (/mansard/i.test(key)) return "mansard_roof";
  if (/reinforcement|reinforce|rebar|armature/i.test(key)) return "reinforcement";
  if (/formwork/i.test(key)) return "formwork";
  if (/screed/i.test(key)) return "screed";
  if (/putty|finish_layer/i.test(key)) return "putty";
  if (/paint|primer/i.test(key)) return "paint";
  if (/plaster/i.test(key)) return "plaster";
  if (/low_voltage|cctv|network|fire_alarm/i.test(key)) return "low_voltage";
  if (/fire/i.test(key)) return "fire_safety";
  if (/road|paving|asphalt|curb|paver|sidewalk|storm_tray|concrete_path|gravel_base|sand_base/i.test(key)) return "roadworks";
  if (/landscape|landscaping|lawn|plant|irrigation|site_grading|retaining/i.test(key)) return "landscaping";
  if (/delivery|transport|(?:^|_)trip(?:_|$)/i.test(key)) return "transport_delivery";
  if (/equipment|rent|rental/i.test(key)) return "equipment_rental";
  if (category === "carpentry_metal") return "metalwork";
  if (/carpentry|wood|timber/i.test(key)) return "carpentry";
  if (category === "concrete_foundation") return "concrete";
  return CATEGORY_FAMILY[category] ?? "cleaning_waste";
}

export function buildProfessionalTemplateCatalogBinding(
  definition: ProductionWorkDefinition,
): ProfessionalTemplateCatalogBinding {
  const family = resolveProfessionalWorkFamily(definition);
  const templateStem = compact(definition.templateKey);
  return {
    template_id: definition.templateKey,
    work_key: definition.workKey,
    category: definition.category,
    work_family_id: family,
    calculator_family_id: `calc_family_${family}_v1`,
    work_catalog_item_id: `work_catalog_${family}_${templateStem}`,
    parameter_schema_id: `params_${family}_v1`,
    norm_pack_id: `norm_pack_${family}_v1`,
    material_recipe_id: `material_recipe_${family}_v1`,
    labor_recipe_id: `labor_recipe_${family}_v1`,
    service_recipe_id: `service_recipe_${family}_v1`,
    equipment_recipe_id: `equipment_recipe_${family}_v1`,
    unit_policy_id: `unit_policy_${family}_${definition.defaultUnit}_v1`,
    price_policy_id: `price_policy_${family}_missing_price_or_ratebook_v1`,
    pdf_policy_id: `pdf_policy_snapshot_trace_${family}_v1`,
    buyer_handoff_policy_id: `buyer_handoff_procurement_subset_${family}_v1`,
  };
}

function kindForRow(row: ProductionCompiledExpandedRow): ProfessionalRowCatalogBinding["kind"] {
  if (row.lineType === "equipment" || row.section === "equipment") return "equipment";
  if (row.lineType === "service" || row.section === "logistics" || row.section === "waste") return "service";
  if (row.lineType === "work" || row.section === "labor" || row.section === "preparation" || row.section === "quality_control") {
    return "work";
  }
  return "material";
}

export function buildProfessionalRowCatalogBinding(input: {
  family: ProfessionalWorkFamilyId;
  row: ProductionCompiledExpandedRow;
}): ProfessionalRowCatalogBinding {
  const kind = kindForRow(input.row);
  return {
    catalog_item_id: `${kind}_catalog_${input.family}_${compact(input.row.rowCode)}`,
    kind,
    family_id: input.family,
    professional_name_ru: input.row.titleRu,
    unit_policy_id: `unit_policy_${input.family}_${input.row.unit}_v1`,
    source_policy_id: `source_policy_${input.row.normSourceId}`,
    row_code: input.row.rowCode,
    section: input.row.section,
    unit: input.row.unit,
    included_in_procurement: input.row.includedInProcurement,
  };
}

export function buildProfessionalEstimateCatalogBindings(input: {
  definition: ProductionWorkDefinition;
  estimate: ProductionCompiledExpandedEstimate;
}) {
  const template = buildProfessionalTemplateCatalogBinding(input.definition);
  const rows = input.estimate.rows.map((row) => buildProfessionalRowCatalogBinding({
    family: template.work_family_id,
    row,
  }));
  return { template, rows };
}
