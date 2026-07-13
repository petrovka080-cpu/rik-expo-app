import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { APP_LAYOUT } from "./appLayout";

export type AppSheetFooterAction = {
  labelRu: string;
  kind: "primary" | "secondary" | "danger" | "neutral";
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  testId?: string;
  testID?: string;
};

export type AppSheetFooterProps = {
  actions: AppSheetFooterAction[];
  placement: "inside_sheet_above_bottom_nav";
  safeAreaAware: true;
  avoidBottomNav: true;
};

export function AppSheetFooter({
  actions,
}: AppSheetFooterProps): React.ReactElement | null {
  const visibleActions = actions.filter(Boolean);
  if (visibleActions.length === 0) return null;

  return (
    <View testID="app.sheet.footer" style={styles.shell}>
      {visibleActions.map((action) => (
        <FooterButton key={`${action.kind}:${action.labelRu}`} action={action} />
      ))}
    </View>
  );
}

function FooterButton({ action }: { action: AppSheetFooterAction }) {
  const disabled = action.disabled === true || action.loading === true;
  const iconOnly = action.kind === "primary" || action.kind === "danger";
  const icon = resolveFooterIcon(action);
  const foreground = action.kind === "primary" || action.kind === "danger" ? "#FFFFFF" : "#334155";

  return (
    <Pressable
      testID={action.testID ?? action.testId}
      accessibilityRole="button"
      accessibilityLabel={action.labelRu}
      accessibilityState={{ disabled: action.disabled === true, busy: action.loading === true }}
      disabled={disabled}
      onPress={() => void action.onPress()}
      style={({ pressed }) => [
        styles.button,
        action.kind === "primary"
          ? styles.primary
          : action.kind === "danger"
            ? styles.danger
            : action.kind === "neutral"
              ? styles.neutral
              : styles.secondary,
        iconOnly ? styles.iconOnlyButton : null,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon ? <Ionicons name={icon} size={iconOnly ? 22 : 16} color={foreground} /> : null}
        {iconOnly ? null : (
          <Text
            style={action.kind === "primary" || action.kind === "danger" ? styles.primaryText : styles.secondaryText}
            numberOfLines={1}
          >
            {action.loading === true ? "..." : action.labelRu}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function resolveFooterIcon(action: AppSheetFooterAction): React.ComponentProps<typeof Ionicons>["name"] | null {
  if (action.kind === "primary") return action.loading === true ? null : "checkmark";
  if (action.kind === "danger") return action.loading === true ? null : "close";
  const normalized = String(action.labelRu || "").toLowerCase();
  if (normalized.includes("pdf")) return "document-text-outline";
  if (normalized.includes("excel")) return "grid-outline";
  if (normalized.includes("дом")) return "home-outline";
  if (normalized.includes("отмена")) return "close-circle-outline";
  return null;
}

const styles = StyleSheet.create({
  shell: {
    flexShrink: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 10,
    paddingHorizontal: APP_LAYOUT.screenHorizontalPaddingPx,
    paddingBottom: APP_LAYOUT.bottomNavHeightPx + APP_LAYOUT.stickyActionGapPx,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.24)",
    backgroundColor: "#0F172A",
  },
  button: {
    minHeight: 44,
    minWidth: 78,
    flexGrow: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  buttonContent: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  iconOnlyButton: {
    flexBasis: 58,
    flexGrow: 0,
    minWidth: 58,
    paddingHorizontal: 0,
  },
  primary: {
    flexBasis: 58,
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  secondary: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
  },
  neutral: {
    backgroundColor: "#E2E8F0",
    borderColor: "#CBD5E1",
  },
  danger: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.55,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  secondaryText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },
});
