import React from "react";
import { Text, View } from "react-native";

type Props = {
  selectedWorkCount: number;
  selectedMatCount: number;
  matSum: number;
};

function ActBuilderSelectionStats(props: Props) {
  return (
    <View
      style={{
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        padding: 8,
        backgroundColor: "#f8fafc",
        gap: 2,
      }}
    >
      <Text style={{ color: "#334155", fontSize: 12 }}>Работ в акте: {props.selectedWorkCount}</Text>
      <Text style={{ color: "#334155", fontSize: 12 }}>Материалов в акте: {props.selectedMatCount}</Text>
      <Text style={{ color: "#0f172a", fontSize: 12, fontWeight: "700" }}>
        Итого по материалам: {props.matSum > 0 ? props.matSum.toLocaleString("ru-RU") : "0"}
      </Text>
    </View>
  );
}

export default React.memo(ActBuilderSelectionStats);
