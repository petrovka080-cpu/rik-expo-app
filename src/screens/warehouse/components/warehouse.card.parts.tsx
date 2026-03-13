import React from "react";
import { Text, View } from "react-native";
import { StatusBadge } from "../../../ui/StatusBadge";
import ChevronIndicator from "../../../ui/ChevronIndicator";
import { s } from "../warehouse.styles";

export function renderWarehouseOnHandBadge(label: string) {
  return (
    <View style={s.metaPill}>
      <Text style={s.metaPillText}>{label}</Text>
    </View>
  );
}

export function renderWarehouseIncomingRightIndicator(leftLabel: string) {
  return (
    <View style={{ alignItems: "flex-end", gap: 6 }}>
      <StatusBadge label={leftLabel} tone="info" compact />
      <ChevronIndicator />
    </View>
  );
}
