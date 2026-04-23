import { useCallback } from "react";
import { Alert } from "react-native";
import {
  buildActBuilderMaterialItems,
  buildActBuilderWorkItems,
  resolveActBuilderRowsScope,
} from "../contractor.actBuilder";
import { ensureActBuilderWorkMaterials } from "../contractor.actBuilderOpenService";
import { inferUnitByWorkName } from "../contractor.utils";
import type { ContractorWorkRow } from "../contractor.loadWorksService";
import type { IssuedItemRow } from "../types";
import type { WorkMaterialRow } from "../../../components/WorkMaterialsEditor";

type ScreenLoadState = "init" | "loading" | "ready" | "error";

type JobHeaderLike = {
  object_name?: string | null;
  work_type?: string | null;
  unit_price?: number | null;
};

type ActBuilderDispatch = (action: {
  type: "SET_ALL";
  payload: { items: any[]; works: any[] };
}) => void;

const ACT_BUILDER_DATA_MISSING_TITLE = "Данные не загружены";
const ACT_BUILDER_DATA_MISSING_MESSAGE = "Данные подряда не загружены";
const ACT_BUILDER_LOADING_TITLE = "Загрузка";
const ACT_BUILDER_LOADING_MESSAGE = "Дождитесь загрузки данных подряда";
const ACT_BUILDER_LOADING_HINT = "Загрузка данных подряда...";

export function useContractorActBuilderOpen(params: {
  supabaseClient: any;
  workModalRow: ContractorWorkRow | null;
  workModalLoading: boolean;
  loadingIssued: boolean;
  issuedItems: IssuedItemRow[];
  workModalMaterials: WorkMaterialRow[];
  rows: ContractorWorkRow[];
  jobHeader: JobHeaderLike | null;
  workModalVisible: boolean;
  toHumanWork: (raw: string | null | undefined) => string;
  resolveContractorJobId: (row: ContractorWorkRow) => Promise<string>;
  resolveRequestId: (row: ContractorWorkRow) => Promise<string>;
  looksLikeUuid: (value: unknown) => boolean;
  isRejectedOrCancelledRequestStatus: (status: unknown) => boolean;
  pickFirstNonEmpty: (...values: (string | null | undefined)[]) => string | null;
  queueAfterClosingModals: (fn: () => void, options?: { closeWork?: boolean }) => void;
  setActBuilderVisible: (next: boolean) => void;
  setActBuilderLoadState: (next: ScreenLoadState) => void;
  setActBuilderHint: (next: string) => void;
  setWorkModalMaterials: (updater: WorkMaterialRow[] | ((prev: WorkMaterialRow[]) => WorkMaterialRow[])) => void;
  dispatchActBuilder: ActBuilderDispatch;
}) {
  const {
    supabaseClient,
    workModalRow,
    workModalLoading,
    loadingIssued,
    issuedItems,
    workModalMaterials,
    rows,
    jobHeader,
    workModalVisible,
    toHumanWork,
    resolveContractorJobId,
    resolveRequestId,
    looksLikeUuid,
    isRejectedOrCancelledRequestStatus,
    pickFirstNonEmpty,
    queueAfterClosingModals,
    setActBuilderVisible,
    setActBuilderLoadState,
    setActBuilderHint,
    setWorkModalMaterials,
    dispatchActBuilder,
  } = params;

  const openActBuilder = useCallback(async () => {
    if (!workModalRow) {
      setActBuilderLoadState("error");
      setActBuilderHint(ACT_BUILDER_DATA_MISSING_MESSAGE);
      Alert.alert(ACT_BUILDER_DATA_MISSING_TITLE, ACT_BUILDER_DATA_MISSING_MESSAGE);
      return;
    }
    if (workModalLoading || loadingIssued) {
      setActBuilderLoadState("loading");
      setActBuilderHint(ACT_BUILDER_LOADING_HINT);
      Alert.alert(ACT_BUILDER_LOADING_TITLE, ACT_BUILDER_LOADING_MESSAGE);
      return;
    }

    setActBuilderLoadState("loading");
    const ensured = await ensureActBuilderWorkMaterials({
      supabaseClient,
      row: workModalRow,
      currentMaterials: workModalMaterials,
      looksLikeUuid,
      resolveContractorJobId,
      resolveRequestId,
      isRejectedOrCancelledRequestStatus,
    });
    if (ensured.fatalError) {
      setActBuilderLoadState("error");
      setActBuilderHint(ACT_BUILDER_DATA_MISSING_MESSAGE);
      Alert.alert(ACT_BUILDER_DATA_MISSING_TITLE, ensured.fatalError);
      return;
    }

    const ensuredWorkMaterials = ensured.materials || [];
    if (ensuredWorkMaterials !== workModalMaterials) {
      setWorkModalMaterials(ensuredWorkMaterials);
    }

    const nextItems = buildActBuilderMaterialItems(issuedItems, ensuredWorkMaterials);
    const rowsForJob = resolveActBuilderRowsScope(rows, workModalRow);
    const nextWorks = buildActBuilderWorkItems(
      rowsForJob,
      (value) => toHumanWork(value),
      inferUnitByWorkName,
      jobHeader,
    );

    dispatchActBuilder({
      type: "SET_ALL",
      payload: { items: nextItems, works: nextWorks },
    });

    const resolvedObjectName = pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";
    const hasHeader = !!jobHeader;
    const hasObject = !!String(resolvedObjectName || "").trim();
    const hasWorks = nextWorks.length > 0;
    if (!hasHeader || !hasObject || !hasWorks) {
      setActBuilderLoadState("error");
      setActBuilderHint(ACT_BUILDER_DATA_MISSING_MESSAGE);
      Alert.alert(ACT_BUILDER_DATA_MISSING_TITLE, ACT_BUILDER_DATA_MISSING_MESSAGE);
      return;
    }

    setActBuilderLoadState("ready");
    setActBuilderHint("");
    if (workModalVisible) {
      queueAfterClosingModals(
        () => {
          setActBuilderVisible(true);
        },
        { closeWork: true },
      );
      return;
    }
    setActBuilderVisible(true);
  }, [
    workModalRow,
    workModalLoading,
    loadingIssued,
    supabaseClient,
    workModalMaterials,
    looksLikeUuid,
    resolveContractorJobId,
    resolveRequestId,
    isRejectedOrCancelledRequestStatus,
    setActBuilderLoadState,
    setActBuilderHint,
    setWorkModalMaterials,
    issuedItems,
    rows,
    toHumanWork,
    jobHeader,
    dispatchActBuilder,
    pickFirstNonEmpty,
    workModalVisible,
    queueAfterClosingModals,
    setActBuilderVisible,
  ]);

  return { openActBuilder };
}
