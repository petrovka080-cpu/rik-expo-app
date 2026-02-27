// src/screens/warehouse/warehouse.availability.ts
// Shared availability lookup — eliminates 3× copy-paste of getAvailableByCode / getAvailableByCodeUom
import { useMemo, useCallback } from "react";
import type { StockRow } from "./warehouse.types";
import { nz, normMatCode } from "./warehouse.utils";

export type AvailabilityApi = {
    getAvailableByCode: (code: string) => number;
    getAvailableByCodeUom: (code: string, uomId: string | null) => number;
    getMaterialNameByCode: (code: string) => string | null;
};

export function useStockAvailability(
    stock: StockRow[],
    matNameByCode: Record<string, string>,
): AvailabilityApi {
    const getAvailableByCode = useCallback(
        (code: string): number => {
            const key = normMatCode(code);
            if (!key) return 0;
            let sum = 0;
            for (const row of stock) {
                const rowKey = normMatCode(
                    String((row as any).rik_code ?? (row as any).code ?? (row as any).material_code ?? ""),
                );
                if (rowKey !== key) continue;
                sum += nz((row as any).qty_available, 0);
            }
            return sum;
        },
        [stock],
    );

    const getAvailableByCodeUom = useCallback(
        (code: string, uomId: string | null): number => {
            const key = normMatCode(code);
            const u = String(uomId ?? "").trim().toLowerCase();
            if (!key) return 0;
            let sum = 0;
            for (const row of stock) {
                const rowKey = normMatCode(
                    String((row as any).rik_code ?? (row as any).code ?? (row as any).material_code ?? ""),
                );
                if (rowKey !== key) continue;
                const rowU = String((row as any).uom_id ?? "").trim().toLowerCase();
                if (u && rowU !== u) continue;
                sum += nz((row as any).qty_available, 0);
            }
            return sum;
        },
        [stock],
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
