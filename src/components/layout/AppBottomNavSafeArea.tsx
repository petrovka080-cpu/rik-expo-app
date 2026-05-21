import React from "react";
import { StyleSheet, View } from "react-native";

import { APP_LAYOUT } from "./appLayout";

export function AppBottomNavSafeArea() {
  return <View pointerEvents="none" style={styles.spacer} testID="app.bottom-nav-safe-area" />;
}

const styles = StyleSheet.create({
  spacer: {
    height: APP_LAYOUT.bottomNavHeightPx + APP_LAYOUT.safeAreaBottomPx,
  },
});
