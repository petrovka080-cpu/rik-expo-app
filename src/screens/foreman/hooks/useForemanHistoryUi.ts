import { useForemanHistoryStore } from "../foremanHistory.store";

export function useForemanHistoryUi() {
  const requestHistoryVisible = useForemanHistoryStore((state) => state.requestHistoryVisible);
  const setRequestHistoryVisible = useForemanHistoryStore((state) => state.setRequestHistoryVisible);
  const requestHistoryLoading = useForemanHistoryStore((state) => state.requestHistoryLoading);
  const setRequestHistoryLoading = useForemanHistoryStore((state) => state.setRequestHistoryLoading);
  const requestHistoryMode = useForemanHistoryStore((state) => state.requestHistoryMode);
  const setRequestHistoryMode = useForemanHistoryStore((state) => state.setRequestHistoryMode);
  const selectedHistoryRequestId = useForemanHistoryStore((state) => state.selectedHistoryRequestId);
  const setSelectedHistoryRequestId = useForemanHistoryStore((state) => state.setSelectedHistoryRequestId);
  const openRequestHistory = useForemanHistoryStore((state) => state.openRequestHistory);
  const closeRequestHistory = useForemanHistoryStore((state) => state.closeRequestHistory);
  const showRequestHistoryDetails = useForemanHistoryStore((state) => state.showRequestHistoryDetails);
  const backToRequestHistoryList = useForemanHistoryStore((state) => state.backToRequestHistoryList);
  const subcontractHistoryVisible = useForemanHistoryStore((state) => state.subcontractHistoryVisible);
  const setSubcontractHistoryVisible = useForemanHistoryStore((state) => state.setSubcontractHistoryVisible);
  const subcontractHistoryLoading = useForemanHistoryStore((state) => state.subcontractHistoryLoading);
  const setSubcontractHistoryLoading = useForemanHistoryStore((state) => state.setSubcontractHistoryLoading);
  const openSubcontractHistory = useForemanHistoryStore((state) => state.openSubcontractHistory);
  const closeSubcontractHistory = useForemanHistoryStore((state) => state.closeSubcontractHistory);
  const historyReopenBusyId = useForemanHistoryStore((state) => state.historyReopenBusyId);
  const setHistoryReopenBusyId = useForemanHistoryStore((state) => state.setHistoryReopenBusyId);
  const refreshReason = useForemanHistoryStore((state) => state.refreshReason);
  const setRefreshReason = useForemanHistoryStore((state) => state.setRefreshReason);

  return {
    requestHistoryVisible,
    setRequestHistoryVisible,
    requestHistoryLoading,
    setRequestHistoryLoading,
    requestHistoryMode,
    setRequestHistoryMode,
    selectedHistoryRequestId,
    setSelectedHistoryRequestId,
    openRequestHistory,
    closeRequestHistory,
    showRequestHistoryDetails,
    backToRequestHistoryList,
    subcontractHistoryVisible,
    setSubcontractHistoryVisible,
    subcontractHistoryLoading,
    setSubcontractHistoryLoading,
    openSubcontractHistory,
    closeSubcontractHistory,
    historyReopenBusyId,
    setHistoryReopenBusyId,
    refreshReason,
    setRefreshReason,
  };
}
