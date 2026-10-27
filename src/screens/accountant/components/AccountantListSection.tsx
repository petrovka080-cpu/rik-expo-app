import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FlashList } from "../../../ui/FlashList";
import {
  buildAccountantMainAiPanelModel,
  type AccountantMainAiPanelAction,
  type AccountantMainAiPanelRow,
} from "../../../features/ai/finance/aiAccountantTodayPaymentAssistant";
import type { HistoryRow } from "../types";
import {
  buildAccountantListModel,
  getAccountantListEstimatedItemSize,
  getAccountantListItemKey,
  type AccountantInboxListRowBase,
  type AccountantListItem,
} from "../accountant.listModel";

const ACCOUNTANT_LIST_SECTION_FLATLIST_TUNING = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 32,
  windowSize: 7,
  removeClippedSubviews: false,
} as const;

function openAccountantMainAi(action: AccountantMainAiPanelAction, params: Record<string, string>) {
  router.push({
    pathname: "/(tabs)/ai",
    params: {
      ...params,
      prompt: action.prompt,
    },
  });
}

export function AccountantMainAiPanel({
  rows,
  loading = false,
}: {
  rows: AccountantMainAiPanelRow[];
  loading?: boolean;
}) {
  const model = React.useMemo(
    () => buildAccountantMainAiPanelModel({ rows, loading }),
    [loading, rows],
  );

  return (
    <View style={accountantMainAiPanelStyles.shell} testID="accountant.main.ai_panel">
      <View style={accountantMainAiPanelStyles.headerRow}>
        <View>
          <Text style={accountantMainAiPanelStyles.eyebrow}>Готово от AI</Text>
          <Text style={accountantMainAiPanelStyles.title}>Финансы сегодня</Text>
        </View>
        <View style={accountantMainAiPanelStyles.safetyBadge}>
          <Ionicons name="lock-closed" size={13} color="#14532D" />
          <Text style={accountantMainAiPanelStyles.safetyText}>без проведения платежей</Text>
        </View>
      </View>

      <Text style={accountantMainAiPanelStyles.summary}>{model.summary}</Text>

      <View style={accountantMainAiPanelStyles.metricsGrid}>
        {model.metrics.map((metric) => (
          <View key={metric.id} style={accountantMainAiPanelStyles.metric}>
            <Text style={accountantMainAiPanelStyles.metricValue}>{metric.value}</Text>
            <Text style={accountantMainAiPanelStyles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      <View style={accountantMainAiPanelStyles.section}>
        <Text style={accountantMainAiPanelStyles.sectionTitle}>Критические платежи</Text>
        {model.criticalPayments.length > 0 ? (
          model.criticalPayments.map((payment, index) => (
            <View key={payment.id} style={accountantMainAiPanelStyles.paymentRow}>
              <Text style={accountantMainAiPanelStyles.paymentTitle}>
                {index + 1}. {payment.supplierName} · {payment.amountLabel}
              </Text>
              <Text style={accountantMainAiPanelStyles.paymentText}>Риск: {payment.riskReason}</Text>
              {payment.missingData.length > 0 ? (
                <Text style={accountantMainAiPanelStyles.paymentText}>
                  Не хватает: {payment.missingData.join(", ")}
                </Text>
              ) : null}
              <Text style={accountantMainAiPanelStyles.paymentText}>Следующий шаг: {payment.nextStep}</Text>
            </View>
          ))
        ) : (
          <Text style={accountantMainAiPanelStyles.emptyText}>
            Критических платежей в текущем read-only срезе не найдено.
          </Text>
        )}
      </View>

      <View style={accountantMainAiPanelStyles.section}>
        <Text style={accountantMainAiPanelStyles.sectionTitle}>Недостающие данные</Text>
        {model.missingData.slice(0, 4).map((item) => (
          <Text key={item} style={accountantMainAiPanelStyles.missingText}>• {item}</Text>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={accountantMainAiPanelStyles.actionRow}
        style={accountantMainAiPanelStyles.actionScroller}
      >
        {model.actions.map((action) => (
          <Pressable
            key={action.id}
            style={[
              accountantMainAiPanelStyles.actionChip,
              action.requiresApproval && accountantMainAiPanelStyles.approvalChip,
            ]}
            onPress={() => openAccountantMainAi(action, model.aiRouteParams)}
            testID={`accountant.main.ai_action.${action.id}`}
          >
            <Text
              style={[
                accountantMainAiPanelStyles.actionText,
                action.requiresApproval && accountantMainAiPanelStyles.approvalText,
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export const AccountantEmptyState = React.memo(function AccountantEmptyState({
  title,
  hint,
  titleColor,
  hintColor,
}: {
  title: string;
  hint: string;
  titleColor: string;
  hintColor: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ fontSize: 28, marginBottom: 8, color: hintColor, opacity: 0.7 }}>...</Text>
      <Text style={{ fontSize: 16, fontWeight: "600", color: titleColor, marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: hintColor, textAlign: "center", fontWeight: "500" }}>{hint}</Text>
    </View>
  );
});

const accountantMainAiPanelStyles = StyleSheet.create({
  shell: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.12)",
    backgroundColor: "#F8FAFC",
    padding: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  safetyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexShrink: 1,
  },
  safetyText: {
    color: "#14532D",
    fontSize: 11,
    fontWeight: "700",
  },
  summary: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metric: {
    minWidth: 96,
    flexGrow: 1,
    flexBasis: "30%",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    padding: 10,
  },
  metricValue: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },
  metricLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
  },
  paymentRow: {
    borderLeftWidth: 3,
    borderLeftColor: "#DC2626",
    paddingLeft: 10,
    paddingVertical: 6,
  },
  paymentTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },
  paymentText: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
  },
  missingText: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
  },
  actionScroller: {
    marginTop: 12,
  },
  actionRow: {
    gap: 8,
    paddingRight: 4,
  },
  actionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.22)",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  approvalChip: {
    borderColor: "rgba(180, 83, 9, 0.28)",
    backgroundColor: "#FFFBEB",
  },
  actionText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
  },
  approvalText: {
    color: "#92400E",
  },
});

export function AccountantListBlock<TInbox extends AccountantInboxListRowBase>({
  isHistory,
  historyRows,
  rows,
  historyHeader,
  historyLoading,
  loading,
  historyRefreshing,
  refreshing,
  historyLoadingMore,
  loadingMore,
  historyHasMore,
  hasMore,
  onRefreshHistory,
  onRefresh,
  onEndReachedHistory,
  onEndReached,
  onScroll,
  contentTopPad,
  inboxHeader,
  onRenderHistory,
  onRenderInbox,
  uiTextColor,
  uiSubColor,
}: {
  isHistory: boolean;
  historyRows: HistoryRow[];
  rows: TInbox[];
  historyHeader: React.ReactElement;
  historyLoading: boolean;
  loading: boolean;
  historyRefreshing: boolean;
  refreshing: boolean;
  historyLoadingMore: boolean;
  loadingMore: boolean;
  historyHasMore: boolean;
  hasMore: boolean;
  onRefreshHistory: () => void;
  onRefresh: () => void;
  onEndReachedHistory: () => void;
  onEndReached: () => void;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  contentTopPad: number;
  inboxHeader?: React.ReactElement | null;
  onRenderHistory: (row: HistoryRow) => React.ReactElement | null;
  onRenderInbox: (row: TInbox) => React.ReactElement | null;
  uiTextColor: string;
  uiSubColor: string;
}) {
  const data = React.useMemo(
    () => buildAccountantListModel({ isHistory, historyRows, rows }),
    [historyRows, isHistory, rows],
  );

  const keyExtractor = React.useCallback(
    (item: AccountantListItem<TInbox>, index: number) => getAccountantListItemKey(item, index),
    [],
  );

  const renderItem = React.useCallback(
    ({ item }: { item: AccountantListItem<TInbox> }) => {
      if (item.__kind === "history") return onRenderHistory(item.data);
      return onRenderInbox(item.data);
    },
    [onRenderHistory, onRenderInbox],
  );

  const footer = isHistory ? (
    historyLoadingMore ? (
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    ) : historyHasMore ? (
      <View style={{ height: 16 }} />
    ) : (
      <View style={{ height: 8 }} />
    )
  ) : loadingMore ? (
    <View style={{ paddingVertical: 16, alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  ) : hasMore ? (
    <View style={{ height: 16 }} />
  ) : (
    <View style={{ height: 8 }} />
  );

  return (
    <FlashList<AccountantListItem<TInbox>>
      style={{ flex: 1 }}
      data={data}
      estimatedItemSize={getAccountantListEstimatedItemSize(isHistory)}
      {...ACCOUNTANT_LIST_SECTION_FLATLIST_TUNING}
      keyExtractor={keyExtractor}
      ListHeaderComponent={isHistory ? historyHeader : inboxHeader ?? null}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={isHistory ? historyRefreshing : refreshing}
          onRefresh={isHistory ? onRefreshHistory : onRefresh}
          title=""
          tintColor="transparent"
        />
      }
      onEndReachedThreshold={0.45}
      onEndReached={isHistory ? onEndReachedHistory : onEndReached}
      ListEmptyComponent={
        isHistory ? (
          historyLoading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ color: uiSubColor, fontWeight: "500" }}>История пуста</Text>
            </View>
          )
        ) : loading ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <AccountantEmptyState
            title="Пока пусто"
            hint="Документы не найдены для текущего таба"
            titleColor={uiTextColor}
            hintColor={uiSubColor}
          />
        )
      }
      ListFooterComponent={footer}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingTop: contentTopPad, paddingBottom: 128 }}
    />
  );
}
