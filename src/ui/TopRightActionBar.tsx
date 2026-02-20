import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type TopRightAction = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  ariaLabel?: string;
};

export type TopRightUi = {
  text: string;
  sub: string;
  border: string;
  btnBg: string;
};

type Props = {
  titleLeft: string;
  actions: TopRightAction[];
  ui: TopRightUi;

  // optional: если хочешь чтобы левый текст был чуть меньше/больше
  titleFontSize?: number;
};

function IconSquare({
  icon,
  onPress,
  disabled,
  ui,
  ariaLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  ui: TopRightUi;
  ariaLabel?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={ariaLabel}
      onPress={onPress}
      disabled={!!disabled}
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: ui.border,
        backgroundColor: ui.btnBg,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Ionicons name={icon} size={18} color={ui.text} />
    </Pressable>
  );
}

export default function TopRightActionBar({ titleLeft, actions, ui, titleFontSize = 14 }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text
        style={{ color: ui.text, fontWeight: "900", flex: 1, fontSize: titleFontSize }}
        numberOfLines={1}
      >
        {titleLeft}
      </Text>

      <View style={{ flexDirection: "row", gap: 8, marginLeft: 10 }}>
        {actions.map((a) => (
          <IconSquare
            key={a.key}
            icon={a.icon}
            onPress={a.onPress}
            disabled={a.disabled}
            ui={ui}
            ariaLabel={a.ariaLabel}
          />
        ))}
      </View>
    </View>
  );
}
