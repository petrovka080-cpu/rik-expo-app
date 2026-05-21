import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { APP_LAYOUT } from "./appLayout";

type AppStickyAction = {
  labelRu: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  testId?: string;
};

export type AppStickyActionBarProps = {
  primary?: AppStickyAction;
  secondary?: AppStickyAction[];
  danger?: AppStickyAction;
  visible: boolean;
  placement: "above_bottom_nav" | "inside_sheet_footer";
  safeAreaAware: true;
};

export function AppStickyActionBar({
  primary,
  secondary = [],
  danger,
  visible,
  placement,
}: AppStickyActionBarProps) {
  const actions = [...secondary, ...(danger ? [danger] : []), ...(primary ? [primary] : [])];
  if (!visible || actions.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={placement === "above_bottom_nav" ? styles.fixedShell : styles.sheetShell}
      testID="app.sticky-action-bar"
    >
      <View
        style={[
          styles.surface,
          placement === "inside_sheet_footer" ? styles.sheetSurface : null,
        ]}
        testID={`app.sticky-action-bar.${placement}`}
      >
        {secondary.map((action) => (
          <StickyButton key={`secondary:${action.labelRu}`} action={action} variant="secondary" />
        ))}
        {danger ? <StickyButton action={danger} variant="danger" /> : null}
        {primary ? <StickyButton action={primary} variant="primary" /> : null}
      </View>
    </View>
  );
}

function StickyButton({
  action,
  variant,
}: {
  action: AppStickyAction;
  variant: "primary" | "secondary" | "danger";
}) {
  const disabled = action.disabled === true || action.loading === true;
  const isPrimary = variant === "primary";

  return (
    <Pressable
      testID={action.testID ?? action.testId}
      accessibilityRole="button"
      accessibilityLabel={action.labelRu}
      accessibilityState={{ disabled, busy: action.loading === true }}
      disabled={disabled}
      onPress={() => void action.onPress()}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primaryButton : variant === "danger" ? styles.dangerButton : styles.secondaryButton,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {action.loading ? (
        <ActivityIndicator color={isPrimary || variant === "danger" ? "#FFFFFF" : "#334155"} size="small" />
      ) : (
        <Text style={isPrimary || variant === "danger" ? styles.primaryText : styles.secondaryText} numberOfLines={1}>
          {action.labelRu}
        </Text>
      )}
    </Pressable>
  );
}

const fixedPosition = Platform.select({
  web: {
    position: "fixed",
    bottom: APP_LAYOUT.bottomNavHeightPx + APP_LAYOUT.stickyActionGapPx,
  } as ViewStyle,
  default: {
    position: "absolute",
    bottom: APP_LAYOUT.bottomNavHeightPx + APP_LAYOUT.stickyActionGapPx,
  } as ViewStyle,
});

const styles = StyleSheet.create({
  fixedShell: {
    ...fixedPosition,
    left: 0,
    right: 0,
    zIndex: 70,
    paddingHorizontal: APP_LAYOUT.screenHorizontalPaddingPx,
  },
  sheetShell: {
    width: "100%",
    paddingHorizontal: APP_LAYOUT.screenHorizontalPaddingPx,
    paddingBottom: APP_LAYOUT.stickyActionGapPx,
  },
  surface: {
    width: "100%",
    maxWidth: 520,
    minHeight: APP_LAYOUT.stickyActionHeightPx,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  sheetSurface: {
    maxWidth: "100%",
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.10)",
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  secondaryButton: {
    minWidth: 112,
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
  },
  dangerButton: {
    minWidth: 112,
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
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },
});
