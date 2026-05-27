import React from "react";
import { ScrollView, Text, View } from "react-native";

import { buildEstimateChangeControlOperatorViewModel } from "../../changeControl";

export const GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE = "estimate_data_viewer";

export type GlobalEstimateAdminRouteKey =
  | "overview"
  | "work_types"
  | "templates"
  | "pricebook"
  | "tax_rules"
  | "sources"
  | "import"
  | "coverage"
  | "qa"
  | "audit"
  | "change_control";

export const globalEstimateAdminRouteConfig: Record<GlobalEstimateAdminRouteKey, {
  title: string;
  requiredRole: typeof GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE;
}> = {
  overview: { title: "Global Estimate Data Ops", requiredRole: GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE },
  work_types: { title: "Work Types", requiredRole: GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE },
  templates: { title: "Estimate Templates", requiredRole: GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE },
  pricebook: { title: "Price Book", requiredRole: GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE },
  tax_rules: { title: "Tax Rules", requiredRole: GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE },
  sources: { title: "Price Sources", requiredRole: GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE },
  import: { title: "Import Preview", requiredRole: GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE },
  coverage: { title: "Coverage Matrix", requiredRole: GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE },
  qa: { title: "Estimate QA", requiredRole: GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE },
  audit: { title: "Change Audit", requiredRole: GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE },
  change_control: { title: "AI Estimate Change Control", requiredRole: GLOBAL_ESTIMATE_ADMIN_REQUIRED_ROLE },
};

function AdminChangeControlPanel() {
  const model = buildEstimateChangeControlOperatorViewModel();
  const ready =
    !model.directActiveMutationFound &&
    !model.publishWithoutValidationFound &&
    !model.publishWithoutApprovalFound &&
    !model.mutationWithoutAuditFound &&
    model.rollbackRestoresPreviousActiveVersion;

  return (
    <View testID="ai-estimate-change-control.screen" style={{ gap: 12 }}>
      <View testID="ai-estimate-change-control.status" style={{ borderColor: ready ? "#15803D" : "#B91C1C", borderWidth: 1, borderRadius: 8, padding: 12 }}>
        <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "800" }}>
          {ready ? "READY_FOR_GOVERNED_CHANGES" : "BLOCKED_CHANGE_CONTROL"}
        </Text>
        <Text style={{ color: "#CBD5E1", fontSize: 13 }}>{model.entityTypesTotal} controlled entity types</Text>
      </View>

      <View testID="ai-estimate-change-control.lifecycle" style={{ borderColor: "#334155", borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 }}>
        <Text style={{ color: "#E2E8F0", fontSize: 16, fontWeight: "800" }}>Lifecycle</Text>
        {model.lifecycle.slice(0, 8).map((row) => (
          <Text key={row.label} style={{ color: row.state === "ready" ? "#BBF7D0" : "#FECACA", fontSize: 13 }}>
            {row.label}: {row.value}
          </Text>
        ))}
      </View>

      <View testID="ai-estimate-change-control.blocking-checks" style={{ borderColor: "#334155", borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 }}>
        <Text style={{ color: "#E2E8F0", fontSize: 16, fontWeight: "800" }}>Publish Blockers</Text>
        {model.blockingChecks.slice(0, 8).map((row) => (
          <Text key={row.label} style={{ color: row.state === "ready" ? "#BBF7D0" : "#FECACA", fontSize: 13 }}>
            {row.label}: {row.value}
          </Text>
        ))}
      </View>

      <View testID="ai-estimate-change-control.governance" style={{ borderColor: "#334155", borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 }}>
        <Text style={{ color: "#E2E8F0", fontSize: 16, fontWeight: "800" }}>Governance</Text>
        {model.governanceChecks.slice(0, 8).map((row) => (
          <Text key={row.label} style={{ color: row.state === "ready" ? "#BBF7D0" : "#FECACA", fontSize: 13 }}>
            {row.label}: {row.value}
          </Text>
        ))}
      </View>

      <View testID="ai-estimate-change-control.golden-cases" style={{ borderColor: "#334155", borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 }}>
        <Text style={{ color: "#E2E8F0", fontSize: 16, fontWeight: "800" }}>Impacted Golden Cases</Text>
        {model.goldenCases.slice(0, 12).map((caseId) => (
          <Text key={caseId} style={{ color: "#CBD5E1", fontSize: 13 }}>{caseId}</Text>
        ))}
      </View>
    </View>
  );
}

export function AdminGlobalEstimateRoute({ routeKey }: { routeKey: GlobalEstimateAdminRouteKey }) {
  const config = globalEstimateAdminRouteConfig[routeKey];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0B0F14" }} contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ color: "#F8FAFC", fontSize: 22, fontWeight: "700" }}>{config.title}</Text>
      <View style={{ borderColor: "#334155", borderWidth: 1, padding: 12, borderRadius: 8 }}>
        <Text style={{ color: "#CBD5E1", fontSize: 14 }}>role: {config.requiredRole}</Text>
        <Text style={{ color: "#CBD5E1", fontSize: 14 }}>writes: approval-only backend apply</Text>
      </View>
      {routeKey === "change_control" ? <AdminChangeControlPanel /> : null}
    </ScrollView>
  );
}
