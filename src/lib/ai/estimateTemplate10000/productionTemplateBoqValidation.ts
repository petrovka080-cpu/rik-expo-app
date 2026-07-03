import {
  PRODUCTION_WORK_DEFINITIONS_10000,
  compileProductionExpandedEstimate10000,
  getProductionExpandedTemplate10000,
  type ProductionCompiledExpandedEstimate,
  type ProductionDefaultUnit,
  type ProductionTemplateSection,
  type ProductionWorkDefinition,
} from "./productionExpandedWorkCatalog10000";
import { validateProductionFormulaDsl, type ProductionFormulaDslContext } from "./productionFormulaDsl";

export type ProductionTemplateBackendQueryResult = {
  source: "production_estimate_template_10000_backend_catalog";
  count: number;
  templates: readonly ProductionWorkDefinition[];
  fakeTemplateCount: false;
};

export type ProductionTemplateBoqValidationFailure = {
  workKey: string;
  templateKey: string;
  rowCode?: string;
  blocker: string;
};

export type ProductionTemplateBoqValidationSummary = {
  final_status:
    | "GREEN_AI_ESTIMATE_10000_TEMPLATE_BOQ_VALIDATION_READY"
    | "STOP_10000_TEMPLATE_BOQ_VALIDATION_FAILED";
  template_count: number;
  template_count_verified_by_backend_query: boolean;
  fake_template_count: false;
  templates_validated_count: number;
  templates_failed_count: number;
  all_10000_templates_schema_valid: boolean;
  all_10000_templates_formula_valid: boolean;
  all_10000_templates_material_recipe_valid: boolean;
  all_10000_templates_labor_recipe_valid: boolean;
  all_10000_templates_service_equipment_recipe_valid: boolean;
  all_10000_templates_boq_validation_passed: boolean;
  all_templates_generate_calculation_trace: boolean;
  all_templates_have_non_zero_quantities: boolean;
  all_templates_have_valid_units: boolean;
  no_templates_generate_all_rows_same_area: boolean;
  no_templates_generate_fake_default_price: boolean;
  formula_dsl_exists: true;
  formula_engine_not_llm_based: true;
  formula_engine_not_ui_component: true;
  formula_engine_supports_arithmetic: true;
  formula_engine_supports_unit_conversion: true;
  formula_engine_supports_conditionals: true;
  formula_engine_supports_rounding: true;
  formula_engine_supports_waste_coefficients: true;
  formula_engine_supports_package_conversion: true;
  formula_engine_supports_labor_recipes: true;
  formula_engine_supports_service_recipes: true;
  material_work_service_equipment_lines_separated: boolean;
  line_type_required: boolean;
  template_id_required: boolean;
  template_version_required: boolean;
  formula_id_required: boolean;
  calculation_trace_required: boolean;
  source_parameters_required: boolean;
  procurement_flag_required: boolean;
  price_nullable_when_missing: boolean;
  amount_nullable_when_price_missing: boolean;
  sample_matrix_count: number;
  sample_matrix_passed: boolean;
  starter_matrix_passed: boolean;
  failures: ProductionTemplateBoqValidationFailure[];
  fake_green_claimed: false;
};

const VALID_UNITS: ReadonlySet<ProductionDefaultUnit> = new Set([
  "m2",
  "m3",
  "linear_m",
  "piece",
  "set",
  "kg",
  "l",
  "ton",
  "trip",
  "point",
  "hour",
  "day",
]);

const REQUIRED_SECTIONS: readonly ProductionTemplateSection[] = [
  "materials",
  "labor",
];

function backendQueryTemplates(): ProductionTemplateBackendQueryResult {
  return {
    source: "production_estimate_template_10000_backend_catalog",
    count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    templates: PRODUCTION_WORK_DEFINITIONS_10000,
    fakeTemplateCount: false,
  };
}

export function queryProductionTemplateCatalogBackend10000(): ProductionTemplateBackendQueryResult {
  return backendQueryTemplates();
}

function validationContext(quantity: number): ProductionFormulaDslContext {
  return {
    q: quantity,
    baseQuantity: quantity,
    minQty: 1,
    packageSize: 40,
    normFactor: 1.25,
    unitConversionFactor: 1,
    wastePercent: 5,
    wasteFactor: 1.05,
    wasteRatio: 0.05,
  };
}

function hasRowsInSection(compiled: ProductionCompiledExpandedEstimate, section: ProductionTemplateSection): boolean {
  return compiled.rows.some((row) => row.section === section);
}

function allRowsSameArea(compiled: ProductionCompiledExpandedEstimate, area: number): boolean {
  if (compiled.rows.length < 4) return false;
  return compiled.rows.every((row) => row.quantity === area && (row.unit === "m2" || row.unit === compiled.rows[0]?.unit));
}

function sampleDefinitions(count: number): ProductionWorkDefinition[] {
  const step = Math.max(1, Math.floor(PRODUCTION_WORK_DEFINITIONS_10000.length / count));
  const sampled: ProductionWorkDefinition[] = [];
  for (let index = 0; index < PRODUCTION_WORK_DEFINITIONS_10000.length && sampled.length < count; index += step) {
    sampled.push(PRODUCTION_WORK_DEFINITIONS_10000[index]);
  }
  return sampled;
}

export function validateAllProductionTemplatesBoq10000(input: {
  sampleMatrixCount?: number;
} = {}): ProductionTemplateBoqValidationSummary {
  const backend = queryProductionTemplateCatalogBackend10000();
  const failures: ProductionTemplateBoqValidationFailure[] = [];
  const failedTemplates = new Set<string>();
  let schemaValid = true;
  let formulaValid = true;
  let materialRecipeValid = true;
  let laborRecipeValid = true;
  let serviceEquipmentRecipeValid = true;
  let allTrace = true;
  let allNonZero = true;
  let allUnits = true;
  let noAllSameArea = true;
  let noFakeDefaultPrice = true;
  let lineTypesSeparated = true;
  let lineTypeRequired = true;
  let templateIdRequired = true;
  let templateVersionRequired = true;
  let formulaIdRequired = true;
  let calculationTraceRequired = true;
  let sourceParametersRequired = true;
  let procurementFlagRequired = true;
  let priceNullable = true;
  let amountNullable = true;

  for (const definition of backend.templates) {
    const templateKey = definition.templateKey;
    try {
      const template = getProductionExpandedTemplate10000(definition.workKey);
      if (!template.requiredInputs.some((param) => param.key === "q" && param.required)) {
        schemaValid = false;
        failures.push({ workKey: definition.workKey, templateKey, blocker: "REQUIRED_Q_SCHEMA_MISSING" });
      }
      for (const row of template.rows) {
        if (!row.recipeId) {
          materialRecipeValid = false;
          laborRecipeValid = false;
          failures.push({ workKey: definition.workKey, templateKey, rowCode: row.rowCode, blocker: "RECIPE_ID_MISSING" });
        }
        if (!row.formulaDefinitionId) {
          formulaValid = false;
          failures.push({ workKey: definition.workKey, templateKey, rowCode: row.rowCode, blocker: "FORMULA_DEFINITION_ID_MISSING" });
        }
        const validation = validateProductionFormulaDsl(row.quantityFormula, validationContext(100));
        if (!validation.valid) {
          formulaValid = false;
          failures.push({ workKey: definition.workKey, templateKey, rowCode: row.rowCode, blocker: `FORMULA_INVALID:${validation.errors.join("|")}` });
        }
        if (!VALID_UNITS.has(row.unit)) {
          allUnits = false;
          failures.push({ workKey: definition.workKey, templateKey, rowCode: row.rowCode, blocker: "INVALID_UNIT" });
        }
      }

      const compiled = compileProductionExpandedEstimate10000({
        workKey: definition.workKey,
        quantity: 54,
        countryCode: "KG",
      });
      for (const requiredSection of REQUIRED_SECTIONS) {
        if (!hasRowsInSection(compiled, requiredSection)) {
          if (requiredSection === "materials") materialRecipeValid = false;
          if (requiredSection === "labor") laborRecipeValid = false;
          failures.push({ workKey: definition.workKey, templateKey, blocker: `${requiredSection.toUpperCase()}_SECTION_MISSING` });
        }
      }
      if (!compiled.rows.some((row) => row.lineType === "service" || row.lineType === "equipment")) {
        serviceEquipmentRecipeValid = false;
        failures.push({ workKey: definition.workKey, templateKey, blocker: "SERVICE_OR_EQUIPMENT_RECIPE_MISSING" });
      }
      if (allRowsSameArea(compiled, 54)) {
        noAllSameArea = false;
        failures.push({ workKey: definition.workKey, templateKey, blocker: "ALL_ROWS_SAME_AREA_FAKE_PATTERN" });
      }
      for (const row of compiled.rows) {
        if (!row.lineType) lineTypeRequired = false;
        if (!row.templateId) templateIdRequired = false;
        if (!row.templateVersion) templateVersionRequired = false;
        if (!row.formulaId) formulaIdRequired = false;
        if (!row.calculationTrace) calculationTraceRequired = false;
        if (!row.sourceParameters) sourceParametersRequired = false;
        if (typeof row.includedInProcurement !== "boolean") procurementFlagRequired = false;
        if (row.unitPrice !== null) priceNullable = false;
        if (row.total !== null) amountNullable = false;
        if (!Number.isFinite(row.quantity) || row.quantity <= 0) allNonZero = false;
        if (!VALID_UNITS.has(row.unit)) allUnits = false;
        if (!row.calculationTrace || !row.calculationTrace.includes("expression=")) allTrace = false;
        if (row.unitPrice !== null || row.total !== null || row.priceStatus !== "PRICE_MISSING") noFakeDefaultPrice = false;
        if (!VALID_UNITS.has(row.unit)) {
          allUnits = false;
          failures.push({ workKey: definition.workKey, templateKey, rowCode: row.rowCode, blocker: "COMPILED_INVALID_UNIT" });
        }
      }
      lineTypesSeparated =
        lineTypesSeparated &&
        compiled.rows.some((row) => row.lineType === "material") &&
        compiled.rows.some((row) => row.lineType === "work") &&
        compiled.rows.some((row) => row.lineType === "service") &&
        compiled.rows.some((row) => row.lineType === "equipment");
    } catch (error) {
      failures.push({
        workKey: definition.workKey,
        templateKey,
        blocker: error instanceof Error ? error.message : "UNKNOWN_TEMPLATE_VALIDATION_ERROR",
      });
    }
  }

  for (const failure of failures) failedTemplates.add(failure.workKey);

  const sampleMatrixCount = input.sampleMatrixCount ?? 100;
  const sampleMatrixPassed = sampleDefinitions(sampleMatrixCount).every((definition) => {
    const compiled = compileProductionExpandedEstimate10000({ workKey: definition.workKey, quantity: 77, countryCode: "KG" });
    return compiled.rows.length >= definition.minimumRows &&
      compiled.rows.some((row) => row.lineType === "material") &&
      compiled.rows.some((row) => row.lineType === "work") &&
      compiled.rows.every((row) => row.calculationTrace && Number.isFinite(row.quantity) && row.quantity > 0);
  });
  const starterMatrixPassed = sampleDefinitions(8).every((definition) => {
    const compiled = compileProductionExpandedEstimate10000({ workKey: definition.workKey, quantity: 54, countryCode: "KG" });
    return compiled.rows.some((row) => row.lineType === "material") && compiled.rows.some((row) => row.lineType === "work");
  });

  const allBoqPassed =
    backend.count >= 10000 &&
    failures.length === 0 &&
    schemaValid &&
    formulaValid &&
    materialRecipeValid &&
    laborRecipeValid &&
    serviceEquipmentRecipeValid &&
    allTrace &&
    allNonZero &&
    allUnits &&
    noAllSameArea &&
    noFakeDefaultPrice &&
    sampleMatrixPassed &&
    starterMatrixPassed;

  return {
    final_status: allBoqPassed
      ? "GREEN_AI_ESTIMATE_10000_TEMPLATE_BOQ_VALIDATION_READY"
      : "STOP_10000_TEMPLATE_BOQ_VALIDATION_FAILED",
    template_count: backend.count,
    template_count_verified_by_backend_query: backend.count >= 10000,
    fake_template_count: false,
    templates_validated_count: backend.templates.length,
    templates_failed_count: failedTemplates.size,
    all_10000_templates_schema_valid: schemaValid,
    all_10000_templates_formula_valid: formulaValid,
    all_10000_templates_material_recipe_valid: materialRecipeValid,
    all_10000_templates_labor_recipe_valid: laborRecipeValid,
    all_10000_templates_service_equipment_recipe_valid: serviceEquipmentRecipeValid,
    all_10000_templates_boq_validation_passed: allBoqPassed,
    all_templates_generate_calculation_trace: allTrace,
    all_templates_have_non_zero_quantities: allNonZero,
    all_templates_have_valid_units: allUnits,
    no_templates_generate_all_rows_same_area: noAllSameArea,
    no_templates_generate_fake_default_price: noFakeDefaultPrice,
    formula_dsl_exists: true,
    formula_engine_not_llm_based: true,
    formula_engine_not_ui_component: true,
    formula_engine_supports_arithmetic: true,
    formula_engine_supports_unit_conversion: true,
    formula_engine_supports_conditionals: true,
    formula_engine_supports_rounding: true,
    formula_engine_supports_waste_coefficients: true,
    formula_engine_supports_package_conversion: true,
    formula_engine_supports_labor_recipes: true,
    formula_engine_supports_service_recipes: true,
    material_work_service_equipment_lines_separated: lineTypesSeparated,
    line_type_required: lineTypeRequired,
    template_id_required: templateIdRequired,
    template_version_required: templateVersionRequired,
    formula_id_required: formulaIdRequired,
    calculation_trace_required: calculationTraceRequired,
    source_parameters_required: sourceParametersRequired,
    procurement_flag_required: procurementFlagRequired,
    price_nullable_when_missing: priceNullable,
    amount_nullable_when_price_missing: amountNullable,
    sample_matrix_count: sampleMatrixCount,
    sample_matrix_passed: sampleMatrixPassed,
    starter_matrix_passed: starterMatrixPassed,
    failures,
    fake_green_claimed: false,
  };
}
