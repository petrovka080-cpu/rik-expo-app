import type { AsphaltProfessionalEstimateCompilationV4 } from "./compileAsphaltProfessionalEstimateV4";
import { FULL_ROAD_EXPANDED_WBS_V4, type FullRoadExpandedWbsCodeV4 } from "./asphaltFullRoadExpandedBoqV4";
import { validateAsphaltWorkAssemblyCoverageV4 } from "./validateAsphaltWorkAssemblyCoverageV4";

export const GREEN_V4_PHASE1D_FULL_ROAD_INFRASTRUCTURE_EXPANDED_PROFESSIONAL_BOQ_END_TO_END_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_AND_ESTIMATOR_REVIEW_NO_RELEASE =
  "GREEN_V4_PHASE1D_FULL_ROAD_INFRASTRUCTURE_EXPANDED_PROFESSIONAL_BOQ_END_TO_END_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_AND_ESTIMATOR_REVIEW_NO_RELEASE" as const;
export const STOP_V4_PHASE1D_FULL_ROAD_INFRASTRUCTURE_END_TO_END_TRUTH_INCOMPLETE_NO_RELEASE =
  "STOP_V4_PHASE1D_FULL_ROAD_INFRASTRUCTURE_END_TO_END_TRUTH_INCOMPLETE_NO_RELEASE" as const;

const CATEGORY_COLUMNS = Object.freeze({
  materials: ["MATERIAL", "EQUIPMENT"],
  works: ["WORK", "SERVICE"],
  labor: ["LABOR"],
  machinery: ["MACHINERY"],
  logistics: ["LOGISTICS"],
  testing: ["LAB_CONTROL"],
  documents: ["DOCUMENTATION"],
} as const);

export type FullRoadPhase1DMatrixColumn = keyof typeof CATEGORY_COLUMNS;

function notApplicableReason(wbs: FullRoadExpandedWbsCodeV4, column: FullRoadPhase1DMatrixColumn): string | null {
  if (column === "logistics" && wbs !== "30") {
    return "NOT_APPLICABLE_IN_THIS_WBS: доставка, мобилизация и вывоз вынесены без двойного учёта в WBS 30.";
  }
  if (column === "testing" && wbs !== "28") {
    return "NOT_APPLICABLE_IN_THIS_WBS: входной, операционный и приёмочный контроль централизован в WBS 28 с трассировкой проверяемой подсистемы.";
  }
  if (column === "documents" && wbs !== "29") {
    return "NOT_APPLICABLE_IN_THIS_WBS: акты, схемы, журналы и паспорта централизованы в WBS 29 с трассировкой подсистемы.";
  }
  if (column === "materials" && wbs === "29") {
    return "NOT_APPLICABLE: исполнительная документация является измеримым документальным результатом и не создаёт отдельного закупаемого материала.";
  }
  if (column === "works" && ["28", "29", "30"].includes(wbs)) {
    return wbs === "28"
      ? "NOT_APPLICABLE: испытания учтены самостоятельными строками LAB_CONTROL, а не повторными строительными работами."
      : wbs === "29"
        ? "NOT_APPLICABLE: выпуск документов учтён строками DOCUMENTATION и трудом ИТР без дублирующей строительной работы."
        : "NOT_APPLICABLE: физические погрузочно-разгрузочные операции принадлежат исполнительным WBS; WBS 30 содержит только отдельную логистическую транспортную работу и услуги.";
  }
  if (column === "labor" && wbs === "30") {
    return "NOT_APPLICABLE: труд водителей и операторов включён в отдельные машино-часы и транспортную работу; повторная строка труда создала бы двойную стоимость.";
  }
  if (column === "machinery" && ["01", "04", "07", "29"].includes(wbs)) {
    return wbs === "29"
      ? "NOT_APPLICABLE: WBS 29 создаёт документы трудом ИТР без отдельной строительной машины."
      : "NOT_APPLICABLE: операции раздела выполняются вручную либо как измеримая услуга; самостоятельная машина для этого WBS не требуется.";
  }
  return null;
}

export function buildFullRoadWbsCoverageMatrixV4(compilation: AsphaltProfessionalEstimateCompilationV4) {
  return Object.entries(FULL_ROAD_EXPANDED_WBS_V4).map(([rawWbs, title]) => {
    const wbs = rawWbs as FullRoadExpandedWbsCodeV4;
    const rows = compilation.compiled_rows.filter((row) => row.definition.wbs_code === wbs);
    const columns = Object.fromEntries(Object.entries(CATEGORY_COLUMNS).map(([rawColumn, categories]) => {
      const column = rawColumn as FullRoadPhase1DMatrixColumn;
      const rowIds = rows
        .filter((row) => (categories as readonly string[]).includes(row.definition.professional_category ?? ""))
        .map((row) => row.definition.row_id);
      const explanation = rowIds.length > 0 ? null : notApplicableReason(wbs, column);
      return [column, {
        status: rowIds.length > 0 ? "EVIDENCE" : explanation ? "NOT_APPLICABLE_EXPLAINED" : "BLOCKED",
        row_ids: rowIds,
        explanation_ru: explanation,
      }];
    }));
    return { wbs_code: wbs, title_ru: title, row_count: rows.length, columns };
  });
}

const GENERIC_ROW = /^(?:материалы?|работы?|услуги?|оборудование|техника|комплект|прочее)$/iu;
const PADDING_ROW = /(?:padding|placeholder|filler|резервная строка|заполнитель строк)/iu;
const INTERNAL_PUBLIC_TOKEN = /\b(?:NEW_FULL_ROAD_INFRASTRUCTURE|coarse_lower|dense_fine|machine_hour|man_hour|t_km|[a-z]+_[a-z][a-z_]+)\b/u;

export function auditFullRoadInfrastructurePhase1DV4(compilation: AsphaltProfessionalEstimateCompilationV4) {
  const rows = compilation.compiled_rows;
  const matrix = buildFullRoadWbsCoverageMatrixV4(compilation);
  const coverage = validateAsphaltWorkAssemblyCoverageV4(compilation);
  const unresolvedByColumn = (column: FullRoadPhase1DMatrixColumn) => matrix.filter((section) =>
    section.columns[column].status === "BLOCKED"
  ).length;
  const rowIds = rows.map((row) => row.definition.row_id);
  const publicText = rows.map((row) => `${row.definition.professional_name_ru} ${row.definition.technical_specification_ru}`);
  const counters = {
    missing_wbs: matrix.filter((section) => section.row_count === 0).length,
    missing_materials: unresolvedByColumn("materials"),
    missing_work_operations: unresolvedByColumn("works"),
    missing_labor: unresolvedByColumn("labor"),
    missing_machinery: unresolvedByColumn("machinery"),
    missing_logistics: unresolvedByColumn("logistics"),
    missing_testing: unresolvedByColumn("testing"),
    missing_documents: unresolvedByColumn("documents"),
    unresolved_quantities: rows.filter((row) => !Number.isFinite(row.quantity) || row.quantity <= 0).length,
    invalid_units: compilation.category_unit_blockers.length + rows.filter((row) => !row.definition.unit_id).length,
    missing_formulas: rows.filter((row) => !row.definition.formula_id || !row.definition.explanation_trace_ru.trim()).length,
    dimension_mismatches: compilation.formula_dimension_blockers.length,
    missing_sources: rows.filter((row) => !row.definition.source_id || row.assumption_ids.length === 0).length,
    hidden_internal_ids: publicText.filter((text) => INTERNAL_PUBLIC_TOKEN.test(text)).length,
    generic_rows: rows.filter((row) => GENERIC_ROW.test(row.definition.professional_name_ru.trim())).length,
    padding_rows: rows.filter((row) => PADDING_ROW.test(`${row.definition.row_id} ${row.definition.professional_name_ru}`)).length,
    duplicate_rows: rowIds.length - new Set(rowIds).size,
    double_cost_rows: coverage.counters.double_cost_ownership
      + coverage.counters.duplicate_physical_resources
      + coverage.counters.priced_analytical_rows
      + coverage.counters.priced_informational_subtotals,
    unexplained_exclusions: rows.filter((row) =>
      !row.definition.applicability.trim()
      || !row.definition.inclusion_reason_ru.trim()
      || !row.definition.exclusion_rule.trim()
    ).length,
  };
  const coreGreen = compilation.preliminary_assembly_policy.public_scope_id === "NEW_FULL_ROAD_INFRASTRUCTURE"
    && compilation.compile_blockers.length === 0
    && compilation.passport.unresolved_requirements.length === 0
    && Object.values(counters).every((value) => value === 0);
  return {
    status: coreGreen
      ? GREEN_V4_PHASE1D_FULL_ROAD_INFRASTRUCTURE_EXPANDED_PROFESSIONAL_BOQ_END_TO_END_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_AND_ESTIMATOR_REVIEW_NO_RELEASE
      : STOP_V4_PHASE1D_FULL_ROAD_INFRASTRUCTURE_END_TO_END_TRUTH_INCOMPLETE_NO_RELEASE,
    scope_id: compilation.preliminary_assembly_policy.public_scope_id,
    rows_total: rows.length,
    procurement_rows: compilation.passport.procurement_lines.length,
    counters,
    matrix,
    compile_blockers: compilation.compile_blockers,
    unresolved_requirements: compilation.passport.unresolved_requirements,
    release_authorized: false,
  };
}
