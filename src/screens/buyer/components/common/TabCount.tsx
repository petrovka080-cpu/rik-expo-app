import React from "react";
import { View, Text } from "react-native";
import type { StylesBag } from "../component.types";

export const TabCount = React.memo(function TabCount({
  n,
  active,
  s,
}: {
  n: number;
  active: boolean;
  s: StylesBag;
}) {
  if (!n) return null;
  if (!s) return null;

  return (
    <View style={[s.tabBadge, active && s.tabBadgeActive]}>
      <Text style={[s.tabBadgeText, active && s.tabBadgeTextActive]}>{n}</Text>
    </View>
  );
});
