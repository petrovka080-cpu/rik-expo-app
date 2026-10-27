import React from "react";
import { View, Text } from "react-native";
import type { StylesBag } from "../component.types";

export type TabKind = "inbox" | "pending" | "approved" | "rejected" | "subcontracts";

export const TabCount = React.memo(function TabCount({
  n,
  active,
  s,
  kind
}: {
  n: number;
  active: boolean;
  s: StylesBag;
  kind?: TabKind;
}) {
  if (!n) return null;
  if (!s) return null;

  let bg = active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)";
  if (kind === "rejected") bg = active ? "#EF4444" : "rgba(239,68,68,0.2)";
  if (kind === "approved") bg = active ? "#10B981" : "rgba(16,185,129,0.2)";
  if (kind === "pending") bg = active ? "#F59E0B" : "rgba(245,158,11,0.2)";
  if (kind === "inbox") bg = active ? "#3B82F6" : "rgba(59,130,246,0.2)";

  return (
    <View style={[s.tabBadge, { backgroundColor: bg }, active && s.tabBadgeActive]}>
      <Text style={[s.tabBadgeText, active && s.tabBadgeTextActive, { fontSize: 11, fontWeight: '900' }]}>
        {n}
      </Text>
    </View>
  );
});
