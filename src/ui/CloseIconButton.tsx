import React from "react";
import { Pressable, ViewStyle, StyleProp } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onPress: () => void;
  size?: number;
  hitSlopPx?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export default function CloseIconButton({
  onPress,
  size = 22,
  hitSlopPx = 12,
  color = "#111",
  style,
  disabled,
  accessibilityLabel = "Close",
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlopPx}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
        style as any,
      ]}
    >
      <Ionicons name="close" size={size} color={color} />
    </Pressable>
  );
}
