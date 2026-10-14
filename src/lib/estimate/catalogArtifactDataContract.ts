import type { ExpandedComplexTemplate } from '../ai/expandedComplexWorks';
import type { WorkEstimateLevel } from './workPassportContract';

/** Validate real catalog data at its loading boundary. Literal JSON inference
 * for tens of thousands of repeated records consumes the compiler heap; these
 * contracts validate all persisted fields without declaration-module stubs,
 * changing records, dropping source rows or substituting ready-status values.
 */
export type CatalogWorkIdentityRecord = {
  template_id: string; work_key: string; work_family_id: string; calculator_family_id: string;
  work_catalog_item_id: string; parameter_schema_id: string; norm_pack_id: string;
  material_recipe_id: string; labor_recipe_id: string; service_recipe_id: string;
  equipment_recipe_id: string; unit_policy_id: string; price_policy_id: string;
  pdf_policy_id: string; buyer_handoff_policy_id: string; category: string;
};
export type EstimateReadinessRecord = CatalogWorkIdentityRecord & {
  norm_version: string; work_type: string; localized_name_ru: string; aliases: string[];
  parameter_schema_status: string; formula_status: string; material_recipe_status: string;
  labor_recipe_status: string; unit_policy_status: string; norm_source_status: string;
  price_source_status: string; calculator_status: string; pdf_status: string;
  buyer_handoff_status: string; readiness_status: string; blocking_reasons: string[];
  row_count: number; source_backed_row_count: number; generic_family_default_row_count: number;
  unverified_norm_row_count: number;
};
export type EstimateReadinessManifest = {
  schema: "estimate-10000-readiness-manifest-v1"; generated_at: string;
  manifest_total_templates: number; approved_backfill_batch_ids: string[];
  manifest_every_template_classified: boolean; ready_professional_count: number;
  quantity_only_price_missing_count: number; not_ready_count: number; generic_fallback_count: number;
  no_template_unclassified: boolean; full_10000_real_norm_green_claimed: boolean;
  fake_green_claimed: boolean; templates: EstimateReadinessRecord[];
};
export type WorkCatalogArtifact = {
  schema: "work-catalog-10000-v1"; generated_at: string; work_catalog_items_count: number;
  items: (CatalogWorkIdentityRecord & { professional_name_ru: string })[];
};
export type ExpandedTemplateCoverageRow = {
  template_id: string; work_family_id: string; template_level: WorkEstimateLevel;
  readiness_status: string; blocking_reasons: string[];
  has_parameter_schema: boolean; has_formula: boolean; has_material_recipe: boolean;
  has_labor_recipe: boolean; has_equipment_recipe: boolean; has_service_recipe: boolean;
  has_norm_source: boolean; has_price_policy: boolean; has_ui_renderer_policy: boolean;
  has_pdf_policy: boolean; has_buyer_handoff_policy: boolean;
};
export type ExpandedTemplateCoverageArtifact = {
  schema: 'expanded-complex-template-coverage-v1'; generated_at: string;
  expanded_templates_count: number; all_templates_checked_for_expanded_complex_works: boolean;
  template_without_family_count: number; not_ready_count: number;
  templates: ExpandedTemplateCoverageRow[];
};
const identityFields = ["template_id", "work_key", "work_family_id", "calculator_family_id", "work_catalog_item_id",
  "parameter_schema_id", "norm_pack_id", "material_recipe_id", "labor_recipe_id", "service_recipe_id",
  "equipment_recipe_id", "unit_policy_id", "price_policy_id", "pdf_policy_id", "buyer_handoff_policy_id", "category"] as const;
const readinessStringFields = ["norm_version", "work_type", "localized_name_ru", "parameter_schema_status", "formula_status",
  "material_recipe_status", "labor_recipe_status", "unit_policy_status", "norm_source_status", "price_source_status",
  "calculator_status", "pdf_status", "buyer_handoff_status", "readiness_status"] as const;
function invalid(locator: string): never { throw new Error(`CATALOG_ARTIFACT_DATA_INVALID:${locator}`); }
function object(value: unknown, locator: string): Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return invalid(locator);
  return value as Record<string, unknown>;
}
function strings(value: unknown, locator: string): void {
  if (!Array.isArray(value)) invalid(locator);
  for (const item of value) if (typeof item !== "string") invalid(locator);
}
function stringFields(value: Record<string, unknown>, fields: readonly string[], locator: string): void {
  for (const field of fields) if (typeof value[field] !== "string") invalid(`${locator}.${field}`);
}
function countFields(value: Record<string, unknown>, fields: readonly string[], locator: string): void {
  for (const field of fields) if (!Number.isSafeInteger(value[field]) || Number(value[field]) < 0) invalid(`${locator}.${field}`);
}
function records(value: unknown, locator: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) return invalid(locator);
  return Array.from(value, (row, index) => object(row, `${locator}[${index}]`));
}
export function parseEstimateReadinessManifest(value: unknown): EstimateReadinessManifest {
  const manifest = object(value, "readiness");
  if (manifest.schema !== "estimate-10000-readiness-manifest-v1") invalid("readiness.schema");
  stringFields(manifest, ["generated_at"], "readiness");
  countFields(manifest, ["manifest_total_templates", "ready_professional_count", "quantity_only_price_missing_count",
    "not_ready_count", "generic_fallback_count"], "readiness");
  strings(manifest.approved_backfill_batch_ids, "readiness.approved_backfill_batch_ids");
  for (const field of ["manifest_every_template_classified", "no_template_unclassified", "full_10000_real_norm_green_claimed", "fake_green_claimed"])
    if (typeof manifest[field] !== "boolean") invalid(`readiness.${field}`);
  const rows = records(manifest.templates, "readiness.templates");
  if (rows.length !== manifest.manifest_total_templates) invalid("readiness.manifest_total_templates");
  rows.forEach((row, index) => {
    const locator = `readiness.templates[${index}]`;
    stringFields(row, identityFields, locator);
    stringFields(row, readinessStringFields, locator);
    strings(row.aliases, `${locator}.aliases`);
    strings(row.blocking_reasons, `${locator}.blocking_reasons`);
    countFields(row, ["row_count", "source_backed_row_count", "generic_family_default_row_count", "unverified_norm_row_count"], locator);
  });
  // Return the actual artifact object with all additional metadata and original
  // record identities intact. Validation neither marks it ready nor projects it.
  return value as EstimateReadinessManifest;
}
export function parseWorkCatalogArtifact(value: unknown): WorkCatalogArtifact {
  const catalog = object(value, "work-catalog");
  if (catalog.schema !== "work-catalog-10000-v1") invalid("work-catalog.schema");
  stringFields(catalog, ["generated_at"], "work-catalog");
  countFields(catalog, ["work_catalog_items_count"], "work-catalog");
  const rows = records(catalog.items, "work-catalog.items");
  if (rows.length !== catalog.work_catalog_items_count) invalid("work-catalog.work_catalog_items_count");
  rows.forEach((row, index) => stringFields(row, [...identityFields, "professional_name_ru"], `work-catalog.items[${index}]`));
  return value as WorkCatalogArtifact;
}

const expandedLevels = ['ROM_CONCEPT', 'PRELIMINARY_BOQ', 'DETAILED_BOQ_FROM_DRAWINGS', 'TENDER_BOQ', 'AS_BUILT_ESTIMATE'];
export function parseExpandedComplexTemplates(value: unknown): ExpandedComplexTemplate[] {
  const rows = records(value, 'expanded-templates');
  rows.forEach((row, index) => {
    const locator = `expanded-templates[${index}]`;
    stringFields(row, ['template_id', 'work_family_id', 'template_level'], locator);
    if (![...expandedLevels, 'NEEDS_INPUT'].includes(row.template_level as string)) invalid(`${locator}.template_level`);
    strings(row.requiredInputs, `${locator}.requiredInputs`);
    strings(row.rowGroups, `${locator}.rowGroups`);
    if ((row.rowGroups as string[]).some(group => !['material', 'work', 'equipment', 'service'].includes(group))) invalid(`${locator}.rowGroups`);
    if (row.pdfPolicy !== 'GROUPED_WITH_ASSUMPTIONS_TRACE_AND_SOURCES') invalid(`${locator}.pdfPolicy`);
    if (row.buyerHandoffPolicy !== 'MATERIAL_EQUIPMENT_DELIVERY_ONLY') invalid(`${locator}.buyerHandoffPolicy`);
  });
  return value as ExpandedComplexTemplate[];
}

export function parseExpandedTemplateCoverage(value: unknown): ExpandedTemplateCoverageArtifact {
  const coverage = object(value, 'expanded-coverage');
  if (coverage.schema !== 'expanded-complex-template-coverage-v1') invalid('expanded-coverage.schema');
  stringFields(coverage, ['generated_at'], 'expanded-coverage');
  countFields(coverage, ['expanded_templates_count', 'template_without_family_count', 'not_ready_count'], 'expanded-coverage');
  if (typeof coverage.all_templates_checked_for_expanded_complex_works !== 'boolean') invalid('expanded-coverage.all_templates_checked_for_expanded_complex_works');
  const rows = records(coverage.templates, 'expanded-coverage.templates');
  if (rows.length !== coverage.expanded_templates_count) invalid('expanded-coverage.expanded_templates_count');
  rows.forEach((row, index) => {
    const locator = `expanded-coverage.templates[${index}]`;
    stringFields(row, ['template_id', 'work_family_id', 'template_level', 'readiness_status'], locator);
    if (![...expandedLevels, 'PROFESSIONAL_EXPANDED'].includes(row.template_level as string)) invalid(`${locator}.template_level`);
    strings(row.blocking_reasons, `${locator}.blocking_reasons`);
    for (const field of ['has_parameter_schema', 'has_formula', 'has_material_recipe', 'has_labor_recipe', 'has_equipment_recipe',
      'has_service_recipe', 'has_norm_source', 'has_price_policy', 'has_ui_renderer_policy', 'has_pdf_policy', 'has_buyer_handoff_policy'])
      if (typeof row[field] !== 'boolean') invalid(`${locator}.${field}`);
  });
  return value as ExpandedTemplateCoverageArtifact;
}
