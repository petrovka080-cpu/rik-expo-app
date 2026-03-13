import React from "react";

import type { WarehouseTabContentProps } from "./components/WarehouseTabContent";
import ExpenditureHeader from "./components/ExpenditureHeader";
import StockFactHeader from "./components/StockFactHeader";

function renderWarehouseStockHeader(props: WarehouseTabContentProps) {
  return (
    <StockFactHeader
      objectOpt={props.objectOpt}
      levelOpt={props.levelOpt}
      systemOpt={props.systemOpt}
      zoneOpt={props.zoneOpt}
      onPickObject={props.onPickObject}
      onPickLevel={props.onPickLevel}
      onPickSystem={props.onPickSystem}
      onPickZone={props.onPickZone}
      onOpenRecipientModal={props.onOpenRecipientModal}
      recipientText={props.recipientText}
      stockSearch={props.stockSearch}
      onStockSearch={props.onStockSearch}
      stockPick={props.stockPick}
      onRemovePick={props.onRemovePick}
      issueBusy={props.issueBusy}
      onClear={props.onClearStockPick}
      onSubmit={props.onSubmitStockPick}
      issueMsg={props.issueMsg}
    />
  );
}

function renderWarehouseIssueHeader(props: WarehouseTabContentProps) {
  return (
    <ExpenditureHeader
      recipientText={props.recipientText}
      onOpenRecipientModal={props.onOpenRecipientModal}
    />
  );
}

export function selectWarehouseIncomingTabProps(props: WarehouseTabContentProps) {
  return {
    data: props.incomingData,
    contentContainerStyle: props.listContentStyle,
    onScroll: props.listOnScroll,
    scrollEventThrottle: props.listScrollEventThrottle,
    onEndReached: props.onIncomingEndReached,
    refreshControl: props.listRefreshControl,
    renderItem: props.renderIncomingItem,
    emptyColor: props.emptyColor,
  };
}

export function selectWarehouseStockTabProps(props: WarehouseTabContentProps) {
  return {
    stockSupported: props.stockSupported,
    data: props.stockFiltered,
    contentContainerStyle: props.listContentStyle,
    onScroll: props.listOnScroll,
    scrollEventThrottle: props.listScrollEventThrottle,
    renderItem: props.renderStockItem,
    header: renderWarehouseStockHeader(props),
    emptyColor: props.emptyColor,
  };
}

export function selectWarehouseIssueTabProps(props: WarehouseTabContentProps) {
  return {
    data: props.reqHeadsData,
    contentContainerStyle: props.listContentStyle,
    onScroll: props.listOnScroll,
    scrollEventThrottle: props.listScrollEventThrottle,
    onEndReached: props.onReqEndReached,
    refreshControl: props.listRefreshControl,
    listHeader: renderWarehouseIssueHeader(props),
    renderItem: props.renderReqHeadItem,
    loading: props.reqHeadsLoading,
    emptyColor: props.emptyColor,
  };
}

export function selectWarehouseReportsTabProps(props: WarehouseTabContentProps) {
  return {
    headerTopPad: props.reportsHeaderTopPad,
    mode: props.reportsMode,
    onBack: props.onReportsBack,
    onSelectMode: props.onReportsSelectMode,
    onScroll: props.reportsOnScroll,
    scrollEventThrottle: props.reportsScrollEventThrottle,
    periodFrom: props.periodFrom,
    periodTo: props.periodTo,
    repStock: props.repStock,
    repMov: props.repMov,
    reportsUi: props.reportsUi,
    onOpenPeriod: props.onOpenRepPeriod,
    onRefresh: props.onReportsRefresh,
    onPdfRegister: props.onPdfRegisterPress,
    onPdfDocument: props.onPdfDocumentPress,
    onPdfMaterials: props.onPdfMaterialsPress,
    onPdfObjectWork: props.onPdfObjectWorkPress,
    onPdfDayRegister: props.onPdfDayRegisterPress,
    onPdfDayMaterials: props.onPdfDayMaterialsPress,
  };
}
