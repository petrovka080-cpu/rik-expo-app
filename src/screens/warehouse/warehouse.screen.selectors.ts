import type { WarehouseHeaderApi } from "./components/WarehouseHeader";
import type { Tab } from "./warehouse.types";
import type { useWarehouseScreenActions } from "./hooks/useWarehouseScreenActions";
import type { useWarehouseScreenData } from "./hooks/useWarehouseScreenData";

type WarehouseAnimNum = WarehouseHeaderApi["titleSize"];

export function selectWarehouseHeaderProps(vm: {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  incomingCount: number;
  stockCount: number;
  titleSize: WarehouseAnimNum;
  warehousemanFio?: string;
  onOpenFioModal: () => void;
}) {
  return {
    tab: vm.tab,
    onTab: vm.onTabChange,
    incomingCount: vm.incomingCount,
    stockCount: vm.stockCount,
    titleSize: vm.titleSize,
    warehousemanFio: vm.warehousemanFio,
    onOpenFioModal: vm.onOpenFioModal,
  };
}

export function selectWarehouseScreenMode(vm: {
  loading: boolean;
  warehousemanFio?: string;
  isFioConfirmVisible: boolean;
}) {
  if (vm.loading) return "loading" as const;
  if (!vm.warehousemanFio && vm.isFioConfirmVisible) return "fio_gate" as const;
  return "content" as const;
}

export function selectWarehouseScreenStateText(mode: "loading" | "fio_gate" | "content") {
  if (mode === "loading") {
    return {
      title: "Загрузка...",
      subtitle: "",
    };
  }

  if (mode === "fio_gate") {
    return {
      title: "Пожалуйста, представьтесь для доступа к складу",
      subtitle: "Это необходимо для формирования документов.",
    };
  }

  return {
    title: "",
    subtitle: "",
  };
}

export function selectWarehouseScreenControllerVm(params: {
  data: ReturnType<typeof useWarehouseScreenData>;
  actions: ReturnType<typeof useWarehouseScreenActions>;
}) {
  const { data, actions } = params;

  return {
    isWeb: data.isWeb,
    loading: data.loading,
    tab: data.tab,
    onTabChange: data.onTabChange,
    incomingCount: data.incoming.incomingCount,
    stockCount: data.stockCount,
    titleSize: data.headerApi.titleSize,
    warehousemanFio: data.warehousemanFio,
    isFioConfirmVisible: data.isFioConfirmVisible,
    onOpenFioModal: () => data.setIsFioConfirmVisible(true),
    headerHeight: data.headerApi.headerHeight,
    headerTranslateY: data.headerApi.headerTranslateY,
    headerShadowSafe: data.headerApi.headerShadowSafe,
    tabContentProps: actions.tabContentProps,
    modalsManagerProps: actions.modalsManagerProps,
  };
}
