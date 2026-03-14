import { useMemo } from "react";
import type { ReqHeadRow, StockRow, WarehouseStockLike } from "../warehouse.types";
import { matchQuerySmart, nz } from "../warehouse.utils";

export function useWarehouseDerived(params: {
  reqHeads: ReqHeadRow[];
  stock: StockRow[];
  stockSearchDeb: string;
}) {
  const { reqHeads, stock, stockSearchDeb } = params;

  const stockRows = stock as WarehouseStockLike[];

  const sortedReqHeads = useMemo(() => {
    return [...reqHeads].sort((a, b) => {
      const readyA = Math.max(0, Number(a.ready_cnt ?? 0));
      const readyB = Math.max(0, Number(b.ready_cnt ?? 0));
      if (readyA > 0 && readyB === 0) return -1;
      if (readyA === 0 && readyB > 0) return 1;
      return 0;
    });
  }, [reqHeads]);

  const stockFiltered = useMemo(() => {
    const baseAll = stockRows || [];

    // PROD: by default hide zero-availability rows.
    const base = baseAll.filter((r) => nz(r.qty_available, 0) > 0);

    const qRaw = String(stockSearchDeb ?? "").trim();
    if (!qRaw) return base;

    const out: StockRow[] = [];
    for (const r of base) {
      const code = String(r?.code ?? "");
      const name = String(r?.name ?? "");
      const uom = String(r?.uom_id ?? "");
      const hay = `${code} ${name} ${uom} `;

      if (matchQuerySmart(hay, qRaw)) out.push(r);
      if (out.length >= 400) break;
    }
    return out;
  }, [stockRows, stockSearchDeb]);

  const matNameByCode = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of stockRows || []) {
      const code = String(r.rik_code ?? r.code ?? r.material_code ?? "")
        .trim()
        .toUpperCase();

      const name = String(r.name_human ?? r.name ?? r.item_name_ru ?? "").trim();

      if (code && name && !m[code]) m[code] = name;
    }
    return m;
  }, [stockRows]);

  return {
    sortedReqHeads,
    stockFiltered,
    matNameByCode,
  };
}
