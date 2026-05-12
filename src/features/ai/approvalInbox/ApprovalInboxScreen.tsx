import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApprovalActionCard } from "./ApprovalActionCard";
import { ApprovalReviewPanel } from "./ApprovalReviewPanel";
import type { ApprovalInboxActionCard } from "./approvalInboxTypes";
import type { ApprovalInboxViewModel } from "./approvalInboxViewModel";

export type ApprovalInboxScreenProps = {
  viewModel: ApprovalInboxViewModel;
  selectedActionId?: string | null;
  onViewAction?: (action: ApprovalInboxActionCard) => void;
  onEditPreview?: (action: ApprovalInboxActionCard) => void;
  onConfirmApprove?: (action: ApprovalInboxActionCard) => void;
  onConfirmReject?: (action: ApprovalInboxActionCard) => void;
};

const HEADER_TITLE = "\u041d\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435";
const HEADER_SUBTITLE =
  "\u0418\u0418 \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u043b \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f. \u041e\u043f\u0430\u0441\u043d\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u044e\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f.";

export default function ApprovalInboxScreen(props: ApprovalInboxScreenProps) {
  const { viewModel } = props;
  const selectedAction =
    viewModel.actions.find((action) => action.actionId === props.selectedActionId) ?? null;
  const visibleSections = viewModel.sections.filter((section) => section.actions.length > 0);

  return (
    <SafeAreaView testID="ai.approval.inbox.screen" style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#0F766E" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{HEADER_TITLE}</Text>
            <Text style={styles.subtitle}>{HEADER_SUBTITLE}</Text>
          </View>
        </View>

        <View testID="ai.approval.inbox.status" style={styles.statusBar}>
          <Text style={styles.statusText}>
            status={viewModel.status}; pending={viewModel.pendingCount}; mutation_count=0
          </Text>
        </View>

        {viewModel.status !== "loaded" ? (
          <View testID="ai.approval.inbox.empty-state" style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>{viewModel.emptyMessage}</Text>
            <Text style={styles.emptyText}>fake_actions=false</Text>
          </View>
        ) : null}

        {selectedAction ? (
          <ApprovalReviewPanel
            action={selectedAction}
            onConfirmApprove={props.onConfirmApprove}
            onConfirmReject={props.onConfirmReject}
          />
        ) : null}

        {visibleSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionList}>
              {section.actions.map((action) => (
                <ApprovalActionCard
                  key={action.actionId}
                  action={action}
                  onView={props.onViewAction}
                  onEditPreview={props.onEditPreview}
                />
              ))}
            </View>
          </View>
        ))}
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
    gap: 16,
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
  statusBar: {
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
  emptyBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 6,
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionList: {
    gap: 10,
  },
});
