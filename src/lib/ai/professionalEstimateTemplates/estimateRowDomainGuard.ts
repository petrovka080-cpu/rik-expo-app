import { forbiddenGenericMaterialLabels } from "./materialRecipeRows";
import type {
  ProfessionalEstimateLine,
  ProfessionalEstimateRecipeRow,
  ProfessionalGroupKey,
} from "./professionalEstimateTypes";
import { detectCrossDomainRowLeaks } from "./professionalEstimateSnapshot";

type GuardRow = ProfessionalEstimateLine | ProfessionalEstimateRecipeRow;

export type EstimateRowDomainGuardResult = {
  selected_work_key: string;
  expected_domain: ProfessionalGroupKey;
  rows_checked: number;
  cross_domain_row_leaks: number;
  row_without_provenance: number;
  generic_material_rows: number;
  paid_control_rows: number;
  fake_green_claimed: false;
};

function rowHasProvenance(row: GuardRow): boolean {
  if (!row.row_key || !row.visible_name_ru || !row.row_domain || !row.source_policy) return false;
  if ("price" in row) {
    return Boolean(row.price && row.price.price_status && row.price.fake_price_claimed === false);
  }
  return Array.isArray(row.allowed_work_keys) && row.allowed_work_keys.length > 0;
}

export function auditEstimateRowDomainGuard(input: {
  selected_work_key: string;
  expected_domain: ProfessionalGroupKey;
  rows: readonly GuardRow[];
}): EstimateRowDomainGuardResult {
  const genericLabels = new Set(forbiddenGenericMaterialLabels().map((label) => label.toLocaleLowerCase("ru-RU")));
  const leaks = detectCrossDomainRowLeaks({
    selected_work_key: input.selected_work_key,
    expected_domain: input.expected_domain,
    rows: input.rows,
  });

  return {
    selected_work_key: input.selected_work_key,
    expected_domain: input.expected_domain,
    rows_checked: input.rows.length,
    cross_domain_row_leaks: leaks.length,
    row_without_provenance: input.rows.filter((row) => !rowHasProvenance(row)).length,
    generic_material_rows: input.rows.filter((row) =>
      row.row_kind === "material" && genericLabels.has(row.visible_name_ru.toLocaleLowerCase("ru-RU"))
    ).length,
    paid_control_rows: input.rows.filter((row) => row.paid_control_row || row.forbidden_as_paid_control_row).length,
    fake_green_claimed: false,
  };
}
