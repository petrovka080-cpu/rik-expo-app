import React, { useRef } from "react";
import { View, Text, Pressable, Animated } from "react-native";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { Attachment, BuyerGroup, DraftAttachmentMap } from "../buyer.types";
import type { StylesBag } from "./component.types";
import { UI } from "../buyerUi";
import { RoleCard } from "../../../components/ui/RoleCard";

export const BuyerGroupBlock = React.memo(function BuyerGroupBlock(props: {
  g: BuyerGroup;
  index?: number;
  gsum?: number;
  isWeb?: boolean;
  supplierGroups?: string[];
  attachments?: DraftAttachmentMap;
  onPickAttachment?: (key: string, att: Attachment | null) => void;

  isOpen: boolean;
  headerTitle: string;
  headerMeta: string;

  s: StylesBag;

  onToggle: () => void;
  renderItemRow: (it: BuyerInboxRow, idx2: number) => React.ReactNode;
}) {
  const { headerTitle, headerMeta, onToggle, s } = props;

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

  const isRejectedHeader =
    String(headerMeta || "").startsWith("❌ ОТКЛОНЕНА") ||
    String(headerMeta || "").includes("❌ отклонено");

  const itemsCntText = `${props.g.items.length} поз.`;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View style={[s.group, { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }]}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onToggle}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        >
          <RoleCard
            title={headerTitle}
            subtitle={itemsCntText}
            meta={headerMeta}
            status={<Text style={{ fontSize: 14 }}>⏳</Text>}
            rightIndicator={<Text style={{ color: UI.accent, fontSize: 18, fontWeight: "300" }}>›</Text>}
            style={[
              s.groupHeader,
              {
                borderBottomWidth: 0,
                marginBottom: 0,
                paddingVertical: 12,
                paddingHorizontal: 16,
              },
            ]}
            titleStyle={[s.groupTitle, { fontSize: 16, fontWeight: "900", color: UI.text }]}
            subtitleStyle={{ color: UI.sub, fontSize: 13, fontWeight: "800", marginTop: 4 }}
            metaStyle={[
              s.groupMeta,
              { fontSize: 13, color: "rgba(255,255,255,0.5)" },
              isRejectedHeader && { color: "#F87171", fontWeight: "900" },
            ]}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
});
