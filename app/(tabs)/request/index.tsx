import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { ConsumerRepairRequestScreen } from "../../../src/features/consumerRepair/ConsumerRepairRequestScreenContainer";
import {
  REQUEST_ESTIMATE_LAUNCH_PAYLOAD_PARAM,
  RequestEstimateLaunchPayloadError,
  buildRequestEstimateLaunchReadyMarkerId,
  decodeRequestEstimateLaunchPayloadV1,
} from "../../../src/lib/navigation/requestEstimateLaunchPayload";
import { ROUTE_PROOF_MARKERS, RouteReadyMarker } from "../../../src/lib/testing/routeReadyMarkers";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

function RequestRoute() {
  const params = useLocalSearchParams<{
    autoPdf?: string | string[];
    autoPrepare?: string | string[];
    description?: string | string[];
    draftId?: string | string[];
    launchError?: string | string[];
    launchId?: string | string[];
    launchPayloadV1?: string | string[];
    prompt?: string | string[];
  }>();
  const encodedPayload = getParam(params[REQUEST_ESTIMATE_LAUNCH_PAYLOAD_PARAM]);
  let launchPayload = null;
  let launchError = getParam(params.launchError).trim();
  if (encodedPayload && !launchError) {
    try {
      launchPayload = decodeRequestEstimateLaunchPayloadV1(encodedPayload);
      if (launchPayload.route !== "/request") {
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
  const launchParameters = launchPayload?.parameters ?? params;
  const prompt =
    getParam(launchParameters.prompt).trim() ||
    getParam(launchParameters.description).trim();
  const draftId = getParam(params.draftId).trim();
  const launchId =
    launchPayload?.launchId ??
    (getParam(params.launchId).trim() || undefined);
  const autoPrepare = getParam(launchParameters.autoPrepare).trim() === "1";
  const autoPdf = getParam(launchParameters.autoPdf).trim() === "1";

  if (launchError) {
    return (
      <View style={styles.launchError} testID="request-estimate-launch-error">
        <Text style={styles.launchErrorTitle}>Не удалось открыть параметры сметы.</Text>
        <Text style={styles.launchErrorCode}>{launchError}</Text>
      </View>
    );
  }

  return (
    <>
      <RouteReadyMarker marker={ROUTE_PROOF_MARKERS.request} />
      {launchId ? (
        <RouteReadyMarker
          marker={buildRequestEstimateLaunchReadyMarkerId(launchId)}
        />
      ) : null}
      <ConsumerRepairRequestScreen
        key={`${launchId || "direct"}::${draftId || "new"}::${prompt}::${autoPrepare ? "prepare" : "manual"}::${autoPdf ? "pdf" : "screen"}`}
        initialProblemText={prompt || undefined}
        initialDraftId={draftId || undefined}
        launchFingerprint={launchPayload?.fingerprint}
        launchId={launchId}
        autoPrepare={autoPrepare || autoPdf}
        autoPdf={autoPdf}
      />
    </>
  );
}

export default withScreenErrorBoundary(RequestRoute, {
  route: "/request",
  screen: "request",
});

const styles = StyleSheet.create({
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
