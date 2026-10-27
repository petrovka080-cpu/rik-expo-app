import React from "react";

import { AdminGlobalEstimateRoute } from "../../../src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function GlobalEstimateDataOpsIndexRoute() {
  return <AdminGlobalEstimateRoute routeKey="overview" />;
}

export default withScreenErrorBoundary(GlobalEstimateDataOpsIndexRoute, {
  screen: "office",
  route: "/admin/global-estimate",
});
