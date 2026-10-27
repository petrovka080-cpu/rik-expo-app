import React from "react";

import { AdminGlobalEstimateRoute } from "../../../src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function GlobalEstimateChangeControlRoute() {
  return <AdminGlobalEstimateRoute routeKey="change_control" />;
}

export default withScreenErrorBoundary(GlobalEstimateChangeControlRoute, {
  screen: "office",
  route: "/admin/global-estimate/change-control",
});
