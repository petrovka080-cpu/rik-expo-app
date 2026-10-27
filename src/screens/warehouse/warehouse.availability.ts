import { useCallback } from "react";
import type { StockRow } from "./warehouse.types";
import { normMatCode } from "./warehouse.utils";

type StockLike = StockRow & {
  rik_code?: unknown;
  material_code?: unknown;
  code?: unknown;
};

export type AvailabilityApi = {
  getMaterialNameByCode: (code: string) => string | null;
};

export function useStockAvailability(
  _stock: StockLike[],
  matNameByCode: Record<string, string>,
): AvailabilityApi {
  const getMaterialNameByCode = useCallback(
    (code: string): string | null => {
      const key = normMatCode(code).toUpperCase();
      if (!key) return null;
      return matNameByCode[key] || null;
    },
    [matNameByCode],
  );

  return { getMaterialNameByCode };
}
