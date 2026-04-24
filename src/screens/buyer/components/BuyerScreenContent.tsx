import React, { useMemo } from "react";
import { Animated } from "react-native";

import RoleScreenLayout from "../../../components/layout/RoleScreenLayout";
import { UI } from "../buyerUi";
import type { BuyerTab } from "../buyer.types";
import BuyerSubcontractTab from "../BuyerSubcontractTab";
import { BuyerMainList, BuyerStickyHeader } from "../buyer.components";
import { BuyerScreenSheets, type BuyerScreenSheetsProps } from "./BuyerScreenSheets";
import { BuyerSearchBar } from "./BuyerSearchBar";
import type { StylesBag } from "./component.types";

type BuyerStickyHeaderProps = React.ComponentProps<typeof BuyerStickyHeader>;
type BuyerMainListProps = React.ComponentProps<typeof BuyerMainList>;

type BuyerScreenContentProps = {
  s: StylesBag;
  isWeb: boolean;
  tab: BuyerTab;
  buyerFio: string;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  onRefresh: () => void;
  showWebRefreshButton: boolean;
  refreshAccessibilityLabel: string;
  measuredHeaderMax: number;
  scrollY: Animated.Value;
  stickyHeader: BuyerStickyHeaderProps;
  mainListHeaderPad: number;
  mainList: Omit<BuyerMainListProps, "s" | "tab" | "measuredHeaderMax" | "scrollY">;
  sheets: Omit<BuyerScreenSheetsProps, "s" | "isWeb">;
};

export const BuyerScreenContent = React.memo(function BuyerScreenContent({
  s,
  isWeb,
  tab,
  buyerFio,
  searchQuery,
  onChangeSearchQuery,
  onRefresh,
  showWebRefreshButton,
  refreshAccessibilityLabel,
  measuredHeaderMax,
  scrollY,
  stickyHeader,
  mainListHeaderPad,
  mainList,
  sheets,
}: BuyerScreenContentProps) {
  const subcontractScrollHandler = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
      }),
    [scrollY],
  );

  return (
    <RoleScreenLayout style={[s.screen, { backgroundColor: UI.bg }]}>
      <BuyerStickyHeader {...stickyHeader} />

      <Animated.View
        style={{
          position: "absolute",
          top: stickyHeader.headerHeight,
          left: 0,
          right: 0,
          zIndex: 40,
          backgroundColor: UI.bg,
          paddingHorizontal: 16,
          paddingBottom: 10,
          paddingTop: 4,
        }}
      >
        <BuyerSearchBar
          s={s}
          searchQuery={searchQuery}
          onChangeSearchQuery={onChangeSearchQuery}
          showWebRefreshButton={showWebRefreshButton}
          onRefresh={onRefresh}
          refreshAccessibilityLabel={refreshAccessibilityLabel}
        />
      </Animated.View>

      {tab === "subcontracts" ? (
        <BuyerSubcontractTab
          contentTopPad={measuredHeaderMax}
          onScroll={subcontractScrollHandler}
          buyerFio={buyerFio}
        />
      ) : (
        <BuyerMainList
          {...mainList}
          s={s}
          tab={tab}
          measuredHeaderMax={mainListHeaderPad}
          scrollY={scrollY}
        />
      )}

      <BuyerScreenSheets {...sheets} s={s} isWeb={isWeb} />
    </RoleScreenLayout>
  );
});
