import React, { useMemo } from "react";
import { View, Text } from "react-native";

export const Chip = React.memo(function Chip({
  label,
  bg,
  fg,
}: {
  label: string;
  bg: string;
  fg: string;
}) {
  const st = useMemo(
    () => ({ backgroundColor: bg, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }),
    [bg]
  );
  const tx = useMemo(() => ({ color: fg, fontWeight: "600" as const, fontSize: 12 }), [fg]);

  return (
    <View style={st}>
      <Text style={tx}>{label}</Text>
    </View>
  );
});

