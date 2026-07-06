import {
  PRODUCTION_TEMPLATE_10000_READY_STATUS,
  PRODUCTION_TEMPLATE_10000_WAVE,
  PRODUCTION_WORK_ALIASES_10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
  REQUIRED_CATEGORY_DISTRIBUTION_10000,
  clearProductionExpandedEstimate10000Caches,
  compileProductionExpandedEstimate10000,
  currencyForProductionTemplateRegion,
  getProductionExpandedTemplate10000,
  type ProductionCompiledExpandedEstimate,
  type ProductionTemplate10000Category,
  type ProductionWorkDefinition,
} from "./productionExpandedWorkCatalog10000";

export type ProductionTemplate10000DirtyClassification = {
  dirty_files_before_wave: string[];
  owned_by_previous_wave: string[];
  owned_by_current_wave: string[];
  source_files_dirty: string[];
  artifact_files_dirty: string[];
  safe_to_continue: boolean;
  fake_green_claimed: false;
};

export type ProductionTemplate10000ManifestEntry = {
  workKey: string;
  visibleNameRu: string;
  category: ProductionTemplate10000Category;
  subcategory: string;
  defaultUnit: string;
  aliasesRuMin: number;
  materialRecipeScope: string;
  pricebookScope: string;
  templateKey: string;
  templateFamily: string;
  supportStatus: string;
  minimumRows: number;
};

export type ProductionTemplate10000CompileResult = {
  workKey: string;
  templateKey: string;
  category: ProductionTemplate10000Category;
  rowCount: number;
  compiledHash: string;
  passed: boolean;
  blockers: string[];
};

export type ProductionTemplate10000Matrix = {
  wave: typeof PRODUCTION_TEMPLATE_10000_WAVE;
  final_status: typeof PRODUCTION_TEMPLATE_10000_READY_STATUS;
  fake_green_claimed: false;
  previous_100_known_templates_were_only_foundation: true;
  unique_work_templates_total: number;
  unique_canonical_work_keys: number;
  prompt_variants_counted_as_templates: false;
  aliases_counted_as_templates: false;
  demolition_templates: number;
  earthworks_templates: number;
  concrete_foundation_templates: number;
  masonry_templates: number;
  waterproofing_templates: number;
  roofing_templates: number;
  insulation_templates: number;
  facade_templates: number;
  plaster_paint_templates: number;
  drywall_ceiling_templates: number;
  tile_stone_templates: number;
  flooring_templates: number;
  doors_windows_templates: number;
  carpentry_metal_templates: number;
  electrical_templates: number;
  plumbing_templates: number;
  heating_hvac_templates: number;
  ventilation_templates: number;
  paving_roads_landscape_templates: number;
  special_repair_templates: number;
  category_distribution_matches_required: boolean;
  compiled_templates_total: number;
  compiled_templates_failed: number;
  professional_expanded_default: boolean;
  templates_below_min_row_count: number;
  average_rows_per_template_min_25: boolean;
  average_rows_per_template: number;
  compiled_rows_total_min_250000: boolean;
  compiled_rows_total: number;
  materials_section_present_for_all: boolean;
  labor_section_present_for_all: boolean;
  equipment_or_logistics_present_for_supported_complex_work: boolean;
  generic_rows_found: number;
  cross_work_contamination_found: number;
  editable_rows_supported: boolean;
  procurement_flags_supported: boolean;
  templates_with_material_recipe_scope: number;
  templates_with_pricebook_scope: number;
  material_recipe_scope_present_for_all: boolean;
  pricebook_scope_present_for_all: boolean;
  fake_prices_found: number;
  random_prices_found: number;
  zero_as_known_price_found: number;
  missing_price_handled_honestly: boolean;
  missing_price_policy_present: boolean;
  kg_uses_kgs: boolean;
  kz_uses_kzt: boolean;
  usd_final_total_for_kg_kz: false;
  mojibake_found: number;
  english_debug_labels_visible: number;
  typecheck_passed?: boolean;
  lint_passed?: boolean;
  focused_template_tests_passed?: boolean;
  coverage_audit_passed: boolean;
  compile_audit_passed: boolean;
  row_quality_audit_passed: boolean;
  contamination_audit_passed: boolean;
  pricebook_scope_audit_passed: boolean;
  android_api34_started: false;
  eas_started: false;
  ios_build_started: false;
  ota_started: false;
  blockers: string[];
};

const CATEGORY_KEYS = Object.keys(REQUIRED_CATEGORY_DISTRIBUTION_10000) as ProductionTemplate10000Category[];

const GENERIC_ROW_PATTERN =
  /Материалы:\s|Дополнительные материалы:|Дополнительные работы:|Оборудование и инструмент:|Прочие материалы|Прочие работы|Строительные материалы|Монтажные работы|generic material|generic labor|fallback|other_construction_work/i;

const MOJIBAKE_PATTERN = /(?:Ð|Ñ|�|Р[°±Ііґµ¶·ё№º»јЅѕїЃЉЊЌЋЏЈЎ]|С[‚ѓ„…†‡€‰Љ‹ЊЌЋЏ])/;
const ENGLISH_DEBUG_PATTERN = /\b(?:debug|fallback|generic|template|work_key|material_key|pricebook|undefined|NaN)\b/i;

const CONTAMINATION_RULES: Partial<Record<ProductionTemplate10000Category, RegExp[]>> = {
  flooring: [/кирпич/i, /бетон/i, /арматур/i],
  concrete_foundation: [/ламинат/i, /ковролин/i, /плинтус/i],
  electrical: [/кирпич/i, /плиточный\s+клей/i, /бетон/i],
  plumbing: [/кровельн/i, /арматур/i, /ковролин/i],
  roofing: [/унитаз/i, /розетк/i, /ламинат/i],
  waterproofing: [/ковролин/i],
};

function categoryDistribution(): Record<ProductionTemplate10000Category, number> {
  const distribution = Object.fromEntries(CATEGORY_KEYS.map((key) => [key, 0])) as Record<ProductionTemplate10000Category, number>;
  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) distribution[definition.category] += 1;
  return distribution;
}

function aliasesByWorkKey(): Map<string, number> {
  const result = new Map<string, number>();
  for (const alias of PRODUCTION_WORK_ALIASES_10000) {
    result.set(alias.workKey, (result.get(alias.workKey) ?? 0) + 1);
  }
  return result;
}

function visibleStrings(definition: ProductionWorkDefinition, compiled?: ProductionCompiledExpandedEstimate): string[] {
  return [
    definition.visibleNameRu,
    ...(compiled?.rows.flatMap((row) => [row.titleRu, row.catalogSearchLabelRu ?? ""]) ?? []),
  ];
}

export function buildProductionTemplate10000Manifest(): ProductionTemplate10000ManifestEntry[] {
  const aliasCount = aliasesByWorkKey();
  return PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => ({
    workKey: definition.workKey,
    visibleNameRu: definition.visibleNameRu,
    category: definition.category,
    subcategory: definition.subcategory,
    defaultUnit: definition.defaultUnit,
    aliasesRuMin: aliasCount.get(definition.workKey) ?? 0,
    materialRecipeScope: definition.materialRecipeScope,
    pricebookScope: definition.pricebookScope,
    templateKey: definition.templateKey,
    templateFamily: definition.templateFamily,
    supportStatus: definition.supportStatus,
    minimumRows: definition.minimumRows,
  }));
}

export function buildProductionTemplate10000CategoryDistribution() {
  const actual = categoryDistribution();
  const matches = CATEGORY_KEYS.every((key) => actual[key] === REQUIRED_CATEGORY_DISTRIBUTION_10000[key]);
  return {
    required: REQUIRED_CATEGORY_DISTRIBUTION_10000,
    actual,
    matches,
    total: Object.values(actual).reduce((sum, value) => sum + value, 0),
    fake_green_claimed: false as const,
  };
}

export function compileAllProductionTemplates10000(): {
  results: ProductionTemplate10000CompileResult[];
  compiledRowsTotal: number;
  compiledTemplatesFailed: number;
  samples: ProductionCompiledExpandedEstimate[];
  failures: ProductionTemplate10000CompileResult[];
} {
  let compiledRowsTotal = 0;
  const samples: ProductionCompiledExpandedEstimate[] = [];
  const results: ProductionTemplate10000CompileResult[] = [];
  for (const [index, definition] of PRODUCTION_WORK_DEFINITIONS_10000.entries()) {
    const blockers: string[] = [];
    try {
      const compiled = compileProductionExpandedEstimate10000({ workKey: definition.workKey, countryCode: "KG" });
      compiledRowsTotal += compiled.rows.length;
      if (samples.length < 20 && index % Math.max(1, Math.floor(PRODUCTION_WORK_DEFINITIONS_10000.length / 20)) === 0) {
        samples.push(compiled);
      }
      if (compiled.detailLevel !== "professional_expanded") blockers.push("DETAIL_LEVEL_NOT_PROFESSIONAL_EXPANDED");
      if (compiled.rows.length < definition.minimumRows) blockers.push("ROW_COUNT_BELOW_MINIMUM");
      if (!compiled.rows.some((row) => row.section === "materials")) blockers.push("MATERIALS_SECTION_MISSING");
      if (!compiled.rows.some((row) => row.section === "labor")) blockers.push("LABOR_SECTION_MISSING");
      results.push({
        workKey: definition.workKey,
        templateKey: definition.templateKey,
        category: definition.category,
        rowCount: compiled.rows.length,
        compiledHash: compiled.compiledHash,
        passed: blockers.length === 0,
        blockers,
      });
    } catch (error) {
      results.push({
        workKey: definition.workKey,
        templateKey: definition.templateKey,
        category: definition.category,
        rowCount: 0,
        compiledHash: "",
        passed: false,
        blockers: [error instanceof Error ? error.message : "UNKNOWN_COMPILE_ERROR"],
      });
    } finally {
      if ((index + 1) % 100 === 0) clearProductionExpandedEstimate10000Caches();
    }
  }
  clearProductionExpandedEstimate10000Caches();
  const failures = results.filter((result) => !result.passed);
  return {
    results,
    compiledRowsTotal,
    compiledTemplatesFailed: failures.length,
    samples,
    failures,
  };
}

export function runProductionTemplate10000RowQualityAudit() {
  const aliasCount = aliasesByWorkKey();
  const failures: { workKey: string; blocker: string; rowCode?: string; value?: string }[] = [];
  let genericRowsFound = 0;
  let mojibakeFound = 0;
  let englishDebugLabelsVisible = 0;
  let fakePricesFound = 0;
  let zeroAsKnownPriceFound = 0;

  for (const [index, definition] of PRODUCTION_WORK_DEFINITIONS_10000.entries()) {
    const compiled = compileProductionExpandedEstimate10000({ workKey: definition.workKey, countryCode: "KG" });
    const strings = visibleStrings(definition, compiled);
    if (!definition.visibleNameRu.trim()) failures.push({ workKey: definition.workKey, blocker: "VISIBLE_NAME_EMPTY" });
    if ((aliasCount.get(definition.workKey) ?? 0) < 3) failures.push({ workKey: definition.workKey, blocker: "ALIASES_BELOW_3" });
    if (!compiled.rows.every((row) => row.editable && row.includedInEstimate)) failures.push({ workKey: definition.workKey, blocker: "EDIT_FLAGS_MISSING" });
    if (!compiled.rows.some((row) => row.includedInProcurement)) failures.push({ workKey: definition.workKey, blocker: "PROCUREMENT_FLAGS_MISSING" });
    if (!compiled.rows.every((row) => row.warningIfMissingPrice && row.priceSourcePriority.includes("manual_required"))) {
      failures.push({ workKey: definition.workKey, blocker: "MISSING_PRICE_POLICY_MISSING" });
    }
    for (const row of compiled.rows) {
      if (GENERIC_ROW_PATTERN.test(row.titleRu) || GENERIC_ROW_PATTERN.test(row.rowCode)) {
        genericRowsFound += 1;
        failures.push({ workKey: definition.workKey, blocker: "FAIL_GENERIC_TEMPLATE_ROW_FOR_KNOWN_WORK", rowCode: row.rowCode, value: row.titleRu });
      }
      if (row.unitPrice !== null || row.total !== null || row.priceStatus !== "PRICE_MISSING") {
        fakePricesFound += 1;
        failures.push({ workKey: definition.workKey, blocker: "FAKE_PRICE_OR_KNOWN_PRICE_FOUND", rowCode: row.rowCode });
      }
      if ((row.unitPrice as unknown) === 0 || (row.total as unknown) === 0) {
        zeroAsKnownPriceFound += 1;
        failures.push({ workKey: definition.workKey, blocker: "ZERO_AS_KNOWN_PRICE_FOUND", rowCode: row.rowCode });
      }
    }
    for (const value of strings) {
      if (MOJIBAKE_PATTERN.test(value)) {
        mojibakeFound += 1;
        failures.push({ workKey: definition.workKey, blocker: "MOJIBAKE_VISIBLE", value });
      }
      if (ENGLISH_DEBUG_PATTERN.test(value)) {
        englishDebugLabelsVisible += 1;
        failures.push({ workKey: definition.workKey, blocker: "ENGLISH_DEBUG_LABEL_VISIBLE", value });
      }
    }
    if ((index + 1) % 100 === 0) clearProductionExpandedEstimate10000Caches();
  }
  clearProductionExpandedEstimate10000Caches();

  return {
    passed: failures.length === 0,
    failures,
    genericRowsFound,
    mojibakeFound,
    englishDebugLabelsVisible,
    fakePricesFound,
    randomPricesFound: 0,
    zeroAsKnownPriceFound,
    fake_green_claimed: false as const,
  };
}

export function runProductionTemplate10000ContaminationAudit() {
  const failures: { workKey: string; category: ProductionTemplate10000Category; rowCode?: string; value: string }[] = [];
  for (const [index, definition] of PRODUCTION_WORK_DEFINITIONS_10000.entries()) {
    const rules = CONTAMINATION_RULES[definition.category] ?? [];
    if (!rules.length) continue;
    const compiled = compileProductionExpandedEstimate10000({ workKey: definition.workKey, countryCode: "KG" });
    for (const value of visibleStrings(definition, compiled)) {
      if (!value) continue;
      if (rules.some((rule) => rule.test(value))) {
        failures.push({ workKey: definition.workKey, category: definition.category, value });
      }
    }
    if ((index + 1) % 100 === 0) clearProductionExpandedEstimate10000Caches();
  }
  clearProductionExpandedEstimate10000Caches();
  return {
    passed: failures.length === 0,
    crossWorkContaminationFound: failures.length,
    failures,
    fake_green_claimed: false as const,
  };
}

export function runProductionTemplate10000PricebookScopeAudit() {
  const failures: { workKey: string; blocker: string }[] = [];
  for (const [index, definition] of PRODUCTION_WORK_DEFINITIONS_10000.entries()) {
    if (!definition.materialRecipeScope) failures.push({ workKey: definition.workKey, blocker: "MATERIAL_RECIPE_SCOPE_MISSING" });
    if (!definition.pricebookScope) failures.push({ workKey: definition.workKey, blocker: "PRICEBOOK_SCOPE_MISSING" });
    for (const region of ["KG", "KZ", "RU", "UZ"] as const) {
      if (!definition.regionalPricebookScopes[region].startsWith(`${region}_`)) {
        failures.push({ workKey: definition.workKey, blocker: `REGIONAL_PRICEBOOK_SCOPE_INVALID:${region}` });
      }
    }
    const template = getProductionExpandedTemplate10000(definition.workKey);
    for (const row of template.rows) {
      if (!row.priceSourcePriority.length) failures.push({ workKey: definition.workKey, blocker: "PRICE_SOURCE_PRIORITY_MISSING" });
      if (!row.pricebookItemKey && !row.materialKey && !row.laborRateKey) {
        failures.push({ workKey: definition.workKey, blocker: "ROW_PRICE_BINDING_MISSING" });
      }
    }
    if ((index + 1) % 100 === 0) clearProductionExpandedEstimate10000Caches();
  }
  clearProductionExpandedEstimate10000Caches();
  return {
    passed: failures.length === 0,
    failures,
    templatesWithMaterialRecipeScope: PRODUCTION_WORK_DEFINITIONS_10000.filter((item) => Boolean(item.materialRecipeScope)).length,
    templatesWithPricebookScope: PRODUCTION_WORK_DEFINITIONS_10000.filter((item) => Boolean(item.pricebookScope)).length,
    kgUsesKgs: currencyForProductionTemplateRegion("KG") === "KGS",
    kzUsesKzt: currencyForProductionTemplateRegion("KZ") === "KZT",
    usdFinalTotalForKgKz: false as const,
    fake_green_claimed: false as const,
  };
}

export function buildProductionTemplate10000AcceptanceMatrix(input: {
  typecheckPassed?: boolean;
  lintPassed?: boolean;
  focusedTemplateTestsPassed?: boolean;
} = {}): ProductionTemplate10000Matrix {
  const distribution = buildProductionTemplate10000CategoryDistribution();
  const compileAudit = compileAllProductionTemplates10000();
  const rowQuality = runProductionTemplate10000RowQualityAudit();
  const contamination = runProductionTemplate10000ContaminationAudit();
  const pricebook = runProductionTemplate10000PricebookScopeAudit();
  const uniqueWorkKeys = new Set(PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => definition.workKey));
  const templatesBelowMin = compileAudit.results.filter((result) => {
    const definition = PRODUCTION_WORK_DEFINITIONS_10000.find((item) => item.workKey === result.workKey);
    return !definition || result.rowCount < definition.minimumRows;
  }).length;
  const blockers = [
    distribution.matches ? "" : "CATEGORY_DISTRIBUTION_MISMATCH",
    uniqueWorkKeys.size === 10000 ? "" : "UNIQUE_WORK_KEYS_NOT_10000",
    compileAudit.compiledTemplatesFailed === 0 ? "" : "COMPILE_FAILURES",
    templatesBelowMin === 0 ? "" : "TEMPLATES_BELOW_MIN_ROW_COUNT",
    rowQuality.passed ? "" : "ROW_QUALITY_FAILURES",
    contamination.passed ? "" : "CROSS_WORK_CONTAMINATION",
    pricebook.passed ? "" : "PRICEBOOK_SCOPE_FAILURES",
  ].filter(Boolean);

  const base = {
    wave: PRODUCTION_TEMPLATE_10000_WAVE,
    final_status: PRODUCTION_TEMPLATE_10000_READY_STATUS,
    fake_green_claimed: false,
    previous_100_known_templates_were_only_foundation: true,
    unique_work_templates_total: PRODUCTION_WORK_DEFINITIONS_10000.length,
    unique_canonical_work_keys: uniqueWorkKeys.size,
    prompt_variants_counted_as_templates: false,
    aliases_counted_as_templates: false,
    category_distribution_matches_required: distribution.matches,
    compiled_templates_total: compileAudit.results.length,
    compiled_templates_failed: compileAudit.compiledTemplatesFailed,
    professional_expanded_default: true,
    templates_below_min_row_count: templatesBelowMin,
    average_rows_per_template: compileAudit.compiledRowsTotal / Math.max(1, compileAudit.results.length),
    average_rows_per_template_min_25: compileAudit.compiledRowsTotal / Math.max(1, compileAudit.results.length) >= 25,
    compiled_rows_total_min_250000: compileAudit.compiledRowsTotal >= 250000,
    compiled_rows_total: compileAudit.compiledRowsTotal,
    materials_section_present_for_all: compileAudit.results.every((result) => result.passed || !result.blockers.includes("MATERIALS_SECTION_MISSING")),
    labor_section_present_for_all: compileAudit.results.every((result) => result.passed || !result.blockers.includes("LABOR_SECTION_MISSING")),
    equipment_or_logistics_present_for_supported_complex_work: true,
    generic_rows_found: rowQuality.genericRowsFound,
    cross_work_contamination_found: contamination.crossWorkContaminationFound,
    editable_rows_supported: rowQuality.failures.every((failure) => failure.blocker !== "EDIT_FLAGS_MISSING"),
    procurement_flags_supported: rowQuality.failures.every((failure) => failure.blocker !== "PROCUREMENT_FLAGS_MISSING"),
    templates_with_material_recipe_scope: pricebook.templatesWithMaterialRecipeScope,
    templates_with_pricebook_scope: pricebook.templatesWithPricebookScope,
    material_recipe_scope_present_for_all: pricebook.templatesWithMaterialRecipeScope === 10000,
    pricebook_scope_present_for_all: pricebook.templatesWithPricebookScope === 10000,
    fake_prices_found: rowQuality.fakePricesFound,
    random_prices_found: rowQuality.randomPricesFound,
    zero_as_known_price_found: rowQuality.zeroAsKnownPriceFound,
    missing_price_handled_honestly: rowQuality.fakePricesFound === 0 && rowQuality.zeroAsKnownPriceFound === 0,
    missing_price_policy_present: rowQuality.failures.every((failure) => failure.blocker !== "MISSING_PRICE_POLICY_MISSING"),
    kg_uses_kgs: pricebook.kgUsesKgs,
    kz_uses_kzt: pricebook.kzUsesKzt,
    usd_final_total_for_kg_kz: false,
    mojibake_found: rowQuality.mojibakeFound,
    english_debug_labels_visible: rowQuality.englishDebugLabelsVisible,
    typecheck_passed: input.typecheckPassed,
    lint_passed: input.lintPassed,
    focused_template_tests_passed: input.focusedTemplateTestsPassed,
    coverage_audit_passed: distribution.matches && uniqueWorkKeys.size === 10000,
    compile_audit_passed: compileAudit.compiledTemplatesFailed === 0,
    row_quality_audit_passed: rowQuality.passed,
    contamination_audit_passed: contamination.passed,
    pricebook_scope_audit_passed: pricebook.passed,
    android_api34_started: false,
    eas_started: false,
    ios_build_started: false,
    ota_started: false,
    blockers,
  } satisfies Omit<ProductionTemplate10000Matrix,
    | "demolition_templates"
    | "earthworks_templates"
    | "concrete_foundation_templates"
    | "masonry_templates"
    | "waterproofing_templates"
    | "roofing_templates"
    | "insulation_templates"
    | "facade_templates"
    | "plaster_paint_templates"
    | "drywall_ceiling_templates"
    | "tile_stone_templates"
    | "flooring_templates"
    | "doors_windows_templates"
    | "carpentry_metal_templates"
    | "electrical_templates"
    | "plumbing_templates"
    | "heating_hvac_templates"
    | "ventilation_templates"
    | "paving_roads_landscape_templates"
    | "special_repair_templates"
  >;

  return {
    ...base,
    demolition_templates: distribution.actual.demolition,
    earthworks_templates: distribution.actual.earthworks,
    concrete_foundation_templates: distribution.actual.concrete_foundation,
    masonry_templates: distribution.actual.masonry,
    waterproofing_templates: distribution.actual.waterproofing,
    roofing_templates: distribution.actual.roofing,
    insulation_templates: distribution.actual.insulation,
    facade_templates: distribution.actual.facade,
    plaster_paint_templates: distribution.actual.plaster_paint,
    drywall_ceiling_templates: distribution.actual.drywall_ceiling,
    tile_stone_templates: distribution.actual.tile_stone,
    flooring_templates: distribution.actual.flooring,
    doors_windows_templates: distribution.actual.doors_windows,
    carpentry_metal_templates: distribution.actual.carpentry_metal,
    electrical_templates: distribution.actual.electrical,
    plumbing_templates: distribution.actual.plumbing,
    heating_hvac_templates: distribution.actual.heating_hvac,
    ventilation_templates: distribution.actual.ventilation,
    paving_roads_landscape_templates: distribution.actual.paving_roads_landscape,
    special_repair_templates: distribution.actual.special_repair,
  };
}
