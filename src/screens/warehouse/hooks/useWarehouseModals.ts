import { useWarehouseUiStore } from "../warehouseUi.store";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

export type WarehouseReportsMode = "choice" | "issue" | "incoming";

export function useWarehouseModals(params?: {
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const screenActiveRef = useWarehouseFallbackActiveRef(
    params?.screenActiveRef,
  );
  const isRecipientModalVisible = useWarehouseUiStore(
    (state) => state.isRecipientModalVisible,
  );
  const setIsRecipientModalVisibleRaw = useWarehouseUiStore(
    (state) => state.setIsRecipientModalVisible,
  );
  const reportsMode = useWarehouseUiStore((state) => state.reportsMode);
  const setReportsModeRaw = useWarehouseUiStore(
    (state) => state.setReportsMode,
  );
  const issueDetailsId = useWarehouseUiStore((state) => state.issueDetailsId);
  const setIssueDetailsIdRaw = useWarehouseUiStore(
    (state) => state.setIssueDetailsId,
  );
  const incomingDetailsId = useWarehouseUiStore(
    (state) => state.incomingDetailsId,
  );
  const setIncomingDetailsIdRaw = useWarehouseUiStore(
    (state) => state.setIncomingDetailsId,
  );
  const repPeriodOpen = useWarehouseUiStore((state) => state.repPeriodOpen);
  const setRepPeriodOpenRaw = useWarehouseUiStore(
    (state) => state.setRepPeriodOpen,
  );

  const guard =
    <T>(setter: (value: T) => void) =>
    (value: T) => {
      if (isWarehouseScreenActive(screenActiveRef)) setter(value);
    };
  const setIsRecipientModalVisible = guard(setIsRecipientModalVisibleRaw);
  const setReportsMode = guard(setReportsModeRaw);
  const setIssueDetailsId = guard(setIssueDetailsIdRaw);
  const setIncomingDetailsId = guard(setIncomingDetailsIdRaw);
  const setRepPeriodOpen = guard(setRepPeriodOpenRaw);

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
