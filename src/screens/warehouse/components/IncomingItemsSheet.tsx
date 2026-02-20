import React from "react";
import { View, Text, TextInput, Platform, FlatList, Animated, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import WarehouseSheet from "./WarehouseSheet";
import { UI, s } from "../warehouse.styles";
import type { ItemRow } from "../warehouse.types";

import IconSquareButton from "../../../ui/IconSquareButton";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

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
}: Props) {
  const submitDisabled = !incomingId || receivingHeadId === incomingId;

  return (
    <WarehouseSheet visible={visible} onClose={onClose} heightPct={0.88}>
      {/* HEADER */}
      <View
        style={{
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderColor: UI.border,
          backgroundColor: "transparent",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* ✅ иконка вместо "Свернуть" */}
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

          {/* ✅ Кнопка "Оприходовать": иконка + текст в одном стиле */}
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

        <Text style={{ marginTop: 10, color: UI.sub, fontWeight: "800", fontSize: 12 }}>
          Введите кол-во только для нужных позиций (пусто — не трогаем).
        </Text>
      </View>

      {/* LIST */}
      <AnimatedFlatList
        data={rows || []}
        keyExtractor={(r: any, idx: number) => String(r?.incoming_item_id ?? r?.purchase_item_id ?? idx)}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: Platform.OS === "web" ? 24 : Math.max(24, kbH) + 24,
        }}
        keyboardShouldPersistTaps={Platform.OS === "web" ? "handled" : "always"}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        renderItem={({ item }: { item: ItemRow }) => {
          const exp = Number(item.qty_expected ?? 0) || 0;
          const rec = Number(item.qty_received ?? 0) || 0;
          const left = Math.max(0, exp - rec);

          const inputKey = String(item.incoming_item_id ?? item.purchase_item_id ?? "");
          const val = qtyInputByItem?.[inputKey] ?? "";

          return (
            <View style={{ marginBottom: 12 }}>
              <View style={s.mobCard}>
                <View style={s.mobMain}>
                  <Text style={s.mobTitle} numberOfLines={3}>
                    {String(item.name ?? "—")}
                  </Text>

                  <Text style={s.mobMeta} numberOfLines={2}>
                    {`${String(item.uom ?? "—")} · Ожид: ${exp} · Принято: ${rec} · Ост: ${left}`}
                  </Text>

                  <TextInput
                    value={val}
                    onChangeText={(t) => {
                      const cleaned = String(t ?? "").replace(",", ".").replace(/\s+/g, "");
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

