import React from "react";
import { Ionicons } from "@expo/vector-icons";
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
  onQuantityChange: (itemId: string, value: string) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onRemove: (itemId: string) => void;
  onAddManual: () => void;
  onAddPhotoMaterialRecognition?: () => void;
  onOpenPhotoForEstimateItem?: (itemId: string) => void;
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
  onQuantityChange,
  onUnitPriceChange,
  onRemove,
  onAddManual,
  onAddPhotoMaterialRecognition,
  onOpenPhotoForEstimateItem,
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

      {viewModel ? <RequestEstimateSummaryCard viewModel={viewModel} /> : null}

      {viewModel ? (
        <RequestEstimateItemsEditor
          viewModel={viewModel}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          onQuantityChange={onQuantityChange}
          onUnitPriceChange={onUnitPriceChange}
          onRemove={onRemove}
          onOpenCatalog={onOpenCatalog}
          onOpenPhoto={onOpenPhotoForEstimateItem}
          showPhotoButtons={Boolean(onOpenPhotoForEstimateItem)}
        />
      ) : (
        <Text style={styles.empty}>Добавьте материал вручную или по фото.</Text>
      )}

      <View style={styles.quickActions} testID="consumer-repair-draft-quick-actions">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Материал вручную"
          onPress={onAddManual}
          style={styles.quickButton}
          testID="consumer-repair-add-manual-item"
        >
          <Text style={styles.manualText}>Материал вручную</Text>
        </Pressable>
        {onAddPhotoMaterialRecognition ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Распознать материал по фото"
            onPress={onAddPhotoMaterialRecognition}
            style={[styles.quickButton, styles.photoQuickButton]}
            testID="consumer-repair-add-photo-draft"
          >
            <Ionicons name="camera-outline" size={17} color="#166534" />
            <Text style={styles.photoButtonText}>Фото</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить примечание к смете"
          onPress={onAddCustom}
          style={styles.quickButton}
          testID="consumer-repair-add-custom-item"
        >
          <Text style={styles.manualText}>Примечание</Text>
        </Pressable>
      </View>
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
    case "deleted_by_user":
      return "Удалена";
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
  empty: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickButton: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  photoQuickButton: {
    flexDirection: "row",
    gap: 6,
    borderColor: "#86EFAC",
    backgroundColor: "#ECFDF5",
  },
  photoButtonText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900",
  },
  manualText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
  manualButton: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
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
