import type { GlobalCatalogMaterialRow } from "./globalCatalogPolicyTypes";

export function validateGlobalCatalogPolicy(rows: readonly GlobalCatalogMaterialRow[]): { valid: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const row of rows) {
    if (!row.materialKey) failures.push("MATERIAL_KEY_REQUIRED");
    if (!row.catalogRegion) failures.push(`CATALOG_REGION_REQUIRED:${row.materialKey}`);
    if (row.catalogCandidates.length === 0 && !row.catalogGapWarning) {
      failures.push(`CATALOG_GAP_WARNING_REQUIRED:${row.materialKey}`);
    }
    for (const candidate of row.catalogCandidates) {
      if (!candidate.catalogItemId.startsWith("catalog:")) failures.push(`CATALOG_ITEM_ID_INVALID:${row.materialKey}`);
      if ("supplierName" in candidate || "stockQuantity" in candidate || "availability" in candidate) {
        failures.push(`FAKE_SUPPLIER_STOCK_AVAILABILITY_FORBIDDEN:${row.materialKey}`);
      }
    }
  }
  return { valid: failures.length === 0, failures };
}
