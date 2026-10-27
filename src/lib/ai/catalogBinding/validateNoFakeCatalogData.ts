import type { EstimateCatalogBindingResult } from "../globalEstimate/catalogBinding/globalEstimateCatalogBindingTypes";

export function validateNoFakeCatalogData(binding: EstimateCatalogBindingResult): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const row of binding.rows) {
    for (const candidate of row.catalogCandidates) {
      if (/fake|placeholder|mock/i.test(candidate.catalogItemId)) failures.push(`synthetic_catalog_item:${candidate.catalogItemId}`);
      if (candidate.stockStatus === "in_stock" && candidate.availabilityStatus === "available") {
        failures.push(`unsupported_stock_supplier_availability:${candidate.catalogItemId}`);
      }
    }
  }
  return { passed: failures.length === 0, failures };
}
