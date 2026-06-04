import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests";
import { RequestEstimateItemsEditor } from "./RequestEstimateItemsEditor";
import { RequestEstimateSummaryCard } from "./RequestEstimateSummaryCard";
import { buildRequestEstimateViewModel } from "./requestEstimateViewModel";

type Props = {
  bundle: ConsumerRepairDraftBundle | null;
  aiAnswerRu: string | null;
  showPdfAction?: boolean;
  onMakePdf?: () => void;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onAddManual: () => void;
  onAddCustom: () => void;
  onRestoreLastRemoved?: () => void;
  canRestoreLastRemoved?: boolean;
  onOpenCatalog?: (itemId: string) => void;
};

export function ConsumerRepairDraftPanel({
  bundle,
  showPdfAction,
  onMakePdf,
  onDecrease,
  onIncrease,
  onRemove,
  onAddManual,
  onAddCustom,
  onRestoreLastRemoved,
  canRestoreLastRemoved,
  onOpenCatalog,
}: Props): React.ReactElement {
  const viewModel = buildRequestEstimateViewModel(bundle);
  return (
    <View style={styles.card} testID="consumer-repair-draft">
      <View style={styles.header}>
        <Text style={styles.title}>Черновик</Text>
        <Text style={styles.status}>{bundle ? statusLabel(bundle.draft.status) : "Позиции пока пустые"}</Text>
      </View>

      {bundle ? (
        <View style={styles.requestSection} testID="consumer-repair-draft-request-section">
          <Text style={styles.sectionTitle}>Заявка</Text>
          <Text style={styles.requestText}>{bundle.draft.problemText || bundle.draft.title || "Описание не указано"}</Text>
        </View>
      ) : null}

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Добавить примечание к смете"
        onPress={onAddCustom}
        style={styles.manualButton}
        testID="consumer-repair-add-custom-item"
      >
        <Text style={styles.manualText}>Примечание</Text>
      </Pressable>
      {canRestoreLastRemoved && onRestoreLastRemoved ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Восстановить удалённую позицию сметы"
          onPress={onRestoreLastRemoved}
          style={styles.manualButton}
          testID="consumer-repair-restore-item"
        >
          <Text style={styles.manualText}>Вернуть позицию</Text>
        </Pressable>
      ) : null}

      {showPdfAction && onMakePdf ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Сделать PDF"
          onPress={onMakePdf}
          style={styles.pdfButton}
          testID="consumer-estimate-make-pdf"
        >
          <Text style={styles.pdfButtonText}>Сделать PDF</Text>
        </Pressable>
      ) : null}
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
      return "Проверьте данные";
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
  requestSection: {
    gap: 6,
  },
  requestText: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
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
  pdfButton: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  pdfButtonText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
});
