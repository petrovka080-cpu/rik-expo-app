import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  compileProductionExpandedEstimate10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";
import { estimateHasSavedCalculationTrace } from "../../src/features/estimates/calculator/estimateCalculationTraceBuilder";
import { auditWorkFamilyFormulaEngine } from "../../src/features/estimates/calculator/workFamilyFormulaEngine";
import { resolveProfessionalRecipeCoverage } from "../../src/features/estimates/calculator/professionalRecipeResolver";
import { resolveEquipmentCatalogRows } from "../../src/features/estimates/catalog/equipmentCatalogResolver";
import { resolveMaterialCatalogRows } from "../../src/features/estimates/catalog/materialCatalogResolver";
import { resolveServiceCatalogRows } from "../../src/features/estimates/catalog/serviceCatalogResolver";
import {
  buildProfessionalEstimateCatalogBindings,
  buildProfessionalTemplateCatalogBinding,
} from "../../src/features/estimates/catalog/workCatalogResolver";
import type { ProfessionalWorkFamilyId } from "../../src/features/estimates/catalog/professionalCatalogTypes";
import { hasMojibakeText } from "./auditEstimatePdfReality";
import { classifyEstimateRowsReality } from "./classifyEstimateRowReality";

export const WORK_FAMILY_COVERAGE_PLAN_PATH =
  "data/estimate-templates/work-family-coverage-plan.json" as const;
export const ESTIMATE_CATALOG_WORK_FAMILY_COVERAGE_PLAN_PATH =
  "data/estimate-catalog/work-family-coverage-plan.json" as const;
export const WORK_CATALOG_10000_PATH =
  "data/estimate-catalog/work-items/work-catalog-10000.json" as const;

export const GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_FAILED =
  "STOP_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_FAILED" as const;

type FamilyCoverage = {
  work_family_id: ProfessionalWorkFamilyId;
  template_count: number;
  row_count: number;
  work_row_count: number;
  material_row_count: number;
  service_row_count: number;
  equipment_row_count: number;
  source_backed_row_count: number;
  generic_family_default_row_count: number;
  synthetic_family_default_count: number;
  templates_with_real_norm_sources_count: number;
  templates_ready_professional_count: number;
  all_template_bindings_complete: boolean;
  all_row_catalog_bindings_complete: boolean;
  all_formula_traces_saved: boolean;
  all_missing_prices_explicit: boolean;
  material_recipe_present: boolean;
  labor_recipe_present: boolean;
  buyer_material_handoff_present: boolean;
  sample_work_catalog_item_ids: string[];
  sample_professional_names_ru: string[];
};

export type WorkFamilyCoveragePlan = {
  schema: "work-family-coverage-plan-v1";
  generated_at: string;
  final_status:
    | typeof GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_FAILED;
  manifest_total_templates: number;
  ready_professional_count: number;
  not_ready_count: number;
  generic_fallback_count: number;
  generic_norm_rows_count: number;
  synthetic_family_default_count: number;
  templates_only_generic_norms_count: number;
  templates_with_real_norm_sources_count: number;
  work_catalog_items_count: number;
  row_catalog_bindings_count: number;
  material_catalog_rows_count: number;
  service_catalog_rows_count: number;
  equipment_catalog_rows_count: number;
  unit_policy_count: number;
  norm_pack_count: number;
  calculator_family_count: number;
  price_policy_missing_price_state_count: number;
  pdf_trace_policy_count: number;
  buyer_material_handoff_rows_count: number;
  work_families_count: number;
  work_families: FamilyCoverage[];
  blockers: string[];
  fake_green_claimed: false;
  marketplace_touched: false;
  rfq_touched: false;
  warehouse_touched: false;
  payment_touched: false;
  production_db_touched: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
};

type WorkCatalogItemArtifact = {
  template_id: string;
  work_key: string;
  work_family_id: ProfessionalWorkFamilyId;
  work_catalog_item_id: string;
  calculator_family_id: string;
  parameter_schema_id: string;
  norm_pack_id: string;
  material_recipe_id: string;
  labor_recipe_id: string;
  service_recipe_id: string | null;
  equipment_recipe_id: string | null;
  unit_policy_id: string;
  price_policy_id: string;
  pdf_policy_id: string;
  buyer_handoff_policy_id: string;
  professional_name_ru: string;
  category: string;
};

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function emptyFamily(family: ProfessionalWorkFamilyId): FamilyCoverage {
  return {
    work_family_id: family,
    template_count: 0,
    row_count: 0,
    work_row_count: 0,
    material_row_count: 0,
    service_row_count: 0,
    equipment_row_count: 0,
    source_backed_row_count: 0,
    generic_family_default_row_count: 0,
    synthetic_family_default_count: 0,
    templates_with_real_norm_sources_count: 0,
    templates_ready_professional_count: 0,
    all_template_bindings_complete: true,
    all_row_catalog_bindings_complete: true,
    all_formula_traces_saved: true,
    all_missing_prices_explicit: true,
    material_recipe_present: true,
    labor_recipe_present: true,
    buyer_material_handoff_present: true,
    sample_work_catalog_item_ids: [],
    sample_professional_names_ru: [],
  };
}

function pushSample(values: string[], value: string): void {
  if (values.length < 5 && !values.includes(value)) values.push(value);
}

export function buildWorkFamilyCoveragePlan(options: { writeFiles?: boolean } = {}): WorkFamilyCoveragePlan {
  const familyMap = new Map<ProfessionalWorkFamilyId, FamilyCoverage>();
  const workCatalogItems: WorkCatalogItemArtifact[] = [];
  const rowCatalogIds = new Set<string>();
  const unitPolicies = new Set<string>();
  const normPacks = new Set<string>();
  const calculatorFamilies = new Set<string>();
  const pricePolicies = new Set<string>();
  const pdfPolicies = new Set<string>();

  let readyProfessionalCount = 0;
  let genericFallbackCount = 0;
  let genericNormRowsCount = 0;
  let syntheticFamilyDefaultCount = 0;
  let templatesOnlyGenericNormsCount = 0;
  let templatesWithRealNormSourcesCount = 0;
  let rowCatalogBindingsCount = 0;
  let materialCatalogRowsCount = 0;
  let serviceCatalogRowsCount = 0;
  let equipmentCatalogRowsCount = 0;
  let buyerMaterialHandoffRowsCount = 0;

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const estimate = compileProductionExpandedEstimate10000({
      workKey: definition.workKey,
      quantity: 100,
      countryCode: "KG",
    });
    const templateBinding = buildProfessionalTemplateCatalogBinding(definition);
    const catalogBindings = buildProfessionalEstimateCatalogBindings({ definition, estimate });
    const family = templateBinding.work_family_id;
    const familyCoverage = familyMap.get(family) ?? emptyFamily(family);
    familyMap.set(family, familyCoverage);

    const rowReality = classifyEstimateRowsReality(estimate.rows);
    const materialRows = resolveMaterialCatalogRows({ family, rows: estimate.rows });
    const serviceRows = resolveServiceCatalogRows({ family, rows: estimate.rows });
    const equipmentRows = resolveEquipmentCatalogRows({ family, rows: estimate.rows });
    const recipeCoverage = resolveProfessionalRecipeCoverage(estimate);
    const formulaAudit = auditWorkFamilyFormulaEngine({
      family,
      estimate,
      repeatHash: estimate.compiledHash,
    });
    const hasTrace = estimateHasSavedCalculationTrace(estimate);
    const rowBindingsComplete =
      catalogBindings.rows.length === estimate.rows.length &&
      catalogBindings.rows.every((row) =>
        Boolean(row.catalog_item_id && row.professional_name_ru && row.unit_policy_id && row.source_policy_id)
      );
    const templateBindingComplete = Object.entries(templateBinding).every(([, value]) => value !== "");
    const allRowsSourceBacked = rowReality.source_backed_count === rowReality.row_count && rowReality.row_count > 0;
    const allMissingPricesExplicit = estimate.rows.every((row) =>
      row.priceStatus === "PRICE_MISSING" &&
      row.unitPrice === null &&
      row.total === null &&
      row.missingPriceHandledHonestly === true
    );
    const namesReadable = !hasMojibakeText(definition.visibleNameRu) &&
      estimate.rows.every((row) => row.titleRu.trim().length > 0 && !hasMojibakeText(row.titleRu));
    const readyProfessional =
      templateBindingComplete &&
      rowBindingsComplete &&
      allRowsSourceBacked &&
      rowReality.generic_family_default_count === 0 &&
      rowReality.invalid_fake_source_count === 0 &&
      rowReality.missing_formula_trace_count === 0 &&
      recipeCoverage.material_recipe_present &&
      recipeCoverage.labor_recipe_present &&
      formulaAudit.formula_steps_saved_per_row &&
      formulaAudit.unit_conversion_m2_m3_mm_m_kg_l_lm_pcs_shift_trip &&
      hasTrace &&
      allMissingPricesExplicit &&
      namesReadable;

    if (readyProfessional) readyProfessionalCount += 1;
    if (rowReality.generic_family_default_count > 0 || rowReality.invalid_fake_source_count > 0) genericFallbackCount += 1;
    if (rowReality.source_backed_count === 0) templatesOnlyGenericNormsCount += 1;
    if (allRowsSourceBacked) templatesWithRealNormSourcesCount += 1;

    genericNormRowsCount += rowReality.generic_family_default_count + rowReality.invalid_fake_source_count;
    syntheticFamilyDefaultCount += rowReality.generic_family_default_count;
    rowCatalogBindingsCount += catalogBindings.rows.length;
    materialCatalogRowsCount += materialRows.length;
    serviceCatalogRowsCount += serviceRows.length;
    equipmentCatalogRowsCount += equipmentRows.length;
    buyerMaterialHandoffRowsCount += materialRows.filter((row) => row.included_in_procurement).length;

    unitPolicies.add(templateBinding.unit_policy_id);
    normPacks.add(templateBinding.norm_pack_id);
    calculatorFamilies.add(templateBinding.calculator_family_id);
    pricePolicies.add(templateBinding.price_policy_id);
    pdfPolicies.add(templateBinding.pdf_policy_id);
    for (const row of catalogBindings.rows) {
      rowCatalogIds.add(row.catalog_item_id);
      unitPolicies.add(row.unit_policy_id);
    }

    familyCoverage.template_count += 1;
    familyCoverage.row_count += estimate.rows.length;
    familyCoverage.work_row_count += catalogBindings.rows.filter((row) => row.kind === "work").length;
    familyCoverage.material_row_count += materialRows.length;
    familyCoverage.service_row_count += serviceRows.length;
    familyCoverage.equipment_row_count += equipmentRows.length;
    familyCoverage.source_backed_row_count += rowReality.source_backed_count;
    familyCoverage.generic_family_default_row_count += rowReality.generic_family_default_count;
    familyCoverage.synthetic_family_default_count += rowReality.generic_family_default_count;
    familyCoverage.templates_with_real_norm_sources_count += allRowsSourceBacked ? 1 : 0;
    familyCoverage.templates_ready_professional_count += readyProfessional ? 1 : 0;
    familyCoverage.all_template_bindings_complete &&= templateBindingComplete;
    familyCoverage.all_row_catalog_bindings_complete &&= rowBindingsComplete;
    familyCoverage.all_formula_traces_saved &&= formulaAudit.formula_steps_saved_per_row && hasTrace;
    familyCoverage.all_missing_prices_explicit &&= allMissingPricesExplicit;
    familyCoverage.material_recipe_present &&= recipeCoverage.material_recipe_present;
    familyCoverage.labor_recipe_present &&= recipeCoverage.labor_recipe_present;
    familyCoverage.buyer_material_handoff_present &&= materialRows.some((row) => row.included_in_procurement);
    pushSample(familyCoverage.sample_work_catalog_item_ids, templateBinding.work_catalog_item_id);
    pushSample(familyCoverage.sample_professional_names_ru, definition.visibleNameRu);

    workCatalogItems.push({
      template_id: templateBinding.template_id,
      work_key: templateBinding.work_key,
      work_family_id: templateBinding.work_family_id,
      work_catalog_item_id: templateBinding.work_catalog_item_id,
      calculator_family_id: templateBinding.calculator_family_id,
      parameter_schema_id: templateBinding.parameter_schema_id,
      norm_pack_id: templateBinding.norm_pack_id,
      material_recipe_id: templateBinding.material_recipe_id,
      labor_recipe_id: templateBinding.labor_recipe_id,
      service_recipe_id: templateBinding.service_recipe_id,
      equipment_recipe_id: templateBinding.equipment_recipe_id,
      unit_policy_id: templateBinding.unit_policy_id,
      price_policy_id: templateBinding.price_policy_id,
      pdf_policy_id: templateBinding.pdf_policy_id,
      buyer_handoff_policy_id: templateBinding.buyer_handoff_policy_id,
      professional_name_ru: definition.visibleNameRu,
      category: definition.category,
    });
  }

  const workFamilies = [...familyMap.values()].sort((left, right) =>
    left.work_family_id.localeCompare(right.work_family_id)
  );
  const notReadyCount = PRODUCTION_WORK_DEFINITIONS_10000.length - readyProfessionalCount;
  const blockers = [
    PRODUCTION_WORK_DEFINITIONS_10000.length !== 10000 ? "manifest_total_templates_not_10000" : "",
    readyProfessionalCount !== 10000 ? `ready_professional_count:${readyProfessionalCount}` : "",
    notReadyCount !== 0 ? `not_ready_count:${notReadyCount}` : "",
    genericFallbackCount !== 0 ? `generic_fallback_count:${genericFallbackCount}` : "",
    genericNormRowsCount !== 0 ? `generic_norm_rows_count:${genericNormRowsCount}` : "",
    syntheticFamilyDefaultCount !== 0 ? `synthetic_family_default_count:${syntheticFamilyDefaultCount}` : "",
    templatesOnlyGenericNormsCount !== 0 ? `templates_only_generic_norms_count:${templatesOnlyGenericNormsCount}` : "",
    templatesWithRealNormSourcesCount !== 10000
      ? `templates_with_real_norm_sources_count:${templatesWithRealNormSourcesCount}`
      : "",
    workCatalogItems.length !== 10000 ? `work_catalog_items_count:${workCatalogItems.length}` : "",
    rowCatalogBindingsCount !== rowCatalogIds.size ? "row_catalog_item_ids_not_unique" : "",
    workFamilies.some((family) => !family.all_template_bindings_complete) ? "family_template_binding_incomplete" : "",
    workFamilies.some((family) => !family.all_row_catalog_bindings_complete) ? "family_row_catalog_binding_incomplete" : "",
    workFamilies.some((family) => !family.all_formula_traces_saved) ? "family_formula_trace_missing" : "",
    workFamilies.some((family) => !family.all_missing_prices_explicit) ? "family_missing_price_state_missing" : "",
    workFamilies.some((family) => !family.material_recipe_present || !family.labor_recipe_present)
      ? "family_material_or_labor_recipe_missing"
      : "",
    workFamilies.some((family) => !family.buyer_material_handoff_present) ? "family_buyer_material_handoff_missing" : "",
  ].filter(Boolean);

  const plan: WorkFamilyCoveragePlan = {
    schema: "work-family-coverage-plan-v1",
    generated_at: new Date().toISOString(),
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_FAILED,
    manifest_total_templates: PRODUCTION_WORK_DEFINITIONS_10000.length,
    ready_professional_count: readyProfessionalCount,
    not_ready_count: notReadyCount,
    generic_fallback_count: genericFallbackCount,
    generic_norm_rows_count: genericNormRowsCount,
    synthetic_family_default_count: syntheticFamilyDefaultCount,
    templates_only_generic_norms_count: templatesOnlyGenericNormsCount,
    templates_with_real_norm_sources_count: templatesWithRealNormSourcesCount,
    work_catalog_items_count: workCatalogItems.length,
    row_catalog_bindings_count: rowCatalogBindingsCount,
    material_catalog_rows_count: materialCatalogRowsCount,
    service_catalog_rows_count: serviceCatalogRowsCount,
    equipment_catalog_rows_count: equipmentCatalogRowsCount,
    unit_policy_count: unitPolicies.size,
    norm_pack_count: normPacks.size,
    calculator_family_count: calculatorFamilies.size,
    price_policy_missing_price_state_count: pricePolicies.size,
    pdf_trace_policy_count: pdfPolicies.size,
    buyer_material_handoff_rows_count: buyerMaterialHandoffRowsCount,
    work_families_count: workFamilies.length,
    work_families: workFamilies,
    blockers,
    fake_green_claimed: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    production_db_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
  };

  if (options.writeFiles) {
    writeJson(WORK_FAMILY_COVERAGE_PLAN_PATH, plan);
    writeJson(ESTIMATE_CATALOG_WORK_FAMILY_COVERAGE_PLAN_PATH, plan);
    writeJson(WORK_CATALOG_10000_PATH, {
      schema: "work-catalog-10000-v1",
      generated_at: plan.generated_at,
      work_catalog_items_count: workCatalogItems.length,
      items: workCatalogItems,
    });
    writeJson("data/estimate-catalog/work-items/work-families.json", {
      schema: "work-family-summary-v1",
      generated_at: plan.generated_at,
      work_families_count: plan.work_families_count,
      families: workFamilies,
    });
    writeJson("data/estimate-catalog/material-items/material-catalog-summary.json", {
      schema: "material-catalog-summary-v1",
      generated_at: plan.generated_at,
      material_catalog_rows_count: materialCatalogRowsCount,
      buyer_material_handoff_rows_count: buyerMaterialHandoffRowsCount,
      families: workFamilies.map((family) => ({
        work_family_id: family.work_family_id,
        material_row_count: family.material_row_count,
        buyer_material_handoff_present: family.buyer_material_handoff_present,
      })),
    });
    writeJson("data/estimate-catalog/service-items/service-catalog-summary.json", {
      schema: "service-catalog-summary-v1",
      generated_at: plan.generated_at,
      service_catalog_rows_count: serviceCatalogRowsCount,
      families: workFamilies.map((family) => ({
        work_family_id: family.work_family_id,
        service_row_count: family.service_row_count,
      })),
    });
    writeJson("data/estimate-catalog/equipment-items/equipment-catalog-summary.json", {
      schema: "equipment-catalog-summary-v1",
      generated_at: plan.generated_at,
      equipment_catalog_rows_count: equipmentCatalogRowsCount,
      families: workFamilies.map((family) => ({
        work_family_id: family.work_family_id,
        equipment_row_count: family.equipment_row_count,
      })),
    });
    writeJson("data/estimate-catalog/unit-policies/unit-policies.json", {
      schema: "unit-policy-summary-v1",
      generated_at: plan.generated_at,
      unit_policy_count: unitPolicies.size,
      unit_policy_ids: [...unitPolicies].sort(),
    });
    writeJson("data/estimate-catalog/work-family-calculators/work-family-calculators.json", {
      schema: "work-family-calculator-summary-v1",
      generated_at: plan.generated_at,
      calculator_family_count: calculatorFamilies.size,
      calculator_family_ids: [...calculatorFamilies].sort(),
    });
    writeJson("data/estimate-catalog/professional-norm-packs/professional-norm-packs.json", {
      schema: "professional-norm-pack-summary-v1",
      generated_at: plan.generated_at,
      norm_pack_count: normPacks.size,
      norm_pack_ids: [...normPacks].sort(),
    });
    writeJson("data/estimate-catalog/price-ratebooks/missing-price-policy.json", {
      schema: "missing-price-policy-v1",
      generated_at: plan.generated_at,
      policy: "MISSING_PRICE_STATE_UNTIL_VERIFIED_RATEBOOK_BOUND",
      price_policy_missing_price_state_count: pricePolicies.size,
      price_policy_ids: [...pricePolicies].sort(),
    });
  }

  return plan;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/buildWorkFamilyCoveragePlan.ts")) {
  const plan = buildWorkFamilyCoveragePlan({ writeFiles: true });
  console.log(JSON.stringify({
    final_status: plan.final_status,
    manifest_total_templates: plan.manifest_total_templates,
    ready_professional_count: plan.ready_professional_count,
    not_ready_count: plan.not_ready_count,
    generic_fallback_count: plan.generic_fallback_count,
    generic_norm_rows_count: plan.generic_norm_rows_count,
    synthetic_family_default_count: plan.synthetic_family_default_count,
    templates_only_generic_norms_count: plan.templates_only_generic_norms_count,
    templates_with_real_norm_sources_count: plan.templates_with_real_norm_sources_count,
    work_catalog_items_count: plan.work_catalog_items_count,
    row_catalog_bindings_count: plan.row_catalog_bindings_count,
    material_catalog_rows_count: plan.material_catalog_rows_count,
    service_catalog_rows_count: plan.service_catalog_rows_count,
    equipment_catalog_rows_count: plan.equipment_catalog_rows_count,
    work_families_count: plan.work_families_count,
    blockers: plan.blockers,
  }, null, 2));
  process.exitCode = plan.final_status === GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS ? 0 : 1;
}
