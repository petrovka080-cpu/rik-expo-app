import React from "react";

import { AdminGlobalEstimateRoute } from "../../../src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function GlobalEstimateSourcesRoute() {
  return <AdminGlobalEstimateRoute routeKey="sources" />;
}

export default withScreenErrorBoundary(GlobalEstimateSourcesRoute, {
  screen: "office",
  route: "/admin/global-estimate/sources",
});
