import React, { useMemo } from "react";
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from "react-native";

const UI = {
  bg: "#020617",
  card: "#0B1120",
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  accent: "#0EA5E9",
};

type ListingItemJson = {
  rik_code?: string | null;
  name?: string | null;
  uom?: string | null;
  qty?: number | null;
  price?: number | null;
  kind?: "material" | "work" | "service" | null;
};

type Props = {
  visible: boolean;
  title: string;
  city: string | null;
  items: ListingItemJson[];
  onClose: () => void;
};

export default function DemandDetailsModal({ visible, title, city, items, onClose }: Props) {
  const rows = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>
                {title || "Запрос"}
              </Text>
              <Text style={styles.sub}>{city || "Город не указан"} • СПРОС</Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 28 }}>
            <Text style={styles.sectionTitle}>Нужно</Text>

            {rows.length === 0 ? (
              <Text style={styles.empty}>Позиции не указаны</Text>
            ) : (
              rows.map((it, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {it.name || it.rik_code || "Позиция"}
                    </Text>
                    <Text style={styles.itemMeta} numberOfLines={1}>
                      {it.kind ? it.kind : "—"} {it.rik_code ? `• ${it.rik_code}` : ""}
                    </Text>
                  </View>

                  <Text style={styles.qty}>
                    {it.qty != null ? it.qty : "—"} {it.uom || ""}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: UI.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    maxHeight: "88%",
  },
  header: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  title: { color: UI.text, fontWeight: "900", fontSize: 16 },
  sub: { color: UI.sub, marginTop: 4, fontWeight: "700" },

  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.card,
  },
  closeText: { color: UI.text, fontWeight: "900", fontSize: 16 },

  sectionTitle: { color: UI.text, fontWeight: "900", fontSize: 14, marginBottom: 10 },
  empty: { color: UI.sub, paddingVertical: 10 },

  itemRow: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    borderRadius: 14,
    marginBottom: 10,
  },
  itemName: { color: UI.text, fontWeight: "900" },
  itemMeta: { color: UI.sub, marginTop: 4, fontSize: 12 },
  qty: { color: UI.accent, fontWeight: "900" },
});
