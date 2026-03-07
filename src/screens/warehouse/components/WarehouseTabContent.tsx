import React from "react";
import type {
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControlProps,
} from "react-native";

import type {
  IncomingRow,
  Option,
  ReqHeadRow,
  StockPickLine,
  StockRow,
  Tab,
  WarehouseReportRow,
} from "../warehouse.types";
import { WAREHOUSE_TABS } from "../warehouse.types";
import StockFactHeader from "./StockFactHeader";
import ExpenditureHeader from "./ExpenditureHeader";
import WarehouseIncomingTab from "./WarehouseIncomingTab";
import WarehouseIssueTab from "./WarehouseIssueTab";
import WarehouseReportsTab from "./WarehouseReportsTab";
import WarehouseStockTab from "./WarehouseStockTab";

export type WarehouseTabContentProps = {
  tab: Tab;
  emptyColor: string;

  listContentStyle: { paddingTop: number; paddingBottom: number };
  listOnScroll: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined;
  listScrollEventThrottle: number | undefined;
  listRefreshControl: React.ReactElement<RefreshControlProps>;

  incomingData: IncomingRow[];
  onIncomingEndReached: () => void;
  renderIncomingItem: ListRenderItem<IncomingRow>;

  stockSupported: boolean | null;
  stockFiltered: StockRow[];
  renderStockItem: ListRenderItem<StockRow>;
  objectOpt: Option | null;
  levelOpt: Option | null;
  systemOpt: Option | null;
  zoneOpt: Option | null;
  onPickObject: () => void;
  onPickLevel: () => void;
  onPickSystem: () => void;
  onPickZone: () => void;
  onOpenRecipientModal: () => void;
  recipientText: string;
  stockSearch: string;
  onStockSearch: (t: string) => void;
  stockPick: Record<string, StockPickLine>;
  onRemovePick: (pickKey: string) => void;
  issueBusy: boolean;
  onClearStockPick: () => void;
  onSubmitStockPick: () => void;
  issueMsg: { kind: "error" | "ok" | null; text: string };

  reqHeadsData: ReqHeadRow[];
  onReqEndReached: () => void;
  renderReqHeadItem: ListRenderItem<ReqHeadRow>;
  reqHeadsLoading: boolean;

  reportsHeaderTopPad: number;
  reportsMode: "choice" | "issue" | "incoming";
  onReportsBack: () => void;
  onReportsSelectMode: (m: "choice" | "issue" | "incoming") => void;
  reportsOnScroll: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined;
  reportsScrollEventThrottle: number | undefined;
  periodFrom: string;
  periodTo: string;
  repStock: StockRow[];
  repMov: WarehouseReportRow[];
  reportsUi: {
    incomingByDay: { day: string; items: Record<string, unknown>[] }[];
    vydachaByDay: { day: string; items: Record<string, unknown>[] }[];
    openIncomingDetails: (incomingId: string) => void | Promise<void>;
    openIssueDetails: (issueId: number) => void | Promise<void>;
  };
  onOpenRepPeriod: () => void;
  onReportsRefresh: () => void;
  onPdfRegisterPress: () => void;
  onPdfDocumentPress: (id: string | number) => void;
  onPdfMaterialsPress: () => void;
  onPdfObjectWorkPress: () => void;
  onPdfDayRegisterPress: (day: string) => void;
  onPdfDayMaterialsPress: (day: string) => void;
};

export default function WarehouseTabContent(props: WarehouseTabContentProps) {
  const {
    tab,
    emptyColor,
    listContentStyle,
    listOnScroll,
    listScrollEventThrottle,
    listRefreshControl,
    incomingData,
    onIncomingEndReached,
    renderIncomingItem,
    stockSupported,
    stockFiltered,
    renderStockItem,
    objectOpt,
    levelOpt,
    systemOpt,
    zoneOpt,
    onPickObject,
    onPickLevel,
    onPickSystem,
    onPickZone,
    onOpenRecipientModal,
    recipientText,
    stockSearch,
    onStockSearch,
    stockPick,
    onRemovePick,
    issueBusy,
    onClearStockPick,
    onSubmitStockPick,
    issueMsg,
    reqHeadsData,
    onReqEndReached,
    renderReqHeadItem,
    reqHeadsLoading,
    reportsHeaderTopPad,
    reportsMode,
    onReportsBack,
    onReportsSelectMode,
    reportsOnScroll,
    reportsScrollEventThrottle,
    periodFrom,
    periodTo,
    repStock,
    repMov,
    reportsUi,
    onOpenRepPeriod,
    onReportsRefresh,
    onPdfRegisterPress,
    onPdfDocumentPress,
    onPdfMaterialsPress,
    onPdfObjectWorkPress,
    onPdfDayRegisterPress,
    onPdfDayMaterialsPress,
  } = props;

  if (tab === WAREHOUSE_TABS[0]) {
    return (
      <WarehouseIncomingTab
        data={incomingData}
        contentContainerStyle={listContentStyle}
        onScroll={listOnScroll}
        scrollEventThrottle={listScrollEventThrottle}
        onEndReached={onIncomingEndReached}
        refreshControl={listRefreshControl}
        renderItem={renderIncomingItem}
        emptyColor={emptyColor}
      />
    );
  }

  if (tab === WAREHOUSE_TABS[1]) {
    return (
      <WarehouseStockTab
        stockSupported={stockSupported}
        data={stockFiltered}
        contentContainerStyle={listContentStyle}
        onScroll={listOnScroll}
        scrollEventThrottle={listScrollEventThrottle}
        renderItem={renderStockItem}
        header={
          <StockFactHeader
            objectOpt={objectOpt}
            levelOpt={levelOpt}
            systemOpt={systemOpt}
            zoneOpt={zoneOpt}
            onPickObject={onPickObject}
            onPickLevel={onPickLevel}
            onPickSystem={onPickSystem}
            onPickZone={onPickZone}
            onOpenRecipientModal={onOpenRecipientModal}
            recipientText={recipientText}
            stockSearch={stockSearch}
            onStockSearch={onStockSearch}
            stockPick={stockPick}
            onRemovePick={onRemovePick}
            issueBusy={issueBusy}
            onClear={onClearStockPick}
            onSubmit={onSubmitStockPick}
            issueMsg={issueMsg}
          />
        }
        emptyColor={emptyColor}
      />
    );
  }

  if (tab === WAREHOUSE_TABS[2]) {
    return (
      <WarehouseIssueTab
        data={reqHeadsData}
        contentContainerStyle={listContentStyle}
        onScroll={listOnScroll}
        scrollEventThrottle={listScrollEventThrottle}
        onEndReached={onReqEndReached}
        refreshControl={listRefreshControl}
        listHeader={<ExpenditureHeader recipientText={recipientText} onOpenRecipientModal={onOpenRecipientModal} />}
        renderItem={renderReqHeadItem}
        loading={reqHeadsLoading}
        emptyColor={emptyColor}
      />
    );
  }

  return (
    <WarehouseReportsTab
      headerTopPad={reportsHeaderTopPad}
      mode={reportsMode}
      onBack={onReportsBack}
      onSelectMode={onReportsSelectMode}
      onScroll={reportsOnScroll}
      scrollEventThrottle={reportsScrollEventThrottle}
      periodFrom={periodFrom}
      periodTo={periodTo}
      repStock={repStock}
      repMov={repMov}
      reportsUi={reportsUi}
      onOpenPeriod={onOpenRepPeriod}
      onRefresh={onReportsRefresh}
      onPdfRegister={onPdfRegisterPress}
      onPdfDocument={onPdfDocumentPress}
      onPdfMaterials={onPdfMaterialsPress}
      onPdfObjectWork={onPdfObjectWorkPress}
      onPdfDayRegister={onPdfDayRegisterPress}
      onPdfDayMaterials={onPdfDayMaterialsPress}
    />
  );
}
