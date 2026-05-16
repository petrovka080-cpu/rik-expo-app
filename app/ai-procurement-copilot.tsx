import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";

const ProcurementCopilotRuntimeSurface = React.lazy(
  () => import("../src/features/ai/procurementCopilot/ProcurementCopilotRuntimeSurface"),
);

function AiRouteLoadingFallback() {
  return (
    <View style={styles.lazyFallback}>
      <ActivityIndicator color="#0F766E" />
    </View>
  );
}

function AiProcurementCopilotRoute() {
  const params = useLocalSearchParams<{ procurementRequestId?: string | string[] }>();
  const procurementRequestId = Array.isArray(params.procurementRequestId)
    ? params.procurementRequestId[0]
    : params.procurementRequestId;

  return (
    <React.Suspense fallback={<AiRouteLoadingFallback />}>
      <ProcurementCopilotRuntimeSurface requestId={procurementRequestId} />
    </React.Suspense>
  );
}

export default withScreenErrorBoundary(AiProcurementCopilotRoute, {
  screen: "ai",
  route: "/ai-procurement-copilot",
});

const styles = StyleSheet.create({
  lazyFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1220",
  },
});
