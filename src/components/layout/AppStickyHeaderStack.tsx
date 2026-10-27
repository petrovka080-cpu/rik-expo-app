import React from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { APP_LAYOUT } from "./appLayout";

export type AppStickyHeaderStackProps = {
  route: string;
  headerHeightPx: number;
  tabs?: React.ReactNode;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  children?: React.ReactNode;
  mustNotOverlapContent: true;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function AppStickyHeaderStack({
  route,
  tabs,
  search,
  filters,
  children,
  style,
  testID,
}: AppStickyHeaderStackProps) {
  return (
    <Animated.View
      style={[styles.stack, style]}
      testID={testID ?? "app.sticky-header-stack"}
      accessibilityLabel={`sticky header stack ${route}`}
    >
      {tabs ? <View style={styles.layer}>{tabs}</View> : null}
      {search ? <View style={styles.layer}>{search}</View> : null}
      {filters ? <View style={styles.layer}>{filters}</View> : null}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: {
    minHeight: APP_LAYOUT.stickySearchHeightPx,
    gap: APP_LAYOUT.filterStackGapPx,
  },
  layer: {
    width: "100%",
  },
});
