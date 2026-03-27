import React from "react";

import AIAssistantScreen from "../../src/features/ai/AIAssistantScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function AITabScreen() {
  return <AIAssistantScreen />;
}

export default withScreenErrorBoundary(AITabScreen, {
  screen: "ai",
  route: "/ai",
});
