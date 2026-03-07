import { useWarehouseScreenActions } from "./useWarehouseScreenActions";
import { useWarehouseScreenData } from "./useWarehouseScreenData";

export function useWarehouseScreenController() {
  const data = useWarehouseScreenData();
  const actions = useWarehouseScreenActions(data);

  return {
    isWeb: data.isWeb,
    loading: data.loading,
    tab: data.tab,
    onTabChange: data.onTabChange,
    incomingCount: data.incoming.incomingCount,
    stockCount: data.stockCount,
    titleSize: data.headerApi.titleSize,
    warehousemanFio: data.warehousemanFio,
    onOpenFioModal: () => data.setIsFioConfirmVisible(true),
    headerHeight: data.headerApi.headerHeight,
    headerTranslateY: data.headerApi.headerTranslateY,
    headerShadowSafe: data.headerApi.headerShadowSafe,
    tabContentProps: actions.tabContentProps,
    modalsManagerProps: actions.modalsManagerProps,
  };
}
