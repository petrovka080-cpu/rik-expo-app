import React from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { ROLE_RADIUS, ROLE_TYPE } from "./roleVisual";

export type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

type ToneColors = {
  bg: string;
  border: string;
  text: string;
};

const TONE_COLORS: Record<StatusBadgeTone, ToneColors> = {
  neutral: {
    bg: "rgba(148,163,184,0.14)",
    border: "rgba(148,163,184,0.35)",
    text: "#CBD5E1",
  },
  success: {
    bg: "rgba(34,197,94,0.14)",
    border: "rgba(34,197,94,0.35)",
    text: "#86EFAC",
  },
  warning: {
    bg: "rgba(245,158,11,0.16)",
    border: "rgba(245,158,11,0.38)",
    text: "#FCD34D",
  },
  danger: {
    bg: "rgba(239,68,68,0.14)",
    border: "rgba(239,68,68,0.36)",
    text: "#FCA5A5",
  },
  info: {
    bg: "rgba(59,130,246,0.14)",
    border: "rgba(59,130,246,0.36)",
    text: "#93C5FD",
  },
};

/**
 * StatusBadge is a visual-only primitive.
 * It intentionally has no press/interaction/data logic.
 */
export function StatusBadge({
  label,
  tone = "neutral",
  compact = false,
  style,
  textStyle,
}: StatusBadgeProps) {
  const colors = TONE_COLORS[tone];
  const trimmed = String(label ?? "").trim();

  return (
    <View
      style={[
        styles.base,
        compact ? styles.compact : styles.regular,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          compact ? styles.textCompact : styles.textRegular,
          { color: colors.text },
          textStyle,
        ]}
      >
        {trimmed}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: ROLE_RADIUS.pill,
    alignSelf: "flex-start",
  },
  regular: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 22,
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    minHeight: 20,
  },
  text: {
    fontWeight: ROLE_TYPE.badge.fontWeight,
    letterSpacing: 0,
  },
  textRegular: {
    fontSize: ROLE_TYPE.badge.fontSize,
    lineHeight: ROLE_TYPE.badge.lineHeight,
  },
  textCompact: {
    fontSize: ROLE_TYPE.badge.fontSize,
    lineHeight: ROLE_TYPE.badge.lineHeight,
  },
});

export default StatusBadge;
