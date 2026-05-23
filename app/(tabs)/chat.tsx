import { Redirect, useLocalSearchParams } from "expo-router";

import ChatScreen from "../../src/features/chat/ChatScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

function ChatRoute() {
  const params = useLocalSearchParams<{
    autoSend?: string | string[];
    context?: string | string[];
    prompt?: string | string[];
  }>();
  const prompt = getParam(params.prompt).trim();
  if (prompt) {
    return (
      <Redirect
        href={{
          pathname: "/(tabs)/ai",
          params: {
            autoSend: getParam(params.autoSend).trim() || "1",
            context: getParam(params.context).trim() || "chat",
            prompt,
          },
        }}
      />
    );
  }

  return <ChatScreen />;
}

export default withScreenErrorBoundary(ChatRoute, {
  screen: "chat",
  route: "/chat",
});
