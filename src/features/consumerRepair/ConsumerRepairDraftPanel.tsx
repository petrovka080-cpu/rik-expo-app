import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairDraftRevisionParamBatchPatch,
} from "../../lib/consumerRequests";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import {
  ConsumerRepairDraftQuickActions,
  ConsumerRepairProgressiveEstimatePanel,
} from "./ConsumerRepairProgressiveEstimatePanel";
import type { ConsumerRepairQuantityChangeMeta } from "./consumerRepairQuantityEditTrace";
import type { ConsumerRepairParamEditState } from "./requestEstimateScreenActions";
import { buildRequestEstimateViewModel } from "./requestEstimateViewModel";

type Props = {
  bundle: ConsumerRepairDraftBundle | null;
  aiAnswerRu: string | null;
  hasSelectedApprovedHistory?: boolean;
  showPdfAction?: boolean;
  onMakePdf?: () => void;
  onOpenProcurement?: () => void;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onRemove: (itemId: string) => void;
  onAddManual: () => void;
  onAddPhotoMaterialRecognition?: () => void;
  onOpenPhotoForEstimateItem?: (itemId: string) => void;
  onAddCustom: () => void;
  onRestoreLastRemoved?: () => void;
  canRestoreLastRemoved?: boolean;
  onOpenCatalog?: (itemId: string) => void;
  editingParam?: ConsumerRepairParamEditState;
  onOpenParamEditor?: (operation: UserParamPatchOperation, paramKey: string) => void;
  onSaveParamEdit?: (rawValue: string) => void;
  onCancelParamEdit?: () => void;
  onApplyParamPatch?: (operation: UserParamPatchOperation, paramKey: string, rawValue: string) => void;
  onApplyParamBatch?: (patches: ConsumerRepairDraftRevisionParamBatchPatch[]) => void;
};

export function ConsumerRepairDraftPanel({
  bundle,
  hasSelectedApprovedHistory,
  showPdfAction,
  onMakePdf,
  onOpenProcurement,
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
  editingParam,
  onOpenParamEditor,
  onSaveParamEdit,
  onCancelParamEdit,
  onApplyParamPatch,
  onApplyParamBatch,
}: Props): React.ReactElement {
  const viewModel = buildRequestEstimateViewModel(bundle);
  const revisionState = bundle?.estimateDraftRevisionState ?? null;
  const currentRevision = revisionState?.revisions.find((revision) => revision.revisionId === revisionState.currentRevisionId) ?? null;
  const latestDiff = revisionState?.diffs[revisionState.diffs.length - 1] ?? null;
  return (
    <View style={styles.card} testID="consumer-repair-draft">
      <View style={styles.header}>
        <Text style={styles.title}>Черновик</Text>
        <Text style={styles.status}>
          {bundle
            ? statusLabel(bundle.draft.status)
            : hasSelectedApprovedHistory
              ? "Утвержденная смета ниже"
              : "Позиции пока пустые"}
        </Text>
      </View>

      {bundle && viewModel ? (
        <>
        <ConsumerRepairProgressiveEstimatePanel
          viewModel={viewModel}
          revisionState={revisionState}
          currentRevision={currentRevision}
          latestDiff={latestDiff}
          showPdfAction={showPdfAction}
          onMakePdf={onMakePdf}
          onOpenProcurement={onOpenProcurement}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          onQuantityChange={onQuantityChange}
          onUnitPriceChange={onUnitPriceChange}
          onRemove={onRemove}
          onAddManual={onAddManual}
          onAddPhotoMaterialRecognition={onAddPhotoMaterialRecognition}
          onOpenPhotoForEstimateItem={onOpenPhotoForEstimateItem}
          onAddCustom={onAddCustom}
          onRestoreLastRemoved={onRestoreLastRemoved}
          canRestoreLastRemoved={canRestoreLastRemoved}
          onOpenCatalog={onOpenCatalog}
          editingParam={editingParam}
          onOpenParamEditor={onOpenParamEditor}
          onSaveParamEdit={onSaveParamEdit}
          onCancelParamEdit={onCancelParamEdit}
          onApplyParamPatch={onApplyParamPatch}
          onApplyParamBatch={onApplyParamBatch}
        />
        {bundle.projectExecutionDrafts[0]?.procurementItems.length ? (
          <View style={styles.card} testID="consumer-estimate-procurement-list">
            <Text style={styles.title}>Список закупки</Text>
            {bundle.projectExecutionDrafts[0].procurementItems.slice(0, 12).map((item) => (
              <Text key={item.id} style={styles.status} testID={`consumer-estimate-procurement-row-${item.sourceEstimateRowId}`}>
                {item.materialVisibleName}: {item.quantity} {item.unit} · цена не заполнена
              </Text>
            ))}
            {bundle.projectExecutionDrafts[0].procurementItems.length > 12 ? (
              <Text style={styles.status} testID="consumer-estimate-procurement-preview-count">
                {`Показано 12 из ${bundle.projectExecutionDrafts[0].procurementItems.length}. Полный список доступен в закупке.`}
              </Text>
            ) : null}
          </View>
        ) : null}
        </>
      ) : (
        <>
          <ConsumerRepairDraftQuickActions
            onAddManual={onAddManual}
            onAddPhotoMaterialRecognition={onAddPhotoMaterialRecognition}
            onAddCustom={onAddCustom}
          />
          <Text style={styles.empty}>
            {hasSelectedApprovedHistory
              ? "Чтобы менять товары и материалы, нажмите «Редактировать позиции» в утвержденной смете ниже."
              : "Добавьте материал вручную или по фото."}
          </Text>
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
        </>
      )}

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
  empty: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
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
