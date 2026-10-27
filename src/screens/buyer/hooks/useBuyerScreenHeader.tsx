import React, { useMemo } from "react";
import { Animated, ScrollView } from "react-native";

import { BuyerScreenHeader } from "../buyer.components";
import type { BuyerTabCounts } from "../buyer.screen.selectors";
import type { BuyerTab } from "../buyer.types";
import type { buyerStyles } from "../buyer.styles";

type BuyerStylesBag = typeof buyerStyles;

type UseBuyerScreenHeaderParams = {
  s: BuyerStylesBag;
  tab: BuyerTab;
  setTab: (tab: BuyerTab) => void;
  buyerFio: string;
  onOpenFioModal: () => void;
  titleSize: number | Animated.Value | Animated.AnimatedInterpolation<number | string>;
  subOpacity: number | Animated.Value | Animated.AnimatedInterpolation<number>;
  counts: BuyerTabCounts;
  tabsScrollRef: React.RefObject<ScrollView | null>;
  scrollTabsToStart: (animated?: boolean) => void;
};

export function useBuyerScreenHeader({
  s,
  tab,
  setTab,
  buyerFio,
  onOpenFioModal,
  titleSize,
  subOpacity,
  counts,
  tabsScrollRef,
  scrollTabsToStart,
}: UseBuyerScreenHeaderParams) {
  return useMemo(
    () => (
      <BuyerScreenHeader
        s={s}
        tab={tab}
        setTab={setTab}
        buyerFio={buyerFio}
        onOpenFioModal={onOpenFioModal}
        titleSize={titleSize}
        subOpacity={subOpacity}
        inboxCount={counts.inboxCount}
        pendingCount={counts.pendingCount}
        approvedCount={counts.approvedCount}
        rejectedCount={counts.rejectedCount}
        subcontractCount={counts.subcontractCount}
        tabsScrollRef={tabsScrollRef}
        scrollTabsToStart={scrollTabsToStart}
      />
    ),
    [
      s,
      tab,
      setTab,
      buyerFio,
      onOpenFioModal,
      titleSize,
      subOpacity,
      counts,
      tabsScrollRef,
      scrollTabsToStart,
    ]
  );
}
