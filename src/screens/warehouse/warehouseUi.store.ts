import type { SetStateAction } from "react";
import { create } from "zustand";
import { WAREHOUSE_TABS, type Option, type Tab } from "./warehouse.types";
import type { WarehouseReportsMode } from "./hooks/useWarehouseModals";

type PickTarget = "object" | "level" | "system" | "zone" | "recipient" | null;

export type WarehouseItemsModalState = {
  incomingId: string;
  purchaseId: string;
  poNo: string | null;
  status: string;
} | null;

type WarehouseUiStore = {
  tab: Tab;
  isRecipientModalVisible: boolean;
  reportsMode: WarehouseReportsMode;
  issueDetailsId: number | null;
  incomingDetailsId: string | null;
  repPeriodOpen: boolean;
  objectOpt: Option | null;
  levelOpt: Option | null;
  systemOpt: Option | null;
  zoneOpt: Option | null;
  pickModal: { what: PickTarget };
  pickFilter: string;
  recipientText: string;
  recipientSuggestOpen: boolean;
  recipientRecent: string[];
  itemsModal: WarehouseItemsModalState;
  isFioConfirmVisible: boolean;
  setTab: (value: SetStateAction<Tab>) => void;
  setIsRecipientModalVisible: (value: SetStateAction<boolean>) => void;
  setReportsMode: (value: SetStateAction<WarehouseReportsMode>) => void;
  setIssueDetailsId: (value: SetStateAction<number | null>) => void;
  setIncomingDetailsId: (value: SetStateAction<string | null>) => void;
  setRepPeriodOpen: (value: SetStateAction<boolean>) => void;
  setObjectOpt: (value: SetStateAction<Option | null>) => void;
  setLevelOpt: (value: SetStateAction<Option | null>) => void;
  setSystemOpt: (value: SetStateAction<Option | null>) => void;
  setZoneOpt: (value: SetStateAction<Option | null>) => void;
  setPickModal: (value: SetStateAction<{ what: PickTarget }>) => void;
  setPickFilter: (value: SetStateAction<string>) => void;
  setRecipientText: (value: SetStateAction<string>) => void;
  setRecipientSuggestOpen: (value: SetStateAction<boolean>) => void;
  setRecipientRecent: (value: SetStateAction<string[]>) => void;
  setItemsModal: (value: SetStateAction<WarehouseItemsModalState>) => void;
  setIsFioConfirmVisible: (value: SetStateAction<boolean>) => void;
};

const TAB_INCOMING = WAREHOUSE_TABS[0] ?? ("К приходу" as Tab);

const resolveUpdate = <T,>(value: SetStateAction<T>, prev: T): T =>
  typeof value === "function" ? (value as (current: T) => T)(prev) : value;

export const useWarehouseUiStore = create<WarehouseUiStore>((set) => ({
  tab: TAB_INCOMING,
  isRecipientModalVisible: false,
  reportsMode: "choice",
  issueDetailsId: null,
  incomingDetailsId: null,
  repPeriodOpen: false,
  objectOpt: null,
  levelOpt: null,
  systemOpt: null,
  zoneOpt: null,
  pickModal: { what: null },
  pickFilter: "",
  recipientText: "",
  recipientSuggestOpen: false,
  recipientRecent: [],
  itemsModal: null,
  isFioConfirmVisible: false,
  setTab: (value) => set((state) => ({ tab: resolveUpdate(value, state.tab) })),
  setIsRecipientModalVisible: (value) =>
    set((state) => ({ isRecipientModalVisible: resolveUpdate(value, state.isRecipientModalVisible) })),
  setReportsMode: (value) => set((state) => ({ reportsMode: resolveUpdate(value, state.reportsMode) })),
  setIssueDetailsId: (value) => set((state) => ({ issueDetailsId: resolveUpdate(value, state.issueDetailsId) })),
  setIncomingDetailsId: (value) =>
    set((state) => ({ incomingDetailsId: resolveUpdate(value, state.incomingDetailsId) })),
  setRepPeriodOpen: (value) => set((state) => ({ repPeriodOpen: resolveUpdate(value, state.repPeriodOpen) })),
  setObjectOpt: (value) => set((state) => ({ objectOpt: resolveUpdate(value, state.objectOpt) })),
  setLevelOpt: (value) => set((state) => ({ levelOpt: resolveUpdate(value, state.levelOpt) })),
  setSystemOpt: (value) => set((state) => ({ systemOpt: resolveUpdate(value, state.systemOpt) })),
  setZoneOpt: (value) => set((state) => ({ zoneOpt: resolveUpdate(value, state.zoneOpt) })),
  setPickModal: (value) => set((state) => ({ pickModal: resolveUpdate(value, state.pickModal) })),
  setPickFilter: (value) => set((state) => ({ pickFilter: resolveUpdate(value, state.pickFilter) })),
  setRecipientText: (value) => set((state) => ({ recipientText: resolveUpdate(value, state.recipientText) })),
  setRecipientSuggestOpen: (value) =>
    set((state) => ({ recipientSuggestOpen: resolveUpdate(value, state.recipientSuggestOpen) })),
  setRecipientRecent: (value) => set((state) => ({ recipientRecent: resolveUpdate(value, state.recipientRecent) })),
  setItemsModal: (value) => set((state) => ({ itemsModal: resolveUpdate(value, state.itemsModal) })),
  setIsFioConfirmVisible: (value) =>
    set((state) => ({ isFioConfirmVisible: resolveUpdate(value, state.isFioConfirmVisible) })),
}));
