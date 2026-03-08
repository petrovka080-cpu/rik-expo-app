import React, { useRef } from "react";
import { View, Text, Pressable, Animated } from "react-native";

import type { BuyerProposalBucketRow } from "../buyer.fetchers";
import { UI } from "../buyerUi";
import { StatusBadge } from "../../../ui/StatusBadge";
import type { StylesBag } from "./component.types";

// We extend ProposalHeadLite internally to support items_cnt if available
type CardHead = BuyerProposalBucketRow & { items_cnt?: number };

export const BuyerProposalCard = React.memo(function BuyerProposalCard(props: {
  head: CardHead;
  title?: string;
  s: StylesBag;
  attCount?: number | null;
  onOpenDetails: (pidStr: string) => void;
}) {
  const { head, s, onOpenDetails } = props;

  const pidStr = String(head.id);
  // Scale animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  // Status with icons
  let statusText = String(head.status || "—");
  let statusIcon = "";
  if (statusText === "Утверждено") {
    statusText = `✓ ${statusText}`;
    statusIcon = "🧾"; // Smart Badge for Approved
  } else if (statusText === "На утверждении") {
    statusText = `⏳ ${statusText}`;
    statusIcon = "⏳"; // Smart Badge for Pending
  } else if (statusText.includes("На доработке")) {
    statusText = `✎ ${statusText}`;
    statusIcon = "✎"; // Smart Badge for Rework
  }

  // Remove "Предложение " prefix
  const headerText = props.title || pidStr.slice(0, 8);
  const dateStr = head.submitted_at ? new Date(head.submitted_at).toLocaleDateString() : "";

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onOpenDetails(pidStr)}
        style={({ pressed }) => [
          s.proposalCard,
          {
            opacity: pressed ? 0.9 : 1,
            borderColor: pressed ? UI.accent : "rgba(255,255,255,0.08)",
            padding: 12,
          }
        ]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[s.cardTitle, { color: UI.text, fontSize: 16, fontWeight: "900" }]} numberOfLines={1}>
                {headerText}
              </Text>

              <View style={{ flexDirection: 'row', gap: 4 }}>
                {statusIcon ? <Text style={{ fontSize: 12 }}>{statusIcon}</Text> : null}
                {typeof props.attCount === "number" && props.attCount > 0 && (
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>📎 {props.attCount}</Text>
                )}
              </View>
            </View>
          </View>

          <StatusBadge label={statusText} tone="neutral" compact />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
          <Text style={{ color: UI.accent, fontSize: 15, fontWeight: "900" }}>
            {Number(head.total_sum ?? 0).toLocaleString()} <Text style={{ fontSize: 11, fontWeight: "400" }}>сом</Text>
          </Text>

          <Text style={{ color: "rgba(255,255,255,0.2)" }}>•</Text>

          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "700" }}>
            {head.items_cnt || 0} поз.
          </Text>

          {!!dateStr && (
            <>
              <Text style={{ color: "rgba(255,255,255,0.2)" }}>•</Text>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: "600" }}>
                {dateStr}
              </Text>
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});
