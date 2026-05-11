import { useCallback, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

import {
  listRequestItems,
  updateRequestMeta,
  type ReqItemRow,
  type RequestMetaPatch,
} from "../../../lib/catalog_api";
import { fetchForemanRequestDisplayLabel } from "../foreman.requests";
import {
  filterActiveDraftItems,
  trim,
} from "./foreman.subcontractController.model";

type DraftItemsLoadSeqRef = {
  current: number;
};

type UseForemanSubcontractRequestDraftLifecycleParams = {
  requestId: string;
  requestMetaPersistPatch: RequestMetaPatch;
  draftItemsLoadSeqRef: DraftItemsLoadSeqRef;
  setDraftItems: Dispatch<SetStateAction<ReqItemRow[]>>;
  setDisplayNo: Dispatch<SetStateAction<string>>;
  logDebugError: (scope: string, error: unknown) => void;
};

export function useForemanSubcontractRequestDraftLifecycle({
  requestId,
  requestMetaPersistPatch,
  draftItemsLoadSeqRef,
  setDraftItems,
  setDisplayNo,
  logDebugError,
}: UseForemanSubcontractRequestDraftLifecycleParams) {
  const loadDraftItems = useCallback(
    async (rid: string) => {
      const requestSeq = ++draftItemsLoadSeqRef.current;
      const id = trim(rid);
      if (!id) {
        setDraftItems([]);
        return;
      }
      try {
        const rows = await listRequestItems(id);
        if (requestSeq !== draftItemsLoadSeqRef.current) return;
        setDraftItems(filterActiveDraftItems(rows || []));
      } catch (error) {
        if (requestSeq !== draftItemsLoadSeqRef.current) return;
        logDebugError("loadDraftItems failed", error);
        setDraftItems([]);
      }
    },
    [draftItemsLoadSeqRef, logDebugError, setDraftItems],
  );

  useEffect(() => {
    void loadDraftItems(requestId);
  }, [requestId, loadDraftItems]);

  useEffect(() => {
    if (!requestId) return;
    const rid = trim(requestId);
    if (!rid) return;
    let cancelled = false;
    void (async () => {
      const ok = await updateRequestMeta(rid, requestMetaPersistPatch);
      if (!ok || cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId, requestMetaPersistPatch]);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    void (async () => {
      try {
        const label = await fetchForemanRequestDisplayLabel(requestId);
        if (cancelled || !label) return;
        if (label) setDisplayNo(label);
      } catch (error) {
        if (cancelled) return;
        logDebugError("request label refresh failed", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logDebugError, requestId, setDisplayNo]);

  return { loadDraftItems };
}
