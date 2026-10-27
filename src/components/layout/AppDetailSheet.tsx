import React from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { APP_LAYOUT } from "./appLayout";

export type AppDetailSheetProps = {
  header: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function AppDetailSheet({ header, children, footer, style, contentStyle }: AppDetailSheetProps) {
  return (
    <View style={[styles.sheet, style]} testID="app.detail-sheet">
      <View style={styles.header} testID="app.detail-sheet.header">{header}</View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        testID="app.detail-sheet.scroll"
      >
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer} testID="app.detail-sheet.footer">{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  header: {
    flexShrink: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    paddingBottom: APP_LAYOUT.stickyActionHeightPx + APP_LAYOUT.stickyActionGapPx,
  },
  footer: {
    flexShrink: 0,
  },
});
