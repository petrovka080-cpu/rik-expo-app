import React from "react";
import { View, Text, TextInput, Platform, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import WarehouseSheet from "./WarehouseSheet";
import { UI, s } from "../warehouse.styles";
import type { ItemRow } from "../warehouse.types";

import IconSquareButton from "../../../ui/IconSquareButton";
import { FlashList } from "../../../ui/FlashList";

type Props = {
  visible: boolean;
  onClose: () => void;

  title?: string;

  prText: string;
  roleLabel: string;

  incomingId: string;
  rows: ItemRow[];

  kbH: number;

  qtyInputByItem: Record<string, string>;
  setQtyInputByItem: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  receivingHeadId: string | null;
  onSubmit: (incomingId: string) => void;
  onRetryNow: (incomingId: string) => void;
  receiveStatusLabel: string;
  receiveStatusDetail: string | null;
  receiveStatusTone: "neutral" | "info" | "success" | "warning" | "danger";
  canRetryReceive: boolean;
};

const statusColorMap: Record<Props["receiveStatusTone"], string> = {
  neutral: "rgba(255,255,255,0.65)",
  info: "rgba(125,211,252,0.95)",
  success: "rgba(134,239,172,0.95)",
  warning: "rgba(253,224,138,0.95)",
  danger: "rgba(252,165,165,0.95)",
};

export default function IncomingItemsSheet({
  visible,
  onClose,
  title = "Позиции прихода",
  prText,
  roleLabel,
  incomingId,
  rows,
  kbH,
  qtyInputByItem,
  setQtyInputByItem,
  receivingHeadId,
  onSubmit,
  onRetryNow,
  receiveStatusLabel,
  receiveStatusDetail,
  receiveStatusTone,
  canRetryReceive,
}: Props) {
  const submitDisabled = !incomingId || receivingHeadId === incomingId;

  return (
    <WarehouseSheet visible={visible} onClose={onClose} heightPct={0.88}>
      <View
        style={{
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderColor: UI.border,
          backgroundColor: "transparent",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconSquareButton
            onPress={onClose}
            accessibilityLabel="Свернуть"
            width={46}
            height={46}
            radius={16}
            bg="rgba(255,255,255,0.06)"
            bgPressed="rgba(255,255,255,0.10)"
            bgDisabled="rgba(255,255,255,0.04)"
            spinnerColor={UI.text}
          >
            <Ionicons name="close" size={22} color={UI.text} />
          </IconSquareButton>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: UI.text, fontWeight: "900", fontSize: 18 }} numberOfLines={1}>
              {title}
            </Text>

            <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={{ fontWeight: "900", color: UI.text }}>{prText || "—"}</Text>

              {!!roleLabel && (
                <View
                  style={{
                    paddingVertical: 3,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.18)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <Text style={{ fontWeight: "900", color: UI.text, fontSize: 12 }}>{roleLabel}</Text>
                </View>
              )}
            </View>
          </View>

          <Pressable
            onPress={() => onSubmit(incomingId)}
            disabled={submitDisabled}
            style={[
              s.openBtn,
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderColor: UI.accent,
                opacity: submitDisabled ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons name="checkmark" size={18} color={UI.text} />
            <Text style={s.openBtnText}>{submitDisabled ? "..." : "Оприходовать"}</Text>
          </Pressable>
        </View>

        <View
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            backgroundColor: "rgba(255,255,255,0.04)",
          }}
        >
          <Text style={{ color: statusColorMap[receiveStatusTone], fontWeight: "900" }}>{receiveStatusLabel}</Text>
          {receiveStatusDetail ? (
            <Text style={{ marginTop: 4, color: UI.sub, fontWeight: "800", fontSize: 12 }}>
              {receiveStatusDetail}
            </Text>
          ) : null}

          {canRetryReceive ? (
            <Pressable
              onPress={() => onRetryNow(incomingId)}
              style={{
                marginTop: 8,
                alignSelf: "flex-start",
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(253,224,138,0.35)",
                backgroundColor: "rgba(253,224,138,0.10)",
              }}
            >
              <Text style={{ color: UI.text, fontWeight: "900" }}>Retry now</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={{ marginTop: 10, color: UI.sub, fontWeight: "800", fontSize: 12 }}>
          Введите количество только для нужных позиций. Пустое поле не отправляется.
        </Text>
      </View>

      <FlashList
        data={rows || []}
        keyExtractor={(row: ItemRow, idx: number) => String(row?.purchase_item_id ?? row?.incoming_item_id ?? idx)}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: Platform.OS === "web" ? 24 : Math.max(24, kbH) + 24,
        }}
        keyboardShouldPersistTaps={Platform.OS === "web" ? "handled" : "always"}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        estimatedItemSize={132}
        renderItem={({ item }) => {
          const row = item as ItemRow;
          const exp = Number(row.qty_expected ?? 0) || 0;
          const rec = Number(row.qty_received ?? 0) || 0;
          const left = Math.max(0, Number(row.qty_left ?? exp - rec) || 0);

          const inputKey = String(row.purchase_item_id ?? row.incoming_item_id ?? "");
          const val = qtyInputByItem?.[inputKey] ?? "";

          return (
            <View style={{ marginBottom: 12 }}>
              <View style={s.mobCard}>
                <View style={s.mobMain}>
                  <Text style={s.mobTitle} numberOfLines={3}>
                    {String(row.name ?? "—")}
                  </Text>

                  <Text style={s.mobMeta} numberOfLines={2}>
                    {`${String(row.uom ?? "—")} · Ожид: ${exp} · Принято: ${rec} · Ост: ${left}`}
                  </Text>

                  <TextInput
                    value={val}
                    onChangeText={(text) => {
                      const cleaned = String(text ?? "").replace(",", ".").replace(/\s+/g, "");
                      setQtyInputByItem((prev) => ({
                        ...(prev || {}),
                        [inputKey]: cleaned === "" || /^0+(\.0+)?$/.test(cleaned) ? "" : cleaned,
                      }));
                    }}
                    keyboardType="numeric"
                    placeholder={`Кол-во (ост: ${left})`}
                    placeholderTextColor={UI.sub}
                    style={[s.input, { marginTop: 10 }]}
                  />
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={{ color: UI.sub, fontWeight: "800", paddingTop: 12 }}>
            Позиции не найдены.
          </Text>
        }
      />
    </WarehouseSheet>
  );
}
