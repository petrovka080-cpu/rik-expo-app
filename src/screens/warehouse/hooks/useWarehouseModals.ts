import { useWarehouseUiStore } from "../warehouseUi.store";

export type WarehouseReportsMode = "choice" | "issue" | "incoming";

export function useWarehouseModals() {
  const isRecipientModalVisible = useWarehouseUiStore((state) => state.isRecipientModalVisible);
  const setIsRecipientModalVisible = useWarehouseUiStore((state) => state.setIsRecipientModalVisible);
  const reportsMode = useWarehouseUiStore((state) => state.reportsMode);
  const setReportsMode = useWarehouseUiStore((state) => state.setReportsMode);
  const issueDetailsId = useWarehouseUiStore((state) => state.issueDetailsId);
  const setIssueDetailsId = useWarehouseUiStore((state) => state.setIssueDetailsId);
  const incomingDetailsId = useWarehouseUiStore((state) => state.incomingDetailsId);
  const setIncomingDetailsId = useWarehouseUiStore((state) => state.setIncomingDetailsId);
  const repPeriodOpen = useWarehouseUiStore((state) => state.repPeriodOpen);
  const setRepPeriodOpen = useWarehouseUiStore((state) => state.setRepPeriodOpen);

  return {
    isRecipientModalVisible,
    setIsRecipientModalVisible,
    reportsMode,
    setReportsMode,
    issueDetailsId,
    setIssueDetailsId,
    incomingDetailsId,
    setIncomingDetailsId,
    repPeriodOpen,
    setRepPeriodOpen,
  };
}
