import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { WarehouseIssuesPanelState } from "../../../lib/api/contractor.scope.service";
import { useContractorModalFlow } from "../contractor.modalFlow";

type WorkOverlayModal = "none" | "contract" | "estimate" | "stage";
type ScreenLoadState = "init" | "loading" | "ready" | "error";

export function useContractorWorkModals(params: {
  workModalBootSeqRef: MutableRefObject<number>;
  issuedLoadSeqRef: MutableRefObject<number>;
  activeWorkModalProgressRef: MutableRefObject<string>;
  clearWorkSearchState: () => void;
  setWarehouseIssuesState: Dispatch<SetStateAction<WarehouseIssuesPanelState>>;
  setWorkOverlayModal: Dispatch<SetStateAction<WorkOverlayModal>>;
  setActBuilderLoadState: Dispatch<SetStateAction<ScreenLoadState>>;
  setWorkModalLoading: Dispatch<SetStateAction<boolean>>;
  setWorkModalVisible: Dispatch<SetStateAction<boolean>>;
  workModalVisible: boolean;
  actBuilderVisible: boolean;
  setActBuilderVisible: Dispatch<SetStateAction<boolean>>;
}) {
  const {
    workModalBootSeqRef,
    issuedLoadSeqRef,
    activeWorkModalProgressRef,
    clearWorkSearchState,
    setWarehouseIssuesState,
    setWorkOverlayModal,
    setActBuilderLoadState,
    setWorkModalLoading,
    setWorkModalVisible,
    workModalVisible,
    actBuilderVisible,
    setActBuilderVisible,
  } = params;

  const closeWorkModal = useCallback(() => {
    workModalBootSeqRef.current += 1;
    issuedLoadSeqRef.current += 1;
    activeWorkModalProgressRef.current = "";
    clearWorkSearchState();
    setWarehouseIssuesState({ status: "idle" });
    setWorkOverlayModal("none");
    setActBuilderLoadState("init");
    setWorkModalLoading(false);
    setWorkModalVisible(false);
  }, [
    workModalBootSeqRef,
    issuedLoadSeqRef,
    activeWorkModalProgressRef,
    clearWorkSearchState,
    setWarehouseIssuesState,
    setWorkOverlayModal,
    setActBuilderLoadState,
    setWorkModalLoading,
    setWorkModalVisible,
  ]);

  const openContractDetailsModal = useCallback(() => {
    setWorkOverlayModal("contract");
  }, [setWorkOverlayModal]);

  const openEstimateMaterialsModal = useCallback(() => {
    setWorkOverlayModal("estimate");
  }, [setWorkOverlayModal]);

  const closeWorkOverlayModal = useCallback(() => {
    setWorkOverlayModal("none");
  }, [setWorkOverlayModal]);

  const closeContractDetailsModal = closeWorkOverlayModal;
  const closeEstimateMaterialsModal = closeWorkOverlayModal;
  const closeWorkStagePickerModal = closeWorkOverlayModal;

  const { onAnyModalDismissed, queueAfterClosingModals } = useContractorModalFlow({
    workModalVisible,
    actBuilderVisible,
    closeWorkModal,
    closeActBuilder: () => setActBuilderVisible(false),
  });

  return {
    closeWorkModal,
    openContractDetailsModal,
    openEstimateMaterialsModal,
    closeContractDetailsModal,
    closeEstimateMaterialsModal,
    closeWorkStagePickerModal,
    onAnyModalDismissed,
    queueAfterClosingModals,
  };
}
