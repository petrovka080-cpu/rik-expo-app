import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";
import {
  loadContractorJobHeaderData,
  loadInitialWorkMaterialsForModal,
  loadIssuedTodayData,
  loadWorkStageOptions,
} from "./contractor.workModalService";
import type { IssuedItemRow, LinkedReqCard, WorkLogRow } from "./types";

type WorkRowLike = {
  progress_id: string;
  work_name?: string | null;
  work_code?: string | null;
  object_name?: string | null;
  uom_id?: string | null;
  qty_planned?: number | null;
  request_id?: string | null;
  contractor_job_id?: string | null;
};

type ContractorJobHeader = {
  contractor_org: string | null;
  contractor_inn: string | null;
  contractor_rep: string | null;
  contractor_phone: string | null;
  contract_number: string | null;
  contract_date: string | null;
  object_name: string | null;
  work_type?: string | null;
  zone: string | null;
  level_name: string | null;
  qty_planned?: number | null;
  uom?: string | null;
  unit_price: number | null;
  total_price?: number | null;
  date_start: string | null;
  date_end: string | null;
};

type BootstrapLoadState = "init" | "loading" | "ready" | "error";

export type WorkModalBootstrapResult = {
  loadState: BootstrapLoadState;
  jobHeader: ContractorJobHeader | null;
  objectNameOverride: string | null;
  workLog: WorkLogRow[];
  workStageOptions: Array<{ code: string; name: string }>;
  initialMaterials: WorkMaterialRow[];
  issuedData: {
    issuedItems: IssuedItemRow[];
    linkedReqCards: LinkedReqCard[];
    issuedHint: string;
  };
};

type Params = {
  supabaseClient: any;
  row: WorkRowLike;
  readOnly: boolean;
  allRows: WorkRowLike[];
  fallbackOrg?: string | null;
  fallbackPhone?: string | null;
  resolveContractorJobId: (row: WorkRowLike) => Promise<string>;
  resolveRequestId: (row: WorkRowLike) => Promise<string>;
  loadWorkLogData: (progressId: string) => Promise<WorkLogRow[]>;
  isRejectedOrCancelledRequestStatus: (status: string | null | undefined) => boolean;
  toLocalDateKey: (value: string | Date | null | undefined) => string;
  normText: (value: any) => string;
};

export async function bootstrapWorkModalData(params: Params): Promise<WorkModalBootstrapResult> {
  const {
    supabaseClient,
    row,
    readOnly,
    allRows,
    fallbackOrg,
    fallbackPhone,
    resolveContractorJobId,
    resolveRequestId,
    loadWorkLogData,
    isRejectedOrCancelledRequestStatus,
    toLocalDateKey,
    normText,
  } = params;

  try {
    const bundle = await Promise.all([
      loadContractorJobHeaderData({
        supabaseClient,
        row,
        resolveContractorJobId: resolveContractorJobId as any,
        resolveRequestId: resolveRequestId as any,
        fallbackOrg,
        fallbackPhone,
        normText,
      }).catch(() => ({ header: null, objectNameOverride: null })),
      loadWorkLogData(String(row.progress_id || "")),
      loadWorkStageOptions({ supabaseClient }).catch(() => [] as Array<{ code: string; name: string }>),
      readOnly
        ? Promise.resolve([] as WorkMaterialRow[])
        : loadInitialWorkMaterialsForModal({
            supabaseClient,
            row,
          }).catch(() => [] as WorkMaterialRow[]),
      loadIssuedTodayData({
        supabaseClient,
        row,
        allRows,
        resolveContractorJobId: resolveContractorJobId as any,
        resolveRequestId: resolveRequestId as any,
        isRejectedOrCancelledRequestStatus,
        toLocalDateKey,
        normText,
      }).catch(
        () =>
          ({
            issuedItems: [] as IssuedItemRow[],
            linkedReqCards: [] as LinkedReqCard[],
            issuedHint: "",
          }) as {
            issuedItems: IssuedItemRow[];
            linkedReqCards: LinkedReqCard[];
            issuedHint: string;
          }
      ),
    ]);

    const [headerResult, workLog, workStageOptions, initialMaterials, issuedData] = bundle;
    return {
      loadState: "ready",
      jobHeader: (headerResult as any)?.header || null,
      objectNameOverride: String((headerResult as any)?.objectNameOverride || "").trim() || null,
      workLog,
      workStageOptions,
      initialMaterials,
      issuedData,
    };
  } catch {
    return {
      loadState: "error",
      jobHeader: null,
      objectNameOverride: null,
      workLog: [],
      workStageOptions: [],
      initialMaterials: [],
      issuedData: { issuedItems: [], linkedReqCards: [], issuedHint: "" },
    };
  }
}

