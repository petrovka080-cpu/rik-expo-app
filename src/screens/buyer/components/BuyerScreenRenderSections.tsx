import React from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";

import { APP_LAYOUT } from "../../../components/layout/appLayout";
import { AppStickyHeaderStack } from "../../../components/layout/AppStickyHeaderStack";
import RoleScreenLayout from "../../../components/layout/RoleScreenLayout";
import BuyerSubcontractTab from "../BuyerSubcontractTab";
import { BuyerMainList, BuyerStickyHeader } from "../buyer.components";
import { BuyerScreenSheets, type BuyerScreenSheetsProps } from "./BuyerScreenSheets";
import { BuyerSearchBar } from "./BuyerSearchBar";
import type { StylesBag } from "./component.types";

export type BuyerStickyHeaderProps = React.ComponentProps<typeof BuyerStickyHeader>;
export type BuyerMainListProps = React.ComponentProps<typeof BuyerMainList>;
type BuyerSubcontractTabProps = React.ComponentProps<typeof BuyerSubcontractTab>;

export const BuyerScreenLayoutSection = React.memo(function BuyerScreenLayoutSection({
  style,
  children,
}: {
  style: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return <RoleScreenLayout style={style}>{children}</RoleScreenLayout>;
});

export const BuyerScreenHeaderSection = React.memo(function BuyerScreenHeaderSection({
  stickyHeader,
}: {
  stickyHeader: BuyerStickyHeaderProps;
}) {
  return <BuyerStickyHeader {...stickyHeader} />;
});

export const BuyerScreenSearchHostSection = React.memo(function BuyerScreenSearchHostSection({
  s,
  searchBarHostStyle,
  searchQuery,
  onChangeSearchQuery,
  showWebRefreshButton,
  onRefresh,
  refreshAccessibilityLabel,
}: {
  s: StylesBag;
  searchBarHostStyle: StyleProp<ViewStyle>;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  showWebRefreshButton: boolean;
  onRefresh: () => void;
  refreshAccessibilityLabel: string;
}) {
  return (
    <Animated.View style={searchBarHostStyle}>
      <AppStickyHeaderStack
        route="/office/buyer"
        headerHeightPx={APP_LAYOUT.headerHeightPx}
        mustNotOverlapContent
        testID="buyer-sticky-search-stack"
        search={
          <BuyerSearchBar
            s={s}
            searchQuery={searchQuery}
            onChangeSearchQuery={onChangeSearchQuery}
            showWebRefreshButton={showWebRefreshButton}
            onRefresh={onRefresh}
            refreshAccessibilityLabel={refreshAccessibilityLabel}
          />
        }
      />
    </Animated.View>
  );
});

export const BuyerScreenContentListSection = React.memo(function BuyerScreenContentListSection({
  s,
  tab,
  buyerFio,
  scrollY,
  subcontractScrollHandler,
  mainListHeaderPad,
  mainList,
}: {
  s: StylesBag;
  tab: BuyerMainListProps["tab"];
  buyerFio: string;
  scrollY: Animated.Value;
  subcontractScrollHandler: BuyerSubcontractTabProps["onScroll"];
  mainListHeaderPad: number;
  mainList: Omit<BuyerMainListProps, "s" | "tab" | "measuredHeaderMax" | "scrollY">;
}) {
  if (tab === "subcontracts") {
    return (
      <BuyerSubcontractTab
        contentTopPad={mainListHeaderPad}
        onScroll={subcontractScrollHandler}
        buyerFio={buyerFio}
      />
    );
  }

  return (
    <BuyerMainList
      {...mainList}
      s={s}
      tab={tab}
      measuredHeaderMax={mainListHeaderPad}
      scrollY={scrollY}
    />
  );
});

export const BuyerScreenSheetHostSection = React.memo(function BuyerScreenSheetHostSection({
  s,
  isWeb,
  sheets,
}: {
  s: StylesBag;
  isWeb: boolean;
  sheets: Omit<BuyerScreenSheetsProps, "s" | "isWeb">;
}) {
  return <BuyerScreenSheets {...sheets} s={s} isWeb={isWeb} />;
});
