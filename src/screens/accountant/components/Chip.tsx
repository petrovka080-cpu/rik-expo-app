import React from "react";
import { Text, View } from "react-native";

export default function Chip({
  label,
  bg,
  fg,
}: {
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <View
      style={{
        height: 26,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: fg, fontWeight: "900", fontSize: 12 }}>
        {String(label).toUpperCase()}
      </Text>
    </View>
  );
}
