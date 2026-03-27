import React from "react";

import ReportsHubScreen from "../../src/features/reports/ReportsHubScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function ReportsRoute() {
  return <ReportsHubScreen />;
}

export default withScreenErrorBoundary(ReportsRoute, {
  screen: "reports",
  route: "/reports",
});
