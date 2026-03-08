import React, { useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View, type DimensionValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RefOption } from "./foreman.types";
import { debugForemanLog } from "./foreman.debug";

type Props = {
  label: string;
  options: RefOption[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  searchable?: boolean;
  width?: DimensionValue;
  required?: boolean;
  showLabel?: boolean;
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
  required = false,
  showLabel = true,
  styles: s,
  ui,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const picked = options.find((o) => o.code === value);

  debugForemanLog('[FOREMAN_DROPDOWN_FACT]', {
    fieldLabel: label,
    value,
    picked: picked ? { code: picked.code, name: picked.name } : null,
    placeholder,
    options: options.map(o => ({ code: o.code, name: o.name })),
  });

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter((o) => (o.name + " " + o.code).toLowerCase().includes(qq));
  }, [q, options]);

  return (
    <View style={{ marginTop: 6, marginBottom: 8 }}>
      {showLabel ? (
        <Text style={s.small}>
          {label}
          {required ? <Text style={s.requiredAsterisk}> *</Text> : null}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        style={[s.input, s.selectRow, { width: Platform.OS === "web" ? width : "100%" }]}
      >
        <View style={s.selectValueWrap}>
          <Text
            style={{
              color: ui.text,
              opacity: picked ? 1 : 0.55,
              fontWeight: "800",
              fontSize: 14,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {picked ? picked.name : placeholder}
          </Text>
          {required ? <Text style={s.requiredAsterisk}>*</Text> : null}
        </View>

        <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.55)" />
      </Pressable>

      {open ? (
        <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
            <View style={s.backdrop} />
          </Pressable>
          <View style={[s.modalSheet, { maxWidth: 420, left: 16, right: 16 }]}>
            <Text
              style={{
                fontWeight: "800",
                fontSize: 14,
                marginBottom: 8,
                color: ui.text,
              }}
            >
              {label}
            </Text>

            {searchable ? (
              <TextInput value={q} onChangeText={setQ} placeholder="Поиск..." style={s.input} />
            ) : null}

            <ScrollView style={{ maxHeight: 360, marginTop: 10 }} keyboardShouldPersistTaps="handled">
              {filtered.map((item, idx) => (
                <Pressable
                  key={`ref:${item.code}:${idx}`}
                  onPress={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                  style={[s.suggest, { borderBottomColor: "rgba(255,255,255,0.08)", paddingVertical: 14 }]}
                >
                  <Text style={{ fontWeight: "700", color: ui.text, fontSize: 15 }}>{item.name}</Text>
                </Pressable>
              ))}
              {filtered.length === 0 && (
                <Text style={{ color: "rgba(255,255,255,0.45)", textAlign: "center", marginTop: 20 }}>Ничего не найдено</Text>
              )}
            </ScrollView>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12, gap: 10 }}>
              {value ? (
                <Pressable
                  onPress={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  style={[s.miniBtn, { flex: 0, paddingHorizontal: 16 }]}
                >
                  <Text style={[s.miniText, { color: "#EF4444" }]}>Сбросить</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setOpen(false)}
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

