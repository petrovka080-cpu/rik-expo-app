import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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
  onOpenDetails?: () => void;
  onOpenShowcase?: () => void;
  onOpenChat?: () => void;
  onAskAssistant?: () => void;
};

export default function DemandDetailsModal({
  visible,
  title,
  city,
  items,
  onClose,
  onOpenDetails,
  onOpenShowcase,
  onOpenChat,
  onAskAssistant,
}: Props) {
  const rows = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title} numberOfLines={2}>
                {title || "Запрос"}
              </Text>
              <Text style={styles.sub}>{city || "Город не указан"} • СПРОС</Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.sectionTitle}>Нужно</Text>

            {rows.length === 0 ? (
              <Text style={styles.empty}>Позиции не указаны</Text>
            ) : (
              rows.map((item, index) => (
                <View key={`${title}:${index}`} style={styles.itemRow}>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name || item.rik_code || "Позиция"}
                    </Text>
                    <Text style={styles.itemMeta} numberOfLines={1}>
                      {item.kind || "—"}
                      {item.rik_code ? ` • ${item.rik_code}` : ""}
                    </Text>
                  </View>

                  <Text style={styles.qty}>
                    {item.qty != null ? item.qty : "—"} {item.uom || ""}
                  </Text>
                </View>
              ))
            )}

            {onOpenDetails || onOpenShowcase || onOpenChat ? (
              <View style={styles.actionsRow}>
                {onOpenDetails ? (
                  <Pressable style={styles.secondaryBtn} onPress={onOpenDetails}>
                    <Text style={styles.secondaryBtnText}>Открыть</Text>
                  </Pressable>
                ) : null}
                {onOpenShowcase ? (
                  <Pressable style={styles.secondaryBtn} onPress={onOpenShowcase}>
                    <Text style={styles.secondaryBtnText}>Витрина</Text>
                  </Pressable>
                ) : null}
                {onOpenChat ? (
                  <Pressable style={styles.secondaryBtn} onPress={onOpenChat}>
                    <Text style={styles.secondaryBtnText}>Чат</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {onAskAssistant ? (
              <Pressable style={styles.assistantBtn} onPress={onAskAssistant}>
                <Text style={styles.assistantBtnText}>Спросить AI по этому спросу</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
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
  headerCopy: {
    flex: 1,
  },
  title: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 16,
  },
  sub: {
    color: UI.sub,
    marginTop: 4,
    fontWeight: "700",
  },
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
  closeText: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 16,
  },
  content: {
    padding: 14,
    paddingBottom: 28,
  },
  sectionTitle: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 14,
    marginBottom: 10,
  },
  empty: {
    color: UI.sub,
    paddingVertical: 10,
  },
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
  itemCopy: {
    flex: 1,
  },
  itemName: {
    color: UI.text,
    fontWeight: "900",
  },
  itemMeta: {
    color: UI.sub,
    marginTop: 4,
    fontSize: 12,
  },
  qty: {
    color: UI.accent,
    fontWeight: "900",
  },
  actionsRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  secondaryBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
  },
  secondaryBtnText: {
    color: UI.text,
    fontSize: 13,
    fontWeight: "900",
  },
  assistantBtn: {
    marginTop: 6,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#082F49",
    borderWidth: 1,
    borderColor: "#0EA5E9",
  },
  assistantBtnText: {
    color: "#E0F2FE",
    fontSize: 13,
    fontWeight: "900",
  },
});
