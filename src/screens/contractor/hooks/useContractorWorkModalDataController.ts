import { useCallback, useMemo } from "react";
import {
  createWorkModalDataController,
  type WorkModalControllerRow,
} from "../contractor.workModalController";
import type { ContractorWorkRow } from "../contractor.loadWorksService";
import type { WorkLogRow } from "../types";

export function useContractorWorkModalDataController(params: {
  supabaseClient: any;
  rows: ContractorWorkRow[];
  normText: (value: unknown) => string;
  isRejectedOrCancelledRequestStatus: (status: unknown) => boolean;
  toLocalDateKey: (value: unknown) => string;
}) {
  const {
    supabaseClient,
    rows,
    normText,
    isRejectedOrCancelledRequestStatus,
    toLocalDateKey,
  } = params;

  const workModalDataController = useMemo(
    () =>
      createWorkModalDataController({
        supabaseClient,
        rows: rows as WorkModalControllerRow[],
        normText,
        isRejectedOrCancelledRequestStatus,
        toLocalDateKey,
      }),
    [supabaseClient, rows, normText, isRejectedOrCancelledRequestStatus, toLocalDateKey],
  );

  const loadWorkLogData = useCallback(
    async (progressId: string): Promise<WorkLogRow[]> =>
      workModalDataController.loadWorkLogData(progressId),
    [workModalDataController],
  );

  const resolveRequestId = useCallback(
    async (row: ContractorWorkRow): Promise<string> =>
      workModalDataController.resolveRequestId(row),
    [workModalDataController],
  );

  const resolveContractorJobId = useCallback(
    async (row: ContractorWorkRow): Promise<string> =>
      workModalDataController.resolveContractorJobId(row),
    [workModalDataController],
  );

  const loadIssuedTodayDataForRow = useCallback(
    async (row: ContractorWorkRow) => workModalDataController.loadIssuedTodayDataForRow(row),
    [workModalDataController],
  );

  return {
    loadWorkLogData,
    resolveRequestId,
    resolveContractorJobId,
    loadIssuedTodayDataForRow,
  };
}
