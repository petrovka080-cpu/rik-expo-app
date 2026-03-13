import React from "react";
import { Pressable, View } from "react-native";

type Props = {
  onPress: () => void;
  children: React.ReactNode;
  containerStyle?: object;
  pressableStyle?: object;
  pressedOpacity?: number;
};

export default function WarehouseCardShell({
  onPress,
  children,
  containerStyle,
  pressableStyle,
  pressedOpacity = 0.92,
}: Props) {
  return (
    <View style={containerStyle}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressableStyle, pressed && { opacity: pressedOpacity }]}
      >
        {children}
      </Pressable>
    </View>
  );
}
