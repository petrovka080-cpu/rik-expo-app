import React, { useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RefOption } from "./foreman.types";

type Props = {
  label: string;
  options: RefOption[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  searchable?: boolean;
  width?: number;
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
  width = 280,
  required = false,
  showLabel = true,
  styles: s,
  ui,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const picked = options.find((o) => o.code === value);

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

            <ScrollView style={{ maxHeight: 360, marginTop: 6 }} keyboardShouldPersistTaps="handled">
              {filtered.map((item, idx) => (
                <Pressable
                  key={`ref:${item.code}:${idx}`}
                  onPress={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                  style={[s.suggest, { borderBottomColor: "#f0f0f0" }]}
                >
                  <Text style={{ fontWeight: "900", color: ui.text }}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 8 }}>
              {value ? (
                <Pressable
                  onPress={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  style={[s.chip, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }]}
                >
                  <Text style={{ color: ui.text, fontWeight: "900" }}>Сбросить</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setOpen(false)}
                style={[s.chip, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }]}
              >
                <Text style={{ color: ui.text, fontWeight: "900" }}>Закрыть</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
