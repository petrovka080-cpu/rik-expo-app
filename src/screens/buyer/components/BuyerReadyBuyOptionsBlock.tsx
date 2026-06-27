import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ProcurementReadyBuyOptionBundle } from "../../../features/ai/procurement/aiProcurementReadyBuyOptionTypes";
import { UI } from "../buyerUi";

type BuyerReadyBuyOptionsBlockProps = {
  bundle: ProcurementReadyBuyOptionBundle | null;
  variant?: "card" | "detail";
  onOpen?: () => void;
  onDraft?: () => void;
  onCompare?: () => void;
};

function actionLabel(action: string): string {
  switch (action) {
    case "request_quote":
    case "draft_supplier_request":
      return "подготовить запрос";
    case "compare":
      return "сравнить";
    case "submit_supplier_choice_for_approval":
      return "на согласование";
    default:
      return "следующий шаг";
  }
}

export function BuyerReadyBuyOptionsBlock({
  bundle,
  variant = "card",
  onOpen,
  onDraft,
  onCompare,
}: BuyerReadyBuyOptionsBlockProps) {
  if (!bundle) return null;

  const compact = variant === "card";
  const optionCount = bundle.options.length;
  const riskCount = bundle.risks.length;
  if (optionCount <= 0) return null;

  const optionsToShow = compact ? bundle.options.slice(0, 2) : bundle.options.slice(0, 4);

  return (
    <View
      style={[styles.root, compact ? styles.cardRoot : styles.detailRoot]}
      testID={compact ? "buyer.ready_buy_options.card" : "buyer.ready_buy_options.detail"}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerMain}>
          <Text style={styles.title}>Готовые варианты закупки</Text>
        </View>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{`Готовые: ${optionCount}`}</Text>
          </View>
          {riskCount > 0 ? (
            <View style={[styles.badge, styles.riskBadge]}>
              <Text style={styles.riskBadgeText}>{`Риски: ${riskCount}`}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {optionsToShow.length > 0 ? (
        <View style={styles.optionList}>
          {optionsToShow.map((option, index) => (
            <View key={option.id} style={styles.optionRow}>
              <Text style={styles.optionTitle} numberOfLines={1}>
                {`${index + 1}. ${option.supplierName}`}
              </Text>
              <Text style={styles.optionText} numberOfLines={compact ? 2 : 4}>
                {[
                  `Покрывает: ${option.coverageLabel}`,
                  option.priceSignal ? `Цена: ${option.priceSignal}` : null,
                  option.deliverySignal ? `Срок: ${option.deliverySignal}` : null,
                  option.risks[0] ? `Риск: ${option.risks[0]}` : null,
                  `Действие: ${actionLabel(option.recommendedAction)}`,
                ].filter(Boolean).join(" · ")}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionButton} onPress={onOpen}>
          <Text style={styles.actionText}>Смотреть варианты</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onDraft}>
          <Text style={styles.actionText}>Подготовить запрос</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onCompare}>
          <Text style={styles.actionText}>Сравнить</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    minHeight: 34,
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.32)",
    backgroundColor: "rgba(34,197,94,0.10)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionText: {
    color: "#BBF7D0",
    fontSize: 12,
    fontWeight: "900",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  badge: {
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.14)",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
    maxWidth: 220,
  },
  badgeText: {
    color: "#86EFAC",
    fontSize: 11,
    fontWeight: "900",
  },
  cardRoot: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 12,
  },
  detailRoot: {
    marginBottom: 10,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: "rgba(34,197,94,0.06)",
    padding: 14,
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  optionList: {
    marginTop: 8,
    gap: 7,
  },
  optionRow: {
    gap: 3,
  },
  optionText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  optionTitle: {
    color: UI.text,
    fontSize: 13,
    fontWeight: "900",
  },
  riskBadge: {
    backgroundColor: "rgba(245,158,11,0.14)",
  },
  riskBadgeText: {
    color: "#FCD34D",
    fontSize: 11,
    fontWeight: "900",
  },
  root: {
    overflow: "hidden",
  },
  title: {
    color: UI.text,
    fontSize: 14,
    fontWeight: "900",
  },
});
