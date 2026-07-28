import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { buildApprovalPersistenceBlockedViewModel } from "../../src/features/ai/approvalInbox/approvalInboxPersistenceBlockedViewModel";
import {
  REQUEST_ESTIMATE_LAUNCH_PAYLOAD_PARAM,
  RequestEstimateLaunchPayloadError,
  decodeRequestEstimateLaunchPayloadV1,
} from "../../src/lib/navigation/requestEstimateLaunchPayload";
import { ROUTE_PROOF_MARKERS, RouteReadyMarker } from "../../src/lib/testing/routeReadyMarkers";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

const AIAssistantScreen = React.lazy(
  () => import("../../src/features/ai/AIAssistantScreen"),
);
const ApprovalInboxScreen = React.lazy(
  () => import("../../src/features/ai/approvalInbox/ApprovalInboxScreen"),
);
const AiCommandCenterScreen = React.lazy(
  () => import("../../src/features/ai/commandCenter/AiCommandCenterScreen"),
);
const ProcurementCopilotRuntimeSurface = React.lazy(
  () => import("../../src/features/ai/procurementCopilot/ProcurementCopilotRuntimeSurface"),
);

type AiRouteSuspenseProps = {
  children: React.ReactNode;
};

function AiRouteLoadingFallback() {
  return (
    <View style={styles.lazyFallback}>
      <ActivityIndicator color="#0F766E" />
    </View>
  );
}

function AiRouteSuspense(props: AiRouteSuspenseProps) {
  return (
    <React.Suspense fallback={<AiRouteLoadingFallback />}>
      {props.children}
    </React.Suspense>
  );
}

function AITabScreen() {
  const params = useLocalSearchParams<{
    approvalInbox?: string | string[];
    mode?: string | string[];
    launchError?: string | string[];
    launchId?: string | string[];
    launchPayloadV1?: string | string[];
    procurementCopilot?: string | string[];
    procurementExternalIntel?: string | string[];
    procurementRequestId?: string | string[];
  }>();
  const firstParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const encodedPayload = firstParam(
    params[REQUEST_ESTIMATE_LAUNCH_PAYLOAD_PARAM],
  );
  let launchPayload = null;
  let launchError = String(firstParam(params.launchError) ?? "").trim();
  if (encodedPayload && !launchError) {
    try {
      launchPayload = decodeRequestEstimateLaunchPayloadV1(encodedPayload);
      if (launchPayload.route !== "/ai") {
        launchError = "REQUEST_ESTIMATE_LAUNCH_ROUTE_MISMATCH";
        launchPayload = null;
      }
    } catch (error) {
      launchError =
        error instanceof RequestEstimateLaunchPayloadError
          ? error.code
          : "REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT";
    }
  }
  if (launchError) {
    return (
      <View style={styles.launchError} testID="request-estimate-launch-error">
        <Text style={styles.launchErrorTitle}>Не удалось открыть параметры сметы.</Text>
        <Text style={styles.launchErrorCode}>{launchError}</Text>
      </View>
    );
  }
  const approvalInbox = Array.isArray(params.approvalInbox)
    ? params.approvalInbox[0]
    : params.approvalInbox;
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const procurementCopilot = Array.isArray(params.procurementCopilot)
    ? params.procurementCopilot[0]
    : params.procurementCopilot;
  const procurementExternalIntel = Array.isArray(params.procurementExternalIntel)
    ? params.procurementExternalIntel[0]
    : params.procurementExternalIntel;
  const procurementRequestId = Array.isArray(params.procurementRequestId)
    ? params.procurementRequestId[0]
    : params.procurementRequestId;
  if (approvalInbox === "1") {
    return (
      <>
        <RouteReadyMarker marker={ROUTE_PROOF_MARKERS.embeddedAi} />
        <AiRouteSuspense>
          <ApprovalInboxScreen viewModel={buildApprovalPersistenceBlockedViewModel()} />
        </AiRouteSuspense>
      </>
    );
  }
  if (procurementCopilot === "1" || procurementExternalIntel === "1") {
    return (
      <>
        <RouteReadyMarker marker={ROUTE_PROOF_MARKERS.embeddedAi} />
        <AiRouteSuspense>
          <ProcurementCopilotRuntimeSurface requestId={procurementRequestId} />
        </AiRouteSuspense>
      </>
    );
  }
  if (mode === "command-center") {
    return (
      <>
        <RouteReadyMarker marker={ROUTE_PROOF_MARKERS.embeddedAi} />
        <AiRouteSuspense>
          <AiCommandCenterScreen />
        </AiRouteSuspense>
      </>
    );
  }

  return (
    <>
      <RouteReadyMarker marker={ROUTE_PROOF_MARKERS.embeddedAi} />
      <AiRouteSuspense>
        <AIAssistantScreen
          launchPayload={launchPayload}
        />
      </AiRouteSuspense>
    </>
  );
}

export default withScreenErrorBoundary(AITabScreen, {
  screen: "ai",
  route: "/ai",
});

const styles = StyleSheet.create({
  lazyFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1220",
  },
  launchError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
    backgroundColor: "#FFF7ED",
  },
  launchErrorTitle: {
    color: "#9A3412",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  launchErrorCode: {
    color: "#7C2D12",
    fontSize: 12,
    textAlign: "center",
  },
});
