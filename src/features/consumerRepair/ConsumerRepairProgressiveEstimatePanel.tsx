import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from "react-native";

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
import { canonicalMaterialQuantityBasisFromRow } from "../../lib/estimate/backendPlatform/canonicalMaterialQuantityProjection";
import { normalizePublicBoqNameRu } from "../../lib/estimate/publicBoqNaming";
import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import type { ConsumerRepairQuantityChangeMeta } from "./consumerRepairQuantityEditTrace";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalogItemPickerTypes";
import { buildConsumerRepairCanonicalSessionPreview } from "./consumerRepairCanonicalSessionPreview";
import {
  consumerRepairCanonicalCalculationRequirementIds,
  consumerRepairCanonicalMissingParameterCount,
} from "./consumerRepairCanonicalEstimateReadiness";
import type { ConsumerRepairParamEditState } from "./requestEstimateScreenActions";
import { RequestEstimateItemsEditor } from "./RequestEstimateItemsEditor";
import { RequestEstimateSummaryCard } from "./RequestEstimateSummaryCard";
import type { RequestEstimateViewModel } from "./requestEstimateViewModel";
import { EstimateRevisionTimeline } from "../requests/components/EstimateRevisionTimeline";
import { EstimateRevisionDiff } from "../requests/components/EstimateRevisionDiff";
import { pickFileAny } from "../../lib/filePick";
import { logger } from "../../lib/logger";
import { safeJsonParseValue } from "../../lib/format";

const LEGACY_ASPHALT_WORK_ID = "asphalt_concrete_pavement";

type ItemEditorHandlers = {
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onSpecificationChange?: (itemId: string, value: string) => void;
  onOptionalChange?: (itemId: string, optional: boolean) => void;
  onRemove: (itemId: string) => void;
  onAddManual: (initialQuery?: string) => void;
  onAddPhotoMaterialRecognition?: () => void;
  onOpenPhotoForEstimateItem?: (itemId: string) => void;
  rowPhotoThumbnails?: Readonly<Record<string, string>>;
  onAddCustom: () => void;
  onRestoreLastRemoved?: () => void;
  canRestoreLastRemoved?: boolean;
  onOpenCatalog?: (itemId: string) => void;
  onSelectCatalogItem?: (item: CatalogItemPickerItem) => void;
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
  canonicalParameterReadinessPending?: boolean;
  showPdfAction?: boolean;
  onMakePdf?: () => void;
  onOpenProcurement?: () => void;
  onRefineCanonicalParameters?: () => void;
};

type ProgressivePanelState = {
  parametersOpen: boolean;
  positionsOpen: boolean;
  procurementOpen: boolean;
};

function hasCurrentProcurementArtifact(revision: EstimateDraftRevision | null): boolean {
  return Boolean(
    revision?.artifacts.procurementArtifactId
    && revision.artifacts.procurementValidForRevisionId === revision.revisionId,
  );
}

export type CanonicalProcurementPreviewRow = {
  rowId: string;
  titleRu: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  currency: string;
};

export function buildCanonicalProcurementPreviewRows(
  revision: EstimateDraftRevision | null,
): CanonicalProcurementPreviewRow[] {
  if (!revision) return [];
  return revision.boq.rows
    .filter((row) => row.includedInProcurement)
    .map((row) => {
      const quantityBasis = row.materialQuantity ?? canonicalMaterialQuantityBasisFromRow(row);
      return {
        rowId: row.rowId,
        titleRu: normalizePublicBoqNameRu({ sourceNameRu: row.titleRu }),
        quantity: quantityBasis?.procurementQuantity ?? row.quantity,
        unit: formatEstimateUnitLabel(
          quantityBasis?.procurementUnit ?? row.unitLabel ?? row.unit,
        ),
        unitPrice: row.unitPrice ?? null,
        currency: row.currency,
      };
    });
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
  unitLabel?: string | null;
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
  if (input.parameter?.source === "ASSUMED" && input.baselineDisplay.trim()) {
    return `Предварительно принято: ${input.baselineDisplay.trim()}${norm ? ` · ${norm.toLocaleLowerCase("ru-RU")}` : ""}`;
  }
  if (norm) return `${norm}. Возьмите значение из указанного нормативного источника.`;

  const parameterId = input.parameter?.parameterId ?? "";
  const valueType = input.parameter?.valueType;
  const unit = String(input.unitLabel ?? input.parameter?.unit ?? "").trim();
  if (/(?:reference|drawing|schedule|confirmation|approval|certificate|document)(?:_|$)/iu.test(parameterId)) {
    return "Введите номер или название документа, например «КЖ-12, лист 4»; если документа нет, поле не должно блокировать предварительный расчёт.";
  }
  if (/(?:location|zone|section|segment|area_name)(?:_|$)/iu.test(parameterId)) {
    return "Укажите конкретный участок, например «оси А–Б, участок 1».";
  }
  if (/(?:designation|specification|grade|class)(?:_|$)/iu.test(parameterId)) {
    return "Введите обозначение из чертежа или спецификации; не подбирайте значение наугад.";
  }
  if (valueType === "number") {
    return `Введите подтверждённое число${unit ? `, ${unit}` : ""}. Где взять: обмер, чертёж или ведомость объёмов.`;
  }
  const guide = String(input.guideShortRu ?? "").trim();
  if (guide && !/^по проекту\.?$/iu.test(guide)) return guide;
  return "Введите конкретное значение из обмера, чертежа или спецификации; не указывайте наугад.";
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
        editable: false,
        clickAction: "read_only",
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

export function buildConsumerRepairProgressiveParameterCards(input: {
  revision: EstimateDraftRevision | null;
  viewModel: RequestEstimateViewModel | null;
  canonicalParameterSession?: CanonicalParameterSession | null;
}): AiEstimateParameterCard[] {
  const canonicalCards = buildCanonicalParameterCards({
    session: input.canonicalParameterSession ?? null,
    revision: input.revision,
  });
  // An empty canonical session means this work has no safe user-editable
  // parameters. Falling back to persisted assumptions here re-exposed BOQ
  // quantities as an editable form.
  if (input.canonicalParameterSession) return canonicalCards;
  const storedCards = buildRevisionParameterCards(input.revision);
  const existingKeys = new Set(storedCards.map((card) => card.key));
  return input.revision?.professionalWorkId === LEGACY_ASPHALT_WORK_ID ||
    input.revision?.matchedFamily === LEGACY_ASPHALT_WORK_ID
    ? storedCards
    : [...storedCards, ...(input.viewModel
      ? buildAssumptionParameterCards(input.viewModel, existingKeys)
      : [])];
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
    // A usable preliminary estimate is the first projection. Missing inputs
    // and source gaps remain explicit in the summary and behind the refinement
    // action, but they must not replace the result with a large form on mount.
    parametersOpen: false,
    positionsOpen:
      this.props.viewModel.preliminaryNeedCount === 0
      &&
      !hasCurrentProcurementArtifact(this.props.currentRevision)
      && this.props.canonicalParameterSession?.status !== "BLOCKING_REQUIRED",
    // Artifact binding can move the draft panel between screen slots and
    // remount this component. The revision therefore keeps the preview open.
    procurementOpen: hasCurrentProcurementArtifact(this.props.currentRevision),
  };

  componentDidUpdate(prevProps: Props): void {
    const previousRevisionId = prevProps.currentRevision?.revisionId ?? null;
    const currentRevisionId = this.props.currentRevision?.revisionId ?? null;
    if (
      this.state.parametersOpen &&
      currentRevisionId != null &&
      currentRevisionId !== previousRevisionId &&
      this.props.canonicalParameterSession?.revisionId !== currentRevisionId
    ) {
      this.props.onRefineCanonicalParameters?.();
    }
    const previousProcurementReady = hasCurrentProcurementArtifact(prevProps.currentRevision);
    const currentProcurementReady = hasCurrentProcurementArtifact(this.props.currentRevision);
    if (currentProcurementReady && !previousProcurementReady && !this.state.procurementOpen) {
      this.setState({ procurementOpen: true, positionsOpen: false });
    } else if (
      currentRevisionId !== previousRevisionId
      && !currentProcurementReady
      && this.state.procurementOpen
    ) {
      this.setState({ procurementOpen: false });
    }
  }

  private toggleParameters = () => {
    const parametersOpen = !this.state.parametersOpen;
    this.setState({ parametersOpen }, () => {
      if (parametersOpen) this.props.onRefineCanonicalParameters?.();
    });
  };

  private togglePositions = () => {
    this.setState((state) => ({ positionsOpen: !state.positionsOpen }));
  };

  private openProcurement = () => {
    this.setState({ procurementOpen: true, positionsOpen: false });
    this.props.onOpenProcurement?.();
  };

  private openIncompleteRequirements = () => {
    this.setState({ parametersOpen: true, positionsOpen: false }, () => {
      this.props.onRefineCanonicalParameters?.();
    });
  };

  render(): React.ReactElement {
    const {
      viewModel,
      currentRevision,
      latestDiff,
      canonicalParameterSession,
      canonicalParameterReadinessPending = false,
      showPdfAction,
      onMakePdf,
      onOpenProcurement,
      onDecrease,
      onIncrease,
      onQuantityChange,
      onUnitPriceChange,
      onSpecificationChange,
      onOptionalChange,
      onRemove,
      onAddManual,
      onAddPhotoMaterialRecognition,
      onOpenPhotoForEstimateItem,
      rowPhotoThumbnails,
      onAddCustom,
      onRestoreLastRemoved,
      canRestoreLastRemoved,
      onOpenCatalog,
      onSelectCatalogItem,
      editingParam,
      onOpenParamEditor,
      onSaveParamEdit,
      onCancelParamEdit,
      onApplyParamPatch,
      onApplyParamBatch,
    } = this.props;
    const { parametersOpen, positionsOpen, procurementOpen } = this.state;
    const procurementRows = buildCanonicalProcurementPreviewRows(currentRevision);
    const editableMissingCount = canonicalParameterSession
      ? consumerRepairCanonicalMissingParameterCount(canonicalParameterSession)
      : 0;
    const sourceGateCount = viewModel.sourceGates?.length ?? 0;
    const count: number | undefined = canonicalParameterSession
      ? editableMissingCount + sourceGateCount
      : canonicalParameterReadinessPending
        ? sourceGateCount > 0 ? sourceGateCount : undefined
        : missingParameterCount(currentRevision, viewModel.assumptionRows.length) + sourceGateCount;
    const paramEditorEnabled = Boolean(onApplyParamBatch || (onApplyParamPatch && onOpenParamEditor && onSaveParamEdit && onCancelParamEdit));

    return (
    <View style={styles.wrap}>
      <RequestEstimateSummaryCard viewModel={viewModel} missingParameterCount={count} />
      <EstimateRevisionTimeline state={this.props.revisionState} />
      <EstimateRevisionDiff
        diff={latestDiff}
        parameters={canonicalParameterSession?.parameters}
      />
      <View style={styles.primaryActions} testID="request-estimate-progressive-actions">
        <Pressable
          accessibilityRole="button"
          onPress={this.toggleParameters}
          style={[styles.actionButton, styles.primaryButton]}
          testID="request-estimate-parameters-toggle"
        >
          <Ionicons name={parametersOpen ? "chevron-up" : "options-outline"} size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>
            {parametersOpen
              ? "Скрыть параметры"
              : sourceGateCount > 0 && editableMissingCount === 0
                ? `Источники норм (${sourceGateCount})`
                : count != null && count > 0
                ? `Уточнить параметры (${count})`
                : "Уточнить параметры"}
          </Text>
        </Pressable>
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
            onPress={this.openProcurement}
            style={styles.actionButton}
            testID="consumer-estimate-open-procurement"
          >
            <Ionicons name="cart-outline" size={16} color="#334155" />
            <Text style={styles.actionButtonText}>Закупка</Text>
          </Pressable>
        ) : null}
      </View>

      {procurementOpen && procurementRows.length > 0 ? (
        <View style={styles.procurementPanel} testID="consumer-estimate-procurement-list">
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Список закупки</Text>
            <Text style={styles.panelMeta}>
              {`${procurementRows.length} ${pluralizeRu(procurementRows.length, "позиция", "позиции", "позиций")} · версия №${currentRevision?.canonicalRevisionNumber ?? "—"}`}
            </Text>
          </View>
          {procurementRows.map((row) => (
            <View
              key={row.rowId}
              style={styles.procurementRow}
              testID={`consumer-estimate-procurement-row-${row.rowId}`}
            >
              <Text style={styles.procurementTitle}>{row.titleRu}</Text>
              <Text style={styles.procurementQuantity}>
                {`${compactRuNumber(row.quantity)} ${row.unit}`}
              </Text>
              <Text style={styles.procurementPrice}>
                {row.unitPrice == null
                  ? "Цена не заполнена"
                  : `${compactRuNumber(row.unitPrice)} ${row.currency} за ${row.unit}`}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {parametersOpen ? (
        <ParameterDisclosurePanel
          viewModel={viewModel}
          revision={currentRevision}
          canonicalParameterSession={canonicalParameterSession}
          latestDiff={latestDiff}
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
          incompleteParameterCount={count ?? null}
          incompleteResolutionLabel={editableMissingCount > 0
            ? `Заполнить данные объекта (${editableMissingCount})`
            : sourceGateCount > 0
              ? `Показать отсутствующие нормы (${sourceGateCount})`
              : "Открыть обязательные данные"}
          onResolveIncomplete={this.openIncompleteRequirements}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          onQuantityChange={onQuantityChange}
          onUnitPriceChange={onUnitPriceChange}
          onSpecificationChange={onSpecificationChange}
          onOptionalChange={onOptionalChange}
          onRemove={onRemove}
          onAddManual={onAddManual}
          onAddPhotoMaterialRecognition={onAddPhotoMaterialRecognition}
          onOpenPhotoForEstimateItem={onOpenPhotoForEstimateItem}
          rowPhotoThumbnails={rowPhotoThumbnails}
          onAddCustom={onAddCustom}
          onRestoreLastRemoved={onRestoreLastRemoved}
          canRestoreLastRemoved={canRestoreLastRemoved}
          onOpenCatalog={onOpenCatalog}
          onSelectCatalogItem={onSelectCatalogItem}
        />
      ) : null}
    </View>
    );
  }
}

type ParameterDisclosurePanelProps = {
  viewModel: RequestEstimateViewModel | null;
  revision: EstimateDraftRevision | null;
  canonicalParameterSession?: CanonicalParameterSession | null;
  latestDiff: EstimateDraftRevisionDiff | null;
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

export function shouldKeepConsumerRepairDirtyMissingParameterInPlace(input: {
  baselineMissing: boolean;
  currentMissing: boolean;
  dirty: boolean;
}): boolean {
  // Keep an actively edited control in the group where it was mounted.
  // The canonical preview can flip a missing field to filled after the first
  // character, or a filled numeric field to missing while its old value is
  // being replaced. Moving either control between groups remounts TextInput
  // and drops native focus before the remaining characters arrive.
  return input.dirty ? input.baselineMissing : input.currentMissing;
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

type InlineParamEditorState = {
  focusedControlId: string | null;
  selectionByControlId: Record<string, { start: number; end: number }>;
};

export class InlineParamEditor extends React.PureComponent<InlineParamEditorProps, InlineParamEditorState> {
  state: InlineParamEditorState = {
    focusedControlId: null,
    selectionByControlId: {},
  };

  private focusControl = (controlId: string): void => {
    this.setState({ focusedControlId: controlId });
  };

  private blurControl = (controlId: string): void => {
    this.setState((state) => ({
      focusedControlId: state.focusedControlId === controlId ? null : state.focusedControlId,
    }));
  };

  private rememberSelection = (
    controlId: string,
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ): void => {
    const next = event.nativeEvent.selection;
    this.setState((state) => {
      const current = state.selectionByControlId[controlId];
      if (current?.start === next.start && current.end === next.end) return null;
      return {
        selectionByControlId: {
          ...state.selectionByControlId,
          [controlId]: next,
        },
      };
    });
  };

  private activeSelection(controlId: string): { start: number; end: number } | undefined {
    return this.state.focusedControlId === controlId
      ? this.state.selectionByControlId[controlId]
      : undefined;
  }

  private compositeItems(): InlineCompositeItem[] {
    if (!this.props.structuredGroup || !this.props.value.trim()) return [];
    const parsed = safeJsonParseValue<unknown>(this.props.value, null);
    return Array.isArray(parsed) ? parsed.filter((item): item is InlineCompositeItem =>
      Boolean(item) && typeof item === "object" && typeof item.itemId === "string"
      && Boolean(item.values) && typeof item.values === "object" && !Array.isArray(item.values)) : [];
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
    const compositeItems = this.compositeItems();

    return (
      <View style={styles.inlineParamEditor} testID={`editable-param-inline-editor-${paramKey}`}>
        <View style={styles.inlineParamEditorBody} testID="editable-param-popover">
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
                    return <View key={field.key} style={styles.typedCompositeField}>
                      <Text style={styles.inlineParamEditorTitle}>{field.labelRu}{field.required ? " *" : ""}</Text>
                      {field.choices.length > 0 ? <View style={styles.batchActions}>{field.choices.map((choice) => <Pressable key={choice.value} onPress={() => this.updateCompositeField(item.itemId, field.key, choice.value)} style={[styles.inlineParamButton, fieldValue === choice.value ? styles.inlineParamPrimaryButton : null]}><Text style={fieldValue === choice.value ? styles.inlineParamPrimaryText : styles.inlineParamButtonText}>{choice.labelRu}</Text></Pressable>)}</View> : <TextInput
                        value={fieldValue}
                        importantForAutofill="no"
                        onChangeText={(nextValue) => this.updateCompositeField(item.itemId, field.key, nextValue)}
                        onFocus={() => this.focusControl(focusId)}
                        onBlur={() => this.blurControl(focusId)}
                        onSelectionChange={(event) => this.rememberSelection(focusId, event)}
                        keyboardType={field.inputKind === "number" ? "decimal-pad" : "default"}
                        placeholder={fieldValue.trim() ? undefined : field.guideShortRu}
                        placeholderTextColor="#64748B"
                        accessibilityLabel={field.labelRu}
                        accessibilityHint={`${field.guideShortRu}${field.unitRu ? `, ${field.unitRu}` : ""}`}
                        selection={this.activeSelection(focusId)}
                        style={styles.inlineParamInput}
                      />}
                      <Text style={styles.inlineGuideChip}>{field.guideShortRu}</Text>
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
            <View>
              <TextInput
                value={value}
                importantForAutofill="no"
                onChangeText={(nextValue) => onChange(paramKey, nextValue)}
                onFocus={() => this.focusControl(paramKey)}
                onBlur={() => this.blurControl(paramKey)}
                onSelectionChange={(event) => this.rememberSelection(paramKey, event)}
                keyboardType={keyboardType}
                placeholder={value.trim() ? undefined : guideShortRu}
                placeholderTextColor="#64748B"
                accessibilityLabel={label}
                accessibilityHint={`${guideShortRu}${unitLabel ? `, ${unitLabel}` : ""}`}
                selection={this.activeSelection(paramKey)}
                style={styles.inlineParamInput}
                testID="editable-param-popover-input"
              />
            </View>
          )}
          {!structuredGroup && guideShortRu ? (
            <Text style={styles.inlineGuideChip} testID={`editable-param-guide-${paramKey}`}>
              {guideShortRu}
            </Text>
          ) : null}
          {hint ? <Text style={styles.parameterMeta}>{hint}</Text> : null}
          <Text
            style={[styles.inlineParamDirty, dirty ? null : styles.inlineParamDirtyHidden]}
            testID={`editable-param-dirty-${paramKey}`}
          >
            {dirty ? "Изменено" : " "}
          </Text>
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

export class ParameterDisclosurePanel extends React.PureComponent<ParameterDisclosurePanelProps, ParameterDisclosurePanelState> {
  private submittedDraftValues: Record<string, string> | null = null;
  private submittedParentRevisionId: string | null = null;

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
    const revisionChanged =
      prevProps.revision?.revisionId !== this.props.revision?.revisionId;
    const canonicalSessionChanged =
      prevProps.canonicalParameterSession?.fingerprint !==
      this.props.canonicalParameterSession?.fingerprint;
    const hasUnsavedUserInput = this.dirtyKeys().length > 0;
    if (revisionChanged) {
      if (!hasUnsavedUserInput) {
        this.syncDraftFromProps();
        return;
      }
      const acceptedSubmittedChild = Boolean(
        this.submittedParentRevisionId
        && this.props.revision?.previousRevisionId === this.submittedParentRevisionId,
      );
      const preserveKeys = acceptedSubmittedChild && this.submittedDraftValues
        ? Object.keys(this.state.draftValues).filter(
            (key) => (this.state.draftValues[key] ?? "") !== (this.submittedDraftValues?.[key] ?? ""),
          )
        : this.dirtyKeys();
      this.rebaseDraftOnCurrentRevision(preserveKeys);
      return;
    }
    if (
      !hasUnsavedUserInput
      && (canonicalSessionChanged || nextDraftSignature !== this.state.draftSignature)
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

  private rebaseDraftOnCurrentRevision(preserveKeys: string[]): void {
    const cards = this.buildCards();
    const baselineValues = Object.fromEntries(cards.map((card) => [card.key, this.valueForCard(card)]));
    const preservedValues = Object.fromEntries(
      preserveKeys
        .filter((key) => Object.prototype.hasOwnProperty.call(baselineValues, key))
        .map((key) => [key, this.state.draftValues[key] ?? ""]),
    );
    this.submittedDraftValues = null;
    this.submittedParentRevisionId = null;
    this.setState({
      draftValues: { ...baselineValues, ...preservedValues },
      baselineValues,
      draftRevisionId: this.props.revision?.revisionId ?? null,
      draftSignature: this.draftSignature(cards),
      validationErrors: {},
      explicitlyConfirmedMissingValues: {},
    });
  }

  private syncDraftFromProps(): void {
    this.rebaseDraftOnCurrentRevision([]);
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
      const parsed = safeJsonParseValue<unknown>(rawValue, null);
      derivedCount = Array.isArray(parsed) ? parsed.length : null;
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
    this.submittedDraftValues = null;
    this.submittedParentRevisionId = null;
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
    this.submittedDraftValues = { ...this.state.draftValues };
    this.submittedParentRevisionId = this.props.revision?.revisionId ?? this.state.draftRevisionId;
    this.props.onApplyParamBatch?.(patches);
  }

  private continuePreliminaryCompilation = (): void => {
    logger.info("ConsumerRepairParameterApplyClick", JSON.stringify({
      result: "submitted_without_document_only_fields",
      patchCount: 0,
    }));
    this.props.onApplyParamBatch?.([]);
  };

  private renderEditableParameterRow(
    card: AiEstimateParameterCard,
    actionLabel: string,
    parameterOrdinal: number,
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
    const meta = card.missing
      ? card.editable
        ? card.requiredForLabelRu
        : "Нужен подтверждённый источник; вручную не вводится."
      : card.displayValueRu;
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
    const editableInPlace = paramEditorEnabled && card.editable;
    const guideExpanded = this.state.expandedGuideDetails[card.key] === true;
    const editorValue = rawValue;
    const placeholder = canonicalConsumerParameterPlaceholder({
      parameter: canonicalParameter,
      baselineDisplay: meta,
      guideShortRu: card.guideShortRu,
      unitLabel: card.unitRu,
    });

    return (
      <View key={card.key} style={styles.parameterRow} testID={`editable-param-chip-${card.key}`}>
        <View style={styles.compactParameterLine}>
          <Text
            style={styles.parameterLabel}
            testID={card.missing ? `request-estimate-missing-param-${card.key}` : undefined}
          >
            {`№ ${parameterOrdinal}. ${card.labelRu}`}{card.missing && actionLabel ? " *" : ""}
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
    } = this.props;
    const { showAllMissing, filledOpen, derivedOpen } = this.state;
    const cards = this.buildCards();
    const parameterOrdinalByKey = new Map(
      cards.map((card, index) => [card.key, index + 1] as const),
    );
    const renderParameter = (card: AiEstimateParameterCard, actionLabel: string) =>
      this.renderEditableParameterRow(
        card,
        actionLabel,
        parameterOrdinalByKey.get(card.key) ?? 1,
      );
    const clarificationRank = {
      critical: 0,
      recommended: 1,
      optional: 2,
    } as const;
    const canonicalSession = this.editableCanonicalParameterSession();
    const canonicalBlockingParameterIds = new Set(canonicalSession?.blockingMissingParameterIds ?? []);
    const baselineMissingParameterIds = new Set(
      buildConsumerRepairProgressiveParameterCards({
        revision: this.props.revision,
        viewModel: this.props.viewModel,
        canonicalParameterSession: this.props.canonicalParameterSession ?? null,
      })
        .filter((card) => card.missing)
        .map((card) => card.key),
    );
    const initialCanonicalCalculationBlocked =
      canonicalSession?.status === "BLOCKING_REQUIRED";
    const missingCards = cards
      .filter((card) => {
        const dirty = isConsumerRepairParameterExplicitlyDirty({
          baselineValue: this.state.baselineValues[card.key] ?? "",
          draftValue: this.initialEditValue(card),
          explicitlyConfirmedMissingValue: this.state.explicitlyConfirmedMissingValues[card.key] === true,
        });
        return shouldKeepConsumerRepairDirtyMissingParameterInPlace({
          baselineMissing: baselineMissingParameterIds.has(card.key),
          currentMissing: card.missing,
          dirty,
        }) &&
        (
          !initialCanonicalCalculationBlocked ||
          canonicalBlockingParameterIds.has(card.key)
        );
      })
      .map((card) => card.missing ? card : { ...card, missing: true })
      .sort(
        (left, right) =>
          clarificationRank[left.clarificationTier ?? "optional"] -
          clarificationRank[right.clarificationTier ?? "optional"],
      );
    const missingCardIds = new Set(missingCards.map((card) => card.key));
    const assumptionCards = canonicalSession
      ? cards.filter((card) => !missingCardIds.has(card.key) && card.source === "catalog_default")
      : [];
    const filledCards = cards.filter((card) =>
      !missingCardIds.has(card.key) &&
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
    const calculationRequirementIds = canonicalSession
      ? consumerRepairCanonicalCalculationRequirementIds(canonicalSession)
      : null;
    const blockingMissingCount = criticalMissingCards.length;
    const contractMissingCount = nonCriticalMissingCards.length;
    const canContinueWithoutDocumentOnlyFields = Boolean(
      canonicalSession
      && this.props.revision == null
      && canonicalSession.status === "BLOCKING_REQUIRED"
      && (calculationRequirementIds?.blockingMissingParameterIds.length ?? 0) === 0
      && (calculationRequirementIds?.invalidParameterIds.length ?? 0) === 0
      && this.props.onApplyParamBatch,
    );
    const sourceGateCount = this.props.viewModel?.sourceGates?.length ?? 0;

    return (
    <View style={styles.parameterPanel} testID="request-estimate-parameter-panel">
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Исходные данные расчёта</Text>
        <Text style={styles.panelMeta}>
          {blockingMissingCount > 0
            ? `Нужно уточнить: ${blockingMissingCount} обязательных ${pluralizeRu(blockingMissingCount, "параметр", "параметра", "параметров")}`
            : contractMissingCount > 0
              ? `До полного состава и подтверждения: ${contractMissingCount} обязательных ${pluralizeRu(contractMissingCount, "параметр", "параметра", "параметров")}.`
              : sourceGateCount > 0
                ? `Данные заказчика заполнены; для ${sourceGateCount} ${pluralizeRu(sourceGateCount, "нормы", "норм", "норм")} нужен подтверждённый источник.`
                : "Все обязательные параметры заполнены"}
        </Text>
        {canonicalSession && assumptionCards.length > 0 ? (
          <Text style={styles.panelMeta}>
            Допущений, которые можно уточнить: {assumptionCards.length}
          </Text>
        ) : null}
      </View>
      {(this.props.viewModel?.sourceGates?.length ?? 0) > 0 ? (
        <View style={styles.parameterGroup} testID="request-estimate-source-gates">
          <Text style={styles.groupTitle}>Нужен подтверждённый источник</Text>
          <Text style={styles.parameterMeta}>
            Эти значения должен предоставить расчётный каталог или специалист. Поля для угадывания заказчиком отключены.
          </Text>
          {(this.props.viewModel?.sourceGates ?? []).map((gate) => (
            <View key={gate.parameterId} style={styles.sourceGateRow} testID={`request-estimate-source-gate-${gate.parameterId}`}>
              <Text style={styles.parameterLabel}>{gate.title}</Text>
              <Text style={styles.parameterMeta}>{gate.sourceRequirement}</Text>
            </View>
          ))}
        </View>
      ) : null}
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
      {dirtyCount === 0 && canContinueWithoutDocumentOnlyFields ? (
        <View style={styles.batchBar} testID="editable-param-preliminary-continue-bar">
          <Text style={styles.batchBarText}>
            Все данные, которые влияют на расчёт, уже сохранены. Номера чертежей и подтверждений можно добавить позже.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={this.continuePreliminaryCompilation}
            style={[styles.inlineParamButton, styles.inlineParamPrimaryButton]}
            testID="editable-param-preliminary-continue"
          >
            <Text style={styles.inlineParamPrimaryText}>Продолжить расчёт</Text>
          </Pressable>
        </View>
      ) : null}
      {latestDiff ? (
        <Text style={styles.successStatus} testID="request-estimate-parameter-apply-status">
          Параметры применены. Смета пересчитана. Документ и пакет закупки нужно пересоздать.
        </Text>
      ) : null}
      {cards.length === 0 ? (
        <Text style={styles.neutralStatus} testID="request-estimate-no-editable-parameters">
          {(this.props.viewModel?.sourceGates?.length ?? 0) > 0
            ? "Все данные, которые может указать заказчик, уже заполнены."
            : "Дополнительные пользовательские параметры для этой работы не требуются."}
        </Text>
      ) : null}
      {visibleMissingCards.length > 0 ? (
        <View style={styles.parameterGroup} testID="request-estimate-visible-missing-parameters">
          {visibleMissingCards.some((card) => card.clarificationTier === "critical") ? (
            <Text style={styles.groupTitle}>Критически необходимо уточнить</Text>
          ) : null}
          {visibleMissingCards.filter((card) => card.clarificationTier === "critical").map((card) => renderParameter(card, "Обязательный"))}
          {visibleMissingCards.some((card) => card.clarificationTier === "recommended") ? (
            <Text style={styles.groupTitle}>Рекомендуется уточнить</Text>
          ) : null}
          {visibleMissingCards.filter((card) => card.clarificationTier === "recommended").map((card) => renderParameter(card, "Для точности"))}
          {visibleMissingCards.some((card) => card.clarificationTier === "optional") ? (
            <Text style={styles.groupTitle}>Можно оставить допущением</Text>
          ) : null}
          {visibleMissingCards.filter((card) => card.clarificationTier === "optional").map((card) => renderParameter(card, "Необязательно"))}
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
          {filledCards.slice(0, 6).map((card) => renderParameter(card, ""))}
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
              {filledCards.slice(6).map((card) => renderParameter(card, ""))}
            </View>
          ) : null}
        </View>
      ) : null}
      {assumptionCards.length > 0 ? (
        <View style={styles.parameterGroup} testID="request-estimate-assumed-parameters">
          <Text style={styles.groupTitle}>Явные предварительные допущения</Text>
          {assumptionCards.map((card) => renderParameter(card, "Допущение"))}
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
              {derivedCards.map((card) => renderParameter(card, ""))}
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
  incompleteParameterCount,
  incompleteResolutionLabel,
  onResolveIncomplete,
  onDecrease,
  onIncrease,
  onQuantityChange,
  onUnitPriceChange,
  onSpecificationChange,
  onOptionalChange,
  onRemove,
  onAddManual,
  onAddPhotoMaterialRecognition,
  onOpenPhotoForEstimateItem,
  rowPhotoThumbnails,
  onAddCustom,
  onRestoreLastRemoved,
  canRestoreLastRemoved,
  onOpenCatalog,
  onSelectCatalogItem,
}: ItemEditorHandlers & {
  viewModel: RequestEstimateViewModel;
  incompleteParameterCount: number | null;
  incompleteResolutionLabel: string;
  onResolveIncomplete: () => void;
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
        showMaterialControl={false}
      />
      <RequestEstimateItemsEditor
        viewModel={viewModel}
        incompleteParameterCount={incompleteParameterCount}
        incompleteResolutionLabel={incompleteResolutionLabel}
        onResolveIncomplete={onResolveIncomplete}
        onAddManual={onAddManual}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        onQuantityChange={onQuantityChange}
        onUnitPriceChange={onUnitPriceChange}
        onSpecificationChange={onSpecificationChange}
        onOptionalChange={onOptionalChange}
        onRemove={onRemove}
        onOpenCatalog={onOpenCatalog}
        onSelectCatalogItem={onSelectCatalogItem}
        onOpenPhoto={onOpenPhotoForEstimateItem}
        showPhotoButtons={Boolean(onOpenPhotoForEstimateItem)}
        rowPhotoThumbnails={rowPhotoThumbnails}
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

type ConsumerRepairDraftQuickActionsProps = {
  onAddManual: (initialQuery?: string) => void;
  onAddPhotoMaterialRecognition?: () => void;
  onAddCustom: () => void;
  showMaterialControl?: boolean;
};

export class ConsumerRepairDraftQuickActions extends React.PureComponent<
  ConsumerRepairDraftQuickActionsProps,
  { materialQuery: string }
> {
  state = { materialQuery: "" };

  private setMaterialQuery = (materialQuery: string): void => {
    this.setState({ materialQuery });
  };

  private openMaterialSearch = (): void => {
    const query = this.state.materialQuery.trim();
    this.props.onAddManual(query || undefined);
  };

  render(): React.ReactElement {
    const {
      onAddPhotoMaterialRecognition,
      onAddCustom,
      showMaterialControl = true,
    } = this.props;
    return (
      <View style={styles.quickActions} testID="consumer-repair-draft-quick-actions">
        {showMaterialControl ? <View style={styles.materialSearchAddControl} testID="consumer-repair-material-search-add-control">
          <TextInput
            accessibilityLabel="Найти или добавить материал"
            onChangeText={this.setMaterialQuery}
            onSubmitEditing={this.openMaterialSearch}
            placeholder="Найти материал или ввести название"
            returnKeyType="search"
            style={styles.materialSearchAddInput}
            testID="consumer-repair-material-search-add-field"
            value={this.state.materialQuery}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Найти или добавить материал"
            onPress={this.openMaterialSearch}
            style={[styles.quickButton, styles.greenQuickButton, styles.materialSearchAddButton]}
            testID="consumer-repair-add-manual-item"
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.greenQuickText}>Материал +</Text>
          </Pressable>
        </View> : null}
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
  procurementPanel: {
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    backgroundColor: "#F0FDF4",
    padding: 12,
  },
  procurementRow: {
    gap: 3,
    borderTopWidth: 1,
    borderTopColor: "#D1FAE5",
    paddingTop: 9,
  },
  procurementTitle: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  procurementQuantity: {
    color: "#166534",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  procurementPrice: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
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
  sourceGateRow: {
    gap: 3,
    borderLeftWidth: 3,
    borderLeftColor: "#D97706",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 9,
    paddingVertical: 7,
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
  inlineParamDirtyHidden: {
    opacity: 0,
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
  materialSearchAddControl: {
    width: "100%",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  materialSearchAddInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  materialSearchAddButton: {
    height: 42,
    minHeight: 42,
    minWidth: 112,
    borderRadius: 0,
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
