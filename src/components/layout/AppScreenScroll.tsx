import React from "react";
import {
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { APP_LAYOUT } from "./appLayout";

export type AppScreenScrollProps = ScrollViewProps & {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export function AppScreenScroll({
  children,
  contentStyle,
  contentContainerStyle,
  keyboardShouldPersistTaps = "handled",
  ...props
}: AppScreenScrollProps) {
  return (
    <ScrollView
      {...props}
      style={[styles.scroll, props.style]}
      contentContainerStyle={[styles.content, contentStyle, contentContainerStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      testID={props.testID ?? "app.screen-scroll"}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    paddingHorizontal: APP_LAYOUT.screenHorizontalPaddingPx,
    paddingBottom: APP_LAYOUT.scrollBottomPaddingPx,
  },
});
