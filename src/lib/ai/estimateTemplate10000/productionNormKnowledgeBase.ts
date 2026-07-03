import {
  compileProductionExpandedEstimate10000,
  getProductionExpandedTemplate10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "./productionExpandedWorkCatalog10000";
import {
  buildEstimateNormBinding,
  buildEstimateNormItemForTemplateRow,
  ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION,
  ESTIMATE_NORM_SOURCES,
  GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS,
  NORM_WORK_TAXONOMY_GROUPS,
  resolveNormWorkGroupForCategory,
  STOP_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_FAILED,
  validateEstimateNormItem,
  type EstimateNormBinding,
  type EstimateNormItem,
} from "./productionNormKnowledgeBaseCore";

export type EstimateNormKnowledgeBaseSnapshot = {
  version: string;
  sources: typeof ESTIMATE_NORM_SOURCES;
  work_groups: typeof NORM_WORK_TAXONOMY_GROUPS;
  bindings: EstimateNormBinding[];
  items: EstimateNormItem[];
};

export type EstimateNormValidationSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_FAILED;
  norm_knowledge_base_version: string;
  norm_sources_schema_passed: boolean;
  work_groups_count: number;
  work_groups_minimum_met: boolean;
  work_templates_count: number;
  templates_with_norm_bindings: number;
  templates_without_norm_bindings: number;
  no_unclassified_templates: boolean;
  norm_items_count: number;
  all_norm_items_have_source_version_units: boolean;
  all_norm_items_have_formula_inputs: boolean;
  all_norm_items_have_parameter_requirements: boolean;
  all_norm_items_have_quality_review: boolean;
  no_ai_or_unknown_norm_sources: boolean;
  production_db_touched: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  full_jest_started: false;
  failures: string[];
};

export type EstimateNormCertificationSummary = EstimateNormValidationSummary & {
  certification_type: "all_10000_template_norm_bindings";
  templates_certified_count: number;
  templates_failed_count: number;
  row_bindings_certified_count: number;
  all_templates_compile_with_norm_trace: boolean;
  all_compiled_rows_have_norm_id: boolean;
  all_compiled_rows_have_norm_source: boolean;
  all_compiled_rows_have_norm_version: boolean;
  trace_includes_norm_id_source_version: boolean;
};

export type EstimateNormPlanSummary = {
  mode: "dry-run" | "verify";
  norm_knowledge_base_version: string;
  final_status: EstimateNormValidationSummary["final_status"];
  work_templates_count: number;
  norm_sources_count: number;
  norm_work_groups_count: number;
  row_bindings_count: number;
  production_db_touched: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  full_jest_started: false;
  failures: string[];
};

function sourceSchemaFailures(): string[] {
  return ESTIMATE_NORM_SOURCES.flatMap((source) => [
    source.source_id ? "" : "norm_source_missing_id",
    source.source_type ? "" : `norm_source_missing_type:${source.source_id}`,
    source.document_version ? "" : `norm_source_missing_document_version:${source.source_id}`,
    source.provenance ? "" : `norm_source_missing_provenance:${source.source_id}`,
    source.license_status ? "" : `norm_source_missing_license:${source.source_id}`,
    source.quality_status ? "" : `norm_source_missing_quality:${source.source_id}`,
    source.review_status ? "" : `norm_source_missing_review:${source.source_id}`,
    /unknown/i.test(source.source_type) ? `unknown_norm_source:${source.source_id}` : "",
    /(^|_)ai($|_)/i.test(source.source_type) || /(^|_)ai($|_)/i.test(source.source_id) ? `ai_as_norm_source:${source.source_id}` : "",
  ]).filter(Boolean);
}

export function buildEstimateNormKnowledgeBaseSnapshot(): EstimateNormKnowledgeBaseSnapshot {
  const bindings: EstimateNormBinding[] = [];
  const items: EstimateNormItem[] = [];

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const template = getProductionExpandedTemplate10000(definition.workKey);
    bindings.push(buildEstimateNormBinding(definition, template.rows));
    for (const row of template.rows) {
      items.push(buildEstimateNormItemForTemplateRow(definition, row));
    }
  }

  return {
    version: ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION,
    sources: ESTIMATE_NORM_SOURCES,
    work_groups: NORM_WORK_TAXONOMY_GROUPS,
    bindings,
    items,
  };
}

export function validateEstimateNormKnowledgeBase(): EstimateNormValidationSummary {
  const failures: string[] = [];
  failures.push(...sourceSchemaFailures());

  const unclassified = PRODUCTION_WORK_DEFINITIONS_10000
    .filter((definition) => !resolveNormWorkGroupForCategory(definition.category))
    .map((definition) => `template_unclassified:${definition.workKey}:${definition.category}`);
  failures.push(...unclassified);

  let templatesWithBindings = 0;
  let normItemsCount = 0;
  let rowsWithSourceVersionUnit = 0;
  let rowsWithInputs = 0;
  let rowsWithRequirements = 0;
  let rowsWithQualityReview = 0;

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const template = getProductionExpandedTemplate10000(definition.workKey);
    const binding = buildEstimateNormBinding(definition, template.rows);
    if (binding.row_bindings.length === template.rows.length && binding.row_bindings.length > 0) {
      templatesWithBindings += 1;
    } else {
      failures.push(`template_without_norm_binding:${definition.workKey}`);
    }

    for (const row of template.rows) {
      const item = buildEstimateNormItemForTemplateRow(definition, row);
      const itemFailures = validateEstimateNormItem(item);
      if (itemFailures.length) failures.push(...itemFailures.slice(0, 3));
      normItemsCount += 1;
      if (item.source_id && item.norm_version && item.unit) rowsWithSourceVersionUnit += 1;
      if (item.formula_inputs.length > 0) rowsWithInputs += 1;
      if (item.parameter_requirements.length > 0) rowsWithRequirements += 1;
      if (item.quality_review.status === "approved_for_formula_engine") rowsWithQualityReview += 1;
    }
  }

  const dedupedFailures = [...new Set(failures)].slice(0, 200);
  const templatesWithoutBindings = PRODUCTION_WORK_DEFINITIONS_10000.length - templatesWithBindings;
  const schemaPassed = sourceSchemaFailures().length === 0;
  const green =
    dedupedFailures.length === 0 &&
    schemaPassed &&
    NORM_WORK_TAXONOMY_GROUPS.length >= 35 &&
    templatesWithoutBindings === 0 &&
    unclassified.length === 0 &&
    rowsWithSourceVersionUnit === normItemsCount &&
    rowsWithInputs === normItemsCount &&
    rowsWithRequirements === normItemsCount &&
    rowsWithQualityReview === normItemsCount;

  return {
    final_status: green
      ? GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_FAILED,
    norm_knowledge_base_version: ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION,
    norm_sources_schema_passed: schemaPassed,
    work_groups_count: NORM_WORK_TAXONOMY_GROUPS.length,
    work_groups_minimum_met: NORM_WORK_TAXONOMY_GROUPS.length >= 35,
    work_templates_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    templates_with_norm_bindings: templatesWithBindings,
    templates_without_norm_bindings: templatesWithoutBindings,
    no_unclassified_templates: unclassified.length === 0,
    norm_items_count: normItemsCount,
    all_norm_items_have_source_version_units: rowsWithSourceVersionUnit === normItemsCount,
    all_norm_items_have_formula_inputs: rowsWithInputs === normItemsCount,
    all_norm_items_have_parameter_requirements: rowsWithRequirements === normItemsCount,
    all_norm_items_have_quality_review: rowsWithQualityReview === normItemsCount,
    no_ai_or_unknown_norm_sources: !dedupedFailures.some((failure) => /unknown_norm_source|ai_as_norm_source/.test(failure)),
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    failures: dedupedFailures,
  };
}

export function certifyAllEstimateNormBindings10000(): EstimateNormCertificationSummary {
  const base = validateEstimateNormKnowledgeBase();
  const failures = [...base.failures];
  let templatesCertified = 0;
  let rowBindings = 0;
  let compiledRowsHaveNormId = true;
  let compiledRowsHaveNormSource = true;
  let compiledRowsHaveNormVersion = true;
  let traceIncludesNormEvidence = true;

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: definition.workKey,
      quantity: 54,
      countryCode: "KG",
    });
    const rows = compiled.rows;
    const rowNormId = rows.every((row) => Boolean(row.normId && row.sourceParameters.normId));
    const rowNormSource = rows.every((row) => Boolean(row.normSourceId && row.sourceParameters.normSourceId));
    const rowNormVersion = rows.every((row) => Boolean(row.normVersion && row.sourceParameters.normVersion));
    const rowTrace = rows.every((row) =>
      row.calculationTrace.includes("normId=") &&
      row.calculationTrace.includes("normSource=") &&
      row.calculationTrace.includes("normVersion=")
    );
    compiledRowsHaveNormId = compiledRowsHaveNormId && rowNormId;
    compiledRowsHaveNormSource = compiledRowsHaveNormSource && rowNormSource;
    compiledRowsHaveNormVersion = compiledRowsHaveNormVersion && rowNormVersion;
    traceIncludesNormEvidence = traceIncludesNormEvidence && rowTrace;
    rowBindings += rows.length;
    if (rowNormId && rowNormSource && rowNormVersion && rowTrace) {
      templatesCertified += 1;
    } else {
      failures.push(`template_norm_trace_failed:${definition.workKey}`);
    }
  }

  const templatesFailed = PRODUCTION_WORK_DEFINITIONS_10000.length - templatesCertified;
  const green =
    base.final_status === GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS &&
    templatesFailed === 0 &&
    compiledRowsHaveNormId &&
    compiledRowsHaveNormSource &&
    compiledRowsHaveNormVersion &&
    traceIncludesNormEvidence;

  return {
    ...base,
    final_status: green
      ? GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_FAILED,
    certification_type: "all_10000_template_norm_bindings",
    templates_certified_count: templatesCertified,
    templates_failed_count: templatesFailed,
    row_bindings_certified_count: rowBindings,
    all_templates_compile_with_norm_trace: templatesFailed === 0,
    all_compiled_rows_have_norm_id: compiledRowsHaveNormId,
    all_compiled_rows_have_norm_source: compiledRowsHaveNormSource,
    all_compiled_rows_have_norm_version: compiledRowsHaveNormVersion,
    trace_includes_norm_id_source_version: traceIncludesNormEvidence,
    failures: [...new Set(failures)].slice(0, 200),
  };
}

export function buildEstimateNormImportPlan(input: { mode: "dry-run" | "verify" }): EstimateNormPlanSummary {
  const validation = validateEstimateNormKnowledgeBase();
  return {
    mode: input.mode,
    norm_knowledge_base_version: ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION,
    final_status: validation.final_status,
    work_templates_count: validation.work_templates_count,
    norm_sources_count: ESTIMATE_NORM_SOURCES.length,
    norm_work_groups_count: NORM_WORK_TAXONOMY_GROUPS.length,
    row_bindings_count: validation.norm_items_count,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    failures: validation.failures,
  };
}

export function buildTemplateNormBindingPlan(input: { mode: "dry-run" | "verify" }): EstimateNormPlanSummary {
  const certification = certifyAllEstimateNormBindings10000();
  return {
    mode: input.mode,
    norm_knowledge_base_version: ESTIMATE_NORM_KNOWLEDGE_BASE_VERSION,
    final_status: certification.final_status,
    work_templates_count: certification.work_templates_count,
    norm_sources_count: ESTIMATE_NORM_SOURCES.length,
    norm_work_groups_count: NORM_WORK_TAXONOMY_GROUPS.length,
    row_bindings_count: certification.row_bindings_certified_count,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    failures: certification.failures,
  };
}
