import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  aiEstimateCanonicalUnitForParameter,
  aiEstimateRuLabelForParameter,
  aiEstimateRuUnitForParameter,
  containsForbiddenAiEstimateVisibleToken,
  hasHumanReadableAiEstimateParameterPassport,
} from "../../lib/estimate/aiEstimateRuParameterDictionary";
import type { ConsumerRepairDraftRevisionParamBatchPatch } from "../../lib/consumerRequests";
import type { AiEstimateParameterCard } from "../../lib/estimate/aiEstimateParameterCardContract";
import type {
  CanonicalParameter,
  CanonicalParameterSession,
} from "../../lib/estimate/canonicalParameters";
import {
  buildCanonicalParameterCards,
  buildRevisionParameterCards,
} from "../../lib/estimatePresentation/buildCanonicalParameterCards";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionDiff,
  EstimateDraftRevisionState,
} from "../../lib/estimate/estimateDraftRevisionContract";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import type { ConsumerRepairQuantityChangeMeta } from "./consumerRepairQuantityEditTrace";
import { buildConsumerRepairCanonicalSessionPreview } from "./consumerRepairCanonicalSessionPreview";
import type { ConsumerRepairParamEditState } from "./requestEstimateScreenActions";
import { RequestEstimateItemsEditor } from "./RequestEstimateItemsEditor";
import { RequestEstimateSummaryCard } from "./RequestEstimateSummaryCard";
import type { RequestEstimateViewModel } from "./requestEstimateViewModel";
import { EstimateRevisionTimeline } from "../requests/components/EstimateRevisionTimeline";
import { EstimateRevisionDiff } from "../requests/components/EstimateRevisionDiff";
import { pickFileAny } from "../../lib/filePick";
import { logger } from "../../lib/logger";

const LEGACY_ASPHALT_WORK_ID = "asphalt_concrete_pavement";

type ItemEditorHandlers = {
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
};

type ParameterHandlers = {
  editingParam?: ConsumerRepairParamEditState;
  onOpenParamEditor?: (operation: UserParamPatchOperation, paramKey: string) => void;
  onSaveParamEdit?: (rawValue: string) => void;
  onCancelParamEdit?: () => void;
  onApplyParamPatch?: (operation: UserParamPatchOperation, paramKey: string, rawValue: string) => void;
  onApplyParamBatch?: (patches: ConsumerRepairDraftRevisionParamBatchPatch[]) => void;
};

type Props = ItemEditorHandlers & ParameterHandlers & {
  viewModel: RequestEstimateViewModel;
  revisionState: EstimateDraftRevisionState | null;
  currentRevision: EstimateDraftRevision | null;
  latestDiff: EstimateDraftRevisionDiff | null;
  canonicalParameterSession?: CanonicalParameterSession | null;
  showPdfAction?: boolean;
  onMakePdf?: () => void;
  onOpenProcurement?: () => void;
  onRefineCanonicalParameters?: () => void;
};

type ProgressivePanelState = {
  parametersOpen: boolean;
  positionsOpen: boolean;
};

function pluralizeRu(count: number, one: string, few: string, many: string): string {
  const value = Math.abs(count);
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function compactRuNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 6,
    useGrouping: false,
  }).format(value);
}

export function canonicalNumericInputRule(input: {
  min?: number;
  max?: number;
  integer?: boolean;
  unit?: string;
}): string {
  const unit = input.unit ? ` ${input.unit}` : "";
  const validPair = input.min != null && input.max != null && input.max > input.min;
  const minimum = input.min != null
      ? `${compactRuNumber(Math.abs(input.min) <= Number.EPSILON * 8 ? 0 : input.min)}${unit}`
      : null;
  const maximum = input.max != null
    ? `${compactRuNumber(input.max)}${unit}`
    : null;
  const range = validPair && minimum && maximum
    ? `от ${minimum} до ${maximum}`
    : minimum
      ? `не меньше ${minimum}`
      : maximum
        ? `не больше ${maximum}`
        : "числовое значение";
  return input.integer ? `${range}; только целое число` : range;
}

export function canonicalConsumerParameterPlaceholder(input: {
  parameter: CanonicalParameter | null | undefined;
  baselineDisplay: string;
  guideShortRu?: string | null;
}): string {
  const validation = input.parameter?.validation;
  const hasNormRange = Boolean(
    input.parameter?.normativeSource &&
    validation?.min != null &&
    validation?.max != null &&
    validation.max > validation.min
  );
  const norm = hasNormRange
    ? `Норма: ${compactRuNumber(validation!.min!)}–${compactRuNumber(validation!.max!)}`
    : null;
  const guide = String(input.guideShortRu ?? "").toLocaleLowerCase("ru-RU");
  const nonNumericGuide = guide.includes("обмер")
    ? "По обмеру"
    : guide.includes("техкарт")
      ? "По техкарте"
      : guide.includes("лаборатор")
        ? "По лабораторному подбору"
        : "По проекту";
  if (input.parameter?.source === "ASSUMED" && input.baselineDisplay.trim()) {
    return `Предварительно принято: ${input.baselineDisplay.trim()}${norm ? ` · ${norm.toLocaleLowerCase("ru-RU")}` : ""}`;
  }
  return norm ?? nonNumericGuide;
}

function missingParameterCount(revision: EstimateDraftRevision | null, fallback: number): number {
  if (!revision) return fallback;
  return revision.missingInputs.length;
}

const ASSUMPTION_ROW_PARAM_KEYS: Record<string, string> = {
  area: "area_m2",
  ceiling: "ceiling_height_m",
  bathrooms: "bathrooms_count",
  bathroom_floor: "bathroom_floor_area_m2",
  dry_floor: "dry_floor_area_m2",
  wall_area: "net_wall_area_m2",
  bath_wall_tile: "bathroom_wall_tile_area_m2",
  paint_total: "paint_total_area_m2",
  baseboard: "baseboard_lm",
  electrical: "electrical_points",
  water: "water_points",
  sewer: "sewer_points",
  doors: "doors_count",
  waste: "waste_volume_m3",
};

function paramKeyForAssumptionRow(rowId: string): string | null {
  if (rowId.startsWith("expanded_")) return rowId.replace(/^expanded_/, "");
  return ASSUMPTION_ROW_PARAM_KEYS[rowId] ?? null;
}

function parseAssumptionRowValue(value: string): number | string {
  const normalized = value.replace(/\u00a0/g, " ").trim();
  const match = normalized.match(/-?\d+(?:[,.]\d+)?/);
  if (!match) return normalized;
  const parsed = Number(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : normalized;
}

function buildAssumptionParameterCards(
  viewModel: RequestEstimateViewModel,
  existingKeys: Set<string>,
): AiEstimateParameterCard[] {
  return viewModel.assumptionRows
    .map((row): AiEstimateParameterCard | null => {
      const key = paramKeyForAssumptionRow(row.id);
      if (!key || existingKeys.has(key)) return null;
      if (!hasHumanReadableAiEstimateParameterPassport(key, row.label)) return null;
      if (containsForbiddenAiEstimateVisibleToken(`${row.label} ${row.value}`)) return null;
      const canonicalUnit = aiEstimateCanonicalUnitForParameter(key);
      const value = parseAssumptionRowValue(row.value);
      existingKeys.add(key);
      return {
        key,
        labelRu: aiEstimateRuLabelForParameter(key, row.label),
        value,
        displayValueRu: row.value,
        unitRu: aiEstimateRuUnitForParameter(key, canonicalUnit),
        source: "formula_derived",
        sourceLabelRu: "рассчитано",
        inputKind: typeof value === "number" ? "number" : "text",
        editable: true,
        clickAction: "open_parameter_editor",
        noStepperControls: true,
        missing: false,
        requiredFor: "better_accuracy",
        requiredForLabelRu: "для точного расчёта",
        affectsRowIds: [],
        affectsRowTitlesRu: [],
        formulaRefs: [],
      };
    })
    .filter((card): card is AiEstimateParameterCard => Boolean(card));
}

function artifactStatus(revision: EstimateDraftRevision | null): string | null {
  if (!revision) return null;
  return revision.artifacts.artifactsValidForRevisionId === revision.revisionId
    ? "PDF и пакет закупки актуальны"
    : "Документ и пакет закупки нужно пересоздать.";
}

export function buildConsumerRepairProgressiveParameterCards(input: {
  revision: EstimateDraftRevision | null;
  viewModel: RequestEstimateViewModel;
  canonicalParameterSession?: CanonicalParameterSession | null;
}): AiEstimateParameterCard[] {
  const canonicalCards = buildCanonicalParameterCards({
    session: input.canonicalParameterSession ?? null,
    revision: input.revision,
  });
  if (canonicalCards.length > 0) return canonicalCards;
  const storedCards = buildRevisionParameterCards(input.revision);
  const existingKeys = new Set(storedCards.map((card) => card.key));
  return input.revision?.professionalWorkId === LEGACY_ASPHALT_WORK_ID ||
    input.revision?.matchedFamily === LEGACY_ASPHALT_WORK_ID
    ? storedCards
    : [...storedCards, ...buildAssumptionParameterCards(input.viewModel, existingKeys)];
}

export function resolveConsumerRepairParamPatchOperation(input: {
  paramKey: string;
  revision: EstimateDraftRevision | null;
  canonicalParameterSession?: CanonicalParameterSession | null;
}): UserParamPatchOperation {
  if (
    input.revision &&
    Object.prototype.hasOwnProperty.call(input.revision.params, input.paramKey)
  ) {
    return "update_param";
  }
  const canonicalParameter = input.canonicalParameterSession?.parameters.find(
    (parameter) => parameter.parameterId === input.paramKey,
  );
  return canonicalParameter?.value != null &&
    canonicalParameter.state !== "BLOCKING_REQUIRED" &&
    canonicalParameter.state !== "INVALID"
    ? "update_param"
    : "add_param";
}

export class ConsumerRepairProgressiveEstimatePanel extends React.PureComponent<Props, ProgressivePanelState> {
  state: ProgressivePanelState = {
    parametersOpen:
      this.props.canonicalParameterSession?.status === "BLOCKING_REQUIRED",
    positionsOpen:
      this.props.canonicalParameterSession?.status !== "BLOCKING_REQUIRED",
  };

  private toggleParameters = () => {
    this.setState((state) => ({ parametersOpen: !state.parametersOpen }));
    this.props.onRefineCanonicalParameters?.();
  };

  private togglePositions = () => {
    this.setState((state) => ({ positionsOpen: !state.positionsOpen }));
  };

  render(): React.ReactElement {
    const {
      viewModel,
      currentRevision,
      latestDiff,
      canonicalParameterSession,
      showPdfAction,
      onMakePdf,
      onOpenProcurement,
      onRefineCanonicalParameters,
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
    } = this.props;
    const { parametersOpen, positionsOpen } = this.state;
    const count = canonicalParameterSession
      ? canonicalParameterSession.blockingMissingParameterIds.length +
        canonicalParameterSession.contractMissingParameterIds.length
      : missingParameterCount(currentRevision, viewModel.assumptionRows.length);
    const visibleMissingParameterSummary = canonicalParameterSession?.parameters
      .filter((parameter) => parameter.source === "MISSING" && parameter.state !== "NOT_APPLICABLE")
      .slice(0, 5)
      .map((parameter) =>
        parameter.unit
          ? `${parameter.label}, ${aiEstimateRuUnitForParameter(parameter.parameterId, parameter.unit)}`
          : parameter.label
      )
      .join(" · ") ?? "";
    const paramEditorEnabled = Boolean(onApplyParamBatch || (onApplyParamPatch && onOpenParamEditor && onSaveParamEdit && onCancelParamEdit));
    const artifactLabel = artifactStatus(currentRevision);

    return (
    <View style={styles.wrap}>
      <RequestEstimateSummaryCard viewModel={viewModel} missingParameterCount={count} />
      <EstimateRevisionTimeline state={this.props.revisionState} />
      <EstimateRevisionDiff diff={latestDiff} />
      {visibleMissingParameterSummary ? (
        <Text
          style={styles.parameterMeta}
          testID="request-estimate-missing-parameter-summary"
        >
          Уточнить: {visibleMissingParameterSummary}
        </Text>
      ) : null}
      <View style={styles.primaryActions} testID="request-estimate-progressive-actions">
        {canonicalParameterSession == null || canonicalParameterSession.parameters.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={this.toggleParameters}
          style={[styles.actionButton, styles.primaryButton]}
          testID="request-estimate-parameters-toggle"
        >
          <Ionicons name={parametersOpen ? "chevron-up" : "options-outline"} size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>{parametersOpen ? "Скрыть параметры" : "Уточнить параметры"}</Text>
        </Pressable>
        ) : (
          <Text style={styles.neutralStatus} testID="request-estimate-no-editable-parameters">
            Дополнительные параметры для этой работы не требуются
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={this.togglePositions}
          style={styles.actionButton}
          testID={
            Platform.OS === "android"
              ? "request-estimate-items-editor"
              : "request-estimate-positions-toggle"
          }
        >
          <Ionicons name={positionsOpen ? "chevron-up" : "list-outline"} size={16} color="#334155" />
          <Text style={styles.actionButtonText}>
            {positionsOpen ? "Скрыть позиции" : "Показать позиции"}
          </Text>
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
        {currentRevision?.boq.rows.some((row) => row.includedInProcurement) && onOpenProcurement ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Открыть список закупки"
            onPress={onOpenProcurement}
            style={styles.actionButton}
            testID="consumer-estimate-open-procurement"
          >
            <Ionicons name="cart-outline" size={16} color="#334155" />
            <Text style={styles.actionButtonText}>Закупка</Text>
          </Pressable>
        ) : null}
      </View>

      {parametersOpen ? (
        <ParameterDisclosurePanel
          viewModel={viewModel}
          revision={currentRevision}
          canonicalParameterSession={canonicalParameterSession}
          latestDiff={latestDiff}
          artifactLabel={artifactLabel}
          paramEditorEnabled={paramEditorEnabled}
          editingParam={editingParam}
          onOpenParamEditor={onOpenParamEditor}
          onSaveParamEdit={onSaveParamEdit}
          onCancelParamEdit={onCancelParamEdit}
          onApplyParamBatch={onApplyParamBatch}
        />
      ) : null}

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
  viewModel: RequestEstimateViewModel;
  revision: EstimateDraftRevision | null;
  canonicalParameterSession?: CanonicalParameterSession | null;
  latestDiff: EstimateDraftRevisionDiff | null;
  artifactLabel: string | null;
  paramEditorEnabled: boolean;
  editingParam?: ConsumerRepairParamEditState;
  onOpenParamEditor?: (operation: UserParamPatchOperation, paramKey: string) => void;
  onSaveParamEdit?: (rawValue: string) => void;
  onCancelParamEdit?: () => void;
  onApplyParamBatch?: (patches: ConsumerRepairDraftRevisionParamBatchPatch[]) => void;
};

type ParameterDisclosurePanelState = {
  showAllMissing: boolean;
  filledOpen: boolean;
  derivedOpen: boolean;
  draftValues: Record<string, string>;
  baselineValues: Record<string, string>;
  draftRevisionId: string | null;
  draftSignature: string;
  validationErrors: Record<string, string>;
  explicitlyConfirmedMissingValues: Record<string, true>;
  expandedGuideDetails: Record<string, true>;
};

export function isConsumerRepairParameterExplicitlyDirty(input: {
  baselineValue: string;
  draftValue: string;
  explicitlyConfirmedMissingValue: boolean;
}): boolean {
  return input.explicitlyConfirmedMissingValue ||
    input.draftValue.trim() !== input.baselineValue.trim();
}

type InlineParamEditorProps = {
  paramKey: string;
  label: string;
  inputKind: AiEstimateParameterCard["inputKind"];
  value: string;
  unitLabel?: string;
  dirty: boolean;
  error?: string;
  hint?: string;
  choices?: { value: string; labelRu: string }[];
  guideShortRu: string;
  structuredGroup?: AiEstimateParameterCard["structuredGroup"];
  clarificationControl?: AiEstimateParameterCard["clarificationControl"];
  onChange: (paramKey: string, rawValue: string) => void;
};

type InlineCompositeItem = {
  itemId: string;
  position: number;
  values: Record<string, string>;
};

export class InlineParamEditor extends React.PureComponent<InlineParamEditorProps, { focusedControlId: string | null }> {
  state = { focusedControlId: null as string | null };

  private compositeItems(): InlineCompositeItem[] {
    if (!this.props.structuredGroup || !this.props.value.trim()) return [];
    try {
      const parsed = JSON.parse(this.props.value);
      return Array.isArray(parsed) ? parsed.filter((item): item is InlineCompositeItem =>
        Boolean(item) && typeof item === "object" && typeof item.itemId === "string"
        && Boolean(item.values) && typeof item.values === "object" && !Array.isArray(item.values)) : [];
    } catch {
      return [];
    }
  }

  private commitComposite(items: InlineCompositeItem[]): void {
    this.props.onChange(this.props.paramKey, JSON.stringify(items.map((item, position) => ({ ...item, position }))));
  }

  private addCompositeItem = (): void => {
    const group = this.props.structuredGroup;
    if (!group) return;
    const items = this.compositeItems();
    if (items.length >= group.maximumItems) return;
    this.commitComposite([...items, {
      itemId: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      position: items.length,
      values: Object.fromEntries(group.fields.map((field) => [field.key, ""])),
    }]);
  };

  private updateCompositeField = (itemId: string, fieldKey: string, value: string): void => {
    this.commitComposite(this.compositeItems().map((item) => item.itemId === itemId
      ? { ...item, values: { ...item.values, [fieldKey]: value } }
      : item));
  };

  private deleteCompositeItem = (itemId: string): void => {
    this.commitComposite(this.compositeItems().filter((item) => item.itemId !== itemId));
  };

  private moveCompositeItem = (itemId: string, direction: -1 | 1): void => {
    const items = [...this.compositeItems()];
    const from = items.findIndex((item) => item.itemId === itemId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= items.length) return;
    [items[from], items[to]] = [items[to], items[from]];
    this.commitComposite(items);
  };

  render(): React.ReactElement {
    const { paramKey, label, inputKind, value, unitLabel, dirty, error, hint, choices, guideShortRu, structuredGroup, clarificationControl, onChange } = this.props;
    const keyboardType = inputKind === "number" ? "decimal-pad" : "default";
    const inputGuideAsCaption = this.state.focusedControlId === paramKey || value.trim().length > 0;
    const compositeItems = this.compositeItems();

    return (
      <View style={styles.inlineParamEditor} testID={`editable-param-inline-editor-${paramKey}`}>
        <View style={styles.inlineParamEditorBody} testID="editable-param-popover">
          {dirty ? <Text style={styles.inlineParamDirty} testID={`editable-param-dirty-${paramKey}`}>Изменено</Text> : null}
          {structuredGroup ? (
            <View style={styles.typedCompositeEditor} testID={`typed-composite-editor-${paramKey}`}>
              <Text style={styles.inlineParamUnit}>Количество: {compositeItems.length} · вычисляется автоматически</Text>
              {compositeItems.map((item, itemIndex) => (
                <View key={item.itemId} style={styles.typedCompositeItem}>
                  <View style={styles.inlineParamEditorHeader}>
                    <Text style={styles.inlineParamEditorTitle}>{structuredGroup.itemLabelRu} {itemIndex + 1}</Text>
                    <View style={styles.batchActions}>
                      <Pressable disabled={itemIndex === 0} onPress={() => this.moveCompositeItem(item.itemId, -1)} style={styles.compactMoveButton}><Text>↑</Text></Pressable>
                      <Pressable disabled={itemIndex === compositeItems.length - 1} onPress={() => this.moveCompositeItem(item.itemId, 1)} style={styles.compactMoveButton}><Text>↓</Text></Pressable>
                      <Pressable onPress={() => this.deleteCompositeItem(item.itemId)} style={styles.inlineParamDangerButton}><Text style={styles.inlineParamDangerText}>Удалить</Text></Pressable>
                    </View>
                  </View>
                  {structuredGroup.fields.map((field) => {
                    const focusId = `${item.itemId}:${field.key}`;
                    const fieldValue = item.values[field.key] ?? "";
                    const showCaption = this.state.focusedControlId === focusId || fieldValue.trim().length > 0 || field.choices.length > 0;
                    return <View key={field.key} style={styles.typedCompositeField}>
                      <Text style={styles.inlineParamEditorTitle}>{field.labelRu}{field.required ? " *" : ""}</Text>
                      {field.choices.length > 0 ? <View style={styles.batchActions}>{field.choices.map((choice) => <Pressable key={choice.value} onPress={() => this.updateCompositeField(item.itemId, field.key, choice.value)} style={[styles.inlineParamButton, fieldValue === choice.value ? styles.inlineParamPrimaryButton : null]}><Text style={fieldValue === choice.value ? styles.inlineParamPrimaryText : styles.inlineParamButtonText}>{choice.labelRu}</Text></Pressable>)}</View> : <TextInput
                        value={fieldValue}
                        onChangeText={(nextValue) => this.updateCompositeField(item.itemId, field.key, nextValue)}
                        onFocus={() => this.setState({ focusedControlId: focusId })}
                        onBlur={() => this.setState((state) => ({ focusedControlId: state.focusedControlId === focusId ? null : state.focusedControlId }))}
                        keyboardType={field.inputKind === "number" ? "decimal-pad" : "default"}
                        placeholder={showCaption ? undefined : field.guideShortRu}
                        placeholderTextColor="#64748B"
                        accessibilityLabel={field.labelRu}
                        accessibilityHint={`${field.guideShortRu}${field.unitRu ? `, ${field.unitRu}` : ""}`}
                        style={styles.inlineParamInput}
                      />}
                      {showCaption ? <Text style={styles.inlineGuideChip}>{field.guideShortRu}</Text> : null}
                      {field.unitRu ? <Text style={styles.inlineParamUnit}>{field.unitRu}</Text> : null}
                    </View>;
                  })}
                </View>
              ))}
              <Pressable disabled={compositeItems.length >= structuredGroup.maximumItems} onPress={this.addCompositeItem} style={styles.inlineParamButton}><Text style={styles.inlineParamButtonText}>Добавить: {structuredGroup.itemLabelRu}</Text></Pressable>
            </View>
          ) : clarificationControl === "file_upload" ? (
            <View style={styles.batchActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void pickFileAny({ accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" }).then((file) => {
                    if (file) onChange(paramKey, file.name);
                  });
                }}
                style={styles.inlineParamButton}
                testID={`editable-param-file-${paramKey}`}
              >
                <Text style={styles.inlineParamButtonText}>{value ? "Заменить документ" : "Загрузить документ"}</Text>
              </Pressable>
              {value ? <Text style={styles.parameterMeta}>{value}</Text> : null}
            </View>
          ) : choices && choices.length > 0 ? (
            <View style={styles.batchActions} testID={`editable-param-options-${paramKey}`}>
              {choices.map((choice) => (
                <Pressable
                  accessibilityRole="button"
                  key={choice.value}
                  onPress={() => onChange(paramKey, choice.value)}
                  style={[styles.inlineParamButton, value === choice.value ? styles.inlineParamPrimaryButton : null]}
                  testID={`editable-param-option-${paramKey}-${choice.value}`}
                >
                  <Text style={value === choice.value ? styles.inlineParamPrimaryText : styles.inlineParamButtonText}>
                    {choice.labelRu}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <TextInput
              value={value}
              onChangeText={(nextValue) => onChange(paramKey, nextValue)}
              onFocus={() => this.setState({ focusedControlId: paramKey })}
              onBlur={() => this.setState((state) => ({ focusedControlId: state.focusedControlId === paramKey ? null : state.focusedControlId }))}
              keyboardType={keyboardType}
              placeholder={inputGuideAsCaption ? undefined : guideShortRu}
              placeholderTextColor="#64748B"
              accessibilityLabel={label}
              accessibilityHint={`${guideShortRu}${unitLabel ? `, ${unitLabel}` : ""}`}
              style={styles.inlineParamInput}
              testID="editable-param-popover-input"
            />
          )}
          {error ? (
            <Text style={styles.inlineParamError} testID={`editable-param-validation-error-${paramKey}`}>
              {error}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }
}

class ParameterDisclosurePanel extends React.PureComponent<ParameterDisclosurePanelProps, ParameterDisclosurePanelState> {
  state: ParameterDisclosurePanelState = {
    showAllMissing: false,
    filledOpen: true,
    derivedOpen: false,
    draftValues: {},
    baselineValues: {},
    draftRevisionId: null,
    draftSignature: "",
    validationErrors: {},
    explicitlyConfirmedMissingValues: {},
    expandedGuideDetails: {},
  };

  componentDidMount(): void {
    this.syncDraftFromProps();
  }

  componentDidUpdate(prevProps: ParameterDisclosurePanelProps): void {
    const nextDraftSignature = this.draftSignature(this.buildCards());
    if (
      prevProps.revision?.revisionId !== this.props.revision?.revisionId ||
      prevProps.canonicalParameterSession?.fingerprint !==
        this.props.canonicalParameterSession?.fingerprint ||
      (this.dirtyKeys().length === 0 && nextDraftSignature !== this.state.draftSignature)
    ) {
      this.syncDraftFromProps();
    }
  }

  private showAllMissing = () => {
    this.setState({ showAllMissing: true });
  };

  private toggleFilled = () => {
    this.setState((state) => ({ filledOpen: !state.filledOpen }));
  };

  private toggleDerived = () => {
    this.setState((state) => ({ derivedOpen: !state.derivedOpen }));
  };

  private editableCanonicalParameterSession(): CanonicalParameterSession | null {
    return buildConsumerRepairCanonicalSessionPreview({
      session: this.props.canonicalParameterSession ?? null,
      draftValues: this.state.draftValues,
    });
  }

  private buildCards(): AiEstimateParameterCard[] {
    return buildConsumerRepairProgressiveParameterCards({
      revision: this.props.revision,
      viewModel: this.props.viewModel,
      canonicalParameterSession: this.editableCanonicalParameterSession(),
    });
  }

  private valueForCard(card: AiEstimateParameterCard): string {
    const currentValue = this.props.revision?.params[card.key]?.value;
    if (currentValue != null) return String(currentValue);
    return card.value == null ? "" : String(card.value);
  }

  private draftSignature(cards: AiEstimateParameterCard[]): string {
    return cards
      .map((card) => `${card.key}:${this.valueForCard(card)}`)
      .join("|");
  }

  private syncDraftFromProps(): void {
    const cards = this.buildCards();
    const baselineValues = Object.fromEntries(cards.map((card) => [card.key, this.valueForCard(card)]));
    this.setState({
      draftValues: baselineValues,
      baselineValues,
      draftRevisionId: this.props.revision?.revisionId ?? null,
      draftSignature: this.draftSignature(cards),
      validationErrors: {},
      explicitlyConfirmedMissingValues: {},
    });
  }

  private initialEditValue(card: AiEstimateParameterCard): string {
    return this.state.draftValues[card.key] ?? this.valueForCard(card);
  }

  private dirtyKeys(): string[] {
    const keys = new Set([...Object.keys(this.state.baselineValues), ...Object.keys(this.state.draftValues)]);
    return [...keys].filter((key) => isConsumerRepairParameterExplicitlyDirty({
      baselineValue: this.state.baselineValues[key] ?? "",
      draftValue: this.state.draftValues[key] ?? "",
      explicitlyConfirmedMissingValue: this.state.explicitlyConfirmedMissingValues[key] === true,
    }));
  }

  private operationForCard(card: AiEstimateParameterCard): UserParamPatchOperation {
    return resolveConsumerRepairParamPatchOperation({
      paramKey: card.key,
      revision: this.props.revision,
      canonicalParameterSession: this.props.canonicalParameterSession,
    });
  }

  private changeDraftValue = (paramKey: string, rawValue: string): void => {
    const card = this.buildCards().find((candidate) => candidate.key === paramKey);
    let derivedCount: number | null = null;
    if (card?.derivedCountParameterKey && card.structuredGroup) {
      try {
        const parsed = JSON.parse(rawValue);
        derivedCount = Array.isArray(parsed) ? parsed.length : null;
      } catch {
        derivedCount = null;
      }
    }
    this.setState((state) => ({
      draftValues: {
        ...state.draftValues,
        [paramKey]: rawValue,
        ...(card?.derivedCountParameterKey && derivedCount != null
          ? { [card.derivedCountParameterKey]: String(derivedCount) }
          : {}),
      },
      validationErrors: {
        ...state.validationErrors,
        [paramKey]: "",
      },
      explicitlyConfirmedMissingValues: card?.missing
        ? { ...state.explicitlyConfirmedMissingValues, [paramKey]: true }
        : state.explicitlyConfirmedMissingValues,
    }));
  };

  private toggleGuideDetails = (paramKey: string): void => {
    this.setState((state) => {
      const next = { ...state.expandedGuideDetails };
      if (next[paramKey]) delete next[paramKey];
      else next[paramKey] = true;
      return { expandedGuideDetails: next };
    });
  };

  private cancelDraftChanges = (): void => {
    this.setState({
      draftValues: { ...this.state.baselineValues },
      validationErrors: {},
      explicitlyConfirmedMissingValues: {},
    });
  };

  private applyDraftChanges = (): void => {
    const cardsByKey = new Map(this.buildCards().map((card) => [card.key, card]));
    const dirtyKeys = this.dirtyKeys();
    const validationErrors: Record<string, string> = {};
    const patches: ConsumerRepairDraftRevisionParamBatchPatch[] = [];

    for (const key of dirtyKeys) {
      const card = cardsByKey.get(key);
      const rawValue = (this.state.draftValues[key] ?? "").trim();
      if (!rawValue) {
        validationErrors[key] = "Введите значение перед применением.";
        continue;
      }
      const canonicalParameter = this.editableCanonicalParameterSession()?.parameters.find(
        (parameter) => parameter.parameterId === key,
      );
      if (canonicalParameter?.valueType === "number") {
        const parsed = Number(rawValue.replace(",", "."));
        const { min, max, integer } = canonicalParameter.validation;
        const rule = canonicalNumericInputRule({ min, max, integer });
        if (!Number.isFinite(parsed)) {
          validationErrors[key] = `${canonicalParameter.label}: введите число.`;
          continue;
        }
        if (
          (min != null && parsed < min) ||
          (max != null && parsed > max) ||
          (integer === true && !Number.isInteger(parsed))
        ) {
          const ruleOwner = canonicalParameter.normativeSource
            ? "нормативный диапазон"
            : "правило проверки ввода";
          validationErrors[key] = `${canonicalParameter.label}: ${ruleOwner} — ${rule}.`;
          continue;
        }
      }
      patches.push({
        operation: card ? this.operationForCard(card) : "update_param",
        paramKey: key,
        rawValue,
      });
    }

    if (Object.keys(validationErrors).length > 0) {
      logger.info("ConsumerRepairParameterApplyClick", JSON.stringify({
        result: "client_validation_rejected",
        dirtyCount: dirtyKeys.length,
        invalidParameterIds: Object.keys(validationErrors),
      }));
      this.setState({ validationErrors });
      return;
    }
    if (patches.length === 0) return;
    // Submit every non-empty edited value atomically even when other required
    // parameters are still missing. The canonical service is the single owner
    // of cross-field/oneOf validation and persists partial progress. Blocking
    // here on unrelated or hidden cards made the button silently do nothing
    // for bridge, parking and other exact Asphalt profiles.
    logger.info("ConsumerRepairParameterApplyClick", JSON.stringify({
      result: "submitted",
      patchCount: patches.length,
      parameterIds: patches.map((patch) => patch.paramKey),
    }));
    this.props.onApplyParamBatch?.(patches);
  }

  private renderEditableParameterRow(
    card: AiEstimateParameterCard,
    actionLabel: string,
  ): React.ReactElement {
    const {
      paramEditorEnabled,
    } = this.props;
    const rawValue = this.initialEditValue(card);
    const baseline = this.state.baselineValues[card.key] ?? "";
    const isDirty = isConsumerRepairParameterExplicitlyDirty({
      baselineValue: baseline,
      draftValue: rawValue,
      explicitlyConfirmedMissingValue: this.state.explicitlyConfirmedMissingValues[card.key] === true,
    });
    const meta = card.missing ? card.requiredForLabelRu : card.displayValueRu;
    const canonicalParameter = this.editableCanonicalParameterSession()?.parameters.find(
      (parameter) => parameter.parameterId === card.key,
    );
    const hasValidNormRange = Boolean(
      canonicalParameter?.normativeSource &&
      canonicalParameter.validation.min != null &&
      canonicalParameter.validation.max != null &&
      canonicalParameter.validation.max > canonicalParameter.validation.min
    );
    const validationHint = canonicalParameter?.valueType === "number" && hasValidNormRange
      ? `Норма: ${canonicalNumericInputRule({
        ...canonicalParameter.validation,
        unit: card.unitRu,
      })}.`
      : undefined;
    // A derived value describes provenance, not immutability. Editing it creates
    // an explicit user override in the next revision and must use the same
    // atomic batch path as every other parameter.
    const editableInPlace = paramEditorEnabled;
    const guideExpanded = this.state.expandedGuideDetails[card.key] === true;
    const acceptedBaseline = canonicalParameter?.source === "ASSUMED" && !isDirty;
    const editorValue = acceptedBaseline ? "" : rawValue;
    const placeholder = canonicalConsumerParameterPlaceholder({
      parameter: canonicalParameter,
      baselineDisplay: meta,
      guideShortRu: card.guideShortRu,
    });

    return (
      <View key={card.key} style={styles.parameterRow} testID={`editable-param-chip-${card.key}`}>
        <View style={styles.compactParameterLine}>
          <Text
            style={styles.parameterLabel}
            testID={card.missing ? `request-estimate-missing-param-${card.key}` : undefined}
          >
            {card.labelRu}{card.missing && actionLabel ? " *" : ""}
          </Text>
          {editableInPlace ? (
            <InlineParamEditor
              paramKey={card.key}
              label={card.labelRu}
              inputKind={card.inputKind}
              value={editorValue}
              unitLabel={card.unitRu}
              dirty={isDirty}
              error={this.state.validationErrors[card.key]}
              hint={validationHint}
              choices={card.choices}
              guideShortRu={placeholder}
              structuredGroup={card.structuredGroup}
              clarificationControl={card.clarificationControl}
              onChange={this.changeDraftValue}
            />
          ) : <Text style={styles.parameterMeta}>{meta}</Text>}
          {card.unitRu ? <Text style={styles.compactParameterUnit}>{card.unitRu}</Text> : null}
          <Pressable
            accessibilityLabel={`Источник параметра: ${card.labelRu}`}
            accessibilityRole="button"
            onPress={() => this.toggleGuideDetails(card.key)}
            style={styles.guideInfoButton}
            testID={`editable-param-guide-details-${card.key}`}
          >
            <Text style={styles.guideInfoButtonText}>i</Text>
          </Pressable>
        </View>
        {guideExpanded ? <View style={styles.guideDetailsPanel}>
          {validationHint ? <Text style={styles.parameterMeta}>{validationHint}</Text> : null}
          {canonicalParameter?.normativeSource ? (
            <Text style={styles.parameterMeta}>
              {canonicalParameter.normativeSource.document} · {canonicalParameter.normativeSource.locator}
            </Text>
          ) : null}
          {(card.guideDetailsRu ?? []).map((line, index) => <Text key={`${card.key}:guide:${index}`} style={styles.parameterMeta}>{line}</Text>)}
          {card.whyItMattersRu ? <Text style={styles.parameterMeta}>Зачем: {card.whyItMattersRu}</Text> : null}
          {card.changesInEstimateRu ? <Text style={styles.parameterMeta}>{card.changesInEstimateRu}</Text> : null}
          {card.missingValueConsequenceRu ? <Text style={styles.parameterMeta}>Если пропустить: {card.missingValueConsequenceRu}</Text> : null}
        </View> : null}
      </View>
    );
  }

  render(): React.ReactElement {
    const {
      latestDiff,
      artifactLabel,
    } = this.props;
    const { showAllMissing, filledOpen, derivedOpen } = this.state;
    const cards = this.buildCards();
    const clarificationRank = {
      critical: 0,
      recommended: 1,
      optional: 2,
    } as const;
    const canonicalSession = this.editableCanonicalParameterSession();
    const canonicalBlockingParameterIds = new Set(canonicalSession?.blockingMissingParameterIds ?? []);
    const initialCanonicalCalculationBlocked =
      canonicalSession?.status === "BLOCKING_REQUIRED";
    const missingCards = cards
      .filter((card) =>
        card.missing &&
        (
          !initialCanonicalCalculationBlocked ||
          canonicalBlockingParameterIds.has(card.key)
        )
      )
      .sort(
        (left, right) =>
          clarificationRank[left.clarificationTier ?? "optional"] -
          clarificationRank[right.clarificationTier ?? "optional"],
      );
    const assumptionCards = canonicalSession
      ? cards.filter((card) => !card.missing && card.source === "catalog_default")
      : [];
    const filledCards = cards.filter((card) =>
      !card.missing &&
      card.source !== "formula_derived" &&
      !assumptionCards.includes(card)
    );
    const derivedCards = cards.filter((card) => card.source === "formula_derived");
    const criticalMissingCards = missingCards.filter(
      (card) => card.clarificationTier === "critical",
    );
    const nonCriticalMissingCards = missingCards.filter(
      (card) => card.clarificationTier !== "critical",
    );
    const visibleMissingCards = showAllMissing
      ? missingCards
      : [
        ...criticalMissingCards,
        ...nonCriticalMissingCards.slice(0, Math.max(0, 5 - criticalMissingCards.length)),
      ];
    const hiddenMissingCount = Math.max(0, missingCards.length - visibleMissingCards.length);
    const dirtyCount = this.dirtyKeys().length;
    const clarification = this.props.revision?.professionalClarification;
    const blockingMissingCount = canonicalSession?.blockingMissingParameterIds.length ?? 0;
    const contractMissingCount = canonicalSession?.contractMissingParameterIds.length ?? missingCards.length;

    return (
    <View style={styles.parameterPanel} testID="request-estimate-parameter-panel">
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Уточнить параметры расчёта</Text>
        <Text style={styles.panelMeta}>
          {blockingMissingCount > 0
            ? `Нужно уточнить: ${blockingMissingCount} обязательных ${pluralizeRu(blockingMissingCount, "параметр", "параметра", "параметров")}`
            : contractMissingCount > 0
              ? `Обязательных уточнений: 0. До договорной версии: ${contractMissingCount}.`
              : "Все обязательные параметры заполнены"}
        </Text>
        {canonicalSession && assumptionCards.length > 0 ? (
          <Text style={styles.panelMeta}>
            Допущений, которые можно уточнить: {assumptionCards.length}
          </Text>
        ) : null}
      </View>
      {clarification ? (
        <View style={styles.parameterGroup} testID="request-estimate-asphalt-v4-understood">
          <Text style={styles.groupTitle}>{clarification.heading_ru}</Text>
          {clarification.understood.map((item) => (
            <Text key={`${item.label_ru}:${item.value_ru}`} style={styles.parameterMeta}>
              {item.label_ru}: {item.value_ru}. {item.provenance_ru}.
            </Text>
          ))}
        </View>
      ) : null}
      {dirtyCount > 0 ? (
        <View style={styles.batchBar} testID="editable-param-batch-bar">
          <Text style={styles.batchBarText} testID="editable-param-batch-dirty-count">
            Изменено параметров: {dirtyCount}
          </Text>
          <View style={styles.batchActions}>
            <Pressable
              accessibilityRole="button"
              onPress={this.applyDraftChanges}
              style={[styles.inlineParamButton, styles.inlineParamPrimaryButton]}
              testID="editable-param-batch-apply"
            >
              <Text style={styles.inlineParamPrimaryText}>Применить и сформировать смету</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={this.cancelDraftChanges}
              style={styles.inlineParamButton}
              testID="editable-param-batch-cancel"
            >
              <Text style={styles.inlineParamButtonText}>Отменить изменения</Text>
            </Pressable>
          </View>
          {Object.values(this.state.validationErrors).find(Boolean) ? (
            <Text style={styles.inlineParamError} testID="editable-param-batch-validation-error">
              {Object.values(this.state.validationErrors).find(Boolean)}
            </Text>
          ) : null}
        </View>
      ) : null}
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
          {visibleMissingCards.some((card) => card.clarificationTier === "critical") ? (
            <Text style={styles.groupTitle}>Критически необходимо уточнить</Text>
          ) : null}
          {visibleMissingCards.filter((card) => card.clarificationTier === "critical").map((card) => this.renderEditableParameterRow(card, "Обязательный"))}
          {visibleMissingCards.some((card) => card.clarificationTier === "recommended") ? (
            <Text style={styles.groupTitle}>Рекомендуется уточнить</Text>
          ) : null}
          {visibleMissingCards.filter((card) => card.clarificationTier === "recommended").map((card) => this.renderEditableParameterRow(card, "Для точности"))}
          {visibleMissingCards.some((card) => card.clarificationTier === "optional") ? (
            <Text style={styles.groupTitle}>Можно оставить допущением</Text>
          ) : null}
          {visibleMissingCards.filter((card) => card.clarificationTier === "optional").map((card) => this.renderEditableParameterRow(card, "Необязательно"))}
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
          {filledCards.slice(0, 6).map((card) => this.renderEditableParameterRow(card, ""))}
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
            <View style={styles.parameterGroup} testID="request-estimate-filled-parameters-extra">
              {filledCards.slice(6).map((card) => this.renderEditableParameterRow(card, ""))}
            </View>
          ) : null}
        </View>
      ) : null}
      {assumptionCards.length > 0 ? (
        <View style={styles.parameterGroup} testID="request-estimate-assumed-parameters">
          <Text style={styles.groupTitle}>Явные предварительные допущения</Text>
          {assumptionCards.map((card) => this.renderEditableParameterRow(card, "Допущение"))}
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
            <View style={styles.parameterGroup} testID="request-estimate-derived-parameters">
              {derivedCards.map((card) => this.renderEditableParameterRow(card, ""))}
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
    <View
      accessibilityLabel="Редактор позиций сметы"
      collapsable={false}
      style={styles.positionsPanel}
      testID={
        Platform.OS === "android"
          ? undefined
          : "request-estimate-items-editor"
      }
    >
      <View collapsable={false} testID="request-estimate-positions-panel">
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
    minHeight: 46,
    gap: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  compactParameterLine: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  parameterRowMain: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
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
    flexBasis: 170,
    flexShrink: 1,
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
  requiredBadge: {
    color: "#0F766E",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
  },
  batchBar: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#99F6E4",
    backgroundColor: "#ECFDF5",
    padding: 10,
    gap: 8,
  },
  batchBarText: {
    color: "#0F766E",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  batchActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineParamEditor: {
    flex: 1,
    minWidth: 150,
  },
  inlineParamEditorBody: {
    gap: 4,
  },
  inlineParamEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  inlineParamEditorTitle: {
    color: "#0F172A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  inlineParamDirty: {
    color: "#0F766E",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
  },
  compactParameterUnit: {
    color: "#475569",
    minWidth: 32,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  guideInfoButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
  },
  guideInfoButtonText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "900",
  },
  inlineParamInput: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "800",
  },
  inlineParamUnit: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  inlineParamError: {
    color: "#B91C1C",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
  },
  inlineParamButton: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  inlineParamPrimaryButton: {
    borderColor: "#0F766E",
    backgroundColor: "#0F766E",
  },
  inlineParamPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  inlineParamButtonText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
  },
  inlineGuideChip: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
    color: "#475569",
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
  },
  typedCompositeEditor: { gap: 8 },
  typedCompositeItem: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#94A3B8",
    backgroundColor: "#FFFFFF",
    padding: 9,
    gap: 8,
  },
  typedCompositeField: { gap: 5 },
  compactMoveButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  inlineParamDangerButton: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  inlineParamDangerText: { color: "#991B1B", fontSize: 11, fontWeight: "900" },
  guideDetailsButton: { alignSelf: "flex-start", paddingVertical: 5 },
  guideDetailsButtonText: { color: "#0F766E", fontSize: 11, fontWeight: "900" },
  guideDetailsPanel: {
    borderLeftWidth: 2,
    borderLeftColor: "#5EEAD4",
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 3,
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
