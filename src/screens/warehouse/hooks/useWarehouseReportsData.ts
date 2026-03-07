import { useCallback, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { apiFetchIncomingReports, apiFetchReports } from "../warehouse.api";
import type { StockRow, WarehouseReportRow } from "../warehouse.types";

const REPORTS_CACHE_TTL_MS = 60 * 1000;

type ReportsCacheEntry = {
  ts: number;
  repStock: StockRow[];
  repMov: WarehouseReportRow[];
  repIssues: WarehouseReportRow[];
  repIncoming: WarehouseReportRow[];
};

export function useWarehouseReportsData(params: {
  supabase: SupabaseClient;
  periodFrom: string;
  periodTo: string;
}) {
  const { supabase, periodFrom, periodTo } = params;

  const [repStock, setRepStock] = useState<StockRow[]>([]);
  const [repMov, setRepMov] = useState<WarehouseReportRow[]>([]);
  const [repIssues, setRepIssues] = useState<WarehouseReportRow[]>([]);
  const [repIncoming, setRepIncoming] = useState<WarehouseReportRow[]>([]);

  const reportsReqSeqRef = useRef(0);
  const reportsInFlightRef = useRef<Map<string, Promise<void>>>(new Map());
  const reportsCacheRef = useRef<Map<string, ReportsCacheEntry>>(new Map());

  const fetchReports = useCallback(
    async (opts?: { from?: string; to?: string }) => {
      const from = String(opts?.from ?? periodFrom ?? "").trim();
      const to = String(opts?.to ?? periodTo ?? "").trim();
      const key = `${from}|${to}`;
      const hit = reportsCacheRef.current.get(key);
      if (hit && Date.now() - hit.ts <= REPORTS_CACHE_TTL_MS) {
        setRepStock(hit.repStock);
        setRepMov(hit.repMov);
        setRepIssues(hit.repIssues);
        setRepIncoming(hit.repIncoming);
        return;
      }

      const inFlight = reportsInFlightRef.current.get(key);
      if (inFlight) {
        await inFlight;
        return;
      }

      const reqId = ++reportsReqSeqRef.current;
      const task = (async () => {
        const [r, inc] = await Promise.all([
          apiFetchReports(supabase, from, to),
          apiFetchIncomingReports(supabase, { from, to }),
        ]);
        if (reqId !== reportsReqSeqRef.current) return;

        const next = {
          ts: Date.now(),
          repStock: r.repStock || [],
          repMov: r.repMov || [],
          repIssues: r.repIssues || [],
          repIncoming: (inc as WarehouseReportRow[]) || [],
        };
        reportsCacheRef.current.set(key, next);
        setRepStock(next.repStock);
        setRepMov(next.repMov);
        setRepIssues(next.repIssues);
        setRepIncoming(next.repIncoming);
      })().finally(() => {
        reportsInFlightRef.current.delete(key);
      });

      reportsInFlightRef.current.set(key, task);
      await task;
    },
    [supabase, periodFrom, periodTo],
  );

  return {
    repStock,
    repMov,
    repIssues,
    repIncoming,
    fetchReports,
  };
}

