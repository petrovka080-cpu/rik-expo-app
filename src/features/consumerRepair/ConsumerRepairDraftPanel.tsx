import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import { EditableParamChips } from "../requests/components/EditableParamChips";
import { EstimateRevisionDiff } from "../requests/components/EstimateRevisionDiff";
import { EstimateRevisionTimeline } from "../requests/components/EstimateRevisionTimeline";
import { MissingInputQuickForm } from "../requests/components/MissingInputQuickForm";
import { ParamEditPopover } from "../requests/components/ParamEditPopover";
import { RecalculateEstimateButton } from "../requests/components/RecalculateEstimateButton";
import { RequestEstimateItemsEditor } from "./RequestEstimateItemsEditor";
import { RequestEstimateSummaryCard } from "./RequestEstimateSummaryCard";
import type { ConsumerRepairParamEditState } from "./requestEstimateScreenActions";
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
  editingParam?: ConsumerRepairParamEditState;
  onOpenParamEditor?: (operation: UserParamPatchOperation, paramKey: string) => void;
  onSaveParamEdit?: (rawValue: string) => void;
  onCancelParamEdit?: () => void;
  onApplyParamPatch?: (operation: UserParamPatchOperation, paramKey: string, rawValue: string) => void;
};

type VisibleAssumption = {
  key: string;
  value: unknown;
  reason: string;
  replacedByUserInput?: boolean;
};

function humanizeTechnicalToken(value: string): string {
  if (value === "PRICE_MISSING") return "Price source not selected";
  if (value === "PRELIMINARY_BOQ") return "Preliminary BOQ";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function assumptionLabel(key: string): string {
  if (key === "estimate_level") return "Estimate level";
  if (key === "prices") return "Price status";
  return humanizeTechnicalToken(key);
}

function assumptionValue(key: string, value: unknown): string {
  const text = String(value);
  if (key === "prices" || key === "estimate_level") return humanizeTechnicalToken(text);
  return text;
}

function visibleAssumptionText(assumption: VisibleAssumption): string {
  const suffix = assumption.replacedByUserInput ? "replaced by user input" : assumption.reason;
  return `${assumptionLabel(assumption.key)}: ${assumptionValue(assumption.key, assumption.value)} · ${suffix}`;
}

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
  editingParam,
  onOpenParamEditor,
  onSaveParamEdit,
  onCancelParamEdit,
  onApplyParamPatch,
}: Props): React.ReactElement {
  const viewModel = buildRequestEstimateViewModel(bundle);
  const revisionState = bundle?.estimateDraftRevisionState ?? null;
  const currentRevision = revisionState?.revisions.find((revision) => revision.revisionId === revisionState.currentRevisionId) ?? null;
  const latestDiff = revisionState?.diffs[revisionState.diffs.length - 1] ?? null;
  const editingValue = editingParam && currentRevision?.params[editingParam.key]
    ? String(currentRevision.params[editingParam.key].value)
    : "";
  const paramEditorEnabled = Boolean(onApplyParamPatch && onOpenParamEditor && onSaveParamEdit && onCancelParamEdit);
  return (
    <View style={styles.card} testID="consumer-repair-draft">
      <View style={styles.header}>
        <Text style={styles.title}>Черновик</Text>
        <Text style={styles.status}>{bundle ? statusLabel(bundle.draft.status) : "Позиции пока пустые"}</Text>
      </View>

      {viewModel ? <RequestEstimateSummaryCard viewModel={viewModel} /> : null}

      {currentRevision ? (
        <View style={styles.revisionPanel} testID="editable-param-revision-panel">
          <EstimateRevisionTimeline state={revisionState} />
          <EditableParamChips
            revision={currentRevision}
            onEditParam={paramEditorEnabled ? (paramKey) => onOpenParamEditor?.("update_param", paramKey) : undefined}
            onRemoveParam={onApplyParamPatch ? (paramKey) => onApplyParamPatch("remove_param", paramKey, "") : undefined}
          />
          <MissingInputQuickForm
            revision={currentRevision}
            onAddParam={paramEditorEnabled ? (paramKey) => onOpenParamEditor?.("add_param", paramKey) : undefined}
          />
          {currentRevision.assumptions.length > 0 ? (
            <View style={styles.assumptionList} testID="editable-param-assumptions-list">
              <Text style={styles.sectionTitle}>Допущения</Text>
              {currentRevision.assumptions.slice(0, 6).map((assumption) => (
                <View key={`${assumption.key}-${String(assumption.value)}`} style={styles.assumptionRow}>
                  <Text style={styles.assumptionText} numberOfLines={2}>
                    {visibleAssumptionText(assumption)}
                  </Text>
                  {paramEditorEnabled && !assumption.replacedByUserInput ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onOpenParamEditor?.("replace_assumption", assumption.key)}
                      style={styles.assumptionButton}
                      testID={`editable-param-replace-assumption-${assumption.key}`}
                    >
                      <Text style={styles.assumptionButtonText}>Заменить</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
          <ParamEditPopover
            visible={Boolean(editingParam && paramEditorEnabled)}
            paramKey={editingParam?.key ?? null}
            label={editingParam?.key ?? ""}
            initialValue={editingValue}
            onSave={onSaveParamEdit ?? (() => undefined)}
            onCancel={onCancelParamEdit ?? (() => undefined)}
          />
          <EstimateRevisionDiff diff={latestDiff} />
          <RecalculateEstimateButton disabled={!onApplyParamPatch} onPress={() => undefined} />
        </View>
      ) : null}

      <View style={styles.quickActions} testID="consumer-repair-draft-quick-actions">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить материал"
          onPress={onAddManual}
          style={[styles.quickButton, styles.greenQuickButton]}
          testID="consumer-repair-add-manual-item"
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.greenQuickText}>Материал</Text>
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
            <Text style={styles.photoQuickText}>Фото</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить заметку"
          onPress={onAddCustom}
          style={[styles.quickButton, styles.greenQuickButton]}
          testID="consumer-repair-add-custom-item"
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.greenQuickText}>Заметка</Text>
        </Pressable>
      </View>

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
  revisionPanel: {
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 10,
  },
  assumptionList: {
    gap: 7,
  },
  assumptionRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  assumptionText: {
    flex: 1,
    color: "#475569",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  assumptionButton: {
    minHeight: 28,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  assumptionButtonText: {
    color: "#334155",
    fontSize: 11,
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
    alignItems: "center",
    gap: 7,
  },
  quickButton: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  greenQuickButton: {
    minWidth: 108,
    flexDirection: "row",
    gap: 5,
    borderColor: "#16A34A",
    backgroundColor: "#16A34A",
    paddingHorizontal: 10,
    overflow: "hidden",
  },
  photoQuickButton: {
    minWidth: 86,
    flexDirection: "row",
    paddingHorizontal: 10,
    gap: 5,
    borderColor: "#86EFAC",
    backgroundColor: "#ECFDF5",
  },
  manualText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
  greenQuickText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  photoQuickText: {
    color: "#166534",
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
