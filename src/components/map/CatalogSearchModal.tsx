import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import type { CatalogItem } from "./types";

const UI = {
  bg: "#020617",
  card: "#0B1120",
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  accent: "#0EA5E9",
};

type Props = {
  visible: boolean;
  initialQuery?: string;
  onClose: () => void;
  onPick: (item: CatalogItem) => void;
};

export default function CatalogSearchModal({
  visible,
  initialQuery = "",
  onClose,
  onPick,
}: Props) {
  const topInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 44;

  const [q, setQ] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CatalogItem[]>([]);
  const [kind, setKind] = useState<"all" | "material" | "work" | "service">("all");

  useEffect(() => {
    if (!visible) return;
    setQ(initialQuery);
  }, [visible, initialQuery]);

  // debounce
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => void runSearch(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, kind, visible]);

  async function runSearch() {
    setLoading(true);
    try {
      let query = supabase
        .from("catalog_items")
        .select("id,rik_code,kind,name_human,uom_code,tags,sector_code")
        .limit(60);

      const s = q.trim().toLowerCase();
      if (s) {
        const like = `%${s}%`;
        query = query.or(
          `search_blob.ilike.${like},name_search.ilike.${like},name_human.ilike.${like},rik_code.ilike.${like}`
        );
      }

      if (kind !== "all") query = query.eq("kind", kind);

      const { data, error } = await query;
      if (error) {
        console.warn("CatalogSearchModal:", error.message);
        setRows([]);
        return;
      }

      setRows((data || []) as CatalogItem[]);
    } finally {
      setLoading(false);
    }
  }

  const chips = useMemo(
    () => [
      { k: "all" as const, t: "Все" },
      { k: "material" as const, t: "Материалы" },
      { k: "work" as const, t: "Работы" },
      { k: "service" as const, t: "Услуги" },
    ],
    []
  );

  const kindLabel = (k: string) =>
    k === "material" ? "Материал" : k === "work" ? "Работа" : k === "service" ? "Услуга" : k;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: UI.bg, paddingTop: topInset }}>
        <View style={{ paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={onClose} style={{ paddingVertical: 8, paddingHorizontal: 10 }}>
            <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }}>←</Text>
          </Pressable>

          <View
            style={{
              flex: 1,
              backgroundColor: UI.card,
              borderWidth: 1,
              borderColor: UI.border,
              borderRadius: 16,
            }}
          >
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Поиск по каталогу…"
              placeholderTextColor={UI.sub}
              style={{ color: UI.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }}
              autoFocus
            />
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: 16,
            marginTop: 10,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {chips.map((c) => {
            const active = kind === c.k;
            return (
              <Pressable
                key={c.k}
                onPress={() => setKind(c.k)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? UI.accent : UI.border,
                  backgroundColor: active ? UI.accent : UI.bg,
                }}
              >
                <Text style={{ color: active ? "#0B1120" : UI.text, fontWeight: "900" }}>{c.t}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1, marginTop: 10 }}>
          {loading ? (
            <View style={{ paddingTop: 20, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 10, color: UI.sub }}>Поиск…</Text>
            </View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(it) => it.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onPick(item)}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: UI.border }}
                >
                  <Text style={{ color: UI.text, fontWeight: "900", fontSize: 15 }} numberOfLines={2}>
                    {item.name_human}
                  </Text>
                  <Text style={{ color: UI.sub, marginTop: 2 }} numberOfLines={1}>
                    {kindLabel(item.kind)} • {item.uom_code ?? "—"} • {item.rik_code}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={{ paddingTop: 20 }}>
                  <Text style={{ color: UI.sub }}>Ничего не найдено</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
