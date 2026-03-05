import React from "react";
import { Text, View } from "react-native";

type Props = {
  workSum: number;
  matSum: number;
};

export default function ActBuilderTotalsCard(props: Props) {
  const total = props.workSum + props.matSum;
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12,
        padding: 10,
        marginTop: 4,
        gap: 4,
      }}
    >
      <Text style={{ color: "#334155", fontWeight: "700", fontSize: 12 }}>Итоги</Text>
      <Text style={{ color: "#334155", fontSize: 12 }}>
        Работы: {props.workSum > 0 ? props.workSum.toLocaleString("ru-RU") : "без суммы"}
      </Text>
      <Text style={{ color: "#334155", fontSize: 12 }}>
        Материалы: {props.matSum > 0 ? props.matSum.toLocaleString("ru-RU") : "без суммы"}
      </Text>
      <Text style={{ color: "#0f172a", fontWeight: "800", fontSize: 13 }}>
        Итого: {total > 0 ? total.toLocaleString("ru-RU") : "—"}
      </Text>
    </View>
  );
}
