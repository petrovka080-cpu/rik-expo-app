import { useCallback, useEffect, useRef, useState } from "react";

import { formatRequestDisplay } from "../../../lib/format";
import { batchResolveRequestLabels } from "../../../lib/catalog_api";
import { supabase } from "../../../lib/supabaseClient";

const errText = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error ?? "");
};

export function useBuyerRequestLabels() {
  const [displayNoByReq, setDisplayNoByReq] = useState<Record<string, string>>({});
  const displayNoByReqRef = useRef<Record<string, string>>({});

  const [prNoByReq, setPrNoByReq] = useState<Record<string, string>>({});
  const prNoByReqRef = useRef<Record<string, string>>({});

  useEffect(() => {
    displayNoByReqRef.current = displayNoByReq || {};
  }, [displayNoByReq]);

  useEffect(() => {
    displayNoByReqRef.current = displayNoByReq || {};
  }, [displayNoByReq]);

  useEffect(() => {
    prNoByReqRef.current = prNoByReq || {};
  }, [prNoByReq]);

  const prettyLabel = useCallback((rid: string, ridOld?: number | null) => {
    const key = String(rid).trim();
    const dn = displayNoByReqRef.current?.[key];
    if (dn) return dn;
    return formatRequestDisplay(String(rid), ridOld ?? null);
  }, []);

  const preloadDisplayNos = useCallback(async (ids: string[]) => {
    const uniqueIds = Array.from(new Set((ids || []).map(String).filter(Boolean)));
    const existing = displayNoByReqRef.current || {};
    const need = uniqueIds.filter((id) => existing[id] == null);
    if (!need.length) return;

    try {
      const map = await batchResolveRequestLabels(need);
      if (map && typeof map === "object") {
        setDisplayNoByReq((prev) => ({ ...prev, ...map }));
      }
    } catch {
      // no-op
    }
  }, []);

  const preloadPrNosByRequests = useCallback(async (reqIds: string[]) => {
    const ids = Array.from(new Set((reqIds || []).map(String).map((s) => s.trim()).filter(Boolean)));
    const need = ids.filter((id) => prNoByReqRef.current?.[id] == null);

    if (!need.length) return;

    try {
      const { data, error } = await supabase.rpc("resolve_req_pr_map", { p_request_ids: need });
      if (error) throw error;

      const rowsTyped = Array.isArray(data)
        ? (data as Array<{ request_id?: string | number | null; proposal_no?: string | null }>)
        : [];

      const patch: Record<string, string> = {};
      for (const r of rowsTyped) {
        const rid = String(r.request_id ?? "").trim();
        const pr = String(r.proposal_no ?? "").trim();
        if (rid && pr) patch[rid] = pr;
      }

      if (Object.keys(patch).length) {
        setPrNoByReq((prev) => ({ ...(prev || {}), ...patch }));
      }
    } catch (e) {
      console.warn("[buyer] preloadPrNosByRequests failed:", errText(e));
    }
  }, []);

  return {
    prNoByReq,
    prettyLabel,
    preloadDisplayNos,
    preloadPrNosByRequests,
  };
}
