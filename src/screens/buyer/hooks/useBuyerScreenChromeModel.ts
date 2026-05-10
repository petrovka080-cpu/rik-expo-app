import { useCallback, useMemo } from "react";

import {
  buildBuyerScreenViewModel,
  type BuyerScreenHeaderCounts,
} from "../buyer.screen.model";
import type { BuyerTabCounts } from "../buyer.screen.selectors";
import { useBuyerScreenHeader } from "./useBuyerScreenHeader";
import type { useBuyerScreenUiState } from "./useBuyerScreenUiState";

type BuyerScreenUiState = ReturnType<typeof useBuyerScreenUiState>;

type UseBuyerScreenChromeModelParams = {
  s: BuyerScreenUiState["s"];
  tab: BuyerScreenUiState["tab"];
  setTab: BuyerScreenUiState["setTab"];
  buyerFio: string;
  setIsFioConfirmVisible: BuyerScreenUiState["setIsFioConfirmVisible"];
  measuredHeaderMax: number;
  kbOpen: boolean;
  isMobileEditorVisible: boolean;
  pickedIdsLength: number;
  creating: boolean;
  isWeb: boolean;
  tabCounts: BuyerTabCounts;
  subcontractCount: number;
  titleSize: BuyerScreenUiState["titleSize"];
  subOpacity: BuyerScreenUiState["subOpacity"];
  tabsScrollRef: BuyerScreenUiState["tabsScrollRef"];
  scrollTabsToStart: BuyerScreenUiState["scrollTabsToStart"];
};

export function useBuyerScreenChromeModel({
  s,
  tab,
  setTab,
  buyerFio,
  setIsFioConfirmVisible,
  measuredHeaderMax,
  kbOpen,
  isMobileEditorVisible,
  pickedIdsLength,
  creating,
  isWeb,
  tabCounts,
  subcontractCount,
  titleSize,
  subOpacity,
  tabsScrollRef,
  scrollTabsToStart,
}: UseBuyerScreenChromeModelParams) {
  const viewModel = useMemo(
    () =>
      buildBuyerScreenViewModel({
        measuredHeaderMax,
        kbOpen,
        isMobileEditorVisible,
        pickedIdsLength,
        creating,
        tab,
        isWeb,
        isDev: __DEV__,
      }),
    [creating, isMobileEditorVisible, kbOpen, measuredHeaderMax, pickedIdsLength, tab, isWeb],
  );

  const openFioModal = useCallback(() => setIsFioConfirmVisible(true), [setIsFioConfirmVisible]);
  const headerCounts = useMemo<BuyerScreenHeaderCounts>(
    () => ({
      ...tabCounts,
      subcontractCount,
    }),
    [subcontractCount, tabCounts],
  );
  const header = useBuyerScreenHeader({
    s,
    tab,
    setTab,
    buyerFio,
    onOpenFioModal: openFioModal,
    titleSize,
    subOpacity,
    counts: headerCounts,
    tabsScrollRef,
    scrollTabsToStart,
  });

  return {
    viewModel,
    header,
  };
}
