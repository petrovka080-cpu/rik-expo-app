import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "../../../lib/supabaseClient";
import { batchResolveRequestLabels } from "../../../lib/catalog_api";
import { preloadProposalTitlesAction } from "../buyer.actions";
import { fetchBuyerProposalNos } from "./useBuyerProposalNos";

const errText = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error ?? "");
};

const uniq = (arr: string[]) =>
  Array.from(new Set((arr || []).map(String).map((s) => s.trim()).filter(Boolean)));

const chunk = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export function useBuyerProposalCaches() {
  const [titleByPid, setTitleByPid] = useState<Record<string, string>>({});
  const titleByPidRef = useRef<Record<string, string>>({});

  const [proposalNoByPid, setProposalNoByPid] = useState<Record<string, string>>({});
  const proposalNoByPidRef = useRef<Record<string, string>>({});

  useEffect(() => {
    titleByPidRef.current = titleByPid || {};
  }, [titleByPid]);

  useEffect(() => {
    proposalNoByPidRef.current = proposalNoByPid || {};
  }, [proposalNoByPid]);

  const prNoInflightRef = useRef<Record<string, Promise<void>>>({});
  const prNoTsRef = useRef<Record<string, number>>({});
  const PRNO_TTL_MS = 10 * 60 * 1000;

  const preloadProposalNosByIds = useCallback(async (proposalIdsRaw: string[]) => {
    const now = Date.now();
    const ids = uniq(proposalIdsRaw);

    const need = ids.filter((id) => {
      const have = proposalNoByPidRef.current?.[id];
      const ts = prNoTsRef.current[id] ?? 0;
      if (have && now - ts < PRNO_TTL_MS) return false;
      return true;
    });

    if (!need.length) return;

    const wait: Promise<void>[] = [];
    const toFetch: string[] = [];

    for (const id of need) {
      const infl = prNoInflightRef.current[id];
      if (infl) wait.push(infl);
      else toFetch.push(id);
    }

    if (toFetch.length) {
      const p = (async () => {
        try {
          const patch: Record<string, string> = {};

          for (const part of chunk(toFetch, 250)) {
            const q = await fetchBuyerProposalNos(part);

            if (!q.error && Array.isArray(q.data)) {
              const rowsTyped = q.data as Array<{ id?: string | number | null; proposal_no?: string | null }>;
              for (const r of rowsTyped) {
                const id = String(r.id ?? "").trim();
                const no = String(r.proposal_no ?? "").trim();
                if (id && no) patch[id] = no;
                if (id) prNoTsRef.current[id] = Date.now();
              }
            }
          }

          if (Object.keys(patch).length) {
            setProposalNoByPid((prev) => {
              const next = { ...(prev || {}), ...patch };
              proposalNoByPidRef.current = next;
              return next;
            });
          }
        } catch (e) {
          console.warn("[buyer] preloadProposalNosByIds failed:", errText(e));
        }
      })();

      for (const id of toFetch) prNoInflightRef.current[id] = p;
      wait.push(p);

      p.finally(() => {
        for (const id of toFetch) {
          if (prNoInflightRef.current[id] === p) delete prNoInflightRef.current[id];
        }
      });
    }

    if (wait.length) {
      try {
        await Promise.all(wait);
      } catch {
        // no-op
      }
    }
  }, []);

  const preloadProposalTitles = useCallback(async (proposalIds: string[]) => {
    await preloadProposalTitlesAction({
      proposalIds,
      supabase,
      batchResolveRequestLabels,
      getExisting: () => titleByPidRef.current || {},
      setTitleByPid,
    });
  }, []);

  return {
    titleByPid,
    proposalNoByPid,
    preloadProposalNosByIds,
    preloadProposalTitles,
  };
}
