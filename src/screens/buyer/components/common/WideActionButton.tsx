import React from "react";
import { Pressable, Text } from "react-native";

export const WideActionButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "neutral",
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: "neutral" | "blue" | "green";
}) => {
  const isDisabled = disabled || loading;

  const tone =
    variant === "green"
      ? { bg: "#22C55E", border: "#22C55E", text: "#0B0F14" }
      : variant === "blue"
        ? { bg: "#3B82F6", border: "#2563EB", text: "#FFFFFF" }
        : { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.18)", text: "#F8FAFC" };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          width: "100%",
          height: 52,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          backgroundColor: tone.bg,
          borderColor: tone.border,
          opacity: isDisabled ? 0.6 : pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text style={{ color: tone.text, fontWeight: "900", fontSize: 14 }}>
        {loading ? "..." : label}
      </Text>
    </Pressable>
  );
};
