import type { SetStateAction } from "react";
import { create } from "zustand";
import type { DirTopTab, FinPage, SheetKind, Tab } from "./director.types";

export type DirectorFinanceSupplierSelection = {
  supplier: string;
  kindName: string;
} | null;

const resolveUpdate = <T,>(value: SetStateAction<T>, prev: T): T =>
  typeof value === "function" ? (value as (current: T) => T)(prev) : value;

type DirectorUiStore = {
  requestTab: Tab;
  dirTab: DirTopTab;
  finOpen: boolean;
  finPage: FinPage;
  finLoading: boolean;
  loadingRows: boolean;
  loadingProps: boolean;
  finPeriodOpen: boolean;
  finFrom: string | null;
  finTo: string | null;
  finKindName: string;
  finSupplierSelection: DirectorFinanceSupplierSelection;
  sheetKind: SheetKind;
  selectedRequestId: string | null;
  selectedProposalId: string | null;
  actingId: string | null;
  reqDeleteId: number | string | null;
  reqSendId: number | string | null;
  propApproveId: string | null;
  propReturnId: string | null;
  loadingPropId: string | null;
  decidingId: string | null;
  actingPropItemId: number | null;
  refreshReason: string | null;
  setRequestTab: (value: Tab) => void;
  setDirTab: (value: DirTopTab) => void;
  setFinOpen: (value: boolean) => void;
  setFinPage: (value: FinPage) => void;
  setFinLoading: (value: boolean) => void;
  setLoadingRows: (value: boolean) => void;
  setLoadingProps: (value: boolean) => void;
  setFinPeriodOpen: (value: boolean) => void;
  setFinFrom: (value: string | null) => void;
  setFinTo: (value: string | null) => void;
  setFinKindName: (value: string) => void;
  setFinSupplierSelection: (value: DirectorFinanceSupplierSelection) => void;
  openRequestSheet: (requestId: number | string) => void;
  openProposalSheet: (proposalId: string) => void;
  setActingId: (value: SetStateAction<string | null>) => void;
  setReqDeleteId: (value: SetStateAction<number | string | null>) => void;
  setReqSendId: (value: SetStateAction<number | string | null>) => void;
  setPropApproveId: (value: SetStateAction<string | null>) => void;
  setPropReturnId: (value: SetStateAction<string | null>) => void;
  setLoadingPropId: (value: SetStateAction<string | null>) => void;
  setDecidingId: (value: SetStateAction<string | null>) => void;
  setActingPropItemId: (value: SetStateAction<number | null>) => void;
  setRefreshReason: (value: string | null) => void;
  closeFinanceUi: () => void;
  closeSheetUi: () => void;
};

export const useDirectorUiStore = create<DirectorUiStore>((set) => ({
  requestTab: "foreman",
  dirTab: "Заявки",
  finOpen: false,
  finPage: "home",
  finLoading: false,
  loadingRows: false,
  loadingProps: false,
  finPeriodOpen: false,
  finFrom: null,
  finTo: null,
  finKindName: "",
  finSupplierSelection: null,
  sheetKind: "none",
  selectedRequestId: null,
  selectedProposalId: null,
  actingId: null,
  reqDeleteId: null,
  reqSendId: null,
  propApproveId: null,
  propReturnId: null,
  loadingPropId: null,
  decidingId: null,
  actingPropItemId: null,
  refreshReason: null,
  setRequestTab: (value) => set({ requestTab: value }),
  setDirTab: (value) => set({ dirTab: value }),
  setFinOpen: (value) => set({ finOpen: value }),
  setFinPage: (value) => set({ finPage: value }),
  setFinLoading: (value) => set({ finLoading: value }),
  setLoadingRows: (value) => set({ loadingRows: value }),
  setLoadingProps: (value) => set({ loadingProps: value }),
  setFinPeriodOpen: (value) => set({ finPeriodOpen: value }),
  setFinFrom: (value) => set({ finFrom: value }),
  setFinTo: (value) => set({ finTo: value }),
  setFinKindName: (value) => set({ finKindName: value }),
  setFinSupplierSelection: (value) => set({ finSupplierSelection: value }),
  openRequestSheet: (requestId) =>
    set({
      sheetKind: "request",
      selectedRequestId: String(requestId ?? "").trim() || null,
      selectedProposalId: null,
    }),
  openProposalSheet: (proposalId) =>
    set({
      sheetKind: "proposal",
      selectedProposalId: String(proposalId ?? "").trim() || null,
      selectedRequestId: null,
    }),
  setActingId: (value) => set((state) => ({ actingId: resolveUpdate(value, state.actingId) })),
  setReqDeleteId: (value) => set((state) => ({ reqDeleteId: resolveUpdate(value, state.reqDeleteId) })),
  setReqSendId: (value) => set((state) => ({ reqSendId: resolveUpdate(value, state.reqSendId) })),
  setPropApproveId: (value) => set((state) => ({ propApproveId: resolveUpdate(value, state.propApproveId) })),
  setPropReturnId: (value) => set((state) => ({ propReturnId: resolveUpdate(value, state.propReturnId) })),
  setLoadingPropId: (value) => set((state) => ({ loadingPropId: resolveUpdate(value, state.loadingPropId) })),
  setDecidingId: (value) => set((state) => ({ decidingId: resolveUpdate(value, state.decidingId) })),
  setActingPropItemId: (value) =>
    set((state) => ({ actingPropItemId: resolveUpdate(value, state.actingPropItemId) })),
  setRefreshReason: (value) => set({ refreshReason: value }),
  closeFinanceUi: () =>
    set({
      finOpen: false,
      finPage: "home",
      finLoading: false,
      finPeriodOpen: false,
      finKindName: "",
      finSupplierSelection: null,
    }),
  closeSheetUi: () =>
    set({
      sheetKind: "none",
      selectedRequestId: null,
      selectedProposalId: null,
    }),
}));
