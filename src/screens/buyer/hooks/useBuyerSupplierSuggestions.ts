import { useCallback } from "react";

import type { BuyerCounterpartySuggestion } from "./useBuyerSuppliers";
import type { CounterpartyRoleGate } from "../procurementTyping";
import { normName } from "../buyerUtils";

export function useBuyerSupplierSuggestions(counterparties: BuyerCounterpartySuggestion[]) {
  const getSupplierSuggestions = useCallback(
    (query: string, roleGate: CounterpartyRoleGate = null) => {
      const needle = normName(query);
      const roleFiltered = counterparties.filter((cp) => {
        if (roleGate === "supplier") return cp.role === "supplier" || cp.role === "both";
        if (roleGate === "contractor") return cp.role === "contractor" || cp.role === "both";
        return true;
      });

      const byNeedle = needle ? roleFiltered.filter((cp) => normName(cp.name).includes(needle)) : roleFiltered;
      const source = byNeedle.length > 0 ? byNeedle : roleFiltered;
      const rawNames = source.map((cp) => String(cp?.name ?? "").trim()).filter(Boolean);
      return Array.from(new Set(rawNames));
    },
    [counterparties]
  );

  return { getSupplierSuggestions };
}
