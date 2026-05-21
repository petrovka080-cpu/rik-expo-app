import React from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { APP_LAYOUT } from "./appLayout";

export type AppChatComposerBarProps = {
  placeholderRu: string;
  canAttach: boolean;
  canSend: boolean;
  safeAboveBottomNav: true;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AppChatComposerBar({
  children,
  style,
}: AppChatComposerBarProps): React.ReactElement {
  return (
    <View testID="app.chat-composer-bar" style={[styles.shell, style]}>
      {children}
    </View>
  );
}

const composerPosition = Platform.select({
  web: {
    position: "fixed",
    bottom: APP_LAYOUT.bottomNavHeightPx,
  } as ViewStyle,
  default: {
    position: "absolute",
    bottom: APP_LAYOUT.bottomNavHeightPx,
  } as ViewStyle,
});

const styles = StyleSheet.create({
  shell: {
    ...composerPosition,
    left: 0,
    right: 0,
    zIndex: 65,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
});
