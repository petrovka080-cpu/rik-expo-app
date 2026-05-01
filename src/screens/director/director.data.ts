import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSupabaseClient } from "../../lib/dbContract.types";
import { REQUEST_PENDING_EN, REQUEST_PENDING_STATUS } from "../../lib/api/requests.status";
import { loadPagedRowsWithCeiling, type PagedQuery } from "../../lib/api/_core";
import { shortId } from "./director.helpers";
import { reportDirectorBoundary } from "./director.observability";
import { fetchDirectorPendingProposalWindow } from "./director.proposals.repo";
import { fetchDirectorPendingRows } from "./director.repository";
import { useDirectorUiStore } from "./directorUi.store";
import type { PendingRow, ProposalHead, RequestMeta } from "./director.types";

type Deps = {
  supabase: AppSupabaseClient;
};

const errText = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error ?? "");
};

const warnDirectorData = (
  scope:
    | "preloadRequestMeta"
    | "preloadProposalRequestIds"
    | "preloadDisplayNos"
    | "list_director_items_stable"
    | "list_director_items_stable_fallback"
    | "proposals list",
  error: unknown,
  level: "warn" | "error" = "warn",
) => {
  reportDirectorBoundary({
    surface: "data",
    scope: `director.data.${scope}`,
    event: `${scope}_failed`,
    error,
    kind: level === "error" ? "degraded_fallback" : "soft_failure",
    category: "fetch",
    sourceKind: "director:data",
    extra: {
      message: errText(error),
      level,
    },
  });
};

const normalizeDirectorPendingRows = (rows: Record<string, unknown>[]): PendingRow[] =>
  rows.map((r, idx: number) => ({
    id: idx,
    request_id: String(r.request_id ?? ""),
    request_item_id:
      r.request_item_id != null
        ? String(r.request_item_id)
        : r.id != null
          ? String(r.id)
          : null,
    name_human: String(r.name_human ?? ""),
    qty: Number(r.qty ?? 0),
    uom: r.uom != null ? String(r.uom) : null,
    rik_code: r.rik_code != null ? String(r.rik_code) : null,
    app_code: r.app_code != null ? String(r.app_code) : null,
    item_kind: r.item_kind != null ? String(r.item_kind) : null,
    note: r.note != null ? String(r.note) : null,
  }));

const DIRECTOR_PENDING_ITEM_STATUSES = new Set([REQUEST_PENDING_STATUS, "У директора", REQUEST_PENDING_EN]);
const DIRECTOR_EXPECTED_REQUEST_STATUSES = [REQUEST_PENDING_STATUS, REQUEST_PENDING_EN] as const;
const DIRECTOR_PROPOSALS_WINDOW_SIZE = 10;
const DIRECTOR_DATA_FALLBACK_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 };

type PagedDirectorDataResult<T> = {
  data: T[] | null;
  error: unknown;
};

type PagedDirectorDataQuery<T> = {
  range: (from: number, to: number) => Promise<PagedDirectorDataResult<T>>;
};

const loadPagedDirectorDataRows = async <T,>(
  queryFactory: () => PagedDirectorDataQuery<T> | PagedQuery<T>,
): Promise<PagedDirectorDataResult<T>> => {
  return loadPagedRowsWithCeiling(queryFactory, DIRECTOR_DATA_FALLBACK_PAGE_DEFAULTS);
};

const logDirectorFetchFilters = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[director fetch filters]", payload);
};

export function useDirectorData({ supabase }: Deps) {
  const fetchTicket = useRef(0);
  const lastNonEmptyRows = useRef<PendingRow[]>([]);
  const lastFetchedRowsAt = useRef<number>(0);
  const lastFetchedPropsAt = useRef<number>(0);
  const propsFetchSeqRef = useRef(0);
  const propsAppendInFlightRef = useRef<Promise<void> | null>(null);
  const propsLoadedHeadsRef = useRef(0);
  const propsHasMoreRef = useRef(false);

  const [rows, setRows] = useState<PendingRow[]>([]);
  const loadingRows = useDirectorUiStore((state) => state.loadingRows);
  const setLoadingRows = useDirectorUiStore((state) => state.setLoadingRows);

  const [propsHeads, setPropsHeads] = useState<ProposalHead[]>([]);
  const [buyerPropsCount, setBuyerPropsCount] = useState<number>(0);
  const [buyerPositionsCount, setBuyerPositionsCount] = useState<number>(0);
  const [propItemsCount, setPropItemsCount] = useState<Record<string, number>>({});
  const loadingProps = useDirectorUiStore((state) => state.loadingProps);
  const setLoadingProps = useDirectorUiStore((state) => state.setLoadingProps);
  const [propsHasMore, setPropsHasMore] = useState(false);
  const [loadingPropsMore, setLoadingPropsMore] = useState(false);

  const [displayNoByReq, setDisplayNoByReq] = useState<Record<string, string>>({});
  const [submittedAtByReq, setSubmittedAtByReq] = useState<Record<string, string>>({});
  const displayNoByReqRef = useRef<Record<string, string>>({});
  const submittedAtByReqRef = useRef<Record<string, string>>({});
  useEffect(() => { displayNoByReqRef.current = displayNoByReq; }, [displayNoByReq]);
  useEffect(() => { submittedAtByReqRef.current = submittedAtByReq; }, [submittedAtByReq]);

  const [reqMetaById, setReqMetaById] = useState<Record<string, RequestMeta>>({});
  const reqMetaByIdRef = useRef<Record<string, RequestMeta>>({});
  useEffect(() => { reqMetaByIdRef.current = reqMetaById; }, [reqMetaById]);

  const [reqItemNoteById, setReqItemNoteById] = useState<Record<string, string>>({});
  const reqItemNoteByIdRef = useRef<Record<string, string>>({});
  useEffect(() => { reqItemNoteByIdRef.current = reqItemNoteById; }, [reqItemNoteById]);

  const [propReqIdsByProp, setPropReqIdsByProp] = useState<Record<string, string[]>>({});
  const propReqIdsByPropRef = useRef<Record<string, string[]>>({});
  useEffect(() => { propReqIdsByPropRef.current = propReqIdsByProp; }, [propReqIdsByProp]);
  const requestDisplaySelectModeRef = useRef<"request_no+display_no" | "display_no_only">("request_no+display_no");
  const requestNoCapabilityInFlightRef = useRef<Promise<"request_no+display_no" | "display_no_only"> | null>(null);

  const resolveRequestDisplaySelectMode = useCallback(async (): Promise<"request_no+display_no" | "display_no_only"> => {
    if (requestDisplaySelectModeRef.current === "display_no_only") return "display_no_only";
    if (requestNoCapabilityInFlightRef.current) return requestNoCapabilityInFlightRef.current;

    requestNoCapabilityInFlightRef.current = (async () => {
      try {
        const q = await supabase.from("requests").select("*").limit(1);
        if (q.error) throw q.error;
        const first =
          Array.isArray(q.data) && q.data.length ? (q.data[0] as Record<string, unknown>) : null;
        const hasRequestNo = !!first && Object.prototype.hasOwnProperty.call(first, "request_no");
        requestDisplaySelectModeRef.current = hasRequestNo ? "request_no+display_no" : "display_no_only";
      } catch (error) {
        reportDirectorBoundary({
          surface: "data",
          scope: "director.data.resolveRequestDisplaySelectMode",
          event: "request_display_select_mode_probe_failed",
          error,
          kind: "degraded_fallback",
          category: "fetch",
          sourceKind: "table:requests",
        });
        requestDisplaySelectModeRef.current = "display_no_only";
      } finally {
        requestNoCapabilityInFlightRef.current = null;
      }
      return requestDisplaySelectModeRef.current;
    })();

    return requestNoCapabilityInFlightRef.current;
  }, [supabase]);

  const preloadRequestMeta = useCallback(async (reqIds: string[]) => {
    const uniq = Array.from(new Set((reqIds || []).map(String).filter(Boolean)));
    const existing = reqMetaByIdRef.current || {};
    const need = uniq.filter((id) => !existing[id]);
    if (!need.length) return;

    try {
      const primaryQuery = await loadPagedDirectorDataRows<Record<string, unknown>>(() =>
        supabase
          .from("requests")
          .select("id, object_name, object, level_code, system_code, zone_code, site_address_snapshot, note, comment")
          .in("id", need)
          .order("id", { ascending: true }) as unknown as PagedQuery<Record<string, unknown>>
      );
      const fallbackQuery = primaryQuery.error
        ? await loadPagedDirectorDataRows<Record<string, unknown>>(() =>
            supabase
              .from("requests")
              .select("id, object_name, level_code, system_code, zone_code, note")
              .in("id", need)
              .order("id", { ascending: true }) as unknown as PagedQuery<Record<string, unknown>>
          )
        : null;
      const q = fallbackQuery ?? primaryQuery;

      if (q.error) throw q.error;

      const next: Record<string, RequestMeta> = {};
      const rowsTyped = (q.data || []) as {
        id?: string | number | null;
        object_name?: string | null;
        object?: string | null;
        level_code?: string | null;
        system_code?: string | null;
        zone_code?: string | null;
        site_address_snapshot?: string | null;
        note?: string | null;
        comment?: string | null;
      }[];
      rowsTyped.forEach((r) => {
        const id = String(r.id || "").trim();
        if (!id) return;
        next[id] = {
          object_name: r.object_name ?? null,
          object: r.object ?? null,
          level_code: r.level_code ?? null,
          system_code: r.system_code ?? null,
          zone_code: r.zone_code ?? null,
          site_address_snapshot: r.site_address_snapshot ?? null,
          note: r.note ?? null,
          comment: r.comment ?? null,
        };
      });

      if (Object.keys(next).length) {
        setReqMetaById((prev) => ({ ...prev, ...next }));
      }
    } catch (e) {
      warnDirectorData("preloadRequestMeta", e);
    }
  }, [supabase]);

  const preloadProposalRequestIds = useCallback(async (proposalId: string, requestItemIds: (string | null)[]) => {
    const pid = String(proposalId || "").trim();
    if (!pid) return;
    if (propReqIdsByPropRef.current?.[pid]?.length) return;

    const ids = Array.from(new Set((requestItemIds || []).map((x) => String(x || "").trim()).filter(Boolean)));
    if (!ids.length) return;

    try {
      const q = await loadPagedRowsWithCeiling<{ id?: string | number | null; request_id?: string | number | null }>(
        () =>
          supabase
            .from("request_items")
            .select("id, request_id")
            .in("id", ids)
            .order("id", { ascending: true }) as unknown as PagedQuery<{
              id?: string | number | null;
              request_id?: string | number | null;
            }>,
        DIRECTOR_DATA_FALLBACK_PAGE_DEFAULTS,
      );

      if (q.error) throw q.error;

      const rowsTyped = (q.data || []) as { request_id?: string | number | null }[];
      const reqIds = Array.from(
        new Set(rowsTyped.map((r) => String(r.request_id || "").trim()).filter(Boolean)),
      ) as string[];
      if (!reqIds.length) return;

      setPropReqIdsByProp((prev) => ({ ...prev, [pid]: reqIds }));
      await preloadRequestMeta(reqIds);
    } catch (e) {
      warnDirectorData("preloadProposalRequestIds", e);
    }
  }, [supabase, preloadRequestMeta]);

  const labelForRequest = useCallback((rid: number | string | null | undefined, fallbackDocNo?: string | null) => {
    const key = String(rid ?? "");
    if (fallbackDocNo && fallbackDocNo.trim()) return fallbackDocNo.trim();
    const d = displayNoByReq[key];
    if (d && d.trim()) return d.trim();
    return `#${shortId(rid)}`;
  }, [displayNoByReq]);

  const preloadDisplayNos = useCallback(async (reqIds: (number | string)[]) => {
    const needed = Array.from(
      new Set(
        reqIds
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
          .filter((id) => displayNoByReqRef.current[id] == null || submittedAtByReqRef.current[id] == null),
      ),
    );
    if (!needed.length) return;

    try {
      await resolveRequestDisplaySelectMode();
      let q;
      if (requestDisplaySelectModeRef.current === "display_no_only") {
        q = await supabase
          .from("requests")
          .select("id, display_no, submitted_at")
          .in("id", needed);
      } else {
        q = await supabase
          .from("requests")
          .select("id, request_no, display_no, submitted_at")
          .in("id", needed);
      }
      if (q.error && requestDisplaySelectModeRef.current !== "display_no_only") {
        q = await supabase
          .from("requests")
          .select("id, display_no, submitted_at")
          .in("id", needed);
        if (!q.error) {
          requestDisplaySelectModeRef.current = "display_no_only";
        }
      }
      if (q.error) throw q.error;

      const mapDn: Record<string, string> = {};
      const mapSub: Record<string, string> = {};

      const rowsTyped = (q.data ?? []) as {
        id?: string | number | null;
        request_no?: string | null;
        display_no?: string | null;
        submitted_at?: string | null;
      }[];
      for (const r of rowsTyped) {
        const id = String(r.id ?? "").trim();
        if (!id) continue;

        const dn = String(r.request_no ?? r.display_no ?? "").trim();
        const sa = r.submitted_at ?? null;

        if (dn) mapDn[id] = dn;
        if (sa) mapSub[id] = String(sa);
      }

      if (Object.keys(mapDn).length) setDisplayNoByReq((prev) => ({ ...prev, ...mapDn }));
      if (Object.keys(mapSub).length) setSubmittedAtByReq((prev) => ({ ...prev, ...mapSub }));
    } catch (e) {
      warnDirectorData("preloadDisplayNos", e);
    }
  }, [supabase, resolveRequestDisplaySelectMode]);

  const loadDirectorRowsFallback = useCallback(async (): Promise<PendingRow[]> => {
    logDirectorFetchFilters({
      sourcePath: "director.data.loadDirectorRowsFallback",
      requestSelector: "submitted_at:not_null",
      expectedRequestStatuses: Array.from(DIRECTOR_EXPECTED_REQUEST_STATUSES),
      visibleItemStatuses: Array.from(DIRECTOR_PENDING_ITEM_STATUSES),
    });
    const reqs = await loadPagedDirectorDataRows<{
      id?: string | number | null;
      submitted_at?: string | null;
      status?: string | null;
    }>(() =>
      supabase
        .from("requests")
        .select("id, submitted_at, status")
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .order("id", { ascending: false }) as unknown as PagedDirectorDataQuery<{
        id?: string | number | null;
        submitted_at?: string | null;
        status?: string | null;
      }>,
    );
    if (reqs.error) throw reqs.error;

    const reqRows = (reqs.data ?? [])
      .map((r) => ({
        id: String(r.id ?? "").trim(),
        submitted_at: r.submitted_at ? String(r.submitted_at) : null,
        status: r.status ? String(r.status) : null,
      }))
      .filter((r) => r.id);
    reqRows.sort((a, b) => {
      const aTs = a.submitted_at ? Date.parse(a.submitted_at) : 0;
      const bTs = b.submitted_at ? Date.parse(b.submitted_at) : 0;
      return bTs - aTs;
    });

    const reqIds = reqRows.map((r) => r.id);
    if (!reqIds.length) return [];

    const reqRank = new Map<string, number>(reqRows.map((r, idx) => [r.id, idx]));

    const items = await loadPagedDirectorDataRows<Record<string, unknown>>(() =>
      supabase
        .from("request_items")
        .select("id,request_id,name_human,qty,uom,rik_code,app_code,item_kind,note,status")
        .in("request_id", reqIds)
        .in("status", Array.from(DIRECTOR_PENDING_ITEM_STATUSES))
        .order("request_id", { ascending: true })
        .order("id", { ascending: true }) as unknown as PagedDirectorDataQuery<Record<string, unknown>>,
    );
    if (items.error) throw items.error;

    const normalized = normalizeDirectorPendingRows((items.data ?? []) as Record<string, unknown>[]);
    normalized.sort((a, b) => {
      const aRank = reqRank.get(String(a.request_id ?? "").trim()) ?? Number.MAX_SAFE_INTEGER;
      const bRank = reqRank.get(String(b.request_id ?? "").trim()) ?? Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return a.id - b.id;
    });

    logDirectorFetchFilters({
      sourcePath: "director.data.loadDirectorRowsFallback",
      requestCount: reqRows.length,
      requestStatusesSample: Array.from(
        new Set(reqRows.map((row) => String(row.status ?? "").trim()).filter(Boolean)),
      ).slice(0, 8),
      syncResultLineCount: normalized.length,
    });

    return normalized;
  }, [supabase]);

  const fetchRows = useCallback(async (force = false) => {
    const now = Date.now();
    // Skip if recently fetched and not forced
    if (!force && rows.length > 0 && now - lastFetchedRowsAt.current < 20000) return;

    const my = ++fetchTicket.current;
    setLoadingRows(true);
    try {
      let normalized: PendingRow[] = [];

      try {
        const result = await fetchDirectorPendingRows({ supabase });
        normalized = result.rows;
      } catch (e) {
        warnDirectorData("list_director_items_stable", e, "error");
        normalized = await loadDirectorRowsFallback();
      }

      lastNonEmptyRows.current = normalized;
      lastFetchedRowsAt.current = Date.now();
      if (my === fetchTicket.current) setRows(normalized);

      const ids = Array.from(new Set(normalized.map((r) => String(r.request_id ?? "").trim()).filter(Boolean)));
      if (ids.length) await preloadDisplayNos(ids);
    } catch (e) {
      warnDirectorData("list_director_items_stable", e, "error");
    } finally {
      if (my === fetchTicket.current) setLoadingRows(false);
    }
  }, [loadDirectorRowsFallback, preloadDisplayNos, rows.length, setLoadingRows, supabase]);

  const applyProposalWindow = useCallback(
    (result: Awaited<ReturnType<typeof fetchDirectorPendingProposalWindow>>, reset: boolean) => {
      propsLoadedHeadsRef.current = result.meta.offsetHeads + result.meta.returnedHeadCount;
      propsHasMoreRef.current = result.meta.hasMore;
      setPropsHasMore(result.meta.hasMore);
      setBuyerPropsCount(result.meta.totalHeadCount);
      setBuyerPositionsCount(result.meta.totalPositionsCount);
      setPropItemsCount((prev) => (reset ? result.itemCounts : { ...prev, ...result.itemCounts }));
      setPropsHeads((prev) => {
        if (reset) return result.heads;
        const seen = new Set(prev.map((head) => String(head.id)));
        const appended = result.heads.filter((head) => !seen.has(String(head.id)));
        return appended.length ? [...prev, ...appended] : prev;
      });
    },
    [],
  );

  const fetchProps = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && propsHeads.length > 0 && now - lastFetchedPropsAt.current < 30000) return;

    const my = ++propsFetchSeqRef.current;
    propsAppendInFlightRef.current = null;
    setLoadingPropsMore(false);
    setLoadingProps(true);
    try {
      const result = await fetchDirectorPendingProposalWindow({
        supabase,
        offsetHeads: 0,
        limitHeads: DIRECTOR_PROPOSALS_WINDOW_SIZE,
      });
      if (my !== propsFetchSeqRef.current) return;
      applyProposalWindow(result, true);
      lastFetchedPropsAt.current = Date.now();
    } catch (e) {
      warnDirectorData("proposals list", e, "error");
    } finally {
      if (my === propsFetchSeqRef.current) setLoadingProps(false);
    }
  }, [applyProposalWindow, propsHeads.length, setLoadingProps, supabase]);

  const loadMoreProps = useCallback(async () => {
    if (loadingProps || loadingPropsMore) return propsAppendInFlightRef.current ?? undefined;
    if (!propsHasMoreRef.current) return;
    if (propsAppendInFlightRef.current) return propsAppendInFlightRef.current;

    let currentPromise: Promise<void> | null = null;
    setLoadingPropsMore(true);
    currentPromise = (async () => {
      try {
        const result = await fetchDirectorPendingProposalWindow({
          supabase,
          offsetHeads: propsLoadedHeadsRef.current,
          limitHeads: DIRECTOR_PROPOSALS_WINDOW_SIZE,
        });
        applyProposalWindow(result, false);
      } catch (e) {
        warnDirectorData("proposals list", e, "error");
      } finally {
        if (propsAppendInFlightRef.current === currentPromise) {
          propsAppendInFlightRef.current = null;
        }
        setLoadingPropsMore(false);
      }
    })();
    propsAppendInFlightRef.current = currentPromise;
    return currentPromise;
  }, [applyProposalWindow, loadingProps, loadingPropsMore, supabase]);

  return {
    rows,
    setRows,
    loadingRows,
    propsHeads,
    buyerPropsCount,
    buyerPositionsCount,
    propItemsCount,
    propsHasMore,
    loadingPropsMore,
    loadingProps,
    submittedAtByReq,
    reqMetaByIdRef,
    reqItemNoteByIdRef,
    propReqIdsByPropRef,
    setReqItemNoteById: setReqItemNoteById as React.Dispatch<React.SetStateAction<Record<string, string>>>,
    labelForRequest,
    preloadProposalRequestIds,
    fetchRows,
    fetchProps,
    loadMoreProps,
  };
}
