import React from "react";
import { View, Text, Pressable } from "react-native";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { Attachment, BuyerGroup, DraftAttachmentMap } from "../buyer.types";
import type { StylesBag } from "./component.types";
import { UI } from "../buyerUi";

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
  const {
    isOpen,
    headerTitle,
    headerMeta,
    onToggle,
    s,
  } = props;

  const isRejectedHeader =
    String(headerMeta || "").startsWith("❌ ОТКЛОНЕНА") ||
    String(headerMeta || "").includes("❌ отклонено");

  return (
    <View style={s.group}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          s.groupHeader,
          {
            opacity: pressed ? 0.7 : 1,
            paddingVertical: 14,
            paddingHorizontal: 16
          }
        ]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.groupTitle, { fontSize: 16, fontWeight: "900", color: UI.text }]} numberOfLines={1}>
            {headerTitle}
          </Text>

          <Text
            style={[
              s.groupMeta,
              { marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.6)" },
              isRejectedHeader && { color: "#F87171", fontWeight: "900" }
            ]}
            numberOfLines={1}
          >
            {headerMeta}
          </Text>
        </View>

        <View style={{ marginLeft: 8 }}>
          <Text style={{ color: UI.accent, fontSize: 20, fontWeight: "300" }}>›</Text>
        </View>
      </Pressable>

      {/* In place expansion is disabled in main list by hardcoding isOpen=false in renderer, 
          but we keep this logic for cases where it might be used elsewhere or if design changes back. */}
      {isOpen ? (
        <View style={s.openBody}>
          <View style={s.itemsPanel}>
            <View style={s.itemsBox}>
              {props.g.items.map((item, idx2) => (
                <React.Fragment
                  key={item?.request_item_id ? `ri:${item.request_item_id}` : `f:${props.g.request_id}:${idx2}`}
                >
                  {props.renderItemRow(item, idx2)}
                </React.Fragment>
              ))}
              <View style={{ height: 12 }} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
});
