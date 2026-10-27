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
  WarehouseReqHeadsIntegrityState,
  WarehouseReqHeadsListState,
  WarehouseReportRow,
} from "../warehouse.types";
import {
  selectWarehouseIncomingTabProps,
  selectWarehouseIssueTabProps,
  selectWarehouseReportsTabProps,
  selectWarehouseStockTabProps,
} from "../warehouse.tab.presentation";
import { WAREHOUSE_TABS } from "../warehouse.types";
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
  incomingHasMore: boolean;
  incomingLoadingMore: boolean;
  renderIncomingItem: ListRenderItem<IncomingRow>;

  stockSupported: boolean | null;
  stockFiltered: StockRow[];
  stockHasMore: boolean;
  stockLoadingMore: boolean;
  onStockEndReached: () => void;
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
  reqHeadsHasMore: boolean;
  reqHeadsLoadingMore: boolean;
  renderReqHeadItem: ListRenderItem<ReqHeadRow>;
  reqHeadsLoading: boolean;
  reqHeadsIntegrityState: WarehouseReqHeadsIntegrityState;
  reqHeadsListState: WarehouseReqHeadsListState;

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
  isPdfBusy: (key: string) => boolean;
};

export default function WarehouseTabContent(props: WarehouseTabContentProps) {
  const { tab } = props;

  if (tab === WAREHOUSE_TABS[0]) {
    return <WarehouseIncomingTab {...selectWarehouseIncomingTabProps(props)} />;
  }

  if (tab === WAREHOUSE_TABS[1]) {
    return <WarehouseStockTab {...selectWarehouseStockTabProps(props)} />;
  }

  if (tab === WAREHOUSE_TABS[2]) {
    return <WarehouseIssueTab {...selectWarehouseIssueTabProps(props)} />;
  }

  return <WarehouseReportsTab {...selectWarehouseReportsTabProps(props)} />;
}
