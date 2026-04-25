import React, { useRef } from "react";
import { View, Text, Pressable, Animated } from "react-native";

import type { BuyerProposalBucketRow } from "../buyer.fetchers";
import { UI } from "../buyerUi";
import { StatusBadge } from "../../../ui/StatusBadge";
import type { StylesBag } from "./component.types";
import { RoleCard } from "../../../components/ui/RoleCard";
import ChevronIndicator from "../../../ui/ChevronIndicator";
import { mapBuyerProposalToCardProps } from "../presentation/buyerRowAdapters";

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
  const card = mapBuyerProposalToCardProps(head, props.title);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        testID={`buyer-proposal-card-${card.pidStr}`}
        accessibilityLabel={`buyer-proposal-card-${card.pidStr}`}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onOpenDetails(card.pidStr)}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <RoleCard
          title={card.title}
          subtitle={card.subtitle}
          meta={card.meta}
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
          status={<StatusBadge label={card.statusText} tone="neutral" compact />}
          rightIndicator={
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              {typeof props.attCount === "number" && props.attCount > 0 ? (
                <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: "500" }}>
                  Файлы {props.attCount}
                </Text>
              ) : null}
              <ChevronIndicator color={UI.accent} />
            </View>
          }
        />
      </Pressable>
    </Animated.View>
  );
});
