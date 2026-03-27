import type { SetStateAction } from "react";
import { create } from "zustand";

import type { MarketHomeCategoryKey, MarketHomeFilters, MarketKind, MarketSide } from "./marketHome.types";

export type MarketUiStore = {
  activeCategory: "all" | MarketHomeCategoryKey;
  query: string;
  side: "all" | MarketSide;
  kind: "all" | MarketKind;
  selectedItemId: string | null;
  loadingMore: boolean;
  setActiveCategory: (value: SetStateAction<"all" | MarketHomeCategoryKey>) => void;
  setQuery: (value: SetStateAction<string>) => void;
  setSide: (value: SetStateAction<"all" | MarketSide>) => void;
  setKind: (value: SetStateAction<"all" | MarketKind>) => void;
  setSelectedItemId: (value: SetStateAction<string | null>) => void;
  setLoadingMore: (value: SetStateAction<boolean>) => void;
  resetFilters: () => void;
  getFilters: () => MarketHomeFilters;
};

const resolveUpdate = <T,>(value: SetStateAction<T>, prev: T): T =>
  typeof value === "function" ? (value as (current: T) => T)(prev) : value;

export const useMarketUiStore = create<MarketUiStore>((set, get) => ({
  activeCategory: "all",
  query: "",
  side: "all",
  kind: "all",
  selectedItemId: null,
  loadingMore: false,
  setActiveCategory: (value) => set((state) => ({ activeCategory: resolveUpdate(value, state.activeCategory) })),
  setQuery: (value) => set((state) => ({ query: resolveUpdate(value, state.query) })),
  setSide: (value) => set((state) => ({ side: resolveUpdate(value, state.side) })),
  setKind: (value) => set((state) => ({ kind: resolveUpdate(value, state.kind) })),
  setSelectedItemId: (value) => set((state) => ({ selectedItemId: resolveUpdate(value, state.selectedItemId) })),
  setLoadingMore: (value) => set((state) => ({ loadingMore: resolveUpdate(value, state.loadingMore) })),
  resetFilters: () =>
    set({
      activeCategory: "all",
      query: "",
      side: "all",
      kind: "all",
    }),
  getFilters: () => {
    const state = get();
    return {
      query: state.query,
      side: state.side,
      kind: state.kind,
      category: state.activeCategory,
    };
  },
}));
