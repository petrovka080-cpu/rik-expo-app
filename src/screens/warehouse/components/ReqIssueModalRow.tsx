// src/screens/warehouse/components/ReqIssueModalRow.tsx
//
// Stable, memoized row component for the ReqIssueModal item list.
// Receives pre-shaped props — no derived values computed here.

import React from "react";
import { View, Text, TextInput, Pressable, Platform } from "react-native";
import { UI, s } from "../warehouse.styles";
import type { ReqIssueModalRowShape } from "./reqIssueModal.row.model";

type Props = {
  shape: ReqIssueModalRowShape;
  onChangeQty: (requestItemId: string, value: string) => void;
  onPressMax: (requestItemId: string, maxUi: number) => void;
  onPressAdd: (shape: ReqIssueModalRowShape) => void;
  issueBusy: boolean;
};

function ReqIssueModalRowInner({
  shape,
  onChangeQty,
  onPressMax,
  onPressAdd,
  issueBusy,
}: Props) {
  const {
    nameHuman,
    metaText,
    maxUi,
    qtyPlaceholder,
    qtyValue,
    disabledByStock,
    disabledAdd,
    showStockZeroWarn,
    showReqZeroWarn,
    item,
  } = shape;

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={s.mobCard}>
        <View style={s.mobMain}>
          <Text style={s.mobTitle} numberOfLines={2}>
            {nameHuman}
          </Text>

          <Text style={s.mobMeta} numberOfLines={3}>
            {metaText}
          </Text>

          <View style={{ marginTop: 10, flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              value={qtyValue}
              onChangeText={(t) => {
                const cleaned = String(t ?? "").replace(",", ".").replace(/\s+/g, "");
                onChangeQty(item.request_item_id, cleaned);
              }}
              keyboardType={Platform.OS === "web" ? "default" : "numeric"}
              placeholder={qtyPlaceholder}
              placeholderTextColor={UI.sub}
              style={[s.input, { flex: 1, paddingVertical: 8 }]}
            />

            <Pressable
              onPress={() => onPressMax(item.request_item_id, maxUi)}
              disabled={disabledByStock}
              style={[s.openBtn, { opacity: disabledByStock ? 0.45 : 1 }]}
            >
              <Text style={s.openBtnText}>Макс</Text>
            </Pressable>

            <Pressable
              onPress={() => onPressAdd(shape)}
              disabled={disabledAdd}
              style={[s.openBtn, { borderColor: UI.accent, opacity: disabledAdd ? 0.45 : 1 }]}
            >
              <Text style={s.openBtnText}>{issueBusy ? "..." : "Добавить"}</Text>
            </Pressable>
          </View>

          {showStockZeroWarn ? (
            <Text style={{ marginTop: 6, color: UI.sub, fontWeight: "800" }}>
              Нельзя выдать сейчас: по заявке лимит исчерпан или на складе 0
            </Text>
          ) : showReqZeroWarn ? (
            <Text style={{ marginTop: 6, color: UI.sub, fontWeight: "800" }}>
              По заявке можно 0 — перерасход делай через «Свободная выдача»
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/**
 * Memoized with field-level comparator.
 * Re-renders only when the shaped values or callbacks change.
 * onChangeQty / onPressMax / onPressAdd should be stable useCallback refs from the parent.
 */
export const ReqIssueModalRow = React.memo(ReqIssueModalRowInner, (prev, next) => {
  return (
    prev.shape.rowKey === next.shape.rowKey &&
    prev.shape.qtyValue === next.shape.qtyValue &&
    prev.shape.maxUi === next.shape.maxUi &&
    prev.shape.disabledByStock === next.shape.disabledByStock &&
    prev.shape.disabledAdd === next.shape.disabledAdd &&
    prev.shape.showStockZeroWarn === next.shape.showStockZeroWarn &&
    prev.shape.showReqZeroWarn === next.shape.showReqZeroWarn &&
    prev.issueBusy === next.issueBusy &&
    prev.onChangeQty === next.onChangeQty &&
    prev.onPressMax === next.onPressMax &&
    prev.onPressAdd === next.onPressAdd
  );
});

ReqIssueModalRow.displayName = "ReqIssueModalRow";
