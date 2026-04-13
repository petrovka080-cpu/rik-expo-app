import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  apiFetchIncomingReports,
  apiFetchReports,
} from "../warehouse.stock.read";
import {
  abortController,
  isAbortError,
  throwIfAborted,
} from "../../../lib/requestCancellation";
import type { StockRow, WarehouseReportRow } from "../warehouse.types";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

const REPORTS_CACHE_TTL_MS = 60 * 1000;

type ReportsCacheEntry = {
  ts: number;
  repStock: StockRow[];
  repMov: WarehouseReportRow[];
  repIssues: WarehouseReportRow[];
  repIncoming: WarehouseReportRow[];
};

type ReportsRequestSlot = {
  key: string;
  reqId: number;
  controller: AbortController;
};

export function useWarehouseReportsData(params: {
  supabase: SupabaseClient;
  periodFrom: string;
  periodTo: string;
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const { supabase, periodFrom, periodTo } = params;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);

  const [repStock, setRepStock] = useState<StockRow[]>([]);
  const [repMov, setRepMov] = useState<WarehouseReportRow[]>([]);
  const [repIssues, setRepIssues] = useState<WarehouseReportRow[]>([]);
  const [repIncoming, setRepIncoming] = useState<WarehouseReportRow[]>([]);

  const reportsReqSeqRef = useRef(0);
  const reportsRequestRef = useRef<ReportsRequestSlot | null>(null);
  const reportsCacheRef = useRef<Map<string, ReportsCacheEntry>>(new Map());

  const abortReportsRequest = useCallback((reason: string) => {
    abortController(reportsRequestRef.current?.controller, reason);
  }, []);

  useEffect(() => () => {
    abortReportsRequest("warehouse reports unmounted");
    reportsReqSeqRef.current += 1;
  }, [abortReportsRequest]);

  const fetchReports = useCallback(
    async (opts?: { from?: string; to?: string }) => {
      const from = String(opts?.from ?? periodFrom ?? "").trim();
      const to = String(opts?.to ?? periodTo ?? "").trim();
      const key = `${from}|${to}`;
      const hit = reportsCacheRef.current.get(key);
      if (hit && Date.now() - hit.ts <= REPORTS_CACHE_TTL_MS) {
        abortReportsRequest("warehouse reports cache hit superseded request");
        reportsReqSeqRef.current += 1;
        if (!isWarehouseScreenActive(screenActiveRef)) return;
        setRepStock(hit.repStock);
        setRepMov(hit.repMov);
        setRepIssues(hit.repIssues);
        setRepIncoming(hit.repIncoming);
        return;
      }

      if (!isWarehouseScreenActive(screenActiveRef)) return;
      const reqId = ++reportsReqSeqRef.current;
      abortReportsRequest("warehouse reports request superseded");
      const requestSlot: ReportsRequestSlot = {
        key,
        reqId,
        controller: new AbortController(),
      };
      reportsRequestRef.current = requestSlot;
      const { signal } = requestSlot.controller;
      const task = (async () => {
        try {
          throwIfAborted(signal);
          const [r, inc] = await Promise.all([
            apiFetchReports(supabase, from, to, { signal }),
            apiFetchIncomingReports(supabase, { from, to }, { signal }),
          ]);
          throwIfAborted(signal);
          if (
            reqId !== reportsReqSeqRef.current ||
            reportsRequestRef.current !== requestSlot
          ) return;
          if (!isWarehouseScreenActive(screenActiveRef)) return;

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
        } catch (error) {
          if (
            isAbortError(error) ||
            reqId !== reportsReqSeqRef.current ||
            reportsRequestRef.current !== requestSlot
          ) return;
          throw error;
        }
      })().finally(() => {
        if (reportsRequestRef.current === requestSlot) {
          reportsRequestRef.current = null;
        }
      });

      await task;
    },
    [abortReportsRequest, supabase, periodFrom, periodTo, screenActiveRef],
  );

  return {
    repStock,
    repMov,
    repIssues,
    repIncoming,
    fetchReports,
  };
}
