import type { GlobalEstimateResult } from "../globalEstimateTypes";
import type { EstimateCatalogBindingResult } from "./globalEstimateCatalogBindingTypes";

export type EstimateCatalogBindingValidation = {
  ok: boolean;
  materialRowsTotal: number;
  materialRowsWithRateKeys: number;
  materialRowsWithMaterialKeys: number;
  bindingAttemptedForMaterialRows: boolean;
  fakeStockFound: boolean;
  fakeSupplierFound: boolean;
  fakeAvailabilityFound: boolean;
  failures: string[];
};

const FAKE_TEXT = /\bfake\b|заглуш|тестовый поставщик|mock/i;

export function validateEstimateCatalogBinding(input: {
  estimate: GlobalEstimateResult;
  binding: EstimateCatalogBindingResult;
}): EstimateCatalogBindingValidation {
  const materialRows = input.estimate.sections
    .filter((section) => section.type === "materials")
    .flatMap((section) => section.rows);
  const bindingRows = new Map(input.binding.rows.map((row) => [row.rowId, row]));
  const failures: string[] = [];

  for (const row of materialRows) {
    const rowId = row.code || row.rowNumber;
    const binding = bindingRows.get(rowId);
    if (!binding || binding.bindingStatus === "not_material_row") {
      failures.push(`MATERIAL_ROW_BINDING_NOT_ATTEMPTED:${rowId}`);
    }
  }

  let fakeStockFound = false;
  let fakeSupplierFound = false;
  let fakeAvailabilityFound = false;
  for (const row of input.binding.rows) {
    for (const candidate of row.catalogCandidates) {
      if (candidate.stockStatus !== "unknown" && FAKE_TEXT.test(candidate.stockStatus)) fakeStockFound = true;
      if (candidate.sourceLabel && FAKE_TEXT.test(candidate.sourceLabel)) fakeSupplierFound = true;
      if (candidate.availabilityStatus !== "unknown" && FAKE_TEXT.test(candidate.availabilityStatus)) fakeAvailabilityFound = true;
    }
  }

  if (fakeStockFound) failures.push("FAKE_STOCK_FOUND");
  if (fakeSupplierFound) failures.push("FAKE_SUPPLIER_FOUND");
  if (fakeAvailabilityFound) failures.push("FAKE_AVAILABILITY_FOUND");

  return {
    ok: failures.length === 0,
    materialRowsTotal: materialRows.length,
    materialRowsWithRateKeys: materialRows.filter((row) => Boolean(row.rateKey)).length,
    materialRowsWithMaterialKeys: materialRows.filter((row) => Boolean(row.materialKey)).length,
    bindingAttemptedForMaterialRows: failures.every((failure) => !failure.startsWith("MATERIAL_ROW_BINDING_NOT_ATTEMPTED")),
    fakeStockFound,
    fakeSupplierFound,
    fakeAvailabilityFound,
    failures,
  };
}
