import React from "react";
import { ActivityIndicator, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type TopRightAction = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  ariaLabel?: string;
  testID?: string;
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
  testIdPrefix?: string;

  // optional: если хочешь чтобы левый текст был чуть меньше/больше
  titleFontSize?: number;
};

function IconSquare({
  icon,
  onPress,
  disabled,
  busy,
  ui,
  ariaLabel,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  ui: TopRightUi;
  ariaLabel?: string;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={ariaLabel}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      onPress={onPress}
      disabled={!!disabled || !!busy}
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: ui.border,
        backgroundColor: ui.btnBg,
        opacity: disabled || busy ? 0.45 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={ui.text} />
      ) : (
        <Ionicons name={icon} size={18} color={ui.text} />
      )}
    </Pressable>
  );
}

export default function TopRightActionBar({
  titleLeft,
  actions,
  ui,
  testIdPrefix,
  titleFontSize = 14,
}: Props) {
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
          <View key={a.key}>
            <IconSquare
              icon={a.icon}
              onPress={a.onPress}
              disabled={a.disabled}
              busy={a.busy}
              ui={ui}
              ariaLabel={a.ariaLabel}
              testID={a.testID ?? (testIdPrefix ? `${testIdPrefix}-action-${a.key}` : undefined)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
