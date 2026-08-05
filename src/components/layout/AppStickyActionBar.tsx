import React from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { createReactNativeWebViewStyle } from "../../ui/reactNativeWebStyle";
import { APP_LAYOUT } from "./appLayout";

type AppStickyAction = {
  labelRu: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  testId?: string;
  showLabel?: boolean;
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
  const actionCount = secondary.length + (primary ? 1 : 0) + (danger ? 1 : 0);
  if (!visible || actionCount === 0) return null;

  return (
    <View
      style={[
        placement === "above_bottom_nav" ? styles.fixedShell : styles.sheetShell,
        styles.pointerBoxNone,
      ]}
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
        {primary ? <StickyButton action={primary} variant="primary" /> : null}
        {danger ? <StickyButton action={danger} variant="danger" /> : null}
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
  const icon = resolveStickyActionIcon(action.labelRu, variant);
  const normalizedLabel = String(action.labelRu || "").toLowerCase();
  const keepsReadableLabel =
    variant === "primary" && normalizedLabel.includes("объяв");
  const iconOnly =
    action.showLabel !== true &&
    (variant === "danger" ||
    (variant === "primary" &&
      !keepsReadableLabel &&
      (normalizedLabel.includes("утверд") ||
        normalizedLabel.includes("подтверд") ||
        normalizedLabel.includes("отправ") ||
        normalizedLabel.includes("опубликов") ||
        normalizedLabel.includes("готово") ||
        normalizedLabel.includes("сохран") ||
        normalizedLabel === "ok")));
  const textStyle = isPrimary || variant === "danger" ? styles.primaryText : styles.secondaryText;
  const invokeAction = () => {
    if (!disabled) void action.onPress();
  };
  const baseButtonStyle = [
    styles.button,
    isPrimary ? styles.primaryButton : variant === "danger" ? styles.dangerButton : styles.secondaryButton,
    iconOnly ? styles.iconOnlyButton : null,
    disabled ? styles.disabled : null,
  ];
  const content = action.loading ? (
    <ActivityIndicator color={isPrimary || variant === "danger" ? "#FFFFFF" : "#334155"} size="small" />
  ) : (
    <View style={[styles.buttonContent, styles.pointerNone]}>
      {icon ? (
        <Ionicons
          name={icon}
          size={iconOnly ? 22 : 16}
          color={isPrimary || variant === "danger" ? "#FFFFFF" : "#334155"}
        />
      ) : null}
      {iconOnly ? null : (
        <Text style={textStyle} numberOfLines={1}>
          {action.labelRu}
        </Text>
      )}
    </View>
  );

  if (Platform.OS === "web") {
    const webStyle = StyleSheet.flatten(baseButtonStyle) as React.CSSProperties;
    return React.createElement(
      "button",
      {
        "aria-busy": action.loading === true ? "true" : undefined,
        "aria-disabled": disabled ? "true" : undefined,
        "aria-label": action.labelRu,
        "data-testid": action.testID ?? action.testId,
        disabled,
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          invokeAction();
        },
        style: {
          ...webStyle,
          appearance: "none",
          borderStyle: "solid",
          cursor: disabled ? "default" : "pointer",
          font: "inherit",
          margin: 0,
          touchAction: "manipulation",
        },
        type: "button",
      },
      content,
    );
  }

  return (
    <Pressable
      testID={action.testID ?? action.testId}
      accessibilityRole="button"
      accessibilityLabel={action.labelRu}
      accessibilityState={{ disabled, busy: action.loading === true }}
      disabled={disabled}
      onPress={invokeAction}
      style={({ pressed }) => [
        ...baseButtonStyle,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

function resolveStickyActionIcon(
  label: string,
  variant: "primary" | "secondary" | "danger",
): React.ComponentProps<typeof Ionicons>["name"] | null {
  if (variant === "danger") return "close";
  const normalized = String(label || "").toLowerCase();
  if (normalized.includes("pdf")) return "document-text-outline";
  if (normalized.includes("маркет")) return "storefront-outline";
  if (normalized.includes("нов")) return "add";
  if (
    normalized.includes("утверд") ||
    normalized.includes("подтверд") ||
    normalized.includes("отправ") ||
    normalized.includes("опубликов") ||
    normalized.includes("готово") ||
    normalized.includes("сохран") ||
    normalized === "ok"
  ) {
    return "checkmark";
  }
  return null;
}

const fixedPosition = Platform.select({
  web: createReactNativeWebViewStyle({
    position: "fixed",
    bottom: "var(--app-sticky-action-bottom)",
  }),
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
    zIndex: 1000,
    elevation: 16,
    paddingHorizontal: APP_LAYOUT.screenHorizontalPaddingPx,
  },
  sheetShell: {
    width: "100%",
    paddingHorizontal: APP_LAYOUT.screenHorizontalPaddingPx,
    paddingBottom: APP_LAYOUT.stickyActionGapPx,
  },
  surface: {
    width: "100%",
    maxWidth: 720,
    minHeight: APP_LAYOUT.stickyActionHeightPx,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  sheetSurface: {
    maxWidth: "100%",
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.10)",
  },
  pointerBoxNone: {
    pointerEvents: "box-none",
  },
  pointerNone: {
    pointerEvents: "none",
  },
  button: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  buttonContent: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  iconOnlyButton: {
    flex: 0,
    width: 58,
    minWidth: 58,
    paddingHorizontal: 0,
  },
  primaryButton: {
    flex: 1.1,
    minWidth: 76,
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  secondaryButton: {
    flex: 0.75,
    minWidth: 70,
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
  },
  dangerButton: {
    flex: 0.8,
    minWidth: 70,
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
