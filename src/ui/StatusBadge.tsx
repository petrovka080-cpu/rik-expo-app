import React from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

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
    bg: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.16)",
    text: "#E5E7EB",
  },
  success: {
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.35)",
    text: "#86EFAC",
  },
  warning: {
    bg: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.35)",
    text: "#FCD34D",
  },
  danger: {
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.35)",
    text: "#FCA5A5",
  },
  info: {
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.35)",
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
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  regular: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 24,
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    minHeight: 20,
  },
  text: {
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  textRegular: {
    fontSize: 11,
    lineHeight: 13,
  },
  textCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
});

export default StatusBadge;
