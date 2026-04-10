import { useCallback } from "react";
import { showErr } from "../warehouse.utils";
import { useWarehouseLifecycle } from "./useWarehouseLifecycle";
import { useWarehouseTabEffects } from "./useWarehouseTabEffects";
import { useWarehousePickerUi } from "./useWarehousePickerUi";
import { useWarehouseReportPeriod } from "./useWarehouseReportPeriod";
import { useWarehouseListUi } from "./useWarehouseListUi";
import { useWarehouseListHandlers } from "./useWarehouseListHandlers";
import { useWarehouseReportActions } from "./useWarehouseReportActions";
import { useWarehouseRenderers } from "./useWarehouseRenderers";
import { useWarehousePickerActions } from "./useWarehousePickerActions";
import { useWarehouseModalsManagerProps } from "./useWarehouseModalsManagerProps";
import type { WarehouseScreenData } from "./useWarehouseScreenData";
import { selectWarehouseModalsManagerParams } from "../warehouse.modals.selectors";
import { selectWarehouseTabContentProps } from "../warehouse.tab.content.selectors";

export function useWarehouseScreenActions(data: WarehouseScreenData) {
  useWarehouseLifecycle({
    tab: data.tab,
    isScreenFocused: data.isScreenFocused,
    setLoading: data.setLoading,
    fetchToReceive: data.callFetchToReceive,
    fetchStock: data.callFetchStock,
    fetchReports: data.callFetchReports,
    onError: showErr,
  });

  useWarehouseTabEffects({
    tab: data.tab,
    isScreenFocused: data.isScreenFocused,
    periodFrom: data.periodFrom,
    periodTo: data.periodTo,
    fetchReports: data.fetchReports,
    onError: showErr,
  });

  const { pickOptions, pickTitle } = useWarehousePickerUi({
    pickWhat: data.pickModal.what,
    pickFilter: data.pickFilter,
    objectList: data.objectList,
    levelList: data.levelList,
    systemList: data.systemList,
    zoneList: data.zoneList,
    recipientList: data.recipientList,
  });

  const {
    applyReportPeriod,
    clearReportPeriod,
    closeReportPeriod,
    onOpenRepPeriod,
    onReportsRefresh,
    repPeriodUi,
  } = useWarehouseReportPeriod({
    setPeriodFrom: data.setPeriodFrom,
    setPeriodTo: data.setPeriodTo,
    setRepPeriodOpen: data.setRepPeriodOpen,
    fetchReports: data.fetchReports,
  });

  const onPickOption = useCallback((opt: { id: string; label: string }) => {
    if (data.pickModal.what === "recipient") {
      void data.rec.commitRecipient(opt.label);
      data.closePick();
      return;
    }
    data.applyPick(opt);
  }, [data]);

  const { listContentStyle, listRefreshControl, listOnScroll, listScrollEventThrottle, fmtRuDate } = useWarehouseListUi({
    headerMax: data.HEADER_MAX,
    refreshing: data.refreshing,
    onRefresh: data.onRefresh,
    isWeb: data.isWeb,
    onListScroll: data.headerApi.onListScroll,
  });

  const {
    onIncomingEndReached,
    closeItemsModal,
    onPickRecipient,
    closeIncomingDetails,
    onIncomingItemsSubmit,
  } = useWarehouseListHandlers({
    toReceiveHasMore: data.incoming.toReceiveHasMore,
    toReceiveIsFetching: data.incoming.toReceiveIsFetching,
    toReceivePage: data.incoming.toReceivePage,
    fetchToReceivePage: data.callFetchToReceive,
    setItemsModal: data.setItemsModal,
    commitRecipient: data.rec.commitRecipient,
    closeIncomingDetailsRaw: data.reportsUi.closeIncomingDetails,
    receiveSelectedForHead: data.receiveSelectedForHead,
  });

  const {
    onReportsBack,
    onReportsSelectMode,
    onPdfRegisterPress,
    onPdfDocumentPress,
    onPdfMaterialsPress,
    onPdfObjectWorkPress,
    onPdfDayRegisterPress,
    onPdfDayMaterialsPress,
    reportsOnScroll,
    reportsScrollEventThrottle,
  } = useWarehouseReportActions({
    isWeb: data.isWeb,
    onListScroll: data.headerApi.onListScroll,
    setReportsMode: data.setReportsMode,
    onPdfRegister: data.onPdfRegister,
    onPdfDocument: data.onPdfDocument,
    onPdfMaterials: data.onPdfMaterials,
    onPdfObjectWork: data.onPdfObjectWork,
    onPdfDayRegister: data.onPdfDayRegister,
    onPdfDayMaterials: data.onPdfDayMaterials,
  });

  const getReceiveStatusText = useCallback((incomingId: string) => {
    const status = data.receiveStatusByIncomingId[String(incomingId ?? "").trim()];
    if (!status) return null;
    if (status.tone === "neutral" || status.tone === "success") return null;
    return status.label;
  }, [data.receiveStatusByIncomingId]);

  const { renderReqHeadItem, renderIncomingItem, renderStockItem } = useWarehouseRenderers({
    openReq: data.openReq,
    fmtRuDate,
    openItemsModal: data.openItemsModal,
    getReceiveStatusText,
    getPickedQty: data.stockPickUi.getPickedQty,
    openStockIssue: data.stockPickUi.openStockIssue,
  });

  const { onPickObject, onPickLevel, onPickSystem, onPickZone, onOpenRecipientModal } = useWarehousePickerActions({
    setPickModal: data.setPickModal,
    setIsRecipientModalVisible: data.setIsRecipientModalVisible,
  });

  const modalsManagerProps = useWarehouseModalsManagerProps(
    selectWarehouseModalsManagerParams(data, {
      closeItemsModal,
      onIncomingItemsSubmit,
      closeIncomingDetails,
      onPickOption,
      closeReportPeriod,
      applyReportPeriod,
      clearReportPeriod,
      repPeriodUi,
      pickOptions,
      pickTitle,
      onPickRecipient,
    })
  );

  const tabContentProps = selectWarehouseTabContentProps(data, {
    listContentStyle,
    listOnScroll,
    listScrollEventThrottle,
    listRefreshControl,
    onIncomingEndReached,
    renderIncomingItem,
    renderStockItem,
    onPickObject,
    onPickLevel,
    onPickSystem,
    onPickZone,
    onOpenRecipientModal,
    onReqEndReached: data.onReqEndReached,
    renderReqHeadItem,
    onReportsBack,
    onReportsSelectMode,
    reportsOnScroll,
    reportsScrollEventThrottle,
    onOpenRepPeriod,
    onReportsRefresh,
    onPdfRegisterPress,
    onPdfDocumentPress,
    onPdfMaterialsPress,
    onPdfObjectWorkPress,
    onPdfDayRegisterPress,
    onPdfDayMaterialsPress,
    isPdfBusy: data.isPdfBusy,
  });

  return { tabContentProps, modalsManagerProps };
}
