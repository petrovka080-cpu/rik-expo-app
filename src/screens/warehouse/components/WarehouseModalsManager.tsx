import React from "react";
import PeriodPickerSheet from "../../../components/PeriodPickerSheet";
import { formatProposalBaseNo, roleBadgeLabel } from "../../../lib/format";
import type { ItemRow, Option, ReqHeadRow, ReqItemUiRow, ReqPickLine, WarehouseReportRow } from "../warehouse.types";
import IncomingDetailsSheet from "./IncomingDetailsSheet";
import IncomingItemsSheet from "./IncomingItemsSheet";
import IssueDetailsSheet from "./IssueDetailsSheet";
import PickOptionSheet from "./PickOptionSheet";
import ReqIssueModal from "./ReqIssueModal";
import StockIssueSheet from "./StockIssueSheet";
import WarehouseFioModal from "./WarehouseFioModal";
import WarehouseRecipientModal from "./WarehouseRecipientModal";

type IssueMsg = { kind: "error" | "ok" | null; text: string };

export type WarehouseModalsManagerProps = {
  stockIssueModal: {
    code: string;
    name: string;
    uom_id: string | null;
    qty_available: number;
  } | null;
  stockIssueQty: string;
  setStockIssueQty: React.Dispatch<React.SetStateAction<string>>;
  issueBusy: boolean;
  addStockPickLine: () => void;
  closeStockIssue: () => void;

  itemsModal: { incomingId: string; purchaseId: string; poNo: string | null; status: string } | null;
  onCloseItemsModal: () => void;
  itemsByHead: Record<string, ItemRow[]>;
  kbH: number;
  qtyInputByItem: Record<string, string>;
  setQtyInputByItem: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  receivingHeadId: string | null;
  onIncomingItemsSubmit: (id: string) => void;
  onRetryReceiveNow: (id: string) => void;
  receiveStatusLabel: string;
  receiveStatusDetail: string | null;
  receiveStatusTone: "neutral" | "info" | "success" | "warning" | "danger";
  canRetryReceive: boolean;

  issueDetailsId: number | null;
  issueLinesLoadingId: number | null;
  issueLinesById: Record<string, WarehouseReportRow[]>;
  matNameByCode: Record<string, string>;
  onCloseIssueDetails: () => void;

  incomingDetailsId: string | null;
  incomingLinesLoadingId: string | null;
  incomingLinesById: Record<string, WarehouseReportRow[]>;
  onCloseIncomingDetails: () => void;

  reqModal: ReqHeadRow | null;
  onCloseReqModal: () => void;
  reqItems: ReqItemUiRow[];
  reqItemsLoading: boolean;
  reqQtyInputByItem: Record<string, string>;
  setReqQtyInputByItem: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  recipientText: string;
  addReqPickLine: (item: ReqItemUiRow) => void;
  submitReqPick: () => void;
  reqPick: Record<string, ReqPickLine>;
  removeReqPickLine: (requestItemId: string) => void;
  issueMsg: IssueMsg;

  pickVisible: boolean;
  pickTitle: string;
  pickFilter: string;
  setPickFilter: React.Dispatch<React.SetStateAction<string>>;
  pickOptions: Option[];
  onPickOption: (opt: Option) => void;
  closePick: () => void;

  repPeriodOpen: boolean;
  closeReportPeriod: () => void;
  periodFrom: string;
  periodTo: string;
  applyReportPeriod: (from: string, to: string) => void;
  clearReportPeriod: () => void;
  repPeriodUi: Record<string, unknown>;

  isFioConfirmVisible: boolean;
  warehousemanFio: string;
  handleFioConfirm: (fio: string) => void;
  isFioLoading: boolean;
  warehousemanHistory: string[];

  isRecipientModalVisible: boolean;
  onCloseRecipientModal: () => void;
  onConfirmRecipientModal: (name: string) => void;
  recipientSuggestions: string[];
  recipientInitialValue: string;
};

export default function WarehouseModalsManager(props: WarehouseModalsManagerProps) {
  return (
    <>
      <StockIssueSheet
        visible={!!props.stockIssueModal}
        item={props.stockIssueModal}
        qty={props.stockIssueQty}
        setQty={props.setStockIssueQty}
        busy={props.issueBusy}
        onAdd={props.addStockPickLine}
        onClose={props.closeStockIssue}
      />

      <IncomingItemsSheet
        visible={!!props.itemsModal}
        onClose={props.onCloseItemsModal}
        title="Позиции прихода"
        prText={props.itemsModal ? formatProposalBaseNo(props.itemsModal.poNo ?? null, props.itemsModal.purchaseId ?? "") : ""}
        roleLabel={roleBadgeLabel("S")}
        incomingId={props.itemsModal?.incomingId ?? ""}
        rows={props.itemsModal ? props.itemsByHead[props.itemsModal.incomingId] ?? [] : []}
        kbH={props.kbH}
        qtyInputByItem={props.qtyInputByItem}
        setQtyInputByItem={props.setQtyInputByItem}
        receivingHeadId={props.receivingHeadId}
        onSubmit={props.onIncomingItemsSubmit}
        onRetryNow={props.onRetryReceiveNow}
        receiveStatusLabel={props.receiveStatusLabel}
        receiveStatusDetail={props.receiveStatusDetail}
        receiveStatusTone={props.receiveStatusTone}
        canRetryReceive={props.canRetryReceive}
      />

      <IssueDetailsSheet
        visible={props.issueDetailsId != null}
        issueId={props.issueDetailsId}
        loadingId={props.issueLinesLoadingId}
        linesById={props.issueLinesById}
        matNameByCode={props.matNameByCode}
        onClose={props.onCloseIssueDetails}
      />

      <IncomingDetailsSheet
        visible={props.incomingDetailsId != null}
        incomingId={props.incomingDetailsId}
        loadingId={props.incomingLinesLoadingId}
        linesById={props.incomingLinesById}
        matNameByCode={props.matNameByCode}
        onClose={props.onCloseIncomingDetails}
      />

      <ReqIssueModal
        visible={!!props.reqModal}
        onClose={props.onCloseReqModal}
        title={`Выдача по заявке ${props.reqModal?.display_no || "—"}`}
        head={props.reqModal}
        reqItems={props.reqItems}
        reqItemsLoading={props.reqItemsLoading}
        reqQtyInputByItem={props.reqQtyInputByItem}
        setReqQtyInputByItem={props.setReqQtyInputByItem}
        recipientText={props.recipientText}
        issueBusy={props.issueBusy}
        addReqPickLine={props.addReqPickLine}
        submitReqPick={props.submitReqPick}
        reqPick={props.reqPick}
        removeReqPickLine={props.removeReqPickLine}
        issueMsg={props.issueMsg}
      />

      <PickOptionSheet
        visible={props.pickVisible}
        title={props.pickTitle}
        filter={props.pickFilter}
        onFilterChange={props.setPickFilter}
        items={props.pickOptions}
        onPick={props.onPickOption}
        onClose={props.closePick}
      />

      {props.repPeriodOpen ? (
        <PeriodPickerSheet
          visible={props.repPeriodOpen}
          onClose={props.closeReportPeriod}
          initialFrom={props.periodFrom || ""}
          initialTo={props.periodTo || ""}
          onApply={props.applyReportPeriod}
          onClear={props.clearReportPeriod}
          ui={props.repPeriodUi}
        />
      ) : null}

      <WarehouseFioModal
        visible={props.isFioConfirmVisible}
        initialFio={props.warehousemanFio}
        onConfirm={props.handleFioConfirm}
        loading={props.isFioLoading}
        history={props.warehousemanHistory}
      />

      <WarehouseRecipientModal
        visible={props.isRecipientModalVisible}
        onClose={props.onCloseRecipientModal}
        onConfirm={props.onConfirmRecipientModal}
        suggestions={props.recipientSuggestions}
        initialValue={props.recipientInitialValue}
      />
    </>
  );
}
