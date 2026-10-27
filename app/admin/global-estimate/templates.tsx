import React from "react";

import { AdminGlobalEstimateRoute } from "../../../src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function GlobalEstimateTemplatesRoute() {
  return <AdminGlobalEstimateRoute routeKey="templates" />;
}

export default withScreenErrorBoundary(GlobalEstimateTemplatesRoute, {
  screen: "office",
  route: "/admin/global-estimate/templates",
});
