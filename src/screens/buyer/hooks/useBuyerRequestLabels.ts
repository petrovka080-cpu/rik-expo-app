import { useCallback, useEffect, useRef, useState } from "react";

import { formatRequestDisplay } from "../../../lib/format";
import { batchResolveRequestLabels } from "../../../lib/catalog_api";
import { normalizeRuText } from "../../../lib/text/encoding";
import { fetchBuyerRequestProposalMap } from "./useBuyerRequestProposalMap";

const errText = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error ?? "");
};

const extractCanonicalRequestLabel = (value: string): string => {
  const normalized = normalizeRuText(value).trim();
  if (!normalized) return "";

  const reqMatch = normalized.match(/\bREQ-[A-Z0-9_-]+\/\d{4}\b/i);
  if (reqMatch?.[0]) return reqMatch[0].toUpperCase();

  const slashMatch = normalized.match(/\b\d{1,6}\/\d{4}\b/);
  if (slashMatch?.[0]) return slashMatch[0];

  const requestHashMatch = normalized.match(/\b#\d+\b/);
  if (requestHashMatch?.[0]) return requestHashMatch[0];

  return normalized;
};

const cleanLabel = (value: unknown): string => extractCanonicalRequestLabel(String(value ?? ""));

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
    const dn = cleanLabel(displayNoByReqRef.current?.[key]);
    if (dn) return dn;
    return cleanLabel(formatRequestDisplay(String(rid), ridOld ?? null));
  }, []);

  const preloadDisplayNos = useCallback(async (ids: string[]) => {
    const uniqueIds = Array.from(new Set((ids || []).map(String).filter(Boolean)));
    const existing = displayNoByReqRef.current || {};
    const need = uniqueIds.filter((id) => existing[id] == null);
    if (!need.length) return;

    try {
      const map = await batchResolveRequestLabels(need);
      if (map && typeof map === "object") {
        const cleanedEntries = Object.entries(map)
          .map(([id, label]) => [String(id).trim(), cleanLabel(label)] as const)
          .filter((entry) => entry[0] && entry[1]);
        if (!cleanedEntries.length) return;
        setDisplayNoByReq((prev) => ({ ...prev, ...Object.fromEntries(cleanedEntries) }));
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
      const { data, error } = await fetchBuyerRequestProposalMap(need);
      if (error) throw error;

      const rowsTyped = Array.isArray(data)
        ? (data as Array<{ request_id?: string | number | null; proposal_no?: string | null }>)
        : [];

      const patch: Record<string, string> = {};
      for (const r of rowsTyped) {
        const rid = String(r.request_id ?? "").trim();
        const pr = cleanLabel(r.proposal_no);
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
