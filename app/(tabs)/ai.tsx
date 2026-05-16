import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { buildApprovalPersistenceBlockedViewModel } from "../../src/features/ai/approvalInbox/approvalInboxPersistenceBlockedViewModel";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

const AIAssistantScreen = React.lazy(() => import("../../src/features/ai/AIAssistantScreen"));
const ApprovalInboxScreen = React.lazy(
  () => import("../../src/features/ai/approvalInbox/ApprovalInboxScreen"),
);
const AiCommandCenterScreen = React.lazy(
  () => import("../../src/features/ai/commandCenter/AiCommandCenterScreen"),
);
const ProcurementCopilotRuntimeSurface = React.lazy(
  () => import("../../src/features/ai/procurementCopilot/ProcurementCopilotRuntimeSurface"),
);

type AiRouteSuspenseProps = {
  children: React.ReactNode;
};

function AiRouteLoadingFallback() {
  return (
    <View style={styles.lazyFallback}>
      <ActivityIndicator color="#0F766E" />
    </View>
  );
}

function AiRouteSuspense(props: AiRouteSuspenseProps) {
  return (
    <React.Suspense fallback={<AiRouteLoadingFallback />}>
      {props.children}
    </React.Suspense>
  );
}

function AITabScreen() {
  const params = useLocalSearchParams<{
    approvalInbox?: string | string[];
    mode?: string | string[];
    procurementCopilot?: string | string[];
    procurementExternalIntel?: string | string[];
    procurementRequestId?: string | string[];
  }>();
  const approvalInbox = Array.isArray(params.approvalInbox)
    ? params.approvalInbox[0]
    : params.approvalInbox;
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const procurementCopilot = Array.isArray(params.procurementCopilot)
    ? params.procurementCopilot[0]
    : params.procurementCopilot;
  const procurementExternalIntel = Array.isArray(params.procurementExternalIntel)
    ? params.procurementExternalIntel[0]
    : params.procurementExternalIntel;
  const procurementRequestId = Array.isArray(params.procurementRequestId)
    ? params.procurementRequestId[0]
    : params.procurementRequestId;
  if (approvalInbox === "1") {
    return (
      <AiRouteSuspense>
        <ApprovalInboxScreen viewModel={buildApprovalPersistenceBlockedViewModel()} />
      </AiRouteSuspense>
    );
  }
  if (procurementCopilot === "1" || procurementExternalIntel === "1") {
    return (
      <AiRouteSuspense>
        <ProcurementCopilotRuntimeSurface requestId={procurementRequestId} />
      </AiRouteSuspense>
    );
  }
  if (mode === "command-center") {
    return (
      <AiRouteSuspense>
        <AiCommandCenterScreen />
      </AiRouteSuspense>
    );
  }

  return (
    <AiRouteSuspense>
      <AIAssistantScreen />
    </AiRouteSuspense>
  );
}

export default withScreenErrorBoundary(AITabScreen, {
  screen: "ai",
  route: "/ai",
});

const styles = StyleSheet.create({
  lazyFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1220",
  },
});
