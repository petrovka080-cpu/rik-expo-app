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
            <Text style={styles.title}>\u0421\u043d\u0430\u0431\u0436\u0435\u043d\u0438\u0435 \u0441\u0435\u0433\u043e\u0434\u043d\u044f</Text>
            <Text style={styles.subtitle}>
              \u0418\u0418 \u0441\u043d\u0430\u0447\u0430\u043b\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u0442 \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0435 \u0437\u0430\u044f\u0432\u043a\u0438 \u0438 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u0435\u0442 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u043e\u0432 \u0431\u0435\u0437 \u043f\u0440\u043e\u0432\u0435\u0440\u0435\u043d\u043d\u043e\u0433\u043e \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0430.
            </Text>
          </View>
        </View>

        <View testID="ai.procurement.copilot.internal-first" style={styles.statusBox}>
          <View testID="ai.procurement.internal-first" style={styles.runtimeInlineMarker} />
          <Text style={styles.statusText}>
            \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0435 \u0434\u0430\u043d\u043d\u044b\u0435. \u0418\u0418 \u043d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u0438\u0437\u043c\u0435\u043d\u044f\u0435\u0442.
          </Text>
        </View>

        <View testID="ai.procurement.copilot.external-status" style={styles.statusBox}>
          <View testID="ai.procurement.external.status" style={styles.runtimeInlineMarker} />
          <Text style={styles.statusText}>
            \u0412\u043d\u0435\u0448\u043d\u0438\u0435 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0438 \u043d\u0435 \u0432\u044b\u0437\u044b\u0432\u0430\u044e\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438. \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043d\u0443\u0436\u043d\u044b \u0441\u0432\u043e\u0438 \u0434\u0430\u043d\u043d\u044b\u0435.
          </Text>
        </View>

        {hasContext ? (
          <View testID="ai.procurement.copilot.context-loaded" style={styles.panel}>
            <Text style={styles.panelTitle}>\u0414\u0430\u043d\u043d\u044b\u0435 \u0437\u0430\u044f\u0432\u043a\u0438 \u0433\u043e\u0442\u043e\u0432\u044b</Text>
            <Text style={styles.panelText}>
              \u041f\u043e\u0437\u0438\u0446\u0438\u0439: {context.requestedItems.length}. \u0414\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432: {context.internalEvidenceRefs.length}.
            </Text>
          </View>
        ) : (
          <View testID="ai.procurement.copilot.empty-state" style={styles.panel}>
            <Text style={styles.panelTitle}>{EMPTY_MESSAGE}</Text>
            <Text style={styles.panelText}>
              \u041f\u043e\u043a\u0430\u0437\u0430\u043d\u044b \u0442\u043e\u043b\u044c\u043a\u043e \u0440\u0435\u0430\u043b\u044c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u0438\u0437 \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0437\u0430\u044f\u0432\u043a\u0438. \u0418\u0418 \u043d\u0435 \u0432\u044b\u0434\u0443\u043c\u044b\u0432\u0430\u0435\u0442 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u043e\u0432.
            </Text>
          </View>
        )}

        <View testID="ai.procurement.copilot.approval-required" style={styles.approvalBox}>
          <View testID="ai.procurement.approval-required" style={styles.runtimeInlineMarker} />
          <Text style={styles.approvalText}>
            \u0424\u0438\u043d\u0430\u043b\u044c\u043d\u0430\u044f \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0430 \u0438\u0434\u0435\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u0447\u0435\u0440\u0435\u0437 \u0441\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u0438\u0435. \u0418\u0418 \u043d\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442 \u0441\u0430\u043c.
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
  runtimeInlineMarker: {
    width: 1,
    height: 1,
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
