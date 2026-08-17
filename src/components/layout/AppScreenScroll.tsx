import React from "react";
import {
  Platform,
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
  automaticallyAdjustKeyboardInsets = true,
  keyboardDismissMode = Platform.OS === "ios" ? "interactive" : "on-drag",
  ...props
}: AppScreenScrollProps) {
  return (
    <ScrollView
      {...props}
      style={[styles.scroll, props.style]}
      contentContainerStyle={[styles.content, contentStyle, contentContainerStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
      keyboardDismissMode={keyboardDismissMode}
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
