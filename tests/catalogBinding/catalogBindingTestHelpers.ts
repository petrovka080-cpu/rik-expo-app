import {
  calculateGlobalConstructionEstimateSync,
  type GlobalEstimateResult,
  type SourceBackedEstimateRow,
} from "../../src/lib/ai/globalEstimate";
import {
  bindEstimateRowsToCatalogItems,
  selectEstimateCatalogCandidate,
} from "../../src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems";
import type { EstimateCatalogBindingResult } from "../../src/lib/ai/globalEstimate/catalogBinding/globalEstimateCatalogBindingTypes";
import { validateEstimateCatalogBinding } from "../../src/lib/ai/globalEstimate/catalogBinding/validateEstimateCatalogBinding";
import type { CatalogItemForEstimate } from "../../src/lib/catalog/catalogItemTypes";

export const FOUNDATION_PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

export function estimateFor(text: string): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    text,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
}

export function candidateFor(row: SourceBackedEstimateRow): CatalogItemForEstimate {
  return {
    catalogItemId: `catalog_${row.rateKey || row.code}`,
    name: `${row.name} catalog_items`,
    normalizedName: `${row.name} catalog_items`.toLocaleLowerCase("ru-RU"),
    category: "material",
    materialKey: row.materialKey,
    rateKey: row.rateKey,
    unit: row.unit,
    unitLabel: row.displayQuantity.replace(String(row.quantity), "").trim() || row.unit,
    unitPrice: row.unitPrice,
    currency: row.currency,
    sourceId: "catalog_items",
    sourceLabel: "catalog_items",
    checkedAt: "2026-05-25T00:00:00.000Z",
    confidence: "high",
    availabilityStatus: "unknown",
    stockStatus: "unknown",
  };
}

export async function bindWithFixtureCatalog(estimate = estimateFor(FOUNDATION_PROMPT)): Promise<EstimateCatalogBindingResult> {
  return bindEstimateRowsToCatalogItems({
    estimate,
    searchProvider: async (_query, row) => [candidateFor(row)],
  });
}

export async function selectedFoundationBinding() {
  const estimate = estimateFor(FOUNDATION_PROMPT);
  const binding = await bindWithFixtureCatalog(estimate);
  const firstMaterial = binding.rows.find((row) => row.bindingStatus === "matched");
  if (!firstMaterial?.catalogCandidates[0]) throw new Error("fixture binding candidate missing");
  return {
    estimate,
    binding: selectEstimateCatalogCandidate({
      binding,
      rowId: firstMaterial.rowId,
      catalogItemId: firstMaterial.catalogCandidates[0].catalogItemId,
    }),
    selectedRowId: firstMaterial.rowId,
    selectedCatalogItemId: firstMaterial.catalogCandidates[0].catalogItemId,
  };
}

export function validateFixtureBinding(estimate: GlobalEstimateResult, binding: EstimateCatalogBindingResult) {
  return validateEstimateCatalogBinding({ estimate, binding });
}
