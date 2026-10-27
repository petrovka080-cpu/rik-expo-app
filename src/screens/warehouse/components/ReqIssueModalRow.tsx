// src/screens/warehouse/components/ReqIssueModalRow.tsx
//
// Stable, memoized row component for the ReqIssueModal item list.
// Receives pre-shaped props — no derived values computed here.

import React from "react";
import { View, Text, TextInput, Pressable, Platform, StyleSheet } from "react-native";
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
    <View
      testID={`warehouse-req-item-${item.request_item_id}`}
      accessibilityLabel={`warehouse-req-item-${item.request_item_id}`}
      style={localStyles.container}
    >
      <View style={s.mobCard}>
        <View style={s.mobMain}>
          <Text style={s.mobTitle} numberOfLines={2}>
            {nameHuman}
          </Text>

          <Text style={s.mobMeta} numberOfLines={3}>
            {metaText}
          </Text>

          <View style={localStyles.actionRow}>
            <TextInput
              testID={`warehouse-req-qty-input-${item.request_item_id}`}
              accessibilityLabel={`warehouse-req-qty-input-${item.request_item_id}`}
              value={qtyValue}
              onChangeText={(t) => {
                const cleaned = String(t ?? "").replace(",", ".").replace(/\s+/g, "");
                onChangeQty(item.request_item_id, cleaned);
              }}
              keyboardType={Platform.OS === "web" ? "default" : "numeric"}
              placeholder={qtyPlaceholder}
              placeholderTextColor={UI.sub}
              style={[s.input, localStyles.input]}
            />

            <Pressable
              testID={`warehouse-req-max-${item.request_item_id}`}
              accessibilityLabel={`warehouse-req-max-${item.request_item_id}`}
              onPress={() => onPressMax(item.request_item_id, maxUi)}
              disabled={disabledByStock}
              style={[s.openBtn, disabledByStock && localStyles.disabledButton]}
            >
              <Text style={s.openBtnText}>Макс</Text>
            </Pressable>

            <Pressable
              testID={`warehouse-req-add-${item.request_item_id}`}
              accessibilityLabel={`warehouse-req-add-${item.request_item_id}`}
              onPress={() => onPressAdd(shape)}
              disabled={disabledAdd}
              style={[s.openBtn, localStyles.addButton, disabledAdd && localStyles.disabledButton]}
            >
              <Text style={s.openBtnText}>{issueBusy ? "..." : "Добавить"}</Text>
            </Pressable>
          </View>

          {showStockZeroWarn ? (
            <Text style={localStyles.warnText}>
              Нельзя выдать сейчас: по заявке лимит исчерпан или на складе 0
            </Text>
          ) : showReqZeroWarn ? (
            <Text style={localStyles.warnText}>
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

const localStyles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  actionRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 8,
  },
  addButton: {
    borderColor: UI.accent,
  },
  disabledButton: {
    opacity: 0.45,
  },
  warnText: {
    marginTop: 6,
    color: UI.sub,
    fontWeight: "800",
  },
});
