import { useCallback } from "react";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { BuyerGroup, LineMeta } from "../buyer.types";

type PickedMap = Record<string, boolean>;
type MetaMap = Record<string, LineMeta>;

type Setter<T> = (v: T | ((prev: T) => T)) => void;
type RefLike<T> = { current: T };
type BuyerInboxOfferFallback = BuyerInboxRow & {
  last_offer_supplier?: string | null;
  last_offer_price?: number | null;
};

export function useBuyerSelectionActions({
  setPicked,
  setMeta,
  pickedRef,
  showToast,
}: {
  setPicked: Setter<PickedMap>;
  setMeta: Setter<MetaMap>;
  pickedRef: RefLike<PickedMap>;
  showToast: (msg: string, ms?: number) => void;
}) {
  const togglePick = useCallback((ri: BuyerInboxRow) => {
    const key = String(ri.request_item_id ?? "").trim();
    if (!key) return;
    setPicked((prev) => {
      const nextPicked = !prev[key];
      if (nextPicked) {
        const fallbackRow = ri as BuyerInboxOfferFallback;
        const fallbackSupplier = String(fallbackRow.last_offer_supplier ?? "").trim();
        const fallbackPriceRaw = fallbackRow.last_offer_price;
        const fallbackPrice =
          typeof fallbackPriceRaw === "number" && Number.isFinite(fallbackPriceRaw)
            ? String(fallbackPriceRaw)
            : "";
        setMeta((prevMeta) => {
          if (prevMeta[key]?.supplier || prevMeta[key]?.price) return prevMeta;
          if (!fallbackSupplier && !fallbackPrice) return prevMeta;
          return {
            ...prevMeta,
            [key]: {
              ...(prevMeta[key] || {}),
              supplier: fallbackSupplier || prevMeta[key]?.supplier,
              price: fallbackPrice || prevMeta[key]?.price,
            },
          };
        });
      }
      return { ...prev, [key]: nextPicked };
    });
  }, [setPicked, setMeta]);

  const clearPick = useCallback(() => {
    setPicked({});
    requestAnimationFrame(() => {
      showToast("Выбор снят");
    });
  }, [setPicked, showToast]);

  const setLineMeta = useCallback((id: string, patch: Partial<LineMeta>) => {
    const key = String(id || "").trim();
    if (!key) return;
    setMeta((prev) => {
      const next = { ...prev, [key]: { ...(prev[key] || {}), ...patch } };
      if (__DEV__) {
        console.info("[buyer.meta] setLineMeta", {
          requestItemId: key,
          patch,
          nextMeta: next[key],
        });
      }
      return next;
    });
  }, [setMeta]);

  const applyToPickedInGroup = useCallback((g: BuyerGroup, patch: Partial<LineMeta>) => {
    setMeta((prev) => {
      const next = { ...prev };
      const pickedNow = pickedRef.current;

      for (const it of g.items) {
        const id = String(it?.request_item_id || "");
        if (!id) continue;
        if (!pickedNow[id]) continue;
        next[id] = { ...(next[id] || {}), ...patch };
      }
      return next;
    });
  }, [setMeta, pickedRef]);

  return { togglePick, clearPick, setLineMeta, applyToPickedInGroup };
}
