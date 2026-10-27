import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AiCommandCenterActions } from "./AiCommandCenterActions";
import type {
  AiCommandCenterActionView,
  AiCommandCenterCardView,
  AiCommandCenterSectionView,
} from "./AiCommandCenterTypes";

const PRIORITY_COLORS: Record<AiCommandCenterCardView["priority"], string> = {
  critical: "#DC2626",
  high: "#EA580C",
  normal: "#2563EB",
  low: "#64748B",
};

export type AiCommandCenterCardProps = {
  card: AiCommandCenterCardView;
  onAction: (card: AiCommandCenterCardView, action: AiCommandCenterActionView) => void;
};

export function AiCommandCenterCard(props: AiCommandCenterCardProps) {
  const priorityColor = PRIORITY_COLORS[props.card.priority];

  return (
    <View testID="ai.screen.runtime.card">
      <View testID="ai.command.center.card" style={styles.card}>
        <View testID="ai.command_center.ai_action_card" style={styles.runtimeInvisibleMarker} />
        <View style={styles.cardTopRow}>
          <View style={styles.titleColumn}>
            <Text style={styles.domain}>{props.card.domainLabel}</Text>
            <Text style={styles.title}>{props.card.title}</Text>
          </View>
          <View
            testID="ai.command.center.card.priority"
            style={[styles.priorityBadge, { borderColor: priorityColor }]}
          >
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {props.card.priorityLabel}
            </Text>
          </View>
        </View>

        <Text style={styles.summary}>{props.card.summary}</Text>

        <View style={styles.metaRow}>
          <View testID="ai.screen.runtime.card.evidence" style={styles.evidenceGroup}>
            <View testID="ai.command.center.card.evidence" style={styles.evidenceGroup}>
              {props.card.insufficientEvidence ? (
                <View style={[styles.evidenceChip, styles.evidenceChipWarning]}>
                  <Ionicons name="alert-circle-outline" size={13} color="#B45309" />
                  <Text style={[styles.evidenceText, styles.evidenceTextWarning]}>
                    {props.card.evidenceLabel}
                  </Text>
                </View>
              ) : (
                props.card.evidenceRefs.map((ref) => (
                  <View key={ref} style={styles.evidenceChip}>
                    <Ionicons name="link-outline" size={13} color="#475569" />
                    <Text style={styles.evidenceText} numberOfLines={1}>
                      {ref}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {props.card.requiresApproval ? (
            <View testID="ai.screen.runtime.card.approval-required">
              <View
                testID="ai.command.center.card.approval-required"
                style={styles.approvalBadge}
              >
                <Ionicons name="shield-checkmark-outline" size={13} color="#92400E" />
                <Text style={styles.approvalText}>approval</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View testID="ai.screen.runtime.intent" style={styles.runtimeInvisibleMarker}>
          <Text style={styles.runtimeInvisibleText}>
            {props.card.actionViews.map((action) => action.action).join(",")}
          </Text>
        </View>
        {props.card.actionViews.some((action) => !action.enabled) ? (
          <View testID="ai.screen.runtime.blocked-intent" style={styles.runtimeInvisibleMarker}>
            <Text style={styles.runtimeInvisibleText}>
              {props.card.actionViews
                .filter((action) => !action.enabled)
                .map((action) => action.action)
                .join(",")}
            </Text>
          </View>
        ) : null}

        <AiCommandCenterActions card={props.card} onAction={props.onAction} />
      </View>
    </View>
  );
}

export type AiCommandCenterSectionProps = {
  section: AiCommandCenterSectionView;
  onAction: (card: AiCommandCenterCardView, action: AiCommandCenterActionView) => void;
};

export function AiCommandCenterSection(props: AiCommandCenterSectionProps) {
  if (props.section.cards.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{props.section.title}</Text>
      <View style={styles.cardsColumn}>
        {props.section.cards.map((card) => (
          <AiCommandCenterCard
            key={card.id}
            card={card}
            onAction={props.onAction}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  cardsColumn: {
    gap: 10,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
  },
  domain: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "#FFFFFF",
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "900",
  },
  summary: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 12,
  },
  evidenceGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
  },
  evidenceChip: {
    maxWidth: 230,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  evidenceChipWarning: {
    backgroundColor: "#FFFBEB",
  },
  evidenceText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },
  evidenceTextWarning: {
    color: "#92400E",
  },
  approvalBadge: {
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  approvalText: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "900",
  },
  runtimeInvisibleMarker: {
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  runtimeInvisibleText: {
    color: "#FFFFFF",
    fontSize: 1,
  },
});
