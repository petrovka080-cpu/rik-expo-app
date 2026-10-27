import React from "react";

import { AdminGlobalEstimateRoute } from "../../../src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function GlobalEstimateQaRoute() {
  return <AdminGlobalEstimateRoute routeKey="qa" />;
}

export default withScreenErrorBoundary(GlobalEstimateQaRoute, {
  screen: "office",
  route: "/admin/global-estimate/qa",
});
