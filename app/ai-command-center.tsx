import React from "react";

import AiCommandCenterScreen from "../src/features/ai/commandCenter/AiCommandCenterScreen";
import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";

function AiCommandCenterRoute() {
  return <AiCommandCenterScreen />;
}

export default withScreenErrorBoundary(AiCommandCenterRoute, {
  screen: "ai",
  route: "/ai-command-center",
});
