import type { WarehouseModalsManagerProps } from "./components/WarehouseModalsManager";
import type { WarehouseScreenData } from "./hooks/useWarehouseScreenData";

export function selectWarehouseModalsManagerParams(
  data: WarehouseScreenData,
  deps: {
    closeItemsModal: () => void;
    onIncomingItemsSubmit: WarehouseModalsManagerProps["onIncomingItemsSubmit"];
    closeIncomingDetails: () => void;
    onPickOption: WarehouseModalsManagerProps["onPickOption"];
    closeReportPeriod: WarehouseModalsManagerProps["closeReportPeriod"];
    applyReportPeriod: WarehouseModalsManagerProps["applyReportPeriod"];
    clearReportPeriod: WarehouseModalsManagerProps["clearReportPeriod"];
    repPeriodUi: WarehouseModalsManagerProps["repPeriodUi"];
    pickOptions: WarehouseModalsManagerProps["pickOptions"];
    pickTitle: WarehouseModalsManagerProps["pickTitle"];
    onPickRecipient: (name: string) => void;
  },
): Omit<WarehouseModalsManagerProps, "onCloseRecipientModal" | "onConfirmRecipientModal"> & {
  setIsRecipientModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onPickRecipient: (name: string) => void;
} {
  return {
    stockIssueModal: data.stockPickUi.stockIssueModal,
    stockIssueQty: data.stockPickUi.stockIssueQty,
    setStockIssueQty: data.stockPickUi.setStockIssueQty,
    issueBusy: data.issueBusy,
    addStockPickLine: data.stockPickUi.addStockPickLine,
    closeStockIssue: data.stockPickUi.closeStockIssue,
    itemsModal: data.itemsModal,
    onCloseItemsModal: deps.closeItemsModal,
    proposalNoByPurchase: data.incoming.proposalNoByPurchase,
    itemsByHead: data.incoming.itemsByHead,
    kbH: data.kbH,
    qtyInputByItem: data.qtyInputByItem,
    setQtyInputByItem: data.setQtyInputByItem,
    receivingHeadId: data.receivingHeadId,
    onIncomingItemsSubmit: deps.onIncomingItemsSubmit,
    issueDetailsId: data.issueDetailsId,
    issueLinesLoadingId: data.issueLinesLoadingId,
    issueLinesById: data.issueLinesById,
    matNameByCode: data.matNameByCode,
    onCloseIssueDetails: data.reportsUi.closeIssueDetails,
    incomingDetailsId: data.incomingDetailsId,
    incomingLinesLoadingId: data.incomingLinesLoadingId,
    incomingLinesById: data.incomingLinesById,
    onCloseIncomingDetails: deps.closeIncomingDetails,
    reqModal: data.reqModal,
    onCloseReqModal: data.closeReq,
    reqItems: data.reqItems,
    reqItemsLoading: data.reqItemsLoading,
    reqQtyInputByItem: data.reqPickUi.reqQtyInputByItem,
    setReqQtyInputByItem: data.reqPickUi.setReqQtyInputByItem,
    recipientText: data.rec.recipientText,
    addReqPickLine: data.reqPickUi.addReqPickLine,
    submitReqPick: data.submitReqPick,
    reqPick: data.reqPickUi.reqPick,
    removeReqPickLine: data.reqPickUi.removeReqPickLine,
    issueMsg: data.issueMsg,
    pickVisible: !!data.pickModal.what,
    pickTitle: deps.pickTitle,
    pickFilter: data.pickFilter,
    setPickFilter: data.setPickFilter,
    pickOptions: deps.pickOptions,
    onPickOption: deps.onPickOption,
    closePick: data.closePick,
    repPeriodOpen: data.repPeriodOpen,
    closeReportPeriod: deps.closeReportPeriod,
    periodFrom: data.periodFrom,
    periodTo: data.periodTo,
    applyReportPeriod: deps.applyReportPeriod,
    clearReportPeriod: deps.clearReportPeriod,
    repPeriodUi: deps.repPeriodUi,
    isFioConfirmVisible: data.isFioConfirmVisible,
    warehousemanFio: data.warehousemanFio,
    handleFioConfirm: data.handleFioConfirm,
    isFioLoading: data.isFioLoading,
    warehousemanHistory: data.warehousemanHistory,
    isRecipientModalVisible: data.isRecipientModalVisible,
    recipientSuggestions: data.rec.recipientSuggestions,
    recipientInitialValue: data.rec.recipientText,
    setIsRecipientModalVisible: data.setIsRecipientModalVisible,
    onPickRecipient: deps.onPickRecipient,
  };
}
