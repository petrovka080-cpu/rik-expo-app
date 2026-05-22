import React from "react";
import { ScrollView, Text, View } from "react-native";

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
  | "audit";

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
};

export function AdminGlobalEstimateRoute({ routeKey }: { routeKey: GlobalEstimateAdminRouteKey }) {
  const config = globalEstimateAdminRouteConfig[routeKey];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0B0F14" }} contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ color: "#F8FAFC", fontSize: 22, fontWeight: "700" }}>{config.title}</Text>
      <View style={{ borderColor: "#334155", borderWidth: 1, padding: 12, borderRadius: 8 }}>
        <Text style={{ color: "#CBD5E1", fontSize: 14 }}>role: {config.requiredRole}</Text>
        <Text style={{ color: "#CBD5E1", fontSize: 14 }}>writes: approval-only backend apply</Text>
      </View>
    </ScrollView>
  );
}
