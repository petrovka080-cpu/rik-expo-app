import { useForemanUiStore } from "../foremanUi.store";

export function useForemanBaseUi() {
  const isFioConfirmVisible = useForemanUiStore((state) => state.isFioConfirmVisible);
  const setIsFioConfirmVisible = useForemanUiStore((state) => state.setIsFioConfirmVisible);
  const isFioLoading = useForemanUiStore((state) => state.isFioLoading);
  const setIsFioLoading = useForemanUiStore((state) => state.setIsFioLoading);
  const fioBootstrapScopeKey = useForemanUiStore((state) => state.fioBootstrapScopeKey);
  const setFioBootstrapScopeKey = useForemanUiStore((state) => state.setFioBootstrapScopeKey);
  const foremanHistory = useForemanUiStore((state) => state.foremanHistory);
  const setForemanHistory = useForemanUiStore((state) => state.setForemanHistory);
  const foremanMainTab = useForemanUiStore((state) => state.foremanMainTab);
  const setForemanMainTab = useForemanUiStore((state) => state.setForemanMainTab);
  const headerAttention = useForemanUiStore((state) => state.headerAttention);
  const setHeaderAttention = useForemanUiStore((state) => state.setHeaderAttention);
  const selectedObjectName = useForemanUiStore((state) => state.selectedObjectName);
  const setSelectedObjectName = useForemanUiStore((state) => state.setSelectedObjectName);

  return {
    isFioConfirmVisible,
    setIsFioConfirmVisible,
    isFioLoading,
    setIsFioLoading,
    fioBootstrapScopeKey,
    setFioBootstrapScopeKey,
    foremanHistory,
    setForemanHistory,
    foremanMainTab,
    setForemanMainTab,
    headerAttention,
    setHeaderAttention,
    selectedObjectName,
    setSelectedObjectName,
  };
}
