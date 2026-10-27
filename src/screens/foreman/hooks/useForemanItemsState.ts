import { useCallback, useEffect, useRef, useState } from 'react';
import {
    listRequestItems,
    type ReqItemRow,
    requestCreateDraft,
    setLocalDraftId,
} from '../../../lib/catalog_api';
import { ridStr } from '../foreman.helpers';
import type { RequestDraftMeta } from '../foreman.types';

const warnForemanItemsState = (error: unknown) => {
    if (__DEV__) {
        console.error('[Foreman] loadItems error:', error);
    }
};

export function useForemanItemsState(formatQtyInput: (v?: number | null) => string) {
    const [requestId, setRequestId] = useState<string>("");
    const [items, setItems] = useState<ReqItemRow[]>([]);
    const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
    const [qtyBusyMap, setQtyBusyMap] = useState<Record<string, boolean>>({});
    const localHydratedRef = useRef(false);
    const requestIdRef = useRef("");
    const loadItemsRequestSeqRef = useRef(0);

    useEffect(() => {
        requestIdRef.current = ridStr(requestId);
    }, [requestId]);

    const loadItems = useCallback(async (
        ridOverride?: string | number | null,
        options?: { forceRemote?: boolean },
    ) => {
        const requestSeq = ++loadItemsRequestSeqRef.current;
        const target = ridOverride ?? requestIdRef.current;
        const key = ridStr(target);
        if (!key) {
            if (localHydratedRef.current && !options?.forceRemote) return;
            setItems([]);
            return;
        }
        try {
            const rows = await listRequestItems(key);
            if (requestSeq !== loadItemsRequestSeqRef.current) return;
            localHydratedRef.current = false;
            setItems(Array.isArray(rows) ? rows : []);
        } catch (e) {
            if (requestSeq !== loadItemsRequestSeqRef.current) return;
            warnForemanItemsState(e);
            setItems([]);
        }
    }, []);

    // Update quantity drafts when items change
    useEffect(() => {
        setQtyDrafts((prev) => {
            const next: Record<string, string> = {};
            for (const row of items) {
                const key = String(row.id);
                const prevVal = prev[key];
                next[key] = prevVal !== undefined ? prevVal : formatQtyInput(row.qty);
            }
            return next;
        });
        setQtyBusyMap((prev) => {
            const next: Record<string, boolean> = {};
            for (const row of items) {
                const key = String(row.id);
                if (prev[key]) next[key] = prev[key];
            }
            return next;
        });
    }, [items, formatQtyInput]);

    const setRowBusy = useCallback((itemId: string | number, value: boolean) => {
        const key = String(itemId);
        setQtyBusyMap((prev) => ({ ...prev, [key]: value }));
    }, []);

    const removeRowLocal = useCallback((itemId: string | number) => {
        const key = String(itemId);
        setItems((prev) => prev.filter((x) => String(x.id) !== key));
        setQtyDrafts((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    const hydrateLocalDraft = useCallback((payload: {
        requestId?: string | null;
        items: ReqItemRow[];
        qtyDrafts?: Record<string, string>;
    }) => {
        loadItemsRequestSeqRef.current += 1;
        localHydratedRef.current = true;
        setRequestId(ridStr(payload.requestId));
        setItems(Array.isArray(payload.items) ? payload.items : []);
        if (payload.qtyDrafts) {
            setQtyDrafts({ ...payload.qtyDrafts });
        }
    }, []);

    const clearItemsState = useCallback(() => {
        loadItemsRequestSeqRef.current += 1;
        localHydratedRef.current = false;
        requestIdRef.current = "";
        setRequestId("");
        setItems([]);
        setQtyDrafts({});
        setQtyBusyMap({});
    }, []);

    const ensureAndGetId = useCallback(async (meta: RequestDraftMeta, setDisplayNo?: (id: string, no: string) => void) => {
        const existing = ridStr(requestId);
        if (existing) return existing;

        const created = await requestCreateDraft(meta);
        if (created?.id) {
            const idStr = String(created.id);
            setRequestId(idStr);
            setLocalDraftId(idStr);
            if (created.display_no && setDisplayNo) {
                setDisplayNo(idStr, created.display_no);
            }
            return idStr;
        }
        throw new Error('Failed to create draft');
    }, [requestId]);

    return {
        requestId,
        setRequestId,
        items,
        setItems,
        qtyDrafts,
        setQtyDrafts,
        qtyBusyMap,
        setQtyBusyMap,
        loadItems,
        setRowBusy,
        removeRowLocal,
        hydrateLocalDraft,
        clearItemsState,
        ensureAndGetId,
    };
}
