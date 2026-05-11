import { useCallback } from "react";

import type { SubcontractFlowScreen } from "../foremanSubcontractUi.store";

type ForemanSubcontractModalVisibilityParams = {
  setSubcontractFlowOpen: (open: boolean) => void;
  setSubcontractFlowScreen: (screen: SubcontractFlowScreen) => void;
  closeSubcontractFlowUi: () => void;
};

export function useForemanSubcontractModalVisibility({
  setSubcontractFlowOpen,
  setSubcontractFlowScreen,
  closeSubcontractFlowUi,
}: ForemanSubcontractModalVisibilityParams) {
  const openSubcontractFlow = useCallback((screen: SubcontractFlowScreen = "details") => {
    setSubcontractFlowScreen(screen);
    setSubcontractFlowOpen(true);
  }, [setSubcontractFlowOpen, setSubcontractFlowScreen]);

  const closeSubcontractFlow = useCallback(() => {
    closeSubcontractFlowUi();
  }, [closeSubcontractFlowUi]);

  return {
    openSubcontractFlow,
    closeSubcontractFlow,
  };
}
