import React from "react";
import { View, Text, Pressable } from "react-native";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { Attachment, BuyerGroup, DraftAttachmentMap } from "../buyer.types";
import type { StylesBag } from "./component.types";

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
    g,
    isOpen,
    headerTitle,
    headerMeta,
    onToggle,
    renderItemRow,
    s,
  } = props;

  const isRejectedHeader =
    String(headerMeta || "").startsWith("❌ ОТКЛОНЕНА") ||
    String(headerMeta || "").includes("❌ отклонено");

  return (
    <View style={s.group}>
      <Pressable onPress={onToggle} style={s.groupHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.groupTitle} numberOfLines={1}>{headerTitle}</Text>

          <Text
            style={[s.groupMeta, isRejectedHeader && { color: "#DC2626", fontWeight: "900" }]}
            numberOfLines={1}
          >
            {headerMeta}
          </Text>
        </View>

        <Pressable onPress={onToggle} style={s.openBtn}>
          <Text style={s.openBtnText}>{isOpen ? "Свернуть" : "Открыть"}</Text>
        </Pressable>
      </Pressable>

      {isOpen ? (
        <View style={s.openBody}>
          <View style={s.itemsPanel}>
            <View style={s.itemsBox}>
              {g.items.map((item, idx2) => (
                <React.Fragment
                  key={item?.request_item_id ? `ri:${item.request_item_id}` : `f:${g.request_id}:${idx2}`}
                >
                  {renderItemRow(item, idx2)}
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
