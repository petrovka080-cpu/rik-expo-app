import { useCallback, useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiFetchIncomingLines } from "./warehouse.stock.read";
import { fetchWarehouseIssueLines } from "./warehouse.reports.repo";
import {
  createWarehouseReportPdfService,
  formatWarehouseReportDayRu,
  normalizeIncomingHead,
  normalizeWarehouseIssueHead,
  type WarehouseReportPdfRow,
} from "./warehouse.reportPdf.service";
import {
  isWarehouseScreenActive,
  type WarehouseScreenActiveRef,
} from "./hooks/useWarehouseScreenActivity";

type BusyLike = unknown;
type SupabaseLike = SupabaseClient;

export function useWarehouseReports(args: {
  busy: BusyLike;
  supabase: SupabaseLike;
  repIssues: WarehouseReportPdfRow[];
  repIncoming?: WarehouseReportPdfRow[];
  periodFrom: string;
  periodTo: string;
  orgName: string;
  warehouseName: string;
  issueLinesById: Record<string, WarehouseReportPdfRow[]>;
  setIssueLinesById: (
    updater: (
      prev: Record<string, WarehouseReportPdfRow[]>,
    ) => Record<string, WarehouseReportPdfRow[]>,
  ) => void;
  issueLinesLoadingId: number | null;
  setIssueLinesLoadingId: (value: number | null) => void;
  issueDetailsId: number | null;
  setIssueDetailsId: (value: number | null) => void;
  incomingLinesById: Record<string, WarehouseReportPdfRow[]>;
  setIncomingLinesById: (
    updater: (
      prev: Record<string, WarehouseReportPdfRow[]>,
    ) => Record<string, WarehouseReportPdfRow[]>,
  ) => void;
  incomingLinesLoadingId: string | null;
  setIncomingLinesLoadingId: (value: string | null) => void;
  incomingDetailsId: string | null;
  setIncomingDetailsId: (value: string | null) => void;
  nameByCode?: Record<string, string>;
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const {
    supabase,
    repIssues,
    repIncoming,
    periodFrom,
    periodTo,
    orgName,
    warehouseName,
    issueLinesById,
    setIssueLinesById,
    setIssueLinesLoadingId,
    setIssueDetailsId,
    incomingLinesById,
    setIncomingLinesById,
    setIncomingLinesLoadingId,
    setIncomingDetailsId,
    nameByCode,
    screenActiveRef,
  } = args;

  const normalizedIssueHeads = useMemo(
    () =>
      (repIssues || [])
        .map(normalizeWarehouseIssueHead)
        .filter(
          (
            row,
          ): row is NonNullable<
            ReturnType<typeof normalizeWarehouseIssueHead>
          > => row !== null,
        ),
    [repIssues],
  );
  const normalizedIncomingHeads = useMemo(
    () =>
      (repIncoming || [])
        .map(normalizeIncomingHead)
        .filter(
          (row): row is NonNullable<ReturnType<typeof normalizeIncomingHead>> =>
            row !== null,
        ),
    [repIncoming],
  );

  const vydachaByDay = useMemo(() => {
    const groups: Record<string, typeof normalizedIssueHeads> = {};
    for (const row of normalizedIssueHeads) {
      const date = row.event_dt ? new Date(String(row.event_dt ?? "")) : null;
      const key = date ? formatWarehouseReportDayRu(date) : "Без даты";
      (groups[key] ||= []).push(row);
    }
    return Object.entries(groups).map(([day, items]) => ({
      day,
      items: items.sort(
        (left, right) =>
          new Date(String(right.event_dt ?? "")).getTime() -
          new Date(String(left.event_dt ?? "")).getTime(),
      ),
    }));
  }, [normalizedIssueHeads]);

  const incomingByDay = useMemo(() => {
    const groups: Record<string, typeof normalizedIncomingHeads> = {};
    for (const row of normalizedIncomingHeads) {
      const date = row.event_dt ? new Date(String(row.event_dt ?? "")) : null;
      const key = date ? formatWarehouseReportDayRu(date) : "Без даты";
      (groups[key] ||= []).push(row);
    }
    return Object.entries(groups).map(([day, items]) => ({
      day,
      items: items.sort(
        (left, right) =>
          new Date(String(right.event_dt ?? "")).getTime() -
          new Date(String(left.event_dt ?? "")).getTime(),
      ),
    }));
  }, [normalizedIncomingHeads]);

  const ensureIssueLines = useCallback(
    async (issueId: number): Promise<WarehouseReportPdfRow[]> => {
      const key = String(issueId);
      const cached = issueLinesById?.[key];
      if (Array.isArray(cached) && cached.length > 0) return cached;
      if (!isWarehouseScreenActive(screenActiveRef)) return [];

      setIssueLinesLoadingId(issueId);
      try {
        const lines = await fetchWarehouseIssueLines(supabase, issueId);
        if (!isWarehouseScreenActive(screenActiveRef)) return lines;
        setIssueLinesById((prev) => ({ ...(prev || {}), [key]: lines }));
        return lines;
      } finally {
        if (isWarehouseScreenActive(screenActiveRef)) {
          setIssueLinesLoadingId(null);
        }
      }
    },
    [
      issueLinesById,
      screenActiveRef,
      setIssueLinesById,
      setIssueLinesLoadingId,
      supabase,
    ],
  );

  const ensureIncomingLines = useCallback(
    async (incomingId: string): Promise<WarehouseReportPdfRow[]> => {
      const cached = incomingLinesById?.[incomingId];
      if (Array.isArray(cached) && cached.length > 0) return cached;
      if (!isWarehouseScreenActive(screenActiveRef)) return [];

      setIncomingLinesLoadingId(incomingId);
      try {
        const lines = await apiFetchIncomingLines(supabase, incomingId);
        if (!isWarehouseScreenActive(screenActiveRef)) return lines;
        setIncomingLinesById((prev) => ({
          ...(prev || {}),
          [incomingId]: lines,
        }));
        return lines;
      } finally {
        if (isWarehouseScreenActive(screenActiveRef)) {
          setIncomingLinesLoadingId(null);
        }
      }
    },
    [
      incomingLinesById,
      screenActiveRef,
      setIncomingLinesById,
      setIncomingLinesLoadingId,
      supabase,
    ],
  );

  const openIncomingDetails = useCallback(
    async (incomingId: string) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      setIncomingDetailsId(incomingId);
      await ensureIncomingLines(incomingId);
    },
    [ensureIncomingLines, screenActiveRef, setIncomingDetailsId],
  );

  const closeIncomingDetails = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    setIncomingDetailsId(null);
  }, [screenActiveRef, setIncomingDetailsId]);

  const openIssueDetails = useCallback(
    async (issueId: number) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      setIssueDetailsId(issueId);
      await ensureIssueLines(issueId);
    },
    [ensureIssueLines, screenActiveRef, setIssueDetailsId],
  );

  const closeIssueDetails = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    setIssueDetailsId(null);
  }, [screenActiveRef, setIssueDetailsId]);

  const pdfBuilders = useMemo(
    () =>
      createWarehouseReportPdfService({
        supabase,
        normalizedIssueHeads,
        normalizedIncomingHeads,
        periodFrom,
        periodTo,
        orgName,
        warehouseName,
        nameByCode,
        ensureIssueLines,
      }),
    [
      supabase,
      normalizedIssueHeads,
      normalizedIncomingHeads,
      periodFrom,
      periodTo,
      orgName,
      warehouseName,
      nameByCode,
      ensureIssueLines,
    ],
  );

  return {
    vydachaByDay,
    incomingByDay,
    ensureIssueLines,
    ensureIncomingLines,
    openIssueDetails,
    closeIssueDetails,
    openIncomingDetails,
    closeIncomingDetails,
    ...pdfBuilders,
    apiFetchIncomingLines: (client: SupabaseClient, incomingId: string) =>
      apiFetchIncomingLines(client, incomingId),
  };
}
