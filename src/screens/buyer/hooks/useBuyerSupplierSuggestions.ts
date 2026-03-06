import { useCallback } from "react";

import type { Supplier } from "../../../lib/catalog_api";
import { normName } from "../buyerUtils";

export function useBuyerSupplierSuggestions(suppliers: Supplier[]) {
  const getSupplierSuggestions = useCallback(
    (query: string) => {
      const needle = normName(query);
      if (!needle) return [];
      return suppliers
        .filter((s) => normName(s.name).includes(needle))
        .slice(0, 8)
        .map((s) => s.name)
        .filter(Boolean);
    },
    [suppliers]
  );

  return { getSupplierSuggestions };
}

