import React, { useMemo } from "react";
import { Animated, StyleSheet } from "react-native";

import { UI } from "../buyerUi";
import {
  BuyerScreenContentListSection,
  BuyerScreenHeaderSection,
  BuyerScreenLayoutSection,
  BuyerScreenSearchHostSection,
  BuyerScreenSheetHostSection,
} from "./BuyerScreenRenderSections";
import type { BuyerScreenContentProps } from "./BuyerScreenContent.props";

export { useBuyerScreenContentProps } from "./BuyerScreenContent.props";
export type {
  BuyerScreenContentProps,
  UseBuyerScreenContentPropsParams,
} from "./BuyerScreenContent.props";

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
  const searchBarHostStyle = useMemo(
    () => [styles.searchBarHost, { top: stickyHeader.headerHeight }],
    [stickyHeader.headerHeight],
  );
  const rootStyle = useMemo(() => [s.screen, styles.root], [s.screen]);

  return (
    <BuyerScreenLayoutSection style={rootStyle}>
      <BuyerScreenHeaderSection stickyHeader={stickyHeader} />

      <BuyerScreenSearchHostSection
        s={s}
        searchBarHostStyle={searchBarHostStyle}
        searchQuery={searchQuery}
        onChangeSearchQuery={onChangeSearchQuery}
        showWebRefreshButton={showWebRefreshButton}
        onRefresh={onRefresh}
        refreshAccessibilityLabel={refreshAccessibilityLabel}
      />

      <BuyerScreenContentListSection
        s={s}
        tab={tab}
        buyerFio={buyerFio}
        measuredHeaderMax={measuredHeaderMax}
        scrollY={scrollY}
        subcontractScrollHandler={subcontractScrollHandler}
        mainListHeaderPad={mainListHeaderPad}
        mainList={mainList}
      />

      <BuyerScreenSheetHostSection sheets={sheets} s={s} isWeb={isWeb} />
    </BuyerScreenLayoutSection>
  );
});

const styles = StyleSheet.create({
  root: {
    backgroundColor: UI.bg,
  },
  searchBarHost: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: UI.bg,
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
  },
});
