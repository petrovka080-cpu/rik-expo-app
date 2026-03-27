import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import type { ContractorWorkRow } from "./contractor.loadWorksService";
import {
  loadContractorJobHeaderData,
  loadInitialWorkMaterialsForModal,
  loadIssuedTodayData,
  loadWorkStageOptions,
} from "./contractor.workModalService";
import type { IssuedItemRow, LinkedReqCard, WorkLogRow } from "./types";

type WorkRowLike = ContractorWorkRow;

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
  resolveContractorJobId: (row: WorkRowLike) => Promise<string>;
  resolveRequestId: (row: WorkRowLike) => Promise<string>;
  loadWorkLogData: (progressId: string) => Promise<WorkLogRow[]>;
  isRejectedOrCancelledRequestStatus: (status: string | null | undefined) => boolean;
  toLocalDateKey: (value: string | Date | null | undefined) => string;
  normText: (value: any) => string;
};

type HeaderLoadResult = { header: ContractorJobHeader | null; objectNameOverride: string | null };

const recordContractorBootstrapFallback = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) =>
  recordPlatformObservability({
    screen: "contractor",
    surface: "work_modal_bootstrap",
    category: "ui",
    event,
    result: "error",
    fallbackUsed: true,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error ?? "contractor_bootstrap_fallback"),
    extra: {
      module: "contractor.workModalBootstrap",
      route: "/contractor",
      role: "contractor",
      owner: "work_modal_bootstrap",
      severity: "error",
      ...extra,
    },
  });

export async function bootstrapWorkModalData(params: Params): Promise<WorkModalBootstrapResult> {
  const {
    supabaseClient,
    row,
    readOnly,
    allRows,
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
        resolveContractorJobId,
        resolveRequestId,
        normText,
      }).catch((error) => {
        recordContractorBootstrapFallback("load_job_header_failed", error, {
          action: "loadContractorJobHeaderData",
          fallbackAction: "header_null",
          progressId: String(row.progress_id || "").trim() || null,
        });
        return { header: null, objectNameOverride: null };
      }),
      loadWorkLogData(String(row.progress_id || "")),
      loadWorkStageOptions({ supabaseClient }).catch((error) => {
        recordContractorBootstrapFallback("load_stage_options_failed", error, {
          action: "loadWorkStageOptions",
          fallbackAction: "empty_stage_options",
        });
        return [] as Array<{ code: string; name: string }>;
      }),
      readOnly
        ? Promise.resolve([] as WorkMaterialRow[])
        : loadInitialWorkMaterialsForModal({
            supabaseClient,
            row,
          }).catch((error) => {
            recordContractorBootstrapFallback("load_initial_materials_failed", error, {
              action: "loadInitialWorkMaterialsForModal",
              fallbackAction: "empty_initial_materials",
              progressId: String(row.progress_id || "").trim() || null,
            });
            return [] as WorkMaterialRow[];
          }),
      loadIssuedTodayData({
        supabaseClient,
        row,
        allRows,
        resolveContractorJobId,
        resolveRequestId,
        isRejectedOrCancelledRequestStatus,
        toLocalDateKey,
        normText,
      }).catch((error) => {
        recordContractorBootstrapFallback("load_issued_today_failed", error, {
          action: "loadIssuedTodayData",
          fallbackAction: "empty_issued_data",
          progressId: String(row.progress_id || "").trim() || null,
        });
        return {
          issuedItems: [] as IssuedItemRow[],
          linkedReqCards: [] as LinkedReqCard[],
          issuedHint: "",
        } as {
          issuedItems: IssuedItemRow[];
          linkedReqCards: LinkedReqCard[];
          issuedHint: string;
        };
      }),
    ]);

    const [headerResult, workLog, workStageOptions, initialMaterials, issuedData] = bundle as [
      HeaderLoadResult,
      WorkLogRow[],
      Array<{ code: string; name: string }>,
      WorkMaterialRow[],
      { issuedItems: IssuedItemRow[]; linkedReqCards: LinkedReqCard[]; issuedHint: string },
    ];
    return {
      loadState: "ready",
      jobHeader: headerResult?.header || null,
      objectNameOverride: String(headerResult?.objectNameOverride || "").trim() || null,
      workLog,
      workStageOptions,
      initialMaterials,
      issuedData,
    };
  } catch (error) {
    recordContractorBootstrapFallback("bootstrap_work_modal_failed", error, {
      action: "bootstrapWorkModalData",
      fallbackAction: "error_state",
      progressId: String(row.progress_id || "").trim() || null,
    });
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
