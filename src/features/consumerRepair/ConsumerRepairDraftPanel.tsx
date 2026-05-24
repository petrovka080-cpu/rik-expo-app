import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests";
import { RequestEstimateItemsEditor } from "./RequestEstimateItemsEditor";
import { RequestEstimateSummaryCard } from "./RequestEstimateSummaryCard";
import { buildRequestEstimateViewModel } from "./requestEstimateViewModel";

type Props = {
  bundle: ConsumerRepairDraftBundle | null;
  aiAnswerRu: string | null;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onAddManual: () => void;
  onOpenCatalog?: (itemId: string) => void;
};

export function ConsumerRepairDraftPanel({
  bundle,
  onDecrease,
  onIncrease,
  onRemove,
  onAddManual,
  onOpenCatalog,
}: Props): React.ReactElement {
  const viewModel = buildRequestEstimateViewModel(bundle);
  return (
    <View style={styles.card} testID="consumer-repair-draft">
      <View style={styles.header}>
        <Text style={styles.title}>Черновик заявки</Text>
        <Text style={styles.status}>{bundle ? statusLabel(bundle.draft.status) : "Позиции пока пустые"}</Text>
      </View>

      {viewModel ? <RequestEstimateSummaryCard viewModel={viewModel} /> : null}

      {viewModel ? (
        <RequestEstimateItemsEditor
          viewModel={viewModel}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          onRemove={onRemove}
          onOpenCatalog={onOpenCatalog}
        />
      ) : (
        <Text style={styles.empty}>Опишите задачу или добавьте фото, затем подготовьте черновик.</Text>
      )}

      {bundle && bundle.draft.missingData.length > 0 ? (
        <View style={styles.missing} testID="consumer-repair-missing-data">
          <Text style={styles.sectionTitle}>Что уточнить</Text>
          {bundle.draft.missingData.map((item) => (
            <Text key={item} style={styles.missingItem}>• {item}</Text>
          ))}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Материал вручную"
        onPress={onAddManual}
        style={styles.manualButton}
        testID="consumer-repair-add-manual-item"
      >
        <Text style={styles.manualText}>Материал вручную</Text>
      </Pressable>
    </View>
  );
}

function statusLabel(status: ConsumerRepairDraftBundle["draft"]["status"]): string {
  switch (status) {
    case "consumer_approved":
      return "Утверждена · PDF готов";
    case "sent_to_marketplace":
      return "Отправлена в маркет";
    case "cancelled":
      return "Отменена";
    case "archived":
      return "Архив";
    default:
      return "Черновик · проверьте данные";
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
  },
  status: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  empty: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  missing: {
    gap: 4,
  },
  missingItem: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  manualButton: {
    minHeight: 38,
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  manualText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
});
