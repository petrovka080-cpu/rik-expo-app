import type { EstimateCatalogBindingResult } from "../globalEstimate/catalogBinding/globalEstimateCatalogBindingTypes";

export function validateCatalogItemBinding(binding: EstimateCatalogBindingResult): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const row of binding.rows) {
    if (row.bindingStatus === "not_material_row") continue;
    if (!row.materialKey && !row.rateKey) failures.push(`row_key_missing:${row.rowId}`);
    if (row.bindingStatus === "no_catalog_match" && !binding.warnings.some((warning) => warning.includes(row.rowId))) {
      failures.push(`catalog_gap_warning_missing:${row.rowId}`);
    }
  }
  return { passed: failures.length === 0, failures };
}
