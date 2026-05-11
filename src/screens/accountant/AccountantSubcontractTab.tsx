import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { normalizeRuText } from "../../lib/text/encoding";
import { FlashList } from "../../ui/FlashList";
import {
  SUBCONTRACT_DEFAULT_PAGE_SIZE,
  STATUS_CONFIG,
  fmtAmount,
  fmtDate,
  listAccountantSubcontractsPage,
  mergeSubcontractPages,
  type Subcontract,
} from "../subcontracts/subcontracts.shared";

type Props = {
  contentTopPad: number;
};

const ACCOUNTANT_SUBCONTRACT_LIST_FLATLIST_TUNING = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 32,
  windowSize: 7,
  removeClippedSubviews: false,
} as const;

const accountantSubcontractKeyExtractor = (item: Subcontract) => item.id;

const ru = (value: unknown, fallback = "—") => {
  const normalized = String(normalizeRuText(String(value ?? fallback)) ?? "").trim();
  return normalized || fallback;
};

export default function AccountantSubcontractTab({ contentTopPad }: Props) {
  const [items, setItems] = useState<Subcontract[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const nextOffsetRef = useRef(0);
  const loadSeqRef = useRef(0);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);

  const load = useCallback(async (options?: { reset?: boolean }) => {
    const reset = options?.reset !== false;
    const offset = reset ? 0 : nextOffsetRef.current;
    const seq = ++loadSeqRef.current;
    if (!reset && (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current)) return;
    if (reset) {
      loadingRef.current = true;
      setLoading(true);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    try {
      const page = await listAccountantSubcontractsPage({
        offset,
        pageSize: SUBCONTRACT_DEFAULT_PAGE_SIZE,
      });
      if (seq !== loadSeqRef.current) return;
      nextOffsetRef.current = page.nextOffset ?? offset;
      hasMoreRef.current = page.hasMore;
      setHasMore(page.hasMore);
      setItems((current) => (reset ? page.items : mergeSubcontractPages(current, page.items)));
    } catch (error) {
      if (__DEV__) console.warn("[AccountantSubcontractTab] load error:", error);
    } finally {
      if (seq === loadSeqRef.current) {
        if (reset) {
          loadingRef.current = false;
          setLoading(false);
        } else {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    void load({ reset: true });
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ reset: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onEndReached = useCallback(() => {
    void load({ reset: false });
  }, [load]);

  const renderCard = ({ item }: { item: Subcontract }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.approved;

    return (
      <Pressable
        testID={`accountant-subcontract-row-${item.id}`}
        accessibilityLabel={`accountant-subcontract-row-${item.id}`}
        accessible
        style={styles.card}
        onPress={() => {
          Alert.alert(
            "Детали подряда",
            `Объект: ${ru(item.object_name)}\n` +
              `Вид работ: ${ru(item.work_type, "Без названия")}\n` +
              `Подрядчик: ${ru(item.contractor_org)}\n` +
              `ИНН: ${ru(item.contractor_inn)}\n` +
              `Договор: ${ru(item.contract_number)} от ${fmtDate(item.contract_date)}\n` +
              `Сумма: ${fmtAmount(item.total_price)} сом\n` +
              `Срок: ${fmtDate(item.date_start)} - ${fmtDate(item.date_end)}\n` +
              `Статус: ${cfg.label}`,
          );
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{ru(item.work_type, "Без названия")}</Text>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.badgeText, { color: cfg.fg }]}>{cfg.label}</Text>
          </View>
        </View>

        <Text style={styles.cardSubtitle}>
          {ru(item.object_name)} · {ru(item.contractor_org)}
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
      <FlashList
        testID="accountant-subcontract-list"
        data={items}
        estimatedItemSize={124}
        renderItem={renderCard}
        keyExtractor={accountantSubcontractKeyExtractor}
        {...ACCOUNTANT_SUBCONTRACT_LIST_FLATLIST_TUNING}
        contentContainerStyle={{ paddingTop: contentTopPad + 10, paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.45}
        onEndReached={hasMore ? onEndReached : undefined}
        ListFooterComponent={
          loadingMore ? (
            <View testID="accountant-subcontract-load-more" style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : (
            <Text testID="accountant-subcontract-empty" style={styles.emptyText}>Подрядов на оплату пока нет</Text>
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
