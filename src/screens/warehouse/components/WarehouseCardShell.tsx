import React from "react";
import { Pressable, View } from "react-native";

type Props = {
  onPress: () => void;
  children: React.ReactNode;
  containerStyle?: object;
  pressableStyle?: object;
  pressedOpacity?: number;
  testID?: string;
  accessibilityLabel?: string;
};

export default function WarehouseCardShell({
  onPress,
  children,
  containerStyle,
  pressableStyle,
  pressedOpacity = 0.92,
  testID,
  accessibilityLabel,
}: Props) {
  return (
    <View style={containerStyle}>
      <Pressable
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [pressableStyle, pressed && { opacity: pressedOpacity }]}
      >
        {children}
      </Pressable>
    </View>
  );
}
