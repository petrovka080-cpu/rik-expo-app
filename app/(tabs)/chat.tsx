import ChatScreen from "../../src/features/chat/ChatScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function ChatRoute() {
  return <ChatScreen />;
}

export default withScreenErrorBoundary(ChatRoute, {
  screen: "chat",
  route: "/chat",
});
