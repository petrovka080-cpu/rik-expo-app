import { useCallback, useMemo } from "react";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { BuyerGroup, LineMeta } from "../buyer.types";
import { lineTotal as lineTotalHelper, requestSum as requestSumHelper } from "../buyer.helpers";

type MetaMap = Record<string, LineMeta>;

export function useBuyerTotals({
  rows,
  pickedIds,
  meta,
}: {
  rows: BuyerInboxRow[];
  pickedIds: string[];
  meta: MetaMap;
}) {
  const lineTotal = useCallback((it: BuyerInboxRow) => {
    const key = String(it.request_item_id ?? "");
    return lineTotalHelper(it, meta?.[key]?.price);
  }, [meta]);

  const requestSum = useCallback((g: BuyerGroup) => {
    return requestSumHelper(g.items, meta);
  }, [meta]);

  const pickedTotal = useMemo(() => {
    let sum = 0;
    const set = new Set(pickedIds);
    for (const r of rows) {
      if (r.request_item_id && set.has(r.request_item_id)) {
        sum += lineTotal(r);
      }
    }
    return sum;
  }, [pickedIds, rows, lineTotal]);

  return { lineTotal, requestSum, pickedTotal };
}
