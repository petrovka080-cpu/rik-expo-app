import { UI } from "./warehouse.styles";
import type { WarehouseTabContentProps } from "./components/WarehouseTabContent";
import type { WarehouseScreenData } from "./hooks/useWarehouseScreenData";

export function selectWarehouseTabContentProps(
  data: WarehouseScreenData,
  deps: {
    listContentStyle: WarehouseTabContentProps["listContentStyle"];
    listOnScroll: WarehouseTabContentProps["listOnScroll"];
    listScrollEventThrottle: WarehouseTabContentProps["listScrollEventThrottle"];
    listRefreshControl: WarehouseTabContentProps["listRefreshControl"];
    onIncomingEndReached: () => void;
    renderIncomingItem: WarehouseTabContentProps["renderIncomingItem"];
    renderStockItem: WarehouseTabContentProps["renderStockItem"];
    onPickObject: () => void;
    onPickLevel: () => void;
    onPickSystem: () => void;
    onPickZone: () => void;
    onOpenRecipientModal: () => void;
    onReqEndReached: () => void;
    renderReqHeadItem: WarehouseTabContentProps["renderReqHeadItem"];
    onReportsBack: () => void;
    onReportsSelectMode: (m: "choice" | "issue" | "incoming") => void;
    reportsOnScroll: WarehouseTabContentProps["reportsOnScroll"];
    reportsScrollEventThrottle: WarehouseTabContentProps["reportsScrollEventThrottle"];
    onOpenRepPeriod: () => void;
    onReportsRefresh: () => void;
    onPdfRegisterPress: () => void;
    onPdfDocumentPress: (id: string | number) => void;
    onPdfMaterialsPress: () => void;
    onPdfObjectWorkPress: () => void;
    onPdfDayRegisterPress: (day: string) => void;
    onPdfDayMaterialsPress: (day: string) => void;
    isPdfBusy: (key: string) => boolean;
  },
): WarehouseTabContentProps {
  return {
    tab: data.tab,
    emptyColor: UI.sub,
    listContentStyle: deps.listContentStyle,
    listOnScroll: deps.listOnScroll,
    listScrollEventThrottle: deps.listScrollEventThrottle,
    listRefreshControl: deps.listRefreshControl,
    incomingData: data.incoming.toReceive,
    onIncomingEndReached: deps.onIncomingEndReached,
    incomingHasMore: data.incoming.toReceiveHasMore,
    incomingLoadingMore: data.incoming.toReceiveFetchingPage,
    renderIncomingItem: deps.renderIncomingItem,
    stockSupported: data.stockSupported,
    stockFiltered: data.stockFiltered,
    stockHasMore: data.stockHasMore,
    stockLoadingMore: data.stockLoadingMore,
    onStockEndReached: data.fetchStockNextPage,
    renderStockItem: deps.renderStockItem,
    objectOpt: data.objectOpt,
    levelOpt: data.levelOpt,
    systemOpt: data.systemOpt,
    zoneOpt: data.zoneOpt,
    onPickObject: deps.onPickObject,
    onPickLevel: deps.onPickLevel,
    onPickSystem: deps.onPickSystem,
    onPickZone: deps.onPickZone,
    onOpenRecipientModal: deps.onOpenRecipientModal,
    recipientText: data.rec.recipientText,
    stockSearch: data.stockSearch,
    onStockSearch: data.setStockSearch,
    stockPick: data.stockPickUi.stockPick,
    onRemovePick: data.stockPickUi.removeStockPickLine,
    issueBusy: data.issueBusy,
    onClearStockPick: data.stockPickUi.clearStockPick,
    onSubmitStockPick: data.submitStockPick,
    issueMsg: data.issueMsg,
    reqHeadsData: data.sortedReqHeads,
    onReqEndReached: deps.onReqEndReached,
    reqHeadsHasMore: data.reqHeadsHasMore,
    reqHeadsLoadingMore: data.reqHeadsFetchingPage && !data.reqHeadsLoading,
    renderReqHeadItem: deps.renderReqHeadItem,
    reqHeadsLoading: data.reqHeadsLoading,
    reqHeadsIntegrityState: data.reqHeadsIntegrityState,
    reqHeadsListState: data.reqHeadsListState,
    reportsHeaderTopPad: data.HEADER_MAX + 8,
    reportsMode: data.reportsMode,
    onReportsBack: deps.onReportsBack,
    onReportsSelectMode: deps.onReportsSelectMode,
    reportsOnScroll: deps.reportsOnScroll,
    reportsScrollEventThrottle: deps.reportsScrollEventThrottle,
    periodFrom: data.periodFrom,
    periodTo: data.periodTo,
    repStock: data.repStock,
    repMov: data.repMov,
    reportsUi: data.reportsUi,
    onOpenRepPeriod: deps.onOpenRepPeriod,
    onReportsRefresh: deps.onReportsRefresh,
    onPdfRegisterPress: deps.onPdfRegisterPress,
    onPdfDocumentPress: deps.onPdfDocumentPress,
    onPdfMaterialsPress: deps.onPdfMaterialsPress,
    onPdfObjectWorkPress: deps.onPdfObjectWorkPress,
    onPdfDayRegisterPress: deps.onPdfDayRegisterPress,
    onPdfDayMaterialsPress: deps.onPdfDayMaterialsPress,
    isPdfBusy: deps.isPdfBusy,
  };
}
