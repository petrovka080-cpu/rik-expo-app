import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { WorkMaterialRow } from "../../../components/WorkMaterialsEditor";
import { bootstrapWorkModalData } from "../contractor.workModalBootstrap";
import type { ContractorWorkRow } from "../contractor.loadWorksService";
import type { IssuedItemRow, LinkedReqCard, WorkLogRow } from "../types";

type WorkOverlayModal = "none" | "contract" | "estimate" | "stage";
type ScreenLoadState = "init" | "loading" | "ready" | "error";

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

type Params = {
  supabaseClient: any;
  rows: ContractorWorkRow[];
  clearSearchState: () => void;
  resolveContractorJobId: (row: ContractorWorkRow) => Promise<string>;
  resolveRequestId: (row: ContractorWorkRow) => Promise<string>;
  loadWorkLogData: (progressId: string) => Promise<WorkLogRow[]>;
  isRejectedOrCancelledRequestStatus: (status: unknown) => boolean;
  toLocalDateKey: (value: unknown) => string;
  normText: (value: unknown) => string;
  workModalBootSeqRef: MutableRefObject<number>;
  activeWorkModalProgressRef: MutableRefObject<string>;
  setWorkModalRow: Dispatch<SetStateAction<ContractorWorkRow | null>>;
  setWorkModalStage: Dispatch<SetStateAction<string>>;
  setWorkModalComment: Dispatch<SetStateAction<string>>;
  setWorkModalLocation: Dispatch<SetStateAction<string>>;
  setWorkModalReadOnly: Dispatch<SetStateAction<boolean>>;
  setWorkSearchVisible: Dispatch<SetStateAction<boolean>>;
  setWorkModalHint: Dispatch<SetStateAction<string>>;
  setActBuilderHint: Dispatch<SetStateAction<string>>;
  setActBuilderLoadState: Dispatch<SetStateAction<ScreenLoadState>>;
  setWorkModalVisible: Dispatch<SetStateAction<boolean>>;
  setWorkModalLoading: Dispatch<SetStateAction<boolean>>;
  setLoadingIssued: Dispatch<SetStateAction<boolean>>;
  setHistoryOpen: Dispatch<SetStateAction<boolean>>;
  setIssuedOpen: Dispatch<SetStateAction<boolean>>;
  setWorkOverlayModal: Dispatch<SetStateAction<WorkOverlayModal>>;
  setJobHeader: Dispatch<SetStateAction<ContractorJobHeader | null>>;
  setWorkLog: Dispatch<SetStateAction<WorkLogRow[]>>;
  setWorkStageOptions: Dispatch<SetStateAction<{ code: string; name: string }[]>>;
  setWorkModalMaterials: Dispatch<SetStateAction<WorkMaterialRow[]>>;
  setIssuedItems: Dispatch<SetStateAction<IssuedItemRow[]>>;
  setLinkedReqCards: Dispatch<SetStateAction<LinkedReqCard[]>>;
  setIssuedHint: Dispatch<SetStateAction<string>>;
};

export function useContractorWorkModalOpen(params: Params) {
  const {
    supabaseClient,
    rows,
    clearSearchState,
    resolveContractorJobId,
    resolveRequestId,
    loadWorkLogData,
    isRejectedOrCancelledRequestStatus,
    toLocalDateKey,
    normText,
    workModalBootSeqRef,
    activeWorkModalProgressRef,
    setWorkModalRow,
    setWorkModalStage,
    setWorkModalComment,
    setWorkModalLocation,
    setWorkModalReadOnly,
    setWorkSearchVisible,
    setWorkModalHint,
    setActBuilderHint,
    setActBuilderLoadState,
    setWorkModalVisible,
    setWorkModalLoading,
    setLoadingIssued,
    setHistoryOpen,
    setIssuedOpen,
    setWorkOverlayModal,
    setJobHeader,
    setWorkLog,
    setWorkStageOptions,
    setWorkModalMaterials,
    setIssuedItems,
    setLinkedReqCards,
    setIssuedHint,
  } = params;

  const openWorkAddModal = useCallback(
    (row: ContractorWorkRow, readOnly: boolean = false) => {
      const openSeq = ++workModalBootSeqRef.current;
      activeWorkModalProgressRef.current = String(row.progress_id || "").trim();
      setWorkModalRow(row);
      setWorkModalStage("");
      setWorkModalComment("");
      setWorkModalLocation("");
      setWorkModalReadOnly(readOnly);
      setWorkSearchVisible(false);
      clearSearchState();
      setWorkModalHint("");
      setActBuilderHint("");
      setActBuilderLoadState("init");
      setWorkModalVisible(true);
      setWorkModalLoading(true);
      setLoadingIssued(true);
      setHistoryOpen(false);
      setIssuedOpen(false);
      setWorkOverlayModal("none");
      setJobHeader(null);
      setWorkLog([]);
      setWorkStageOptions([]);
      setWorkModalMaterials([]);
      setIssuedItems([]);
      setLinkedReqCards([]);
      setIssuedHint("");

      (async () => {
        try {
          const bundle = await bootstrapWorkModalData({
            supabaseClient,
            row,
            readOnly,
            allRows: rows,
            resolveContractorJobId,
            resolveRequestId,
            loadWorkLogData,
            isRejectedOrCancelledRequestStatus,
            toLocalDateKey,
            normText,
          });

          const isCurrent =
            openSeq === workModalBootSeqRef.current &&
            activeWorkModalProgressRef.current === String(row.progress_id || "").trim();
          if (!isCurrent) return;

          setJobHeader(bundle.jobHeader);
          if (String(bundle.objectNameOverride || "").trim()) {
            setWorkModalRow((prev) =>
              prev ? { ...prev, object_name: String(bundle.objectNameOverride) } : prev,
            );
          }
          setWorkLog(bundle.workLog);
          setWorkStageOptions(bundle.workStageOptions);
          if (!readOnly) setWorkModalMaterials(bundle.initialMaterials as WorkMaterialRow[]);
          setIssuedItems(bundle.issuedData.issuedItems || []);
          setLinkedReqCards(bundle.issuedData.linkedReqCards || []);
          setIssuedHint(String(bundle.issuedData.issuedHint || ""));
          if (bundle.loadState !== "ready") {
            setWorkModalHint("\u0414\u0430\u043d\u043d\u044b\u0435 \u043f\u043e\u0434\u0440\u044f\u0434\u0430 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u044b \u043d\u0435 \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e.");
          }
        } finally {
          const isCurrent =
            openSeq === workModalBootSeqRef.current &&
            activeWorkModalProgressRef.current === String(row.progress_id || "").trim();
          if (!isCurrent) return;
          setLoadingIssued(false);
          setWorkModalLoading(false);
        }
      })();
    },
    [
      workModalBootSeqRef,
      activeWorkModalProgressRef,
      setWorkModalRow,
      setWorkModalStage,
      setWorkModalComment,
      setWorkModalLocation,
      setWorkModalReadOnly,
      setWorkSearchVisible,
      clearSearchState,
      setWorkModalHint,
      setActBuilderHint,
      setActBuilderLoadState,
      setWorkModalVisible,
      setWorkModalLoading,
      setLoadingIssued,
      setHistoryOpen,
      setIssuedOpen,
      setWorkOverlayModal,
      setJobHeader,
      setWorkLog,
      setWorkStageOptions,
      setWorkModalMaterials,
      setIssuedItems,
      setLinkedReqCards,
      setIssuedHint,
      supabaseClient,
      rows,
      resolveContractorJobId,
      resolveRequestId,
      loadWorkLogData,
      isRejectedOrCancelledRequestStatus,
      toLocalDateKey,
      normText,
    ],
  );

  return { openWorkAddModal };
}
