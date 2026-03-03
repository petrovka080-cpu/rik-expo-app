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

  const fetchRows = useCallback(async () => {
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
      if (my === fetchTicket.current) setRows(normalized);

      const ids = Array.from(new Set(normalized.map((r) => String(r.request_id ?? "").trim()).filter(Boolean)));
      if (ids.length) await preloadDisplayNos(ids);
    } catch (e) {
      console.error("[director] list_director_items_stable]:", errText(e));
    } finally {
      if (my === fetchTicket.current) setLoadingRows(false);
    }
  }, [supabase, preloadDisplayNos]);

  const fetchProps = useCallback(async () => {
    setLoadingProps(true);
    try {
      const list = await listDirectorProposalsPending();
      const listTyped = (list ?? []) as Array<{ id?: string | number | null; submitted_at?: string | null }>;
      const heads: ProposalHead[] = listTyped
        .filter((x) => x && x.id != null && x.submitted_at != null)
        .map((x) => ({ id: String(x.id), submitted_at: String(x.submitted_at), pretty: null }));

      if (!heads.length) {
        setPropsHeads([]);
        return;
      }

      const ids = heads.map((h) => h.id);
      const { data, error } = await supabase
        .from("proposals")
        .select("id, proposal_no, id_short, sent_to_accountant_at")
        .in("id", ids);

      if (error || !Array.isArray(data)) {
        setPropsHeads(heads);
        return;
      }

      const okIds = new Set<string>(
        data.filter((r) => !r?.sent_to_accountant_at).map((r) => String(r.id)),
      );

      const prettyMap: Record<string, string> = {};
      const dataTyped = data as Array<{ id?: string | number | null; proposal_no?: string | null; id_short?: string | number | null }>;
      for (const r of dataTyped) {
        const id = String(r.id);
        const pn = String(r.proposal_no ?? "").trim();
        const short = r.id_short;
        const pretty = pn || (short != null ? `PR-${String(short)}` : "");
        if (id && pretty) prettyMap[id] = pretty;
      }

      let filtered = heads
        .filter((h) => okIds.has(h.id))
        .map((h) => ({ ...h, pretty: prettyMap[h.id] ?? h.pretty ?? null }));

      try {
        const propIds = filtered.map((h) => h.id);
        if (propIds.length) {
          const q = await supabase
            .from("proposal_items")
            .select("proposal_id")
            .in("proposal_id", propIds);

          const qRows = (q.data || []) as Array<{ proposal_id?: string | number | null }>;
          const nonEmpty = new Set(qRows.map((r) => String(r.proposal_id)));
          filtered = filtered.filter((h) => nonEmpty.has(String(h.id)));
        }
      } catch { }
      setPropsHeads(filtered);
      try {
        const propIds = filtered.map((h) => h.id);
        if (propIds.length) {
          const qCnt = await supabase
            .from("proposal_items")
            .select("proposal_id")
            .in("proposal_id", propIds);

          const map: Record<string, number> = {};
          const cntRows = (qCnt.data || []) as Array<{ proposal_id?: string | number | null }>;
          for (const r of cntRows) {
            const pid = String(r.proposal_id ?? "");
            if (!pid) continue;
            map[pid] = (map[pid] || 0) + 1;
          }
          setPropItemsCount(map);
        } else {
          setPropItemsCount({});
        }
      } catch {
        setPropItemsCount({});
      }

      setBuyerPropsCount(filtered.length);

      try {
        const propIds = filtered.map((h) => h.id);
        if (propIds.length) {
          const q = await supabase
            .from("proposal_items_view")
            .select("proposal_id")
            .in("proposal_id", propIds);

          setBuyerPositionsCount(!q.error && Array.isArray(q.data) ? q.data.length : 0);
        } else {
          setBuyerPositionsCount(0);
        }
      } catch {
        setBuyerPositionsCount(0);
      }
    } catch (e) {
      console.error("[director] proposals list]:", errText(e));
      setPropsHeads([]);
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
