import React from "react";

import { AdminGlobalEstimateRoute } from "../../../src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function GlobalEstimateImportRoute() {
  return <AdminGlobalEstimateRoute routeKey="import" />;
}

export default withScreenErrorBoundary(GlobalEstimateImportRoute, {
  screen: "office",
  route: "/admin/global-estimate/import",
});
