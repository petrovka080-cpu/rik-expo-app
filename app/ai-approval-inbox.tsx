import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { buildApprovalPersistenceBlockedViewModel } from "../src/features/ai/approvalInbox/approvalInboxPersistenceBlockedViewModel";
import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";

const ApprovalInboxScreen = React.lazy(
  () => import("../src/features/ai/approvalInbox/ApprovalInboxScreen"),
);

function AiRouteLoadingFallback() {
  return (
    <View style={styles.lazyFallback}>
      <ActivityIndicator color="#0F766E" />
    </View>
  );
}

function AiApprovalInboxRoute() {
  return (
    <React.Suspense fallback={<AiRouteLoadingFallback />}>
      <ApprovalInboxScreen viewModel={buildApprovalPersistenceBlockedViewModel()} />
    </React.Suspense>
  );
}

export default withScreenErrorBoundary(AiApprovalInboxRoute, {
  screen: "ai",
  route: "/ai-approval-inbox",
});

const styles = StyleSheet.create({
  lazyFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1220",
  },
});
