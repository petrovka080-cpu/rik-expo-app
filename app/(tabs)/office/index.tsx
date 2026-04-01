import React from "react";

import OfficeHubScreen from "../../../src/screens/office/OfficeHubScreen";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeIndexRoute() {
  return <OfficeHubScreen />;
}

export default withScreenErrorBoundary(OfficeIndexRoute, {
  screen: "office",
  route: "/office",
});
