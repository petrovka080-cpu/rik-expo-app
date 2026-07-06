import {
  PRODUCTION_WORK_DEFINITIONS_10000,
  clearProductionExpandedEstimate10000Caches,
  compileProductionExpandedEstimate10000,
  type ProductionDefaultUnit,
  type ProductionTemplateSection,
} from "./productionExpandedWorkCatalog10000";
import { validateAllProductionTemplatesBoq10000 } from "./productionTemplateBoqValidation";
import { validateAllProductionTemplatesPricing10000 } from "./productionTemplatePricingValidation";

export const GREEN_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_FAILED =
  "STOP_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_FAILED" as const;

export type ProductionTemplateExtendedValidationFailure = {
  workKey: string;
  templateKey: string;
  rowCode?: string;
  blocker: string;
};

export type ProductionTemplateExtendedValidationSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_FAILED;
  template_count: number;
  templates_validated_count: number;
  templates_failed_count: number;
  rows_validated_count: number;
  all_10000_templates_extended_validation_passed: boolean;
  all_10000_templates_boq_validation_passed: boolean;
  all_10000_templates_pricing_validation_passed: boolean;
  all_templates_have_material_rows: boolean;
  all_templates_have_labor_rows: boolean;
  all_templates_have_equipment_or_service_rows: boolean;
  all_templates_have_logistics_or_waste_rows: boolean;
  all_templates_have_formula_trace: boolean;
  all_templates_have_norm_trace: boolean;
  all_templates_have_template_version: boolean;
  all_templates_have_source_parameters: boolean;
  all_templates_have_procurement_flags: boolean;
  all_templates_have_valid_units: boolean;
  all_templates_have_positive_quantities: boolean;
  all_templates_have_honest_missing_price: boolean;
  no_templates_generate_fake_area_multiplier: boolean;
  no_templates_generate_fake_default_980_price: boolean;
  no_templates_generate_zero_amount_when_price_missing: boolean;
  no_templates_generate_same_total_fake_cluster: boolean;
  material_work_service_equipment_lines_separated: boolean;
  price_sources_separated_from_norm_sources: boolean;
  failures: ProductionTemplateExtendedValidationFailure[];
  production_db_touched: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  full_jest_started: false;
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

const LOGISTICS_OR_WASTE_SECTIONS: ReadonlySet<ProductionTemplateSection> = new Set([
  "logistics",
  "waste",
  "consumables",
]);

function approximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 0.0001;
}

function repeatedNumericCluster(values: readonly (number | null)[], minimumCount: number): boolean {
  const counts = new Map<number, number>();
  for (const value of values) {
    if (value == null || !Number.isFinite(value)) continue;
    const rounded = Math.round(value * 10000) / 10000;
    counts.set(rounded, (counts.get(rounded) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= minimumCount);
}

function hasTraceParam(trace: string, key: string): boolean {
  return new RegExp(`(^|;\\s*)${key}=`).test(trace);
}

export function validateAllProductionTemplatesExtended10000(): ProductionTemplateExtendedValidationSummary {
  const boq = validateAllProductionTemplatesBoq10000({ sampleMatrixCount: 100 });
  const pricing = validateAllProductionTemplatesPricing10000();
  const failures: ProductionTemplateExtendedValidationFailure[] = [];
  const failedTemplates = new Set<string>();
  let rowsValidated = 0;

  let materialRows = true;
  let laborRows = true;
  let equipmentOrServiceRows = true;
  let logisticsOrWasteRows = true;
  let formulaTrace = true;
  let normTrace = true;
  let templateVersion = true;
  let sourceParameters = true;
  let procurementFlags = true;
  let validUnits = true;
  let positiveQuantities = true;
  let honestMissingPrice = true;
  let noFakeAreaMultiplier = true;
  let noDefault980 = true;
  let noZeroAmount = true;
  let noSameTotalCluster = true;
  let separatedLineTypes = true;
  let priceSeparatedFromNorm = true;

  const pushFailure = (failure: ProductionTemplateExtendedValidationFailure) => {
    failures.push(failure);
    failedTemplates.add(failure.workKey);
  };

  for (const [index, definition] of PRODUCTION_WORK_DEFINITIONS_10000.entries()) {
    try {
      const compiled = compileProductionExpandedEstimate10000({
        workKey: definition.workKey,
        quantity: 54,
        countryCode: "KG",
      });
      rowsValidated += compiled.rows.length;
      const failureBase = { workKey: definition.workKey, templateKey: definition.templateKey };

      const hasMaterial = compiled.rows.some((row) => row.lineType === "material" || row.section === "materials");
      const hasLabor = compiled.rows.some((row) => row.lineType === "work" || row.section === "labor");
      const hasEquipmentOrService = compiled.rows.some((row) =>
        row.lineType === "equipment" ||
        row.lineType === "service" ||
        row.section === "equipment" ||
        row.section === "quality_control"
      );
      const hasLogisticsOrWaste = compiled.rows.some((row) => LOGISTICS_OR_WASTE_SECTIONS.has(row.section));
      const allRowsSameArea = compiled.rows.length >= 4 &&
        compiled.rows.filter((row) => approximatelyEqual(row.quantity, 54)).length >= Math.ceil(compiled.rows.length * 0.8);
      const allTotalsClustered = repeatedNumericCluster(compiled.rows.map((row) => row.total), Math.max(4, Math.ceil(compiled.rows.length * 0.4)));

      if (!hasMaterial) {
        materialRows = false;
        pushFailure({ ...failureBase, blocker: "MATERIAL_ROWS_MISSING" });
      }
      if (!hasLabor) {
        laborRows = false;
        pushFailure({ ...failureBase, blocker: "LABOR_ROWS_MISSING" });
      }
      if (!hasEquipmentOrService) {
        equipmentOrServiceRows = false;
        pushFailure({ ...failureBase, blocker: "EQUIPMENT_OR_SERVICE_ROWS_MISSING" });
      }
      if (!hasLogisticsOrWaste) {
        logisticsOrWasteRows = false;
        pushFailure({ ...failureBase, blocker: "LOGISTICS_OR_WASTE_ROWS_MISSING" });
      }
      if (allRowsSameArea) {
        noFakeAreaMultiplier = false;
        pushFailure({ ...failureBase, blocker: "FAKE_AREA_MULTIPLIER_PATTERN" });
      }
      if (allTotalsClustered) {
        noSameTotalCluster = false;
        pushFailure({ ...failureBase, blocker: "SAME_TOTAL_FAKE_CLUSTER" });
      }

      for (const row of compiled.rows) {
        const rowFailureBase = { ...failureBase, rowCode: row.rowCode };
        if (!row.formulaId || !row.calculationTrace || !row.calculationTrace.includes("expression=")) {
          formulaTrace = false;
          pushFailure({ ...rowFailureBase, blocker: "FORMULA_TRACE_MISSING" });
        }
        if (
          !row.normId ||
          !row.normSourceId ||
          !row.normVersion ||
          !hasTraceParam(row.calculationTrace, "normId") ||
          !hasTraceParam(row.calculationTrace, "normSource") ||
          !hasTraceParam(row.calculationTrace, "normVersion")
        ) {
          normTrace = false;
          pushFailure({ ...rowFailureBase, blocker: "NORM_TRACE_MISSING" });
        }
        if (!row.templateId || !row.templateVersion || !hasTraceParam(row.calculationTrace, "templateVersion")) {
          templateVersion = false;
          pushFailure({ ...rowFailureBase, blocker: "TEMPLATE_VERSION_MISSING" });
        }
        if (!row.sourceParameters || Object.keys(row.sourceParameters).length === 0) {
          sourceParameters = false;
          pushFailure({ ...rowFailureBase, blocker: "SOURCE_PARAMETERS_MISSING" });
        }
        if (typeof row.includedInProcurement !== "boolean" || typeof row.includedInEstimate !== "boolean") {
          procurementFlags = false;
          pushFailure({ ...rowFailureBase, blocker: "PROCUREMENT_FLAGS_MISSING" });
        }
        if (!VALID_UNITS.has(row.unit)) {
          validUnits = false;
          pushFailure({ ...rowFailureBase, blocker: "INVALID_UNIT" });
        }
        if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
          positiveQuantities = false;
          pushFailure({ ...rowFailureBase, blocker: "INVALID_QUANTITY" });
        }
        if (
          row.unitPrice !== null ||
          row.total !== null ||
          row.priceStatus !== "PRICE_MISSING" ||
          row.missingPriceHandledHonestly !== true
        ) {
          honestMissingPrice = false;
          pushFailure({ ...rowFailureBase, blocker: "MISSING_PRICE_NOT_HONEST" });
        }
        if (row.unitPrice === 980 || row.total === 980) {
          noDefault980 = false;
          pushFailure({ ...rowFailureBase, blocker: "DEFAULT_980_PRICE" });
        }
        if (row.unitPrice === 0 || row.total === 0) {
          noZeroAmount = false;
          pushFailure({ ...rowFailureBase, blocker: "ZERO_AMOUNT_WHEN_PRICE_MISSING" });
        }
        if (row.pricebookItemKey === row.normSourceId || row.pricebookItemKey === row.normId) {
          priceSeparatedFromNorm = false;
          pushFailure({ ...rowFailureBase, blocker: "PRICE_SOURCE_COLLAPSED_WITH_NORM_SOURCE" });
        }
      }

      separatedLineTypes =
        separatedLineTypes &&
        compiled.rows.some((row) => row.lineType === "material") &&
        compiled.rows.some((row) => row.lineType === "work") &&
        compiled.rows.some((row) => row.lineType === "service") &&
        compiled.rows.some((row) => row.lineType === "equipment");
      if (!separatedLineTypes) {
        pushFailure({ ...failureBase, blocker: "LINE_TYPES_NOT_SEPARATED" });
      }
    } catch (error) {
      pushFailure({
        workKey: definition.workKey,
        templateKey: definition.templateKey,
        blocker: error instanceof Error ? error.message : "UNKNOWN_EXTENDED_TEMPLATE_VALIDATION_ERROR",
      });
    } finally {
      if ((index + 1) % 100 === 0) clearProductionExpandedEstimate10000Caches();
    }
  }
  clearProductionExpandedEstimate10000Caches();

  const passed =
    PRODUCTION_WORK_DEFINITIONS_10000.length >= 10000 &&
    failures.length === 0 &&
    boq.all_10000_templates_boq_validation_passed &&
    pricing.final_status === "GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS" &&
    rowsValidated > 0 &&
    materialRows &&
    laborRows &&
    equipmentOrServiceRows &&
    logisticsOrWasteRows &&
    formulaTrace &&
    normTrace &&
    templateVersion &&
    sourceParameters &&
    procurementFlags &&
    validUnits &&
    positiveQuantities &&
    honestMissingPrice &&
    noFakeAreaMultiplier &&
    noDefault980 &&
    noZeroAmount &&
    noSameTotalCluster &&
    separatedLineTypes &&
    priceSeparatedFromNorm;

  return {
    final_status: passed
      ? GREEN_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_FAILED,
    template_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    templates_validated_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    templates_failed_count: failedTemplates.size,
    rows_validated_count: rowsValidated,
    all_10000_templates_extended_validation_passed: passed,
    all_10000_templates_boq_validation_passed: boq.all_10000_templates_boq_validation_passed,
    all_10000_templates_pricing_validation_passed:
      pricing.final_status === "GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS",
    all_templates_have_material_rows: materialRows,
    all_templates_have_labor_rows: laborRows,
    all_templates_have_equipment_or_service_rows: equipmentOrServiceRows,
    all_templates_have_logistics_or_waste_rows: logisticsOrWasteRows,
    all_templates_have_formula_trace: formulaTrace,
    all_templates_have_norm_trace: normTrace,
    all_templates_have_template_version: templateVersion,
    all_templates_have_source_parameters: sourceParameters,
    all_templates_have_procurement_flags: procurementFlags,
    all_templates_have_valid_units: validUnits,
    all_templates_have_positive_quantities: positiveQuantities,
    all_templates_have_honest_missing_price: honestMissingPrice,
    no_templates_generate_fake_area_multiplier: noFakeAreaMultiplier,
    no_templates_generate_fake_default_980_price: noDefault980,
    no_templates_generate_zero_amount_when_price_missing: noZeroAmount,
    no_templates_generate_same_total_fake_cluster: noSameTotalCluster,
    material_work_service_equipment_lines_separated: separatedLineTypes,
    price_sources_separated_from_norm_sources: priceSeparatedFromNorm,
    failures,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  };
}
