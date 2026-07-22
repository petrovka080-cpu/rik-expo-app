import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  aiEstimateCanonicalUnitForParameter,
  aiEstimateRuAssumptionLabel,
  aiEstimateRuAssumptionReason,
  aiEstimateRuAssumptionValue,
  aiEstimateRuLabelForParameter,
  aiEstimateRuUnitForParameter,
  containsForbiddenAiEstimateVisibleToken,
  hasHumanReadableAiEstimateParameterPassport,
} from "../../lib/estimate/aiEstimateRuParameterDictionary";
import type { ConsumerRepairDraftRevisionParamBatchPatch } from "../../lib/consumerRequests";
import type { AiEstimateParameterCard } from "../../lib/estimate/buildAiEstimateParameterCards";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionDiff,
  EstimateDraftRevisionState,
} from "../../lib/estimate/estimateDraftRevisionContract";
import { buildAiEstimateRuntimeViewModel } from "../../lib/estimate/runtime/buildAiEstimateRuntimeViewModel";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import { EstimateRevisionDiff } from "../requests/components/EstimateRevisionDiff";
import { EstimateRevisionTimeline } from "../requests/components/EstimateRevisionTimeline";
import type { ConsumerRepairQuantityChangeMeta } from "./consumerRepairQuantityEditTrace";
import type { ConsumerRepairParamEditState } from "./requestEstimateScreenActions";
import { RequestEstimateItemsEditor } from "./RequestEstimateItemsEditor";
import { RequestEstimateSummaryCard } from "./RequestEstimateSummaryCard";
import type { RequestEstimateViewModel } from "./requestEstimateViewModel";
import { pickFileAny } from "../../lib/filePick";
import {
  ASPHALT_WORK_ID_V4,
  buildAsphaltImmediateScopePreviewV4,
  type AsphaltImmediateScopePreviewItemV4,
} from "../../lib/estimate/v4/asphalt";

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
  showPdfAction?: boolean;
  onMakePdf?: () => void;
  onOpenProcurement?: () => void;
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

function AsphaltImmediateScopePanel({ rows }: { rows: readonly AsphaltImmediateScopePreviewItemV4[] }) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.immediateScopePanel} testID="request-estimate-immediate-scope">
      <Text style={styles.sectionTitle}>Предварительный состав материалов и работ</Text>
      <Text style={styles.parameterMeta}>
        AI-смета уже показала, что потребуется. Для точного расчёта количеств и стоимости нажмите «Уточнить параметры».
      </Text>
      {(["material", "work", "equipment"] as const).map((category) => {
        const categoryRows = rows.filter((row) => row.category === category);
        if (categoryRows.length === 0) return null;
        const title = category === "material" ? "Материалы" : category === "work" ? "Работы" : "Техника";
        return (
          <View key={category} style={styles.parameterGroup} testID={`request-estimate-immediate-scope-${category}`}>
            <Text style={styles.groupTitle}>{title}</Text>
            {categoryRows.map((row) => (
              <View key={row.id} style={styles.immediateScopeRow} testID={`request-estimate-immediate-scope-row-${row.id}`}>
                <Text style={styles.inlineParamEditorTitle}>{row.title_ru}</Text>
                <Text style={styles.parameterMeta}>{row.quantity_status_ru}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

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
}): AiEstimateParameterCard[] {
  const runtime = buildAiEstimateRuntimeViewModel({
    revision: input.revision,
    includeMissing: true,
    maxTraceRows: 0,
  });
  const existingKeys = new Set(runtime.cards.map((card) => card.key));
  return input.revision?.professionalWorkId === ASPHALT_WORK_ID_V4 ||
    input.revision?.matchedFamily === ASPHALT_WORK_ID_V4
    ? runtime.cards
    : [...runtime.cards, ...buildAssumptionParameterCards(input.viewModel, existingKeys)];
}

export class ConsumerRepairProgressiveEstimatePanel extends React.PureComponent<Props, ProgressivePanelState> {
  state: ProgressivePanelState = {
    parametersOpen: false,
    positionsOpen: true,
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
    } = this.props;
    const { parametersOpen, positionsOpen, technicalOpen } = this.state;
    const count = missingParameterCount(currentRevision, viewModel.assumptionRows.length);
    const paramEditorEnabled = Boolean(onApplyParamBatch || (onApplyParamPatch && onOpenParamEditor && onSaveParamEdit && onCancelParamEdit));
    const singleParamEditorEnabled = Boolean(!onApplyParamBatch && onApplyParamPatch && onOpenParamEditor && onSaveParamEdit && onCancelParamEdit);
    const artifactLabel = artifactStatus(currentRevision);
    const immediateScope = buildAsphaltImmediateScopePreviewV4(currentRevision);

    return (
    <View style={styles.wrap}>
      <RequestEstimateSummaryCard
        viewModel={viewModel}
        missingParameterCount={count}
        preliminaryScopeCount={immediateScope.length}
      />
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

      {positionsOpen ? <AsphaltImmediateScopePanel rows={immediateScope} /> : null}

      {parametersOpen ? (
        <ParameterDisclosurePanel
          viewModel={viewModel}
          revision={currentRevision}
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
                    {singleParamEditorEnabled && !assumption.replacedByUserInput ? (
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

      {positionsOpen && immediateScope.length === 0 ? (
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
};

type InlineParamEditorProps = {
  paramKey: string;
  label: string;
  inputKind: AiEstimateParameterCard["inputKind"];
  value: string;
  unitLabel?: string;
  dirty: boolean;
  error?: string;
  choices?: { value: string; labelRu: string }[];
  clarificationControl?: AiEstimateParameterCard["clarificationControl"];
  onChange: (paramKey: string, rawValue: string) => void;
};

class InlineParamEditor extends React.PureComponent<InlineParamEditorProps> {
  render(): React.ReactElement {
    const { paramKey, label, inputKind, value, unitLabel, dirty, error, choices, clarificationControl, onChange } = this.props;
    const keyboardType = inputKind === "number" ? "decimal-pad" : "default";

    return (
      <View style={styles.inlineParamEditor} testID={`editable-param-inline-editor-${paramKey}`}>
        <View style={styles.inlineParamEditorBody} testID="editable-param-popover">
          <View style={styles.inlineParamEditorHeader}>
            <Text style={styles.inlineParamEditorTitle}>{label}</Text>
            {dirty ? <Text style={styles.inlineParamDirty} testID={`editable-param-dirty-${paramKey}`}>Изменено</Text> : null}
          </View>
          {clarificationControl === "file_upload" ? (
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
              keyboardType={keyboardType}
              placeholder={`Введите: ${label.toLocaleLowerCase("ru-RU")}`}
              placeholderTextColor="#94A3B8"
              style={styles.inlineParamInput}
              testID="editable-param-popover-input"
            />
          )}
          {unitLabel ? <Text style={styles.inlineParamUnit}>{unitLabel}</Text> : null}
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
  };

  componentDidMount(): void {
    this.syncDraftFromProps();
  }

  componentDidUpdate(prevProps: ParameterDisclosurePanelProps): void {
    if (
      prevProps.revision?.revisionId !== this.props.revision?.revisionId ||
      prevProps.viewModel !== this.props.viewModel
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

  private buildCards(): AiEstimateParameterCard[] {
    return buildConsumerRepairProgressiveParameterCards({
      revision: this.props.revision,
      viewModel: this.props.viewModel,
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
    });
  }

  private initialEditValue(card: AiEstimateParameterCard): string {
    return this.state.draftValues[card.key] ?? this.valueForCard(card);
  }

  private dirtyKeys(): string[] {
    const keys = new Set([...Object.keys(this.state.baselineValues), ...Object.keys(this.state.draftValues)]);
    return [...keys].filter((key) =>
      (this.state.draftValues[key] ?? "").trim() !== (this.state.baselineValues[key] ?? "").trim()
    );
  }

  private operationForCard(card: AiEstimateParameterCard): UserParamPatchOperation {
    return this.props.revision?.params[card.key] ? "update_param" : "add_param";
  }

  private changeDraftValue = (paramKey: string, rawValue: string): void => {
    this.setState((state) => ({
      draftValues: {
        ...state.draftValues,
        [paramKey]: rawValue,
      },
      validationErrors: {
        ...state.validationErrors,
        [paramKey]: "",
      },
    }));
  };

  private cancelDraftChanges = (): void => {
    this.setState({
      draftValues: { ...this.state.baselineValues },
      validationErrors: {},
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
      patches.push({
        operation: card ? this.operationForCard(card) : "update_param",
        paramKey: key,
        rawValue,
      });
    }

    if (Object.keys(validationErrors).length > 0) {
      this.setState({ validationErrors });
      return;
    }
    if (patches.length === 0) return;
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
    const isDirty = rawValue.trim() !== baseline.trim();
    const meta = card.missing ? card.requiredForLabelRu : card.displayValueRu;
    const editableInPlace = paramEditorEnabled && card.source !== "formula_derived";

    return (
      <View key={card.key} style={styles.parameterRow} testID={`editable-param-chip-${card.key}`}>
        <View style={styles.parameterRowMain}>
          <View style={styles.parameterCopy} testID={card.missing ? `request-estimate-missing-param-${card.key}` : undefined}>
            <Text style={styles.parameterLabel}>{card.labelRu}</Text>
            <Text style={styles.parameterMeta}>{meta}</Text>
            {card.whyItMattersRu ? <Text style={styles.parameterMeta}>Зачем: {card.whyItMattersRu}</Text> : null}
            {card.exampleRu ? <Text style={styles.parameterMeta}>{card.exampleRu}</Text> : null}
            {card.changesInEstimateRu ? <Text style={styles.parameterMeta}>{card.changesInEstimateRu}</Text> : null}
            {card.missing && card.missingValueConsequenceRu ? (
              <Text style={styles.parameterMeta}>Если пропустить: {card.missingValueConsequenceRu}</Text>
            ) : null}
          </View>
          {card.missing ? (
            <Text style={styles.requiredBadge}>{actionLabel}</Text>
          ) : null}
        </View>
        {editableInPlace ? (
          <InlineParamEditor
            paramKey={card.key}
            label={card.labelRu}
            inputKind={card.inputKind}
            value={rawValue}
            unitLabel={card.unitRu}
            dirty={isDirty}
            error={this.state.validationErrors[card.key]}
            choices={card.choices}
            clarificationControl={card.clarificationControl}
            onChange={this.changeDraftValue}
          />
        ) : null}
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
    const missingCards = cards.filter((card) => card.missing);
    const filledCards = cards.filter((card) => !card.missing && card.source !== "formula_derived");
    const derivedCards = cards.filter((card) => card.source === "formula_derived");
    const visibleMissingCards = showAllMissing ? missingCards : missingCards.slice(0, 5);
    const hiddenMissingCount = Math.max(0, missingCards.length - visibleMissingCards.length);
    const dirtyCount = this.dirtyKeys().length;
    const clarification = this.props.revision?.professionalClarification;

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
              <Text style={styles.inlineParamPrimaryText}>Применить все изменения</Text>
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
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    width: "100%",
  },
  inlineParamEditorBody: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    padding: 10,
    gap: 8,
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
  immediateScopePanel: {
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    padding: 12,
  },
  immediateScopeRow: {
    gap: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 10,
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
