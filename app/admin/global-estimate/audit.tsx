import React from "react";

import { AdminGlobalEstimateRoute } from "../../../src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function GlobalEstimateAuditRoute() {
  return <AdminGlobalEstimateRoute routeKey="audit" />;
}

export default withScreenErrorBoundary(GlobalEstimateAuditRoute, {
  screen: "office",
  route: "/admin/global-estimate/audit",
});
