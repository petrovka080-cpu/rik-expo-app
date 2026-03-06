import { loadWorkLogRows } from "./contractor.data";
import {
  resolveContractorJobIdForRow,
  resolveRequestIdForRow,
} from "./contractor.resolvers";
import { loadIssuedTodayData } from "./contractor.workModalService";
import type { IssuedItemRow, LinkedReqCard, WorkLogRow } from "./types";

export type WorkModalControllerRow = {
  progress_id: string;
  request_id?: string | null;
  purchase_item_id?: string | null;
  contractor_job_id?: string | null;
};

export function createWorkModalDataController(params: {
  supabaseClient: any;
  rows: WorkModalControllerRow[];
  normText: (v: any) => string;
  isRejectedOrCancelledRequestStatus: (status: string | null | undefined) => boolean;
  toLocalDateKey: (value: string | Date | null | undefined) => string;
}) {
  const {
    supabaseClient,
    rows,
    normText,
    isRejectedOrCancelledRequestStatus,
    toLocalDateKey,
  } = params;

  const loadWorkLogData = async (progressId: string): Promise<WorkLogRow[]> => {
    try {
      return await loadWorkLogRows(supabaseClient, progressId, normText);
    } catch (e) {
      console.warn("[loadWorkLog] error", e);
      return [];
    }
  };

  const resolveRequestId = async (row: WorkModalControllerRow): Promise<string> =>
    resolveRequestIdForRow(supabaseClient, row);

  const resolveContractorJobId = async (row: WorkModalControllerRow): Promise<string> =>
    resolveContractorJobIdForRow(supabaseClient, row, resolveRequestId);

  const loadIssuedTodayDataForRow = async (row: WorkModalControllerRow): Promise<{
    issuedItems: IssuedItemRow[];
    linkedReqCards: LinkedReqCard[];
    issuedHint: string;
  }> => {
    try {
      return await loadIssuedTodayData({
        supabaseClient,
        row,
        allRows: rows,
        resolveContractorJobId,
        resolveRequestId,
        isRejectedOrCancelledRequestStatus,
        toLocalDateKey,
        normText,
      });
    } catch (e) {
      console.warn("[loadIssuedToday] error:", e);
      return {
        issuedItems: [] as IssuedItemRow[],
        linkedReqCards: [] as LinkedReqCard[],
        issuedHint: "",
      };
    }
  };

  return {
    loadWorkLogData,
    resolveRequestId,
    resolveContractorJobId,
    loadIssuedTodayDataForRow,
  };
}
