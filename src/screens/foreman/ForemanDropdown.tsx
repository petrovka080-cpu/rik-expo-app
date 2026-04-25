import React, { useCallback, useEffect } from "react";
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

import { FOREMAN_DROPDOWN_DEFAULT_FIELD } from "./foreman.dropdown.constants";
import { debugForemanLogLazy } from "./foreman.debug";
import { useForemanDropdownModel } from "./hooks/useForemanDropdownModel";
import type { RefOption } from "./foreman.types";

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
  attentionActive?: boolean;
  attentionHint?: string | null;
  attentionToken?: number;
  autoOpenOnAttention?: boolean;
  ui: { text: string };
  styles: typeof import("./foreman.styles").s;
};

const toSelectorToken = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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
  attentionActive = false,
  attentionHint,
  attentionToken = 0,
  autoOpenOnAttention = false,
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

  useEffect(() => {
    if (!autoOpenOnAttention || !attentionToken || open) return;
    openModal();
  }, [attentionToken, autoOpenOnAttention, open, openModal]);

  const renderItem = useCallback(
    ({ item }: { item: RefOption }) => (
      <Pressable
        testID={`foreman-dropdown-option-${toSelectorToken(key)}-${toSelectorToken(item.code) || "empty"}`}
        accessibilityLabel={`foreman-dropdown-option-${toSelectorToken(key)}-${toSelectorToken(item.code) || "empty"}`}
        onPress={() => pickCode(item.code)}
        style={[s.suggest, localStyles.itemRow]}
      >
        <Text style={[localStyles.itemName, { color: ui.text }]}>{item.name}</Text>
        <Text style={localStyles.itemCode}>{item.code}</Text>
      </Pressable>
    ),
    [key, pickCode, s.suggest, ui.text],
  );

  return (
    <View style={localStyles.root}>
      {showLabel ? (
        <Text style={[s.small, attentionActive && localStyles.attentionLabel]}>
          {label}
          {required ? <Text style={s.requiredAsterisk}> *</Text> : null}
        </Text>
      ) : null}

      <Pressable
        testID={`foreman-dropdown-open-${toSelectorToken(key)}`}
        accessibilityLabel={`foreman-dropdown-open-${toSelectorToken(key)}`}
        onPress={openModal}
        style={[
          s.input,
          s.selectRow,
          { width: Platform.OS === "web" ? width : "100%" },
          attentionActive && localStyles.attentionControl,
        ]}
      >
        <View style={s.selectValueWrap}>
          <Text style={[localStyles.valueText, { color: ui.text, opacity: picked ? 1 : 0.55 }]} numberOfLines={1}>
            {picked ? picked.name : valueLabelOverride || placeholder}
          </Text>
          {required ? <Text style={s.requiredAsterisk}>*</Text> : null}
        </View>

        <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.55)" />
      </Pressable>

      {attentionActive && attentionHint ? (
        <Text style={localStyles.attentionHint}>{attentionHint}</Text>
      ) : null}

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
                  testID={`foreman-dropdown-search-${toSelectorToken(key)}`}
                  accessibilityLabel={`foreman-dropdown-search-${toSelectorToken(key)}`}
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
  attentionLabel: {
    color: "#FCA5A5",
  },
  attentionControl: {
    borderColor: "#F97316",
    backgroundColor: "rgba(249,115,22,0.12)",
    shadowColor: "#F97316",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  attentionHint: {
    marginTop: 6,
    marginLeft: 4,
    color: "#FDBA74",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
});
