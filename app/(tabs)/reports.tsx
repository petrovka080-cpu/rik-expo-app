import React from "react";

import ReportsHubScreen from "../../src/features/reports/ReportsHubScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

export function ReportsScreen() {
  return <ReportsHubScreen />;
}

export default withScreenErrorBoundary(ReportsScreen, {
  screen: "reports",
  route: "/reports",
});
