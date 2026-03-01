import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  STATUS_CONFIG,
  fmtAmount,
  fmtDate,
  listAccountantSubcontracts,
  type Subcontract,
} from "../subcontracts/subcontracts.shared";

type Props = {
  contentTopPad: number;
};

export default function AccountantSubcontractTab({ contentTopPad }: Props) {
  const [items, setItems] = useState<Subcontract[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAccountantSubcontracts();
      setItems(rows);
    } catch (e) {
      console.warn("[AccountantSubcontractTab] load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const renderCard = ({ item }: { item: Subcontract }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.approved;

    return (
      <Pressable
        style={styles.card}
        onPress={() => {
          Alert.alert(
            "Детали подряда",
            `Объект: ${item.object_name || "—"}\n` +
              `Вид работ: ${item.work_type || "—"}\n` +
              `Подрядчик: ${item.contractor_org || "—"}\n` +
              `ИНН: ${item.contractor_inn || "—"}\n` +
              `Договор: ${item.contract_number || "—"} от ${fmtDate(item.contract_date)}\n` +
              `Сумма: ${fmtAmount(item.total_price)} сом\n` +
              `Срок: ${fmtDate(item.date_start)} - ${fmtDate(item.date_end)}\n` +
              `Статус: ${cfg.label}`,
          );
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.work_type || "Без названия"}</Text>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.badgeText, { color: cfg.fg }]}>{cfg.label}</Text>
          </View>
        </View>

        <Text style={styles.cardSubtitle}>
          {item.object_name || "—"} · {item.contractor_org || "—"}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>{fmtAmount(item.total_price)} сом</Text>
          <Text style={styles.cardDate}>Утвержден: {fmtDate(item.approved_at)}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0F14" }}>
      <FlatList
        data={items}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: contentTopPad + 10, paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : (
            <Text style={styles.emptyText}>Подрядов на оплату пока нет</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#101826",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F2A37",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  cardSubtitle: {
    color: "#9CA3AF",
    fontSize: 14,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: {
    color: "#22C55E",
    fontSize: 16,
    fontWeight: "900",
  },
  cardDate: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
});
