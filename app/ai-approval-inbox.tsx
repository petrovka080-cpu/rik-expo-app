import React from "react";

import ApprovalInboxScreen from "../src/features/ai/approvalInbox/ApprovalInboxScreen";
import { buildApprovalPersistenceBlockedViewModel } from "../src/features/ai/approvalInbox/approvalInboxPersistenceBlockedViewModel";
import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";

function AiApprovalInboxRoute() {
  return <ApprovalInboxScreen viewModel={buildApprovalPersistenceBlockedViewModel()} />;
}

export default withScreenErrorBoundary(AiApprovalInboxRoute, {
  screen: "ai",
  route: "/ai-approval-inbox",
});
