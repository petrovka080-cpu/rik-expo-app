import type { AsphaltProfessionalEstimateCompilationV4 } from "./compileAsphaltProfessionalEstimateV4";
import { getAsphaltScopeManifestV4 } from "./asphaltScopeManifestV4";

const GENERIC_ROW = /^(?:материал(?:ы)?|работ(?:а|ы)?|услуг(?:а|и)?|оборудование|техника|комплект|прочее)$/iu;
const PADDING_ROW = /(?:preview|placeholder|padding|filler|резерв|строка\s+\d+)/iu;

export type AsphaltWorkAssemblyCoverageCountersV4 = {
  required_wbs_rows_missing: number;
  quantity_missing: number;
  quantity_non_positive: number;
  unit_missing: number;
  formula_trace_missing: number;
  assumption_trace_missing: number;
  generic_rows: number;
  preview_only_rows: number;
  padding_rows: number;
  duplicate_row_ids: number;
  category_mismatch: number;
  formula_dimension_mismatch: number;
  unresolved_requirements: number;
  duplicate_physical_resources: number;
  double_cost_ownership: number;
  priced_analytical_rows: number;
  priced_informational_subtotals: number;
  inapplicable_rows: number;
  public_internal_ids: number;
};

export function validateAsphaltWorkAssemblyCoverageV4(
  compilation: AsphaltProfessionalEstimateCompilationV4,
) {
  const rows = compilation.compiled_rows;
  const ids = rows.map((row) => row.definition.row_id);
  const idSet = new Set(ids);
  const manifest = getAsphaltScopeManifestV4(compilation.preliminary_assembly_policy.profile_id);
  const required = manifest.required_row_ids;
  const physicalKeys = rows
    .filter((row) => row.definition.professional_category === "MATERIAL" || row.definition.professional_category === "PRODUCT")
    .map((row) => `${row.definition.professional_name_ru}|${row.definition.technical_specification_ru}|${row.definition.unit_id}`);
  const pricedOwners = rows
    .filter((row) => row.definition.priced === true && row.definition.costing_mode !== "ANALYTICAL_ONLY" && row.definition.costing_mode !== "INFORMATIONAL_SUBTOTAL")
    .map((row) => row.definition.cost_ownership_id)
    .filter((value): value is string => Boolean(value));
  const counters: AsphaltWorkAssemblyCoverageCountersV4 = {
    required_wbs_rows_missing: required.filter((rowId) => !idSet.has(rowId)).length,
    quantity_missing: rows.filter((row) => row.quantity == null || !Number.isFinite(row.quantity)).length,
    quantity_non_positive: rows.filter((row) => row.quantity <= 0).length,
    unit_missing: rows.filter((row) => !row.definition.unit_id).length,
    formula_trace_missing: rows.filter((row) => !row.definition.formula_id || !row.definition.explanation_trace_ru.trim()).length,
    assumption_trace_missing: rows.filter((row) => row.assumption_ids.length === 0).length,
    generic_rows: rows.filter((row) => GENERIC_ROW.test(row.definition.professional_name_ru.trim())).length,
    preview_only_rows: rows.filter((row) => /^preview:/i.test(row.definition.row_id)).length,
    padding_rows: rows.filter((row) => PADDING_ROW.test(`${row.definition.row_id} ${row.definition.professional_name_ru}`)).length,
    duplicate_row_ids: ids.length - idSet.size,
    category_mismatch: compilation.category_unit_blockers.length,
    formula_dimension_mismatch: compilation.formula_dimension_blockers.length,
    unresolved_requirements: compilation.passport.unresolved_requirements.length,
    duplicate_physical_resources: physicalKeys.length - new Set(physicalKeys).size,
    double_cost_ownership: pricedOwners.length - new Set(pricedOwners).size,
    priced_analytical_rows: rows.filter((row) => row.definition.priced === true && row.definition.costing_mode === "ANALYTICAL_ONLY").length,
    priced_informational_subtotals: rows.filter((row) => row.definition.priced === true && row.definition.costing_mode === "INFORMATIONAL_SUBTOTAL").length,
    inapplicable_rows: rows.filter((row) => /applicability_false|not_applicable/iu.test(row.definition.applicability)).length,
    public_internal_ids: rows.filter((row) => /\b(?:coarse_lower|dense_fine)\b/u.test(
      `${row.definition.professional_name_ru} ${row.definition.technical_specification_ru}`,
    )).length,
  };
  const green = Object.values(counters).every((value) => value === 0);
  return {
    status: green
      ? "GREEN_ASPHALT_WORK_ASSEMBLY_COVERAGE_V4" as const
      : "STOP_ASPHALT_WORK_ASSEMBLY_COVERAGE_V4" as const,
    assembly_id: compilation.preliminary_assembly_policy.assembly_id,
    manifest_id: manifest.manifest_id,
    manifest_coverage_ratio: required.length === 0 ? 1 : (required.length - counters.required_wbs_rows_missing) / required.length,
    explicitly_excluded_wbs_ru: manifest.explicitly_excluded_wbs_ru,
    quantity_basis: compilation.quantity_basis,
    required_row_ids: required,
    counters,
  };
}
