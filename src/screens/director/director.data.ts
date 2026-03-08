import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { listDirectorProposalsPending } from "../../lib/catalog_api";
import { shortId } from "./director.helpers";
import type { PendingRow, ProposalHead, ProposalItem, RequestMeta } from "./director.types";

type Deps = {
  supabase: any;
};

const errText = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error ?? "");
};

export function useDirectorData({ supabase }: Deps) {
  const fetchTicket = useRef(0);
  const lastNonEmptyRows = useRef<PendingRow[]>([]);
  const lastFetchedRowsAt = useRef<number>(0);
  const lastFetchedPropsAt = useRef<number>(0);

  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const [propsHeads, setPropsHeads] = useState<ProposalHead[]>([]);
  const [buyerPropsCount, setBuyerPropsCount] = useState<number>(0);
  const [buyerPositionsCount, setBuyerPositionsCount] = useState<number>(0);
  const [propItemsCount, setPropItemsCount] = useState<Record<string, number>>({});
  const [loadingProps, setLoadingProps] = useState(false);

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

  const preloadRequestMeta = useCallback(async (reqIds: string[]) => {
    const uniq = Array.from(new Set((reqIds || []).map(String).filter(Boolean)));
    const existing = reqMetaByIdRef.current || {};
    const need = uniq.filter((id) => !existing[id]);
    if (!need.length) return;

    try {
      const q = await supabase
        .from("requests")
        .select("id, object_name, object, level_code, system_code, zone_code, site_address_snapshot, note, comment")
        .in("id", need);

      if (q.error) throw q.error;

      const next: Record<string, RequestMeta> = {};
      const rowsTyped = (q.data || []) as Array<{
        id?: string | number | null;
        object_name?: string | null;
        object?: string | null;
        level_code?: string | null;
        system_code?: string | null;
        zone_code?: string | null;
        site_address_snapshot?: string | null;
        note?: string | null;
        comment?: string | null;
      }>;
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
      console.warn("[director] preloadRequestMeta:", errText(e));
    }
  }, [supabase]);

  const preloadProposalRequestIds = useCallback(async (proposalId: string, requestItemIds: (string | null)[]) => {
    const pid = String(proposalId || "").trim();
    if (!pid) return;
    if (propReqIdsByPropRef.current?.[pid]?.length) return;

    const ids = Array.from(new Set((requestItemIds || []).map((x) => String(x || "").trim()).filter(Boolean)));
    if (!ids.length) return;

    try {
      const q = await supabase
        .from("request_items")
        .select("id, request_id")
        .in("id", ids);

      if (q.error) throw q.error;

      const rowsTyped = (q.data || []) as Array<{ request_id?: string | number | null }>;
      const reqIds = Array.from(
        new Set(rowsTyped.map((r) => String(r.request_id || "").trim()).filter(Boolean)),
      ) as string[];
      if (!reqIds.length) return;

      setPropReqIdsByProp((prev) => ({ ...prev, [pid]: reqIds }));
      await preloadRequestMeta(reqIds);
    } catch (e) {
      console.warn("[director] preloadProposalRequestIds:", errText(e));
    }
  }, [supabase, preloadRequestMeta]);

  const labelForRequest = useCallback((rid: number | string | null | undefined, fallbackDocNo?: string | null) => {
    const key = String(rid ?? "");
    if (fallbackDocNo && fallbackDocNo.trim()) return fallbackDocNo.trim();
    const d = displayNoByReq[key];
    if (d && d.trim()) return d.trim();
    return `#${shortId(rid)}`;
  }, [displayNoByReq]);

  const preloadDisplayNos = useCallback(async (reqIds: Array<number | string>) => {
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
      const { data, error } = await supabase
        .from("requests")
        .select("id, request_no, display_no, submitted_at")
        .in("id", needed);
      if (error) throw error;

      const mapDn: Record<string, string> = {};
      const mapSub: Record<string, string> = {};

      const rowsTyped = (data ?? []) as Array<{
        id?: string | number | null;
        request_no?: string | null;
        display_no?: string | null;
        submitted_at?: string | null;
      }>;
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
      console.warn("[director] preloadDisplayNos]:", errText(e));
    }
  }, [supabase]);

  const fetchRows = useCallback(async (force = false) => {
    const now = Date.now();
    // Skip if recently fetched and not forced
    if (!force && rows.length > 0 && now - lastFetchedRowsAt.current < 20000) return;

    const my = ++fetchTicket.current;
    setLoadingRows(true);
    try {
      const { data, error } = await supabase.rpc("list_director_items_stable");
      if (error) throw error;

      const rowsTyped = (data ?? []) as Array<Record<string, unknown>>;
      const normalized: PendingRow[] = rowsTyped.map((r, idx: number) => ({
        id: idx,
        request_id: String(r.request_id ?? ""),
        request_item_id: r.request_item_id != null ? String(r.request_item_id) : null,
        name_human: String(r.name_human ?? ""),
        qty: Number(r.qty ?? 0),
        uom: r.uom != null ? String(r.uom) : null,
        rik_code: r.rik_code != null ? String(r.rik_code) : null,
        app_code: r.app_code != null ? String(r.app_code) : null,
        item_kind: r.item_kind != null ? String(r.item_kind) : null,
        note: r.note != null ? String(r.note) : null,
      }));

      lastNonEmptyRows.current = normalized;
      lastFetchedRowsAt.current = Date.now();
      if (my === fetchTicket.current) setRows(normalized);

      const ids = Array.from(new Set(normalized.map((r) => String(r.request_id ?? "").trim()).filter(Boolean)));
      if (ids.length) await preloadDisplayNos(ids);
    } catch (e) {
      console.error("[director] list_director_items_stable]:", errText(e));
    } finally {
      if (my === fetchTicket.current) setLoadingRows(false);
    }
  }, [supabase, preloadDisplayNos]);

  const fetchProps = useCallback(async (force = false) => {
    const now = Date.now();
    // Skip if recently fetched and not forced (cache for 30s)
    if (!force && propsHeads.length > 0 && now - lastFetchedPropsAt.current < 30000) return;

    setLoadingProps(true);
    try {
      // 1. Fetch pending proposals with basic info
      const list = await listDirectorProposalsPending();
      const heads: ProposalHead[] = (list ?? [])
        .filter((x) => x && x.id != null && x.submitted_at != null)
        .map((x) => ({ id: String(x.id), submitted_at: String(x.submitted_at), pretty: null }));

      if (!heads.length) {
        setPropsHeads([]);
        setBuyerPropsCount(0);
        setBuyerPositionsCount(0);
        setPropItemsCount({});
        return;
      }

      const propIds = heads.map((h) => h.id);

      // 2. Parallel secondary data fetching: 
      // a) Meta for titles (proposal_no, id_short)
      // b) Counts per proposal (efficient grouping)
      // c) Total positions count for KPI (head: true)
      const [metaRes, countsRes, totalKpiRes] = await Promise.all([
        supabase
          .from("proposals")
          .select("id, proposal_no, id_short, sent_to_accountant_at")
          .in("id", propIds),

        // Count items per proposal directly in DB
        supabase
          .from("proposal_items")
          .select("proposal_id")
          .in("proposal_id", propIds),
        // Note: Ideally we'd use an RPC for grouped count, but for now we filter and count locally
        // to maintain compatibility with the existing code structure while minimizing the logic change.
        // However, we can at least parallelize it.

        // Total positions count for KPI - HEAD only (returns count, not rows)
        supabase
          .from("proposal_items_view")
          .select("id", { count: "exact", head: true })
          .in("proposal_id", propIds),
      ]);

      // Process Meta
      const prettyMap: Record<string, string> = {};
      const okIds = new Set<string>();

      if (!metaRes.error && Array.isArray(metaRes.data)) {
        metaRes.data.forEach((r) => {
          if (!r.sent_to_accountant_at) okIds.add(String(r.id));
          const pn = String(r.proposal_no ?? "").trim();
          const short = r.id_short;
          const pretty = pn || (short != null ? `PR-${String(short)}` : "");
          if (pretty) prettyMap[String(r.id)] = pretty;
        });
      }

      // Process Counts per proposal (Request 3 & 4 combined into one in-memory map from countsRes)
      const perPropCountMap: Record<string, number> = {};
      const nonEmptyPids = new Set<string>();
      if (!countsRes.error && Array.isArray(countsRes.data)) {
        countsRes.data.forEach((r: any) => {
          const pid = String(r.proposal_id ?? "");
          if (!pid) return;
          perPropCountMap[pid] = (perPropCountMap[pid] || 0) + 1;
          nonEmptyPids.add(pid);
        });
      }

      // Final heads: filter sent and empty
      const filtered = heads
        .filter((h) => okIds.has(h.id) && nonEmptyPids.has(h.id))
        .map((h) => ({ ...h, pretty: prettyMap[h.id] ?? null }));

      setPropsHeads(filtered);
      setPropItemsCount(perPropCountMap);
      setBuyerPropsCount(filtered.length);
      setBuyerPositionsCount(totalKpiRes.count ?? 0);
      lastFetchedPropsAt.current = Date.now();

    } catch (e) {
      console.error("[director] proposals list]:", errText(e));
    } finally {
      setLoadingProps(false);
    }
  }, [supabase]);

  return {
    rows,
    setRows,
    loadingRows,
    propsHeads,
    buyerPropsCount,
    buyerPositionsCount,
    propItemsCount,
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
  };
}
