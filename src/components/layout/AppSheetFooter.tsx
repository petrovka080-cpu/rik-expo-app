import React from "react";
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
        <Pressable
          key={`${action.kind}:${action.labelRu}`}
          testID={action.testID ?? action.testId}
          accessibilityRole="button"
          accessibilityLabel={action.labelRu}
          accessibilityState={{ disabled: action.disabled === true, busy: action.loading === true }}
          disabled={action.disabled === true || action.loading === true}
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
            pressed && action.disabled !== true ? styles.pressed : null,
            action.disabled === true || action.loading === true ? styles.disabled : null,
          ]}
        >
          <Text
            style={action.kind === "primary" || action.kind === "danger" ? styles.primaryText : styles.secondaryText}
            numberOfLines={1}
          >
            {action.loading === true ? "..." : action.labelRu}
          </Text>
        </Pressable>
      ))}
    </View>
  );
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
  primary: {
    flexBasis: "100%",
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
