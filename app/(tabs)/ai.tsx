import React from "react";
import { useLocalSearchParams } from "expo-router";

import AIAssistantScreen from "../../src/features/ai/AIAssistantScreen";
import ApprovalInboxScreen from "../../src/features/ai/approvalInbox/ApprovalInboxScreen";
import { buildApprovalPersistenceBlockedViewModel } from "../../src/features/ai/approvalInbox/approvalInboxPersistenceBlockedViewModel";
import AiCommandCenterScreen from "../../src/features/ai/commandCenter/AiCommandCenterScreen";
import ProcurementCopilotRuntimeSurface from "../../src/features/ai/procurementCopilot/ProcurementCopilotRuntimeSurface";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function AITabScreen() {
  const params = useLocalSearchParams<{
    approvalInbox?: string | string[];
    mode?: string | string[];
    procurementCopilot?: string | string[];
    procurementRequestId?: string | string[];
  }>();
  const approvalInbox = Array.isArray(params.approvalInbox)
    ? params.approvalInbox[0]
    : params.approvalInbox;
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const procurementCopilot = Array.isArray(params.procurementCopilot)
    ? params.procurementCopilot[0]
    : params.procurementCopilot;
  const procurementRequestId = Array.isArray(params.procurementRequestId)
    ? params.procurementRequestId[0]
    : params.procurementRequestId;
  if (approvalInbox === "1") {
    return <ApprovalInboxScreen viewModel={buildApprovalPersistenceBlockedViewModel()} />;
  }
  if (procurementCopilot === "1") {
    return <ProcurementCopilotRuntimeSurface requestId={procurementRequestId} />;
  }
  if (mode === "command-center") return <AiCommandCenterScreen />;

  return <AIAssistantScreen />;
}

export default withScreenErrorBoundary(AITabScreen, {
  screen: "ai",
  route: "/ai",
});
