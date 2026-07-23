import { useLocalSearchParams } from "expo-router";
import React, { Suspense } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ROUTE_PROOF_MARKERS, RouteReadyMarker } from "../../../src/lib/testing/routeReadyMarkers";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

const ConsumerRepairRequestScreen = React.lazy(async () => {
  const module = await import(
    "../../../src/features/consumerRepair/ConsumerRepairRequestScreenContainer"
  );
  return { default: module.ConsumerRepairRequestScreen };
});

function RequestRouteLoadingFallback() {
  return (
    <View style={styles.loading} testID="request-route-loading">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={styles.loadingTitle}>Подготавливаем смету</Text>
      <Text style={styles.loadingHint}>Загружаем профессиональный расчёт…</Text>
    </View>
  );
}

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

function RequestRoute() {
  const params = useLocalSearchParams<{
    autoPdf?: string | string[];
    autoPrepare?: string | string[];
    description?: string | string[];
    prompt?: string | string[];
  }>();
  const prompt = getParam(params.prompt).trim() || getParam(params.description).trim();
  const autoPrepare = getParam(params.autoPrepare).trim() === "1";
  const autoPdf = getParam(params.autoPdf).trim() === "1";

  return (
    <>
      <RouteReadyMarker marker={ROUTE_PROOF_MARKERS.request} />
      <Suspense fallback={<RequestRouteLoadingFallback />}>
        <ConsumerRepairRequestScreen
          key={`${prompt}::${autoPrepare ? "prepare" : "manual"}::${autoPdf ? "pdf" : "screen"}`}
          initialProblemText={prompt || undefined}
          autoPrepare={autoPrepare || autoPdf}
          autoPdf={autoPdf}
        />
      </Suspense>
    </>
  );
}

export default withScreenErrorBoundary(RequestRoute, {
  route: "/request",
  screen: "request",
});

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  loadingTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
  },
  loadingHint: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
  },
});
