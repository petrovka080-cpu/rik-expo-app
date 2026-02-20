// src/ui/AppButton.tsx
import React from "react";
import { Pressable, Text, View, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from "react-native";

type Variant = "neutral" | "blue" | "green" | "red" | "orange";
type Shape = "wide" | "pill" | "square";
type Size = "sm" | "md";

type Props = {
  label?: string;                 // если кнопка текстовая
  children?: React.ReactNode;     // если иконка или кастом
  onPress: () => void | Promise<void>;

  variant?: Variant;
  shape?: Shape;
  size?: Size;

  disabled?: boolean;
  loading?: boolean;

  // квадрат
  width?: number;
  height?: number;

  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

const tones: Record<Variant, { bg: string; border: string; text: string }> = {
  green:  { bg: "#22C55E", border: "#22C55E", text: "#0B0F14" },
  blue:   { bg: "#3B82F6", border: "#2563EB", text: "#FFFFFF" },
  red:    { bg: "#EF4444", border: "#EF4444", text: "#FFFFFF" },
  orange: { bg: "#F97316", border: "#F97316", text: "#FFFFFF" },
  neutral:{ bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.18)", text: "#F8FAFC" },
};

function radiusFor(shape: Shape) {
  if (shape === "pill") return 999;
  return 16;
}
function heightFor(shape: Shape, size: Size) {
  if (shape === "square") return size === "sm" ? 44 : 52;
  return size === "sm" ? 44 : 52;
}
function padFor(shape: Shape, size: Size) {
  if (shape === "square") return { px: 0, py: 0 };
  if (shape === "pill") return size === "sm" ? { px: 12, py: 8 } : { px: 16, py: 10 };
  // wide
  return size === "sm" ? { px: 12, py: 10 } : { px: 14, py: 12 };
}

export default function AppButton({
  label,
  children,
  onPress,

  variant = "neutral",
  shape = "wide",
  size = "md",

  disabled = false,
  loading = false,

  width,
  height,

  style,
  textStyle,
  accessibilityLabel,
}: Props) {
  const isDisabled = disabled || loading;
  const t = tones[variant];

  const h = height ?? heightFor(shape, size);
  const w = shape === "wide" ? "100%" : (width ?? (shape === "square" ? h : undefined));
  const r = radiusFor(shape);
  const pad = padFor(shape, size);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          width: w as any,
          height: h,
          borderRadius: r,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          backgroundColor: t.bg,
          borderColor: t.border,
          opacity: isDisabled ? 0.6 : pressed ? 0.92 : 1,
          paddingHorizontal: pad.px,
          paddingVertical: pad.py,
        },
        style as any,
      ]}
    >
      {loading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ActivityIndicator color={t.text} />
          {label ? (
            <Text style={[{ color: t.text, fontWeight: "900", fontSize: 14 }, textStyle]}>
              {label}
            </Text>
          ) : null}
        </View>
      ) : children ? (
        children
      ) : (
        <Text style={[{ color: t.text, fontWeight: "900", fontSize: 14 }, textStyle]}>
          {label ?? ""}
        </Text>
      )}
    </Pressable>
  );
}
