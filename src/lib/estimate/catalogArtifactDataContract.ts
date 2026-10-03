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
