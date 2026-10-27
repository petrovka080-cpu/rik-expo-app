import { useCallback, useMemo } from "react";
import {
  generateHistoryPdfForLog,
  generateSummaryPdfForWork,
  type ContractorPdfJobHeaderLike,
  type ContractorPdfWorkRowLike,
} from "../contractor.pdfService";
import { parseActMeta, pickErr, pickFirstNonEmpty } from "../contractor.utils";
import type { WorkLogRow } from "../types";
import type { AppSupabaseClient } from "../../../lib/dbContract.types";

type WorkRowLike = ContractorPdfWorkRowLike;
type JobHeaderLike = ContractorPdfJobHeaderLike;

export function useContractorPdfActions(params: {
  supabaseClient: AppSupabaseClient;
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
        workModalRow,
        jobHeader,
        pickFirstNonEmpty,
      });
    } catch (error) {
      if (__DEV__) console.warn("[PDF aggregated] error", error);
      showErr(error);
    }
  }, [supabaseClient, workModalRow, jobHeader, showErr]);

  const handleGenerateHistoryPdf = useCallback(async (log: WorkLogRow) => {
    if (!workModalRow) return;
    try {
      await generateHistoryPdfForLog({
        supabaseClient,
        workModalRow,
        jobHeader,
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
