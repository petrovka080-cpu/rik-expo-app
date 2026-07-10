import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  aiEstimateRuAssumptionLabel,
  aiEstimateRuAssumptionReason,
  aiEstimateRuAssumptionValue,
} from "../../lib/estimate/aiEstimateRuParameterDictionary";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionDiff,
  EstimateDraftRevisionState,
} from "../../lib/estimate/estimateDraftRevisionContract";
import {
  buildAiEstimateRuntimeViewModel,
  findAiEstimateRuntimeParameterCard,
} from "../../lib/estimate/runtime/buildAiEstimateRuntimeViewModel";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import { EstimateRevisionDiff } from "../requests/components/EstimateRevisionDiff";
import { EstimateRevisionTimeline } from "../requests/components/EstimateRevisionTimeline";
import { ParamEditPopover } from "../requests/components/ParamEditPopover";
import type { ConsumerRepairParamEditState } from "./requestEstimateScreenActions";
import { RequestEstimateItemsEditor } from "./RequestEstimateItemsEditor";
import { RequestEstimateSummaryCard } from "./RequestEstimateSummaryCard";
import type { RequestEstimateViewModel } from "./requestEstimateViewModel";

type ItemEditorHandlers = {
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

type ParameterHandlers = {
  editingParam?: ConsumerRepairParamEditState;
  onOpenParamEditor?: (operation: UserParamPatchOperation, paramKey: string) => void;
  onSaveParamEdit?: (rawValue: string) => void;
  onCancelParamEdit?: () => void;
  onApplyParamPatch?: (operation: UserParamPatchOperation, paramKey: string, rawValue: string) => void;
};

type Props = ItemEditorHandlers & ParameterHandlers & {
  viewModel: RequestEstimateViewModel;
  revisionState: EstimateDraftRevisionState | null;
  currentRevision: EstimateDraftRevision | null;
  latestDiff: EstimateDraftRevisionDiff | null;
  showPdfAction?: boolean;
  onMakePdf?: () => void;
};

type VisibleAssumption = {
  key: string;
  value: unknown;
  reason: string;
  replacedByUserInput?: boolean;
};

type ProgressivePanelState = {
  parametersOpen: boolean;
  positionsOpen: boolean;
  technicalOpen: boolean;
};

function visibleAssumptionText(assumption: VisibleAssumption): string {
  const suffix = assumption.replacedByUserInput ? "replaced by user input" : assumption.reason;
  return `${aiEstimateRuAssumptionLabel(assumption.key)}: ${aiEstimateRuAssumptionValue(assumption.key, assumption.value)} · ${aiEstimateRuAssumptionReason(suffix, assumption.replacedByUserInput)}`;
}

function pluralizeRu(count: number, one: string, few: string, many: string): string {
  const value = Math.abs(count);
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function missingParameterCount(revision: EstimateDraftRevision | null, fallback: number): number {
  if (!revision) return fallback;
  const runtime = buildAiEstimateRuntimeViewModel({ revision, includeMissing: true, maxTraceRows: 0 });
  return runtime.completeness?.missingRequirements.length ?? revision.missingInputs.length;
}

function artifactStatus(revision: EstimateDraftRevision | null): string | null {
  if (!revision) return null;
  return revision.artifacts.artifactsValidForRevisionId === revision.revisionId
    ? "PDF и пакет закупки актуальны"
    : "Документ и пакет закупки нужно пересоздать.";
}

export class ConsumerRepairProgressiveEstimatePanel extends React.PureComponent<Props, ProgressivePanelState> {
  state: ProgressivePanelState = {
    parametersOpen: false,
    positionsOpen: false,
    technicalOpen: false,
  };

  private toggleParameters = () => {
    this.setState((state) => ({ parametersOpen: !state.parametersOpen }));
  };

  private togglePositions = () => {
    this.setState((state) => ({ positionsOpen: !state.positionsOpen }));
  };

  private toggleTechnical = () => {
    this.setState((state) => ({ technicalOpen: !state.technicalOpen }));
  };

  render(): React.ReactElement {
    const {
      viewModel,
      revisionState,
      currentRevision,
      latestDiff,
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
    } = this.props;
    const { parametersOpen, positionsOpen, technicalOpen } = this.state;
    const count = missingParameterCount(currentRevision, viewModel.assumptionRows.length);
    const paramEditorEnabled = Boolean(onApplyParamPatch && onOpenParamEditor && onSaveParamEdit && onCancelParamEdit);
    const editingValue = editingParam && currentRevision?.params[editingParam.key]
      ? String(currentRevision.params[editingParam.key].value)
      : "";
    const editingLabel = findAiEstimateRuntimeParameterCard(currentRevision, editingParam?.key)?.labelRu ?? "";
    const artifactLabel = artifactStatus(currentRevision);

    return (
    <View style={styles.wrap}>
      <RequestEstimateSummaryCard viewModel={viewModel} missingParameterCount={count} />
      <View style={styles.primaryActions} testID="request-estimate-progressive-actions">
        <Pressable
          accessibilityRole="button"
          onPress={this.toggleParameters}
          style={[styles.actionButton, styles.primaryButton]}
          testID="request-estimate-parameters-toggle"
        >
          <Ionicons name={parametersOpen ? "chevron-up" : "options-outline"} size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>{parametersOpen ? "Скрыть параметры" : "Уточнить параметры"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={this.togglePositions}
          style={styles.actionButton}
          testID="request-estimate-positions-toggle"
        >
          <Ionicons name={positionsOpen ? "chevron-up" : "list-outline"} size={16} color="#334155" />
          <Text style={styles.actionButtonText}>{positionsOpen ? "Скрыть позиции" : "Показать позиции"}</Text>
        </Pressable>
        {showPdfAction && onMakePdf ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Сделать PDF"
            onPress={onMakePdf}
            style={styles.actionButton}
            testID="consumer-estimate-make-pdf"
          >
            <Ionicons name="document-text-outline" size={16} color="#334155" />
            <Text style={styles.actionButtonText}>PDF</Text>
          </Pressable>
        ) : null}
      </View>

      {parametersOpen ? (
        <ParameterDisclosurePanel
          revision={currentRevision}
          latestDiff={latestDiff}
          artifactLabel={artifactLabel}
          paramEditorEnabled={paramEditorEnabled}
          onOpenParamEditor={onOpenParamEditor}
        />
      ) : null}

      <ParamEditPopover
        visible={Boolean(editingParam && paramEditorEnabled)}
        paramKey={editingParam?.key ?? null}
        label={editingLabel}
        initialValue={editingValue}
        onSave={onSaveParamEdit ?? (() => undefined)}
        onCancel={onCancelParamEdit ?? (() => undefined)}
      />

      <View style={styles.technicalWrap}>
        <Pressable
          accessibilityRole="button"
          onPress={this.toggleTechnical}
          style={styles.technicalToggle}
          testID="request-estimate-runtime-details-toggle"
        >
          <Ionicons name={technicalOpen ? "chevron-up" : "construct-outline"} size={15} color="#334155" />
          <Text style={styles.technicalToggleText}>
            {technicalOpen ? "Скрыть историю пересчета" : "Показать историю пересчета"}
          </Text>
        </Pressable>
        {technicalOpen ? (
          <View style={styles.technicalPanel} testID="request-estimate-runtime-details-panel">
            <EstimateRevisionTimeline state={revisionState} />
            <EstimateRevisionDiff diff={latestDiff} />
            {currentRevision?.assumptions.length ? (
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
                        style={styles.smallButton}
                        testID={`editable-param-replace-assumption-${assumption.key}`}
                      >
                        <Text style={styles.smallButtonText}>Заменить</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {positionsOpen ? (
        <EstimatePositionsPanel
          viewModel={viewModel}
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
        />
      ) : null}
    </View>
    );
  }
}

type ParameterDisclosurePanelProps = {
  revision: EstimateDraftRevision | null;
  latestDiff: EstimateDraftRevisionDiff | null;
  artifactLabel: string | null;
  paramEditorEnabled: boolean;
  onOpenParamEditor?: (operation: UserParamPatchOperation, paramKey: string) => void;
};

type ParameterDisclosurePanelState = {
  showAllMissing: boolean;
  filledOpen: boolean;
  derivedOpen: boolean;
};

class ParameterDisclosurePanel extends React.PureComponent<ParameterDisclosurePanelProps, ParameterDisclosurePanelState> {
  state: ParameterDisclosurePanelState = {
    showAllMissing: false,
    filledOpen: false,
    derivedOpen: false,
  };

  private showAllMissing = () => {
    this.setState({ showAllMissing: true });
  };

  private toggleFilled = () => {
    this.setState((state) => ({ filledOpen: !state.filledOpen }));
  };

  private toggleDerived = () => {
    this.setState((state) => ({ derivedOpen: !state.derivedOpen }));
  };

  render(): React.ReactElement {
    const {
      revision,
      latestDiff,
      artifactLabel,
      paramEditorEnabled,
      onOpenParamEditor,
    } = this.props;
    const { showAllMissing, filledOpen, derivedOpen } = this.state;
    const runtime = buildAiEstimateRuntimeViewModel({ revision, includeMissing: true, maxTraceRows: 0 });
    const missingCards = runtime.cards.filter((card) => card.missing);
    const filledCards = runtime.cards.filter((card) => !card.missing && card.source !== "formula_derived");
    const derivedCards = runtime.cards.filter((card) => card.source === "formula_derived");
    const visibleMissingCards = showAllMissing ? missingCards : missingCards.slice(0, 5);
    const hiddenMissingCount = Math.max(0, missingCards.length - visibleMissingCards.length);

    return (
    <View style={styles.parameterPanel} testID="request-estimate-parameter-panel">
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Уточнить параметры расчёта</Text>
        <Text style={styles.panelMeta}>
          {missingCards.length > 0
            ? `${missingCards.length} ${pluralizeRu(missingCards.length, "параметр", "параметра", "параметров")} для точности`
            : "Основные параметры заполнены"}
        </Text>
      </View>
      {latestDiff ? (
        <Text style={styles.successStatus} testID="request-estimate-parameter-apply-status">
          Параметры применены. Смета пересчитана. Документ и пакет закупки нужно пересоздать.
        </Text>
      ) : artifactLabel ? (
        <Text style={styles.neutralStatus} testID="request-estimate-artifact-status">
          {artifactLabel}
        </Text>
      ) : null}
      {visibleMissingCards.length > 0 ? (
        <View style={styles.parameterGroup} testID="request-estimate-visible-missing-parameters">
          <Text style={styles.groupTitle}>Нужно уточнить для точности</Text>
          {visibleMissingCards.map((card) => (
            <View key={card.key} style={styles.parameterRow} testID={`editable-param-chip-${card.key}`}>
              <View style={styles.parameterCopy} testID={`request-estimate-missing-param-${card.key}`}>
                <Text style={styles.parameterLabel}>{card.labelRu}</Text>
                <Text style={styles.parameterMeta}>{card.requiredForLabelRu}</Text>
              </View>
              {paramEditorEnabled ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onOpenParamEditor?.("add_param", card.key)}
                  style={styles.smallButton}
                  testID={`editable-param-edit-${card.key}`}
                >
                  <Text style={styles.smallButtonText}>Добавить</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          {hiddenMissingCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={this.showAllMissing}
              style={styles.showMoreButton}
              testID="request-estimate-show-more-parameters"
            >
              <Text style={styles.showMoreText}>
                Показать ещё {hiddenMissingCount} {pluralizeRu(hiddenMissingCount, "параметр", "параметра", "параметров")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {filledCards.length > 0 ? (
        <View style={styles.parameterGroup} testID="request-estimate-filled-parameters">
          <Text style={styles.groupTitle}>Заполнено</Text>
          <View style={styles.compactGrid}>
            {filledCards.slice(0, 6).map((card) => (
              <View key={card.key} style={styles.compactParam} testID={`editable-param-chip-${card.key}`}>
                <Text style={styles.compactLabel}>{card.labelRu}</Text>
                <Text style={styles.compactValue}>{card.displayValueRu}</Text>
                {paramEditorEnabled ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onOpenParamEditor?.("update_param", card.key)}
                    style={styles.compactEdit}
                    testID={`editable-param-edit-${card.key}`}
                  >
                    <Text style={styles.compactEditText}>Изменить</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
          {filledCards.length > 6 ? (
            <Pressable
              accessibilityRole="button"
              onPress={this.toggleFilled}
              style={styles.inlineToggle}
              testID="request-estimate-filled-parameters-toggle"
            >
              <Text style={styles.inlineToggleText}>{filledOpen ? "Скрыть остальные" : `Показать ещё ${filledCards.length - 6}`}</Text>
            </Pressable>
          ) : null}
          {filledOpen ? (
            <View style={styles.compactGrid} testID="request-estimate-filled-parameters-extra">
              {filledCards.slice(6).map((card) => (
                <View key={card.key} style={styles.compactParam} testID={`editable-param-chip-${card.key}`}>
                  <Text style={styles.compactLabel}>{card.labelRu}</Text>
                  <Text style={styles.compactValue}>{card.displayValueRu}</Text>
                  {paramEditorEnabled ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onOpenParamEditor?.("update_param", card.key)}
                      style={styles.compactEdit}
                      testID={`editable-param-edit-${card.key}`}
                    >
                      <Text style={styles.compactEditText}>Изменить</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      {derivedCards.length > 0 ? (
        <View style={styles.parameterGroup}>
          <Pressable
            accessibilityRole="button"
            onPress={this.toggleDerived}
            style={styles.inlineToggle}
            testID="request-estimate-derived-parameters-toggle"
          >
            <Text style={styles.inlineToggleText}>
              {derivedOpen ? "Скрыть рассчитанные параметры" : `Рассчитанные параметры: ${derivedCards.length}`}
            </Text>
          </Pressable>
          {derivedOpen ? (
            <View style={styles.compactGrid} testID="request-estimate-derived-parameters">
              {derivedCards.map((card) => (
                <View key={card.key} style={styles.compactParam}>
                  <Text style={styles.compactLabel}>{card.labelRu}</Text>
                  <Text style={styles.compactValue}>{card.displayValueRu}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
    );
  }
}

function EstimatePositionsPanel({
  viewModel,
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
}: ItemEditorHandlers & {
  viewModel: RequestEstimateViewModel;
}): React.ReactElement {
  return (
    <View style={styles.positionsPanel} testID="request-estimate-positions-panel">
      <ConsumerRepairDraftQuickActions
        onAddManual={onAddManual}
        onAddPhotoMaterialRecognition={onAddPhotoMaterialRecognition}
        onAddCustom={onAddCustom}
      />
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
    </View>
  );
}

export function ConsumerRepairDraftQuickActions({
  onAddManual,
  onAddPhotoMaterialRecognition,
  onAddCustom,
}: {
  onAddManual: () => void;
  onAddPhotoMaterialRecognition?: () => void;
  onAddCustom: () => void;
}): React.ReactElement {
  return (
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
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  primaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  primaryButton: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  actionButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
  parameterPanel: {
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "#F8FAFC",
    padding: 12,
  },
  panelHeader: {
    gap: 3,
  },
  panelTitle: {
    color: "#0F172A",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
  },
  panelMeta: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  successStatus: {
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    color: "#166534",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  neutralStatus: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  parameterGroup: {
    gap: 8,
  },
  groupTitle: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
  },
  parameterRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  parameterCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  parameterLabel: {
    color: "#0F172A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  parameterMeta: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  smallButton: {
    minHeight: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  smallButtonText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "900",
  },
  showMoreButton: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  showMoreText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
  },
  compactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  compactParam: {
    minWidth: 132,
    flexGrow: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 8,
    gap: 3,
  },
  compactLabel: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
  },
  compactValue: {
    color: "#0F172A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  compactEdit: {
    alignSelf: "flex-start",
    minHeight: 26,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  compactEditText: {
    color: "#334155",
    fontSize: 10,
    fontWeight: "900",
  },
  inlineToggle: {
    alignSelf: "flex-start",
    minHeight: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  inlineToggleText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "900",
  },
  technicalWrap: {
    gap: 8,
  },
  technicalToggle: {
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
  },
  technicalToggleText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
  },
  technicalPanel: {
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
  sectionTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
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
  positionsPanel: {
    gap: 12,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },
  quickButton: {
    height: 38,
    borderRadius: 8,
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
  manualText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
});
