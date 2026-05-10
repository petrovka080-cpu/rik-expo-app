import { useCallback, useEffect, useRef, useState } from "react";

import {
  SUBCONTRACT_DEFAULT_PAGE_SIZE,
  listForemanSubcontractsPage,
  mergeSubcontractPages,
  type Subcontract,
} from "../subcontracts/subcontracts.shared";

export type ResolveBuyerSubcontractUserId = () => Promise<string | null>;

export type BuyerSubcontractWarningScope =
  | "load error"
  | "contractor_id attach skipped"
  | "contractor_id attach exception";

type BuyerSubcontractDataModelParams = {
  resolveCurrentUserId: ResolveBuyerSubcontractUserId;
  warn: (scope: BuyerSubcontractWarningScope, error: unknown) => void;
};

export type BuyerSubcontractLoad = (options?: { reset?: boolean }) => Promise<void>;

export function useBuyerSubcontractDataModel({
  resolveCurrentUserId,
  warn,
}: BuyerSubcontractDataModelParams) {
  const [items, setItems] = useState<Subcontract[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const nextOffsetRef = useRef(0);
  const loadSeqRef = useRef(0);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);

  const load = useCallback<BuyerSubcontractLoad>(async (options) => {
    const reset = options?.reset !== false;
    const offset = reset ? 0 : nextOffsetRef.current;
    const seq = ++loadSeqRef.current;
    if (!reset && (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current)) return;
    if (reset) {
      loadingRef.current = true;
      setLoading(true);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    try {
      const uid = await resolveCurrentUserId();
      if (!uid) return;
      const page = await listForemanSubcontractsPage(uid, {
        offset,
        pageSize: SUBCONTRACT_DEFAULT_PAGE_SIZE,
      });
      if (seq !== loadSeqRef.current) return;
      nextOffsetRef.current = page.nextOffset ?? offset;
      hasMoreRef.current = page.hasMore;
      setHasMore(page.hasMore);
      setItems((current) => (reset ? page.items : mergeSubcontractPages(current, page.items)));
    } catch (error) {
      warn("load error", error);
    } finally {
      if (seq === loadSeqRef.current) {
        if (reset) {
          loadingRef.current = false;
          setLoading(false);
        } else {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    }
  }, [resolveCurrentUserId, warn]);

  useEffect(() => {
    void load({ reset: true });
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ reset: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onEndReached = useCallback(() => {
    void load({ reset: false });
  }, [load]);

  return {
    items,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    load,
    onRefresh,
    onEndReached,
  };
}
