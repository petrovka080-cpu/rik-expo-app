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
    bg: "#EEF2F7",
    border: "#D7DEE8",
    text: "#475467",
  },
  success: {
    bg: "#E7F7EF",
    border: "#B8E7CC",
    text: "#1A7F55",
  },
  warning: {
    bg: "#FFF3E0",
    border: "#FFD9A8",
    text: "#B26A00",
  },
  danger: {
    bg: "#FDEAEA",
    border: "#F7C4C0",
    text: "#B42318",
  },
  info: {
    bg: "#EAF2FF",
    border: "#C9DBFF",
    text: "#1D4ED8",
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
    paddingVertical: 4,
    minHeight: 22,
  },
  compact: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    minHeight: 20,
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0,
  },
  textRegular: {
    fontSize: 12,
    lineHeight: 14,
  },
  textCompact: {
    fontSize: 12,
    lineHeight: 14,
  },
});

export default StatusBadge;
