import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ApprovalInboxActionCard } from "./approvalInboxTypes";

export type ApprovalReviewPanelProps = {
  action: ApprovalInboxActionCard;
  onConfirmApprove?: (action: ApprovalInboxActionCard) => void;
  onConfirmReject?: (action: ApprovalInboxActionCard) => void;
};

export function ApprovalReviewPanel(props: ApprovalReviewPanelProps) {
  const { action, onConfirmApprove, onConfirmReject } = props;
  const canApprove = action.allowedReviewActions.includes("approve");
  const canReject = action.allowedReviewActions.includes("reject");

  return (
    <View testID="ai.approval.review.panel" style={styles.panel}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#0F766E" />
        <Text style={styles.title}>{action.title}</Text>
      </View>

      <Text testID="ai.approval.review.summary" style={styles.summary}>
        {action.summary}
      </Text>

      <View testID="ai.approval.review.evidence" style={styles.evidenceBox}>
        {action.evidenceRefs.map((ref) => (
          <Text key={ref} style={styles.evidenceText}>
            {ref}
          </Text>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          testID="ai.approval.review.confirm-approve"
          accessibilityRole="button"
          disabled={!canApprove}
          onPress={() => onConfirmApprove?.(action)}
          style={[styles.approveButton, !canApprove ? styles.disabledButton : null]}
        >
          <Ionicons name="checkmark-outline" size={16} color={canApprove ? "#FFFFFF" : "#94A3B8"} />
          <Text style={[styles.approveText, !canApprove ? styles.disabledText : null]}>
            Approve
          </Text>
        </Pressable>

        <Pressable
          testID="ai.approval.review.confirm-reject"
          accessibilityRole="button"
          disabled={!canReject}
          onPress={() => onConfirmReject?.(action)}
          style={[styles.rejectButton, !canReject ? styles.disabledButton : null]}
        >
          <Ionicons name="close-outline" size={16} color={canReject ? "#991B1B" : "#94A3B8"} />
          <Text style={[styles.rejectText, !canReject ? styles.disabledText : null]}>
            Reject
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#99F6E4",
    backgroundColor: "#F0FDFA",
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    color: "#134E4A",
    fontSize: 15,
    fontWeight: "900",
  },
  summary: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 18,
  },
  evidenceBox: {
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 4,
  },
  evidenceText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  approveButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#0F766E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rejectButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  approveText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  rejectText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "900",
  },
  disabledButton: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  disabledText: {
    color: "#94A3B8",
  },
});
