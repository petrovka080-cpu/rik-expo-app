import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  StatusBar,
} from "react-native";
import type { Filters, Kind } from "./types";

const UI = {
  bg: "#020617",
  card: "#0B1120",
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  accent: "#0EA5E9",
  ok: "#22C55E",
};

type Props = {
  visible: boolean;
  value: Filters;
  resultsCount: number;
  onClose: () => void;
  onApply: (next: Filters) => void;
  onReset: () => void;
};

export default function FiltersModal({
  visible,
  value,
  resultsCount,
  onClose,
  onApply,
  onReset,
}: Props) {
  const topInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 44;

  const [city, setCity] = useState(value.city || "");
  const [min, setMin] = useState(value.minPrice != null ? String(value.minPrice) : "");
  const [max, setMax] = useState(value.maxPrice != null ? String(value.maxPrice) : "");
  const [kind, setKind] = useState<Kind>(value.kind);
  const [side, setSide] = useState<"all" | "offer" | "demand">(value.side);

  const kinds = useMemo(
    () => [
      { k: "all" as const, t: "Все" },
      { k: "material" as const, t: "Материалы" },
      { k: "work" as const, t: "Работы" },
      { k: "service" as const, t: "Услуги" },
    ],
    []
  );

  const sides = useMemo(
    () => [
      { k: "all" as const, t: "Все" },
      { k: "offer" as const, t: "Предложения" },
      { k: "demand" as const, t: "Спрос" },
    ],
    []
  );

  function apply() {
    onApply({
      ...value,
      side,
      city: city.trim(),
      kind,
      minPrice: min.trim() ? Number(min.replace(",", ".")) : null,
      maxPrice: max.trim() ? Number(max.replace(",", ".")) : null,
    });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: topInset }}>
        <View
          style={{
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 10,
          }}
        >
          <Pressable onPress={onClose} style={{ paddingVertical: 8, paddingHorizontal: 10 }}>
            <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }}>←</Text>
          </Pressable>

          <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }}>Фильтры</Text>

          <Pressable onPress={onReset} style={{ paddingVertical: 8, paddingHorizontal: 10 }}>
            <Text style={{ color: UI.accent, fontWeight: "900", fontSize: 16 }}>Reset</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          {/* Side */}
          <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }}>Режим</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {sides.map((c) => {
              const active = side === c.k;
              return (
                <Pressable
                  key={c.k}
                  onPress={() => setSide(c.k)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? UI.ok : UI.border,
                    backgroundColor: active ? UI.ok : UI.card,
                  }}
                >
                  <Text style={{ color: active ? "#0B1120" : UI.text, fontWeight: "900" }}>{c.t}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Kind */}
          <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16, marginTop: 18 }}>Тип</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {kinds.map((c) => {
              const active = kind === c.k;
              return (
                <Pressable
                  key={c.k}
                  onPress={() => setKind(c.k)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? UI.accent : UI.border,
                    backgroundColor: active ? UI.accent : UI.card,
                  }}
                >
                  <Text style={{ color: active ? "#0B1120" : UI.text, fontWeight: "900" }}>{c.t}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Price */}
          <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16, marginTop: 18 }}>Цена</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>Min</Text>
              <TextInput
                value={min}
                onChangeText={setMin}
                placeholder="0"
                placeholderTextColor={UI.sub}
                keyboardType="numeric"
                style={{
                  backgroundColor: UI.card,
                  borderWidth: 1,
                  borderColor: UI.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: UI.text,
                }}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>Max</Text>
              <TextInput
                value={max}
                onChangeText={setMax}
                placeholder="∞"
                placeholderTextColor={UI.sub}
                keyboardType="numeric"
                style={{
                  backgroundColor: UI.card,
                  borderWidth: 1,
                  borderColor: UI.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: UI.text,
                }}
              />
            </View>
          </View>

          {/* City */}
          <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16, marginTop: 18 }}>Город</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Бишкек…"
            placeholderTextColor={UI.sub}
            style={{
              marginTop: 10,
              backgroundColor: UI.card,
              borderWidth: 1,
              borderColor: UI.border,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: UI.text,
            }}
          />
        </View>

        <View style={{ marginTop: "auto", padding: 16, borderTopWidth: 1, borderTopColor: UI.border }}>
          <Pressable
            onPress={apply}
            style={{ backgroundColor: UI.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
          >
            <Text style={{ color: "#0B1120", fontWeight: "900", fontSize: 16 }}>
              Показать {resultsCount} результатов
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

