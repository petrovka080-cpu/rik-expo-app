import type { EstimateCatalogBindingResult } from "./globalEstimateCatalogBindingTypes";

export function formatCatalogBindingWarnings(binding: EstimateCatalogBindingResult): string[] {
  return binding.warnings.map((warning) => {
    if (warning.startsWith("NO_CATALOG_MATCH:")) {
      const [, rowId, key] = warning.split(":");
      return `Для строки ${rowId} не найден catalog_items кандидат (${key}).`;
    }
    return warning;
  });
}
