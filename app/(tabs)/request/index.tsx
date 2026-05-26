import { useLocalSearchParams } from "expo-router";

import { ConsumerRepairRequestScreen } from "../../../src/features/consumerRepair";
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
    prompt?: string | string[];
  }>();
  const prompt = getParam(params.prompt).trim() || getParam(params.description).trim();
  const autoPrepare = getParam(params.autoPrepare).trim() === "1";
  const autoPdf = getParam(params.autoPdf).trim() === "1";

  return (
    <>
      <RouteReadyMarker marker={ROUTE_PROOF_MARKERS.request} />
      <ConsumerRepairRequestScreen
        initialProblemText={prompt || undefined}
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
