import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { resolveProcurementRequestContext } from "../procurement/procurementRequestContextResolver";

export type ProcurementCopilotRuntimeSurfaceProps = {
  requestId?: string | null;
};

const EMPTY_MESSAGE = "\u041d\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0439 \u0437\u0430\u044f\u0432\u043a\u0438 \u0434\u043b\u044f \u0430\u043d\u0430\u043b\u0438\u0437\u0430";

export default function ProcurementCopilotRuntimeSurface(
  props: ProcurementCopilotRuntimeSurfaceProps,
) {
  const requestId = String(props.requestId ?? "").trim();
  const context = useMemo(
    () =>
      resolveProcurementRequestContext({
        auth: { userId: "developer-control-runtime", role: "control" },
        requestId,
        screenId: "ai.procurement.copilot",
        requestSnapshot: null,
      }),
    [requestId],
  );
  const hasContext = context.status === "loaded" && context.requestedItems.length > 0;

  return (
    <SafeAreaView testID="ai.procurement.copilot.screen" style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="git-compare-outline" size={22} color="#0F766E" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Procurement Copilot</Text>
            <Text style={styles.subtitle}>
              internal-first runtime surface; no supplier cards are created without bounded context.
            </Text>
          </View>
        </View>

        <View testID="ai.procurement.copilot.internal-first" style={styles.statusBox}>
          <Text style={styles.statusText}>
            internal_app_first=true; mutation_count=0
          </Text>
        </View>

        <View testID="ai.procurement.copilot.external-status" style={styles.statusBox}>
          <Text style={styles.statusText}>
            external_intel_status=disabled; provider_called=false
          </Text>
        </View>

        {hasContext ? (
          <View testID="ai.procurement.copilot.context-loaded" style={styles.panel}>
            <Text style={styles.panelTitle}>context_loaded</Text>
            <Text style={styles.panelText}>
              requested_items={context.requestedItems.length}; evidence_refs=
              {context.internalEvidenceRefs.length}
            </Text>
          </View>
        ) : (
          <View testID="ai.procurement.copilot.empty-state" style={styles.panel}>
            <Text style={styles.panelTitle}>{EMPTY_MESSAGE}</Text>
            <Text style={styles.panelText}>
              fake_request=false; fake_suppliers=false; mutation_count=0
            </Text>
          </View>
        )}

        <View testID="ai.procurement.copilot.approval-required" style={styles.approvalBox}>
          <Text style={styles.approvalText}>
            submit_for_approval requires approval; final_mutation_allowed=false
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  subtitle: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  statusBox: {
    borderRadius: 8,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusText: {
    color: "#075985",
    fontSize: 12,
    fontWeight: "800",
  },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 6,
  },
  panelTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  panelText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  approvalBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FACC15",
    backgroundColor: "#FEFCE8",
    padding: 12,
  },
  approvalText: {
    color: "#854D0E",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
  },
});
