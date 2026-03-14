// src/screens/warehouse/warehouse.availability.ts
// Shared availability lookup: eliminates duplicate getAvailableByCode/getAvailableByCodeUom logic.
import { useCallback, useMemo } from "react";
import type { StockRow } from "./warehouse.types";
import { nz, normMatCode } from "./warehouse.utils";

type StockLike = StockRow & {
  rik_code?: unknown;
  material_code?: unknown;
  qty_available?: unknown;
  uom_id?: unknown;
  code?: unknown;
};

export type AvailabilityApi = {
  getAvailableByCode: (code: string) => number;
  getAvailableByCodeUom: (code: string, uomId: string | null) => number;
  getMaterialNameByCode: (code: string) => string | null;
};

export function useStockAvailability(
  stock: StockLike[],
  matNameByCode: Record<string, string>,
): AvailabilityApi {
  const availableByCode = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of stock) {
      const rowKey = normMatCode(
        String(row.rik_code ?? row.code ?? row.material_code ?? ""),
      );
      if (!rowKey) continue;
      map[rowKey] = (map[rowKey] || 0) + nz(row.qty_available, 0);
    }
    return map;
  }, [stock]);

  const availableByCodeUom = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of stock) {
      const rowKey = normMatCode(
        String(row.rik_code ?? row.code ?? row.material_code ?? ""),
      );
      if (!rowKey) continue;
      const rowUom = String(row.uom_id ?? "").trim().toLowerCase();
      const key = `${rowKey}::${rowUom}`;
      map[key] = (map[key] || 0) + nz(row.qty_available, 0);
    }
    return map;
  }, [stock]);

  const getAvailableByCode = useCallback(
    (code: string): number => {
      const key = normMatCode(code);
      if (!key) return 0;
      return availableByCode[key] || 0;
    },
    [availableByCode],
  );

  const getAvailableByCodeUom = useCallback(
    (code: string, uomId: string | null): number => {
      const key = normMatCode(code);
      const u = String(uomId ?? "").trim().toLowerCase();
      if (!key) return 0;
      if (!u) return availableByCode[key] || 0;
      return availableByCodeUom[`${key}::${u}`] || 0;
    },
    [availableByCode, availableByCodeUom],
  );

  const getMaterialNameByCode = useCallback(
    (code: string): string | null => {
      const key = normMatCode(code).toUpperCase();
      if (!key) return null;
      return matNameByCode[key] || null;
    },
    [matNameByCode],
  );

  return { getAvailableByCode, getAvailableByCodeUom, getMaterialNameByCode };
}
