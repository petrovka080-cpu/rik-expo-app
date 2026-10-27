import React from "react";

import { AdminGlobalEstimateRoute } from "../../../src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function GlobalEstimatePricebookRoute() {
  return <AdminGlobalEstimateRoute routeKey="pricebook" />;
}

export default withScreenErrorBoundary(GlobalEstimatePricebookRoute, {
  screen: "office",
  route: "/admin/global-estimate/pricebook",
});
