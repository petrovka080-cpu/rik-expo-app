import React from "react";

import { AdminGlobalEstimateRoute } from "../../../src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function GlobalEstimateWorkTypesRoute() {
  return <AdminGlobalEstimateRoute routeKey="work_types" />;
}

export default withScreenErrorBoundary(GlobalEstimateWorkTypesRoute, {
  screen: "office",
  route: "/admin/global-estimate/work-types",
});
