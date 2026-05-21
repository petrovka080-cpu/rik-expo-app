import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

export type AppScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hasStickyAction?: boolean;
};

export function AppScreen({ children, style, hasStickyAction }: AppScreenProps) {
  return (
    <View
      style={[styles.screen, hasStickyAction ? styles.hasStickyAction : null, style]}
      testID={hasStickyAction ? "app.screen.has-sticky-action" : "app.screen"}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
  },
  hasStickyAction: {
    minHeight: 0,
  },
});
