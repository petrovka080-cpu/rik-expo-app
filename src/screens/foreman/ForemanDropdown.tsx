import React, { useCallback } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RefOption } from "./foreman.types";
import { debugForemanLogLazy } from "./foreman.debug";
import { useForemanDropdownModel } from "./hooks/useForemanDropdownModel";
import { FOREMAN_DROPDOWN_DEFAULT_FIELD } from "./foreman.dropdown.constants";

type Props = {
  label: string;
  options: RefOption[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  searchable?: boolean;
  width?: DimensionValue;
  fieldKey?: string;
  required?: boolean;
  showLabel?: boolean;
  valueLabelOverride?: string;
  ui: { text: string };
  styles: typeof import("./foreman.styles").s;
};

export default function ForemanDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = "Выбрать...",
  searchable = true,
  width = "100%",
  fieldKey,
  required = false,
  showLabel = true,
  valueLabelOverride,
  styles: s,
  ui,
}: Props) {
  const key = String(fieldKey || label || FOREMAN_DROPDOWN_DEFAULT_FIELD).trim();

  const {
    open,
    query,
    setQuery,
    picked,
    filtered,
    openModal,
    closeModal,
    clearSearch,
    pickCode,
    resetSelection,
    keyExtractor,
    getItemLayout,
  } = useForemanDropdownModel({
    fieldKey: key,
    options,
    value,
    onChange,
  });

  debugForemanLogLazy("[FOREMAN_DROPDOWN_FACT]", () => ({
    fieldLabel: label,
    value,
    picked: picked ? { code: picked.code, name: picked.name } : null,
    placeholder,
    options: options.map((o) => ({ code: o.code, name: o.name })),
  }));

  const renderItem = useCallback(
    ({ item }: { item: RefOption }) => (
      <Pressable onPress={() => pickCode(item.code)} style={[s.suggest, localStyles.itemRow]}>
        <Text style={[localStyles.itemName, { color: ui.text }]}>{item.name}</Text>
        <Text style={localStyles.itemCode}>{item.code}</Text>
      </Pressable>
    ),
    [pickCode, s.suggest, ui.text],
  );

  return (
    <View style={localStyles.root}>
      {showLabel ? (
        <Text style={s.small}>
          {label}
          {required ? <Text style={s.requiredAsterisk}> *</Text> : null}
        </Text>
      ) : null}

      <Pressable onPress={openModal} style={[s.input, s.selectRow, { width: Platform.OS === "web" ? width : "100%" }]}>
        <View style={s.selectValueWrap}>
          <Text style={[localStyles.valueText, { color: ui.text, opacity: picked ? 1 : 0.55 }]} numberOfLines={1}>
            {picked ? picked.name : valueLabelOverride || placeholder}
          </Text>
          {required ? <Text style={s.requiredAsterisk}>*</Text> : null}
        </View>

        <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.55)" />
      </Pressable>

      {open ? (
        <Modal transparent animationType="fade" onRequestClose={closeModal}>
          <Pressable style={{ flex: 1 }} onPress={closeModal}>
            <View style={s.backdrop} />
          </Pressable>
          <View style={[s.modalSheet, { maxWidth: 420, left: 16, right: 16 }]}>
            <Text style={[localStyles.sheetTitle, { color: ui.text }]}>{label}</Text>

            {searchable ? (
              <View style={localStyles.searchWrap}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Поиск по названию или коду..."
                  autoFocus
                  style={s.input}
                />
                {query ? (
                  <Pressable onPress={clearSearch} style={[s.miniBtn, localStyles.clearBtn]}>
                    <Text style={s.miniText}>Очистить поиск</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <FlatList
              style={localStyles.list}
              keyboardShouldPersistTaps="handled"
              data={filtered}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              initialNumToRender={16}
              maxToRenderPerBatch={24}
              windowSize={7}
              removeClippedSubviews={Platform.OS !== "web"}
              renderItem={renderItem}
              ListEmptyComponent={<Text style={localStyles.emptyText}>Ничего не найдено</Text>}
            />

            <View style={localStyles.actionsRow}>
              {value ? (
                <Pressable onPress={resetSelection} style={[s.miniBtn, { flex: 0, paddingHorizontal: 16 }]}>
                  <Text style={[s.miniText, { color: "#EF4444" }]}>Сбросить</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={closeModal}
                style={[s.miniBtn, { flex: 0, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.15)" }]}
              >
                <Text style={s.miniText}>Закрыть</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const localStyles = StyleSheet.create({
  root: { marginTop: 6, marginBottom: 8 },
  valueText: { fontWeight: "800", fontSize: 14, flex: 1 },
  sheetTitle: { fontWeight: "800", fontSize: 14, marginBottom: 8 },
  searchWrap: { gap: 8 },
  clearBtn: { alignSelf: "flex-start", flex: 0, paddingHorizontal: 12 },
  list: { maxHeight: 360, marginTop: 10 },
  itemRow: { borderBottomColor: "rgba(255,255,255,0.08)", paddingVertical: 14 },
  itemName: { fontWeight: "700", fontSize: 15 },
  itemCode: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  emptyText: { color: "rgba(255,255,255,0.45)", textAlign: "center", marginTop: 20 },
  actionsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, gap: 10 },
});
