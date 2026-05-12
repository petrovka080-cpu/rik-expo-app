import React from "react";
import { useLocalSearchParams } from "expo-router";

import AIAssistantScreen from "../../src/features/ai/AIAssistantScreen";
import AiCommandCenterScreen from "../../src/features/ai/commandCenter/AiCommandCenterScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function AITabScreen() {
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  if (mode === "command-center") return <AiCommandCenterScreen />;

  return <AIAssistantScreen />;
}

export default withScreenErrorBoundary(AITabScreen, {
  screen: "ai",
  route: "/ai",
});
