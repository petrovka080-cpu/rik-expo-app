import React from "react";
import { useLocalSearchParams } from "expo-router";

import ProcurementCopilotRuntimeSurface from "../src/features/ai/procurementCopilot/ProcurementCopilotRuntimeSurface";
import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";

function AiProcurementCopilotRoute() {
  const params = useLocalSearchParams<{ procurementRequestId?: string | string[] }>();
  const procurementRequestId = Array.isArray(params.procurementRequestId)
    ? params.procurementRequestId[0]
    : params.procurementRequestId;

  return <ProcurementCopilotRuntimeSurface requestId={procurementRequestId} />;
}

export default withScreenErrorBoundary(AiProcurementCopilotRoute, {
  screen: "ai",
  route: "/ai-procurement-copilot",
});
