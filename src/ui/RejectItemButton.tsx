// src/ui/RejectItemButton.tsx
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import IconSquareButton from "./IconSquareButton";

type Props = {
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
};

export default function RejectItemButton({
  onPress,
  disabled = false,
  loading = false,
}: Props) {
  return (
    <IconSquareButton
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      accessibilityLabel="Отклонить позицию"
      width={52}
      height={52}
      radius={16}
      bg="#7F1D1D"
      bgPressed="#991B1B"
      bgDisabled="#2A0F10"
      spinnerColor="#FFFFFF"
    >
      <Ionicons name="close" size={21} color="#FFFFFF" />
    </IconSquareButton>
  );
}
