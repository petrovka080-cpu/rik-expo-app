import { useEffect, useState } from "react";

import {
  loadBuyerCounterpartyData,
  type BuyerCounterpartySourceDiag,
  type BuyerCounterpartySuggestion,
} from "../buyer.counterparty.data";
import type { Supplier } from "../../../lib/catalog_api";

export type { BuyerCounterpartySourceDiag, BuyerCounterpartySuggestion } from "../buyer.counterparty.data";

const logBuyerSuppliersDiag = (diag: BuyerCounterpartySourceDiag) => {
  if (!__DEV__) return;
  if (!diag.ok) {
    console.warn(
      `[buyer.suppliers] source=${diag.source} ok=false query=${diag.query} error=${diag.error ?? "unknown"} rows=${diag.rows}`,
    );
    return;
  }
  console.info(`[buyer.suppliers] source=${diag.source} ok=true rows=${diag.rows}`);
};

const warnBuyerSuppliers = (error: unknown) => {
  if (__DEV__) {
    console.warn("[buyer.suppliers] load failed", error);
  }
};

export function useBuyerSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [counterparties, setCounterparties] = useState<BuyerCounterpartySuggestion[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);
  const [sourceDiag, setSourceDiag] = useState<BuyerCounterpartySourceDiag[]>([]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (suppliersLoaded) return;
      try {
        const result = await loadBuyerCounterpartyData();
        if (cancelled) return;

        setSourceDiag(result.sourceDiag);
        for (const diag of result.sourceDiag) logBuyerSuppliersDiag(diag);
        setSuppliers(result.suppliers);
        setCounterparties(result.counterparties);
      } catch (error) {
        if (!cancelled) warnBuyerSuppliers(error);
      } finally {
        if (!cancelled) setSuppliersLoaded(true);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [suppliersLoaded]);

  const hasAnyOptions = counterparties.length > 0;
  const hasHardFailure = suppliersLoaded && !hasAnyOptions;
  return { suppliers, counterparties, sourceDiag, hasAnyOptions, hasHardFailure };
}
