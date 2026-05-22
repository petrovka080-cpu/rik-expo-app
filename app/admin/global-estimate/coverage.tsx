import React from "react";

import { AdminGlobalEstimateRoute } from "../../../src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function GlobalEstimateCoverageRoute() {
  return <AdminGlobalEstimateRoute routeKey="coverage" />;
}

export default withScreenErrorBoundary(GlobalEstimateCoverageRoute, {
  screen: "office",
  route: "/admin/global-estimate/coverage",
});
