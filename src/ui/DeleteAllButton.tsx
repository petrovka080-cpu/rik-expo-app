// src/ui/DeleteAllButton.tsx
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import IconSquareButton from "./IconSquareButton";

type Props = {
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};

export default function DeleteAllButton({
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel = "Удалить всё",
}: Props) {
  return (
    <IconSquareButton
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      accessibilityLabel={accessibilityLabel}
      width={52}
      height={52}
      radius={16}
      bg="#7F1D1D"
      bgPressed="#991B1B"
      bgDisabled="#2A0F10"
      spinnerColor="#FFFFFF"
    >
      <Ionicons name="close" size={22} color="#FFFFFF" />
    </IconSquareButton>
  );
}


