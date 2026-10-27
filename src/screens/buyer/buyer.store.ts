import { create } from "zustand";
import type { BuyerSheetKind, BuyerTab } from "./buyer.types";

type BuyerDateRange = {
  from: string;
  to: string;
};

type BuyerFilters = {
  searchQuery?: string;
  status?: string;
  objectId?: string;
  dateRange?: BuyerDateRange;
};

type BuyerSortMode = "date" | "priority";
type BuyerRefreshReason = "focus" | "manual" | "mutation" | null;
type BuyerModalType = "none" | BuyerSheetKind;

export type BuyerScreenState = {
  activeTab: BuyerTab;
  selectedRequestId: string | null;
  selectedSupplierId: string | null;
  filters: BuyerFilters;
  sortMode: BuyerSortMode;
  modal: {
    type: BuyerModalType;
    entityId?: string;
  };
  loading: {
    list: boolean;
    action: boolean;
  };
  refreshReason: BuyerRefreshReason;
  expandedSections: Record<string, boolean>;
  setTab: (value: BuyerTab) => void;
  setSelectedRequestId: (value: string | null) => void;
  setSelectedSupplierId: (value: string | null) => void;
  setFilters: (value: Partial<BuyerFilters>) => void;
  setSortMode: (value: BuyerSortMode) => void;
  openModal: (type: BuyerModalType, entityId?: string) => void;
  closeModal: () => void;
  setLoading: (value: Partial<BuyerScreenState["loading"]>) => void;
  setRefreshReason: (value: BuyerRefreshReason) => void;
  toggleSection: (key: string) => void;
};

export const useBuyerStore = create<BuyerScreenState>((set) => ({
  activeTab: "inbox",
  selectedRequestId: null,
  selectedSupplierId: null,
  filters: {},
  sortMode: "date",
  modal: {
    type: "none",
  },
  loading: {
    list: false,
    action: false,
  },
  refreshReason: null,
  expandedSections: {},
  setTab: (value) => set({ activeTab: value }),
  setSelectedRequestId: (value) => set({ selectedRequestId: value }),
  setSelectedSupplierId: (value) => set({ selectedSupplierId: value }),
  setFilters: (value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...value,
      },
    })),
  setSortMode: (value) => set({ sortMode: value }),
  openModal: (type, entityId) =>
    set({
      modal: {
        type,
        entityId,
      },
    }),
  closeModal: () =>
    set({
      modal: {
        type: "none",
      },
    }),
  setLoading: (value) =>
    set((state) => ({
      loading: {
        ...state.loading,
        ...value,
      },
    })),
  setRefreshReason: (value) => set({ refreshReason: value }),
  toggleSection: (key) =>
    set((state) => ({
      expandedSections: {
        ...state.expandedSections,
        [key]: !state.expandedSections[key],
      },
    })),
}));
