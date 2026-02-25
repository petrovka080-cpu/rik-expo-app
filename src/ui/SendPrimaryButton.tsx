import React from "react";
import { Text } from "react-native";
import SendHomeIcon from "./icons/SendHomeIcon";
import IconSquareButton from "./IconSquareButton";

type Variant = "dark" | "green" | "grayGreen";
type Mode = "square" | "wide";

type Props = {
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;

  variant?: Variant;
  mode?: Mode;

  // 🔒 глобальный стандарт
  size?: number;      // default = 52
  radius?: number;    // default = 16
  iconSize?: number;  // default = 24

  label?: string;     // для wide
  accessibilityLabel?: string;
};

function colors(variant: Variant, disabled: boolean) {
  let bg = "#0B0B0C";
  let bgPressed = "#121316";
  let bgDisabled = "#1A1A1A";
  let fg = disabled ? "#6E6E6E" : "#FFFFFF";

  if (variant === "green") {
    bg = "#1B7F55";
    bgPressed = "#166846";
    bgDisabled = "#143327";
    fg = disabled ? "#8ED8B9" : "#FFFFFF";
  } else if (variant === "grayGreen") {
    bg = "#2A2D32";
    bgPressed = "#31343A";
    bgDisabled = "#22252A";
    fg = disabled ? "#3C6B54" : "#2ECC71";
  }

  return { bg, bgPressed, bgDisabled, fg };
}

export default function SendPrimaryButton({
  onPress,
  disabled = false,
  loading = false,
  variant = "dark",
  mode = "square",

  // ✅ ГЛАВНОЕ
  size = 52,
  radius = 16,
  iconSize = 24,

  label,
  accessibilityLabel,
}: Props) {
  const isDisabled = disabled || loading;
  const { bg, bgPressed, bgDisabled, fg } = colors(variant, isDisabled);

  // защита
  const BTN = Math.max(44, Math.round(size));
  const RAD = Math.max(12, Math.round(radius));
  const ICON = Math.max(20, Math.round(iconSize));

  // ===== WIDE =====
  if (mode === "wide") {
    const text = String(label || "Отправить").trim();

    return (
      <IconSquareButton
        onPress={onPress}
        disabled={disabled}
        loading={loading}
        accessibilityLabel={accessibilityLabel || text}
    // @ts-ignore
        width="100%"
        height={52}
        radius={RAD}
        bg={bg}
        bgPressed={bgPressed}
        bgDisabled={bgDisabled}
        spinnerColor={fg}
        luxGreen={variant === "green"}
      >
        <Text style={{ color: fg, fontWeight: "900" }}>
          {loading ? "…" : text}
        </Text>
      </IconSquareButton>
    );
  }

  // ===== SQUARE 52×52 =====
  return (
    <IconSquareButton
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      accessibilityLabel={accessibilityLabel || "Отправить"}
      width={BTN}
      height={BTN}
      radius={RAD}
      bg={bg}
      bgPressed={bgPressed}
      bgDisabled={bgDisabled}
      spinnerColor={fg}
      luxGreen={variant === "green"}
    >
      <SendHomeIcon size={ICON} color={fg} />
    </IconSquareButton>
  );
}
