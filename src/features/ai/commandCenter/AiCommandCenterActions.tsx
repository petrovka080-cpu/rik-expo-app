import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  AiCommandCenterAction,
  AiCommandCenterActionView,
  AiCommandCenterCardView,
} from "./AiCommandCenterTypes";

type ActionIconName = keyof typeof Ionicons.glyphMap;

const ICON_BY_ACTION: Record<AiCommandCenterAction, ActionIconName> = {
  ask_why: "help-circle-outline",
  open_source: "open-outline",
  preview_tool: "eye-outline",
  create_draft: "document-text-outline",
  submit_for_approval: "shield-checkmark-outline",
};

export type AiCommandCenterActionsProps = {
  card: AiCommandCenterCardView;
  onAction: (card: AiCommandCenterCardView, action: AiCommandCenterActionView) => void;
};

export function AiCommandCenterActions(props: AiCommandCenterActionsProps) {
  return (
    <View style={styles.row}>
      {props.card.actionViews.map((action) => (
        <Pressable
          key={action.action}
          testID={action.testID}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ disabled: !action.enabled }}
          disabled={!action.enabled}
          onPress={() => props.onAction(props.card, action)}
          style={({ pressed }) => [
            styles.button,
            action.action === "submit_for_approval" && styles.approvalButton,
            !action.enabled && styles.disabledButton,
            pressed && action.enabled && styles.pressedButton,
          ]}
        >
          <Ionicons
            name={ICON_BY_ACTION[action.action]}
            size={15}
            color={action.enabled ? "#0F172A" : "#94A3B8"}
          />
          <Text style={[styles.label, !action.enabled && styles.disabledLabel]}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  button: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  approvalButton: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  disabledButton: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  pressedButton: {
    opacity: 0.82,
  },
  label: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "800",
  },
  disabledLabel: {
    color: "#94A3B8",
  },
});
