import React from "react";

import { AdminGlobalEstimateRoute } from "../../../src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function GlobalEstimateTaxRulesRoute() {
  return <AdminGlobalEstimateRoute routeKey="tax_rules" />;
}

export default withScreenErrorBoundary(GlobalEstimateTaxRulesRoute, {
  screen: "office",
  route: "/admin/global-estimate/tax-rules",
});
