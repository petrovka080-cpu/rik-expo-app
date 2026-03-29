import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";
import {
  contractorWarehouseIssuesErrorState,
  loadContractorFactScope,
  type ContractorFactScope,
  type WarehouseIssuesPanelState,
} from "../../lib/api/contractor.scope.service";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import type { ContractorWorkRow } from "./contractor.loadWorksService";
import {
  loadInitialWorkMaterialsForModal,
  loadWorkStageOptions,
} from "./contractor.workModalService";
import type { WorkLogRow } from "./types";

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
  warehouseIssuesState: WarehouseIssuesPanelState;
};

type Params = {
  supabaseClient: any;
  row: WorkRowLike;
  readOnly: boolean;
  loadWorkLogData: (progressId: string) => Promise<WorkLogRow[]>;
  myContractorId: string | null;
  isStaff: boolean;
};

type HeaderLoadResult = { header: ContractorJobHeader | null; objectNameOverride: string | null };

const toJobHeader = (scope: ContractorFactScope): ContractorJobHeader => ({
  contractor_org: scope.row.identity.contractorName,
  contractor_inn: scope.row.identity.contractorInn,
  contractor_rep: null,
  contractor_phone: null,
  contract_number: scope.row.identity.contractNumber,
  contract_date: scope.row.identity.contractDate,
  object_name: scope.row.location.objectName,
  work_type: scope.row.work.workName,
  zone: scope.row.location.zoneName,
  level_name: scope.row.location.floorName,
  qty_planned: scope.row.work.quantity,
  uom: scope.row.work.uom,
  unit_price: scope.row.work.unitPrice,
  total_price: scope.row.work.totalAmount,
  date_start: null,
  date_end: null,
});

const toFallbackJobHeader = (row: WorkRowLike): ContractorJobHeader => ({
  contractor_org: row.contractor_org ?? null,
  contractor_inn: row.contractor_inn ?? null,
  contractor_rep: null,
  contractor_phone: row.contractor_phone ?? null,
  contract_number: null,
  contract_date: null,
  object_name: row.object_name ?? null,
  work_type: row.work_name ?? row.work_code ?? null,
  zone: null,
  level_name: null,
  qty_planned: Number(row.qty_planned ?? 0),
  uom: row.uom_id ?? null,
  unit_price: row.unit_price ?? null,
  total_price:
    row.unit_price == null
      ? null
      : Number.isFinite(Number(row.qty_planned ?? 0))
        ? Number(row.unit_price) * Number(row.qty_planned ?? 0)
        : null,
  date_start: null,
  date_end: null,
});

const resolveCanonicalWorkItemId = (row: WorkRowLike): string =>
  String((row as WorkRowLike & { canonical_work_item_id?: string | null }).canonical_work_item_id || row.progress_id || "")
    .trim();

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
    loadWorkLogData,
    myContractorId,
    isStaff,
  } = params;

  try {
    const bundle = await Promise.all([
      loadContractorFactScope({
        supabaseClient,
        workItemId: resolveCanonicalWorkItemId(row),
        myContractorId,
        isStaff,
      }).catch((error) => {
        recordContractorBootstrapFallback("load_fact_scope_failed", error, {
          action: "loadContractorFactScope",
          fallbackAction: "fact_error_state",
          progressId: String(row.progress_id || "").trim() || null,
        });
        return null as ContractorFactScope | null;
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
    ]);

    const [factScope, workLog, workStageOptions, initialMaterials] = bundle as [
      ContractorFactScope | null,
      WorkLogRow[],
      Array<{ code: string; name: string }>,
      WorkMaterialRow[],
    ];
    const headerResult: HeaderLoadResult = factScope
      ? {
          header: toJobHeader(factScope),
          objectNameOverride: factScope.row.location.objectName,
        }
      : {
          header: toFallbackJobHeader(row),
          objectNameOverride: String(row.object_name || "").trim() || null,
        };
    return {
      loadState: factScope ? "ready" : "error",
      jobHeader: headerResult?.header || null,
      objectNameOverride: String(headerResult?.objectNameOverride || "").trim() || null,
      workLog,
      workStageOptions,
      initialMaterials,
      warehouseIssuesState:
        factScope?.warehouseIssuesPanel ??
        contractorWarehouseIssuesErrorState("Не удалось загрузить выдачи со склада."),
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
      warehouseIssuesState: contractorWarehouseIssuesErrorState(
        "Не удалось загрузить выдачи со склада.",
      ),
    };
  }
}
