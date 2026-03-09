import React, { useRef } from "react";
import { View, Text, Pressable, Animated } from "react-native";

import type { BuyerProposalBucketRow } from "../buyer.fetchers";
import { UI } from "../buyerUi";
import { StatusBadge } from "../../../ui/StatusBadge";
import type { StylesBag } from "./component.types";
import { RoleCard } from "../../../components/ui/RoleCard";

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

  // Keep existing status mapping behavior unchanged
  let statusText = String(head.status || "—");
  let statusIcon = "";
  if (statusText === "Утверждено") {
    statusText = `✓ ${statusText}`;
    statusIcon = "🧾";
  } else if (statusText === "На утверждении") {
    statusText = `⏳ ${statusText}`;
    statusIcon = "⏳";
  } else if (statusText.includes("На доработке")) {
    statusText = `✎ ${statusText}`;
    statusIcon = "✎";
  }

  const headerText = props.title || pidStr.slice(0, 8);
  const dateStr = head.submitted_at ? new Date(head.submitted_at).toLocaleDateString() : "";
  const amountText = `${Number(head.total_sum ?? 0).toLocaleString()} сом`;
  const metaText = `${head.items_cnt || 0} поз.${dateStr ? ` • ${dateStr}` : ""}`;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onOpenDetails(pidStr)}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <RoleCard
          title={headerText}
          subtitle={amountText}
          meta={metaText}
          style={[
            s.proposalCard,
            {
              marginBottom: 0,
              borderColor: "rgba(255,255,255,0.08)",
              paddingVertical: 12,
              paddingHorizontal: 12,
            },
          ]}
          subtitleStyle={{ color: UI.accent, fontWeight: "900" }}
          metaStyle={{ color: "rgba(255,255,255,0.6)", fontWeight: "700" }}
          status={<StatusBadge label={statusText} tone="neutral" compact />}
          rightIndicator={
            <View style={{ flexDirection: "row", gap: 4 }}>
              {statusIcon ? <Text style={{ fontSize: 12 }}>{statusIcon}</Text> : null}
              {typeof props.attCount === "number" && props.attCount > 0 ? (
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>📎 {props.attCount}</Text>
              ) : null}
            </View>
          }
        />
      </Pressable>
    </Animated.View>
  );
});
