import { useShallow } from "zustand/react/shallow";

import {
  type BuyerScreenState,
  useBuyerStore,
} from "../buyer.store";

export type BuyerScreenStoreViewModel = Pick<
  BuyerScreenState,
  | "setTab"
  | "setFilters"
  | "setLoading"
  | "setRefreshReason"
> & {
  tab: BuyerScreenState["activeTab"];
  searchQuery: string;
};

export const selectBuyerScreenStoreViewModel = (
  state: BuyerScreenState,
): BuyerScreenStoreViewModel => ({
  tab: state.activeTab,
  setTab: state.setTab,
  searchQuery: state.filters.searchQuery ?? "",
  setFilters: state.setFilters,
  setLoading: state.setLoading,
  setRefreshReason: state.setRefreshReason,
});

export function useBuyerScreenStoreViewModel(): BuyerScreenStoreViewModel {
  return useBuyerStore(useShallow(selectBuyerScreenStoreViewModel));
}
