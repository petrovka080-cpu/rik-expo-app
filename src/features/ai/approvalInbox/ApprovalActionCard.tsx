import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ApprovalInboxActionCard } from "./approvalInboxTypes";

export type ApprovalActionCardProps = {
  action: ApprovalInboxActionCard;
  onView?: (action: ApprovalInboxActionCard) => void;
  onEditPreview?: (action: ApprovalInboxActionCard) => void;
};

export function ApprovalActionCard(props: ApprovalActionCardProps) {
  const { action, onView, onEditPreview } = props;
  const canEdit = action.allowedReviewActions.includes("edit_preview");

  return (
    <View testID="ai.approval.action-card" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{action.title}</Text>
          <Text testID="ai.approval.action.status" style={styles.status}>
            {action.status}
          </Text>
        </View>
        <View testID="ai.approval.action.risk" style={styles.riskBadge}>
          <Text style={styles.riskText}>{action.riskLevel}</Text>
        </View>
      </View>

      <Text style={styles.summary}>{action.summary}</Text>

      <View testID="ai.approval.action.evidence" style={styles.evidenceRow}>
        <Ionicons name="document-text-outline" size={14} color="#0F766E" />
        <Text style={styles.evidenceText}>{action.evidenceRefs.length} evidence</Text>
      </View>

      <View testID="ai.approval.action.approval-required" style={styles.approvalRow}>
        <Ionicons name="shield-checkmark-outline" size={14} color="#92400E" />
        <Text style={styles.approvalText}>approval_required</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          testID="ai.approval.action.view"
          accessibilityRole="button"
          onPress={() => onView?.(action)}
          style={styles.primaryButton}
        >
          <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>
            \u041e\u0431\u0437\u043e\u0440
          </Text>
        </Pressable>

        <Pressable
          testID="ai.approval.action.edit-preview"
          accessibilityRole="button"
          disabled={!canEdit}
          onPress={() => onEditPreview?.(action)}
          style={[styles.iconButton, !canEdit ? styles.disabledButton : null]}
        >
          <Ionicons name="create-outline" size={16} color={canEdit ? "#0F172A" : "#94A3B8"} />
        </Pressable>

        <Pressable
          testID="ai.approval.action.approve"
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          disabled
          style={[styles.iconButton, styles.disabledButton]}
        >
          <Ionicons name="checkmark-outline" size={16} color="#94A3B8" />
        </Pressable>

        <Pressable
          testID="ai.approval.action.reject"
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          disabled
          style={[styles.iconButton, styles.disabledButton]}
        >
          <Ionicons name="close-outline" size={16} color="#94A3B8" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  status: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  riskBadge: {
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  riskText: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "900",
  },
  summary: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
  },
  evidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  evidenceText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
  },
  approvalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  approvalText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    backgroundColor: "#0F766E",
    paddingHorizontal: 12,
    height: 34,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  disabledButton: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
});
