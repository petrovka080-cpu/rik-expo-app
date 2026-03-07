import { useCallback, useMemo } from "react";
import { generateHistoryPdfForLog, generateSummaryPdfForWork } from "../contractor.pdfService";
import { parseActMeta, pickErr, pickFirstNonEmpty } from "../contractor.utils";
import type { WorkLogRow } from "../types";

type WorkRowLike = {
  object_name?: string | null;
} & Record<string, unknown>;

type JobHeaderLike = {
  object_name?: string | null;
} & Record<string, unknown>;

export function useContractorPdfActions(params: {
  supabaseClient: any;
  workModalRow: WorkRowLike | null;
  jobHeader: JobHeaderLike | null;
  showErr: (error: unknown) => void;
}) {
  const { supabaseClient, workModalRow, jobHeader, showErr } = params;

  const resolvedObjectName = useMemo(
    () => pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "",
    [workModalRow, jobHeader],
  );

  const handleGenerateSummaryPdf = useCallback(async () => {
    if (!workModalRow) return;
    try {
      await generateSummaryPdfForWork({
        supabaseClient,
        workModalRow: workModalRow as any,
        jobHeader: jobHeader as any,
        pickFirstNonEmpty,
      });
    } catch (error) {
      console.warn("[PDF aggregated] error", error);
      showErr(error);
    }
  }, [supabaseClient, workModalRow, jobHeader, showErr]);

  const handleGenerateHistoryPdf = useCallback(async (log: WorkLogRow) => {
    if (!workModalRow) return;
    try {
      await generateHistoryPdfForLog({
        supabaseClient,
        workModalRow: workModalRow as any,
        jobHeader: jobHeader as any,
        log,
        parseActMeta,
        pickFirstNonEmpty,
      });
    } catch (error) {
      showErr(error);
    }
  }, [supabaseClient, workModalRow, jobHeader, showErr]);

  return {
    resolvedObjectName,
    handleGenerateSummaryPdf,
    handleGenerateHistoryPdf,
    parseActMeta,
    pickErr,
  };
}
