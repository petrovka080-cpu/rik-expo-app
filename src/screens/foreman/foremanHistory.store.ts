import { create } from "zustand";

export type ForemanHistoryMode = "list" | "details";

type ForemanHistoryStore = {
  requestHistoryVisible: boolean;
  requestHistoryLoading: boolean;
  requestHistoryMode: ForemanHistoryMode;
  selectedHistoryRequestId: string | null;
  subcontractHistoryVisible: boolean;
  subcontractHistoryLoading: boolean;
  historyReopenBusyId: string | null;
  refreshReason: string | null;
  setRequestHistoryVisible: (value: boolean) => void;
  setRequestHistoryLoading: (value: boolean) => void;
  setRequestHistoryMode: (value: ForemanHistoryMode) => void;
  setSelectedHistoryRequestId: (value: string | null) => void;
  openRequestHistory: () => void;
  closeRequestHistory: () => void;
  showRequestHistoryDetails: (requestId: string) => void;
  backToRequestHistoryList: () => void;
  setSubcontractHistoryVisible: (value: boolean) => void;
  setSubcontractHistoryLoading: (value: boolean) => void;
  openSubcontractHistory: () => void;
  closeSubcontractHistory: () => void;
  setHistoryReopenBusyId: (value: string | null) => void;
  setRefreshReason: (value: string | null) => void;
};

export const useForemanHistoryStore = create<ForemanHistoryStore>((set) => ({
  requestHistoryVisible: false,
  requestHistoryLoading: false,
  requestHistoryMode: "list",
  selectedHistoryRequestId: null,
  subcontractHistoryVisible: false,
  subcontractHistoryLoading: false,
  historyReopenBusyId: null,
  refreshReason: null,
  setRequestHistoryVisible: (value) => set({ requestHistoryVisible: value }),
  setRequestHistoryLoading: (value) => set({ requestHistoryLoading: value }),
  setRequestHistoryMode: (value) => set({ requestHistoryMode: value }),
  setSelectedHistoryRequestId: (value) => set({ selectedHistoryRequestId: value }),
  openRequestHistory: () =>
    set({
      requestHistoryVisible: true,
      requestHistoryMode: "list",
      selectedHistoryRequestId: null,
    }),
  closeRequestHistory: () =>
    set({
      requestHistoryVisible: false,
      requestHistoryMode: "list",
      selectedHistoryRequestId: null,
    }),
  showRequestHistoryDetails: (requestId) =>
    set({
      requestHistoryVisible: true,
      requestHistoryMode: "details",
      selectedHistoryRequestId: requestId,
    }),
  backToRequestHistoryList: () =>
    set({
      requestHistoryMode: "list",
      selectedHistoryRequestId: null,
    }),
  setSubcontractHistoryVisible: (value) => set({ subcontractHistoryVisible: value }),
  setSubcontractHistoryLoading: (value) => set({ subcontractHistoryLoading: value }),
  openSubcontractHistory: () => set({ subcontractHistoryVisible: true }),
  closeSubcontractHistory: () => set({ subcontractHistoryVisible: false }),
  setHistoryReopenBusyId: (value) => set({ historyReopenBusyId: value }),
  setRefreshReason: (value) => set({ refreshReason: value }),
}));
