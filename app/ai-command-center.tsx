import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";

const AiCommandCenterScreen = React.lazy(
  () => import("../src/features/ai/commandCenter/AiCommandCenterScreen"),
);

function AiRouteLoadingFallback() {
  return (
    <View style={styles.lazyFallback}>
      <ActivityIndicator color="#0F766E" />
    </View>
  );
}

function AiCommandCenterRoute() {
  return (
    <React.Suspense fallback={<AiRouteLoadingFallback />}>
      <AiCommandCenterScreen />
    </React.Suspense>
  );
}

export default withScreenErrorBoundary(AiCommandCenterRoute, {
  screen: "ai",
  route: "/ai-command-center",
});

const styles = StyleSheet.create({
  lazyFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1220",
  },
});
