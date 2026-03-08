import React from "react";
import { View, Text, Pressable } from "react-native";

import type { ProposalHeadLite } from "../buyer.types";
import { UI } from "../buyerUi";
import { Chip } from "./common/Chip";
import type { StylesBag } from "./component.types";
import { statusColors } from "./statusColors";

// We extend ProposalHeadLite internally to support items_cnt if available
type CardHead = ProposalHeadLite & { items_cnt?: number };

export const BuyerProposalCard = React.memo(function BuyerProposalCard(props: {
  head: CardHead;
  title?: string;
  s: StylesBag;
  attCount?: number | null;
  onOpenDetails: (pidStr: string) => void;
}) {
  const { head, s, onOpenDetails } = props;

  const pidStr = String(head.id);
  const sc = statusColors(head.status);

  // Remove "Предложение " prefix as requested by user
  // We use the pretty title if available, else short ID
  const headerText = props.title || pidStr.slice(0, 8);

  return (
    <Pressable
      onPress={() => onOpenDetails(pidStr)}
      style={({ pressed }) => [
        s.proposalCard,
        { opacity: pressed ? 0.8 : 1 }
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.cardTitle, { color: UI.text, fontSize: 16, fontWeight: "900" }]} numberOfLines={1}>
            {headerText}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Text style={[s.cardMeta, { color: "rgba(255,255,255,0.6)", fontSize: 13 }]}>
              {head.submitted_at ? new Date(head.submitted_at).toLocaleDateString() : "—"}
            </Text>
            {typeof props.attCount === "number" && props.attCount > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <Text style={{ color: "rgba(255,255,255,0.4)" }}>·</Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>📎 {props.attCount}</Text>
              </View>
            )}
          </View>
        </View>

        <Chip label={String(head.status || "—")} bg={sc.bg} fg={sc.fg} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Итого:</Text>
          <Text style={{ color: UI.accent, fontSize: 17, fontWeight: "900" }}>
            {Number(head.total_sum ?? 0).toLocaleString()} <Text style={{ fontSize: 12, fontWeight: "400" }}>сом</Text>
          </Text>
        </View>

        {!!head.items_cnt && (
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
            {head.items_cnt} поз.
          </Text>
        )}
      </View>
    </Pressable>
  );
});
