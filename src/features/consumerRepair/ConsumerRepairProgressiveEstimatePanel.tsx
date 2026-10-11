import { Ionicons } from "@expo/vector-icons";
import { canonicalPublicEstimateRowNameRu } from '../../lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu';
import React from "react";
import {
  Keyboard,
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
import type { ConsumerRepairDraftRevisionParamBatchPatch, ConsumerRepairRequestItem } from "../../lib/consumerRequests";
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
import { canonicalArtifactPurchaseBalance, canonicalArtifactPurchaseRequirement } from "../../lib/estimate/backendPlatform/canonicalPersistedPurchaseBalance";
import { formatEstimateQuantityRu } from "../../lib/estimatePresentation/formatEstimateQuantityRu";
import { publicBoqDisplayNameRu } from "../../lib/estimate/publicBoqNaming";
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
import { requestEstimatePublicRevisionDiff } from './requestEstimateViewModel';
import { EstimateRevisionTimeline } from "../requests/components/EstimateRevisionTimeline";
import { EstimateRevisionDiff } from "../requests/components/EstimateRevisionDiff";
import { pickFileAny } from "../../lib/filePick";
import { logger } from "../../lib/logger";
import { safeJsonParseValue } from "../../lib/format";
import { getCanonicalEstimateCatalogItem, getCanonicalEstimateRevision } from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import { jubileeParameterGroups, jubileeParameterWording } from './consumerJubileeParameterPresentation';

const LEGACY_ASPHALT_WORK_ID = "asphalt_concrete_pavement";

type ItemEditorHandlers = {
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  pendingCanonicalRowEditCount?: number;
  canonicalRowEditsApplying?: boolean;
  onApplyCanonicalRowEdits?: () => boolean | void | Promise<boolean | void>;
  onCancelCanonicalRowEdits?: () => void;
  canonicalRowEditorResetKeys?: Readonly<Record<string, number>>;
  onSpecificationChange?: (itemId: string, value: string) => void;
  onOptionalChange?: (itemId: string, optional: boolean) => void;
  onRemove: (itemId: string) => void;
  onAddManual: (initialQuery?: string) => void;
  onAddPhotoMaterialRecognition?: () => void;
  onOpenPhotoForEstimateItem?: (itemId: string) => void;
  rowPhotoThumbnails?: Readonly<Record<string, string>>;
  rowPhotoAttachmentItemIds?: ReadonlySet<string>;
  onAddCustom: () => void;
  onRestoreLastRemoved?: () => void;
  canRestoreLastRemoved?: boolean;
  onOpenCatalog?: (itemId: string) => void;
  onSelectCatalogItem?: (item: CatalogItemPickerItem) => void;
};

export type ConsumerRepairParameterApplyResult = boolean | void | { status: "revision_opened" | "applied"; revisionId: string };

type ParameterHandlers = {
  onParameterDraftInteraction?: () => void;
  editingParam?: ConsumerRepairParamEditState;
  onOpenParamEditor?: (operation: UserParamPatchOperation, paramKey: string) => void;
  onSaveParamEdit?: (rawValue: string) => void;
  onCancelParamEdit?: () => void;
  onApplyParamPatch?: (operation: UserParamPatchOperation, paramKey: string, rawValue: string) => void;
  onApplyParamBatch?: (
    patches: ConsumerRepairDraftRevisionParamBatchPatch[],
  ) => ConsumerRepairParameterApplyResult | Promise<ConsumerRepairParameterApplyResult>;
};

type Props = ItemEditorHandlers & ParameterHandlers & {
  viewModel: RequestEstimateViewModel;
  revisionState: EstimateDraftRevisionState | null;
  currentRevision: EstimateDraftRevision | null;
  latestDiff: EstimateDraftRevisionDiff | null;
  canonicalParameterSession?: CanonicalParameterSession | null;
  canonicalParameterReadinessPending?: boolean;
  showPdfAction?: boolean;
  pdfOpenBusy?: boolean;
  onMakePdf?: () => void;
  onOpenProcurement?: () => void;
  onRefineCanonicalParameters?: () => void;
};

type ProgressivePanelState = {
  parametersOpen: boolean;
  parametersMounted: boolean;
  positionsOpen: boolean;
  procurementOpen: boolean;
};

function hasCurrentProcurementArtifact(revision: EstimateDraftRevision | null): boolean {
  return Boolean(
    revision?.artifacts.procurementArtifactId
    && revision.artifacts.procurementValidForRevisionId === revision.revisionId,
  );
}

function shouldOpenPositionsByDefault(props: Props): boolean {
  const preliminaryNeedCount = props.viewModel.preliminaryNeedCount;
  if (preliminaryNeedCount == null) return false;
  // When a row blocks confirmation, open the list immediately so the amber
  // notice and the "only unresolved" filter are visible without hunting.
  if (preliminaryNeedCount > 0) return true;
  return props.canonicalParameterSession?.status !== "BLOCKING_REQUIRED";
}

export type CanonicalProcurementPreviewRow = {
  rowId: string;
  titleRu: string;
  quantity: number | string | null;
  preliminary?: boolean;
  unit: string;
  unitPrice: number | null;
  currency: string;
  quantityDetails: string[];
};

export function buildCanonicalProcurementPreviewRows(
  revision: EstimateDraftRevision | null,
  items: readonly ConsumerRepairRequestItem[] = [],
): CanonicalProcurementPreviewRow[] {
  if (!revision) return [];
  const rows: CanonicalProcurementPreviewRow[] = revision.boq.rows
    .filter((row) => row.includedInProcurement)
    .map((row) => {
      const balance = canonicalArtifactPurchaseBalance({
        row_id: row.rowId, unit_id: row.unit,
        calculation_trace: { purchaseBalance: row.sourceParameters?.canonicalPurchaseBalance },
      });
      const quantityBasis = balance ? null : row.materialQuantity ?? canonicalMaterialQuantityBasisFromRow(row);
      const unit = formatEstimateUnitLabel(balance?.unitId ?? quantityBasis?.procurementUnit ?? row.unitLabel ?? row.unit);
      const orderScope = balance?.balanceScope === "new_order_vs_required_consumption";
      const quantityDetails = balance ? [
        `${orderScope ? balance.requirementBasis === "selected_supply_order" ? "Исходная потребность к заказу" : "Плановая потребность" : "Расход"}: ${formatEstimateQuantityRu(balance.netQuantity)} ${unit}`,
        ...(!orderScope ? [
          `В наличии: ${formatEstimateQuantityRu(balance.stock)} ${unit}`,
          `Сохраняемый резерв: ${formatEstimateQuantityRu(balance.reserve)} ${unit}`,
          `Остаток после расхода: ${formatEstimateQuantityRu(balance.remaining)} ${unit}`,
        ] : []),
        ...(balance.quantum ? [`Шаг поставки: ${formatEstimateQuantityRu(balance.quantum)} ${unit}`] : []),
      ] : quantityBasis ? [
        `Расход с учётом потерь: ${formatEstimateQuantityRu(quantityBasis.grossQuantity)} ${formatEstimateUnitLabel(quantityBasis.unit)}`,
        `Шаг поставки: ${formatEstimateQuantityRu(quantityBasis.procurementPackageSize)} ${unit}`,
      ] : [];
      return {
        rowId: row.rowId,
        titleRu: canonicalPublicEstimateRowNameRu({ rowId: row.rowId,
          titleRu: publicBoqDisplayNameRu({ sourceNameRu: row.titleRu, rowType: row.rowType }),
          manualTitleOverride: row.sourceParameters?.canonicalManualTitleOverride === true }),
        quantity: balance?.effectiveOrder ?? quantityBasis?.procurementQuantity ?? row.quantity,
        unit,
        unitPrice: row.unitPrice ?? null,
        currency: row.currency,
        quantityDetails,
      };
    });
  const includedIds = new Set(rows.map(row => row.rowId));
  for (const item of items) {
    const source = item.sourceParameters;
    if (source?.canonicalPreliminaryNeed !== true || source.includedInProcurement !== true
      || source.canonicalBackendRevisionId !== revision.revisionId) continue;
    const rowId = String(source.rowCode ?? item.id);
    if (includedIds.has(rowId)) continue;
    const requirement = canonicalArtifactPurchaseRequirement({ row_id: rowId, unit_id: item.unit,
      calculation_trace: { purchaseRequirementV1: source.canonicalPurchaseRequirement } });
    rows.push({ rowId, titleRu: canonicalPublicEstimateRowNameRu({ rowId, titleRu: item.titleRu,
      manualTitleOverride: source.canonicalManualTitleOverride === true }), quantity: item.quantity ?? null, preliminary: true,
      unit: formatEstimateUnitLabel(item.unit), unitPrice: item.unitPrice ?? null, currency: item.currency,
      quantityDetails: requirement ? [`${requirement.labelRu}: ${formatEstimateQuantityRu(requirement.quantity)} ${formatEstimateUnitLabel(requirement.unitId)}`] : [],
    });
    includedIds.add(rowId);
  }
  return rows;
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

let compactDisplayFormatter: Intl.NumberFormat | undefined;

function compactRuNumber(value: number): string {
  compactDisplayFormatter ??= new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 6,
    useGrouping: true,
  });
  return compactDisplayFormatter.format(value).replace(/[\u00a0\u202f]/gu, " ");
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
  const hasValidatedRange = Boolean(
    input.parameter?.normativeSource &&
    validation?.min != null &&
    validation?.max != null &&
    validation.max > validation.min
  );
  const validatedRange = hasValidatedRange
    ? `Допустимо: ${compactRuNumber(validation!.min!)}–${compactRuNumber(validation!.max!)}`
    : null;
  if (input.parameter?.source === "ASSUMED" && input.baselineDisplay.trim()) {
    return `Предварительно принято: ${input.baselineDisplay.trim()}${validatedRange ? ` · ${validatedRange.toLocaleLowerCase("ru-RU")}` : ""}`;
  }
  const guide = String(input.guideShortRu ?? "").trim();
  if (validatedRange) return `${validatedRange}. ${guide || 'Источник и область применения доступны по «i».'}`;

  const parameterId = input.parameter?.parameterId ?? "";
  const valueType = input.parameter?.valueType;
  const unit = String(input.unitLabel ?? input.parameter?.unit ?? "").trim();
  const constructionExample = canonicalConstructionParameterExample(parameterId);
  if (constructionExample) {
    return `${constructionExample} — укажите значение из проекта или спецификации, не применяйте пример как норму.`;
  }
  if (guide && !/^по проекту\.?$/iu.test(guide)) return guide;
  if (/(?:reference|drawing|schedule|confirmation|approval|certificate|document)(?:_|$)/iu.test(parameterId)) {
    return "Укажите документ или результат проверки, который подтверждает эти данные. Если их нет, оставьте поле для уточнения.";
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
  return "Введите конкретное значение из обмера, чертежа или спецификации; не указывайте наугад.";
}

function canonicalConstructionParameterExample(parameterId: string): string | null {
  const examples: Readonly<Record<string, string>> = {
    concrete_class: "Например: B25",
    watertightness: "Например: W6",
    frost_resistance: "Например: F150",
    mobility: "Например: П4 (P4)",
  };
  if (examples[parameterId]) return examples[parameterId];
  if (/(?:^|_)concrete_(?:strength_)?class(?:_|$)/iu.test(parameterId)) return "Например: B25";
  if (/(?:^|_)watertightness(?:_|$)/iu.test(parameterId)) return "Например: W6";
  if (/(?:^|_)frost_resistance(?:_|$)/iu.test(parameterId)) return "Например: F150";
  if (/(?:^|_)concrete_(?:mix_)?mobility(?:_|$)/iu.test(parameterId)) return "Например: П4 (P4)";
  return null;
}

function canonicalConsumerParameterSourceHint(
  parameter: CanonicalParameter | null | undefined,
  guideKind: AiEstimateParameterCard["guideKind"],
): string {
  const parameterId = parameter?.parameterId ?? "";
  const unit = parameter?.unit ?? "";
  if (/(?:worker|labor|man_hour|person_shift|crew).*(?:_h|hour|shift)?|(?:_worker_h|_labor_h)$/iu.test(parameterId)
    || unit === "man_hour" || unit === "person_shift") {
    return "из КРЕР/ППР";
  }
  if (/(?:machine|equipment|productivity|shift)/iu.test(parameterId)
    || unit === "machine_hour" || unit === "shift") {
    return "паспорт/ППР";
  }
  if (/(?:price|cost|tariff|quote)/iu.test(parameterId)) return "из КП/прайса";
  if (/(?:haul|route|delivery_distance|transport_distance)/iu.test(parameterId)) return "маршрут/КП";
  if (/(?:rate|consumption|coverage|yield)/iu.test(parameterId)) {
    return parameter?.normativeSource ? "норма по «i»" : "паспорт/проект";
  }
  if (/(?:area|volume|length|width|height|depth|thickness|diameter|dimension|perimeter|distance)/iu.test(parameterId)) {
    return "чертёж/обмер";
  }
  if (/(?:count|quantity|number|amount)/iu.test(parameterId)) return "проект/ведомость";
  if (guideKind === "MANUFACTURER_GUIDANCE") return "по паспорту";
  if (guideKind === "MEASUREMENT_RULE") return "чертёж/обмер";
  if (parameter?.normativeSource) return "источник по «i»";
  return "проект/ведомость";
}

export function canonicalConsumerParameterInlineGuide(input: {
  parameter: CanonicalParameter | null | undefined;
  baselineValue: string;
  guideKind?: AiEstimateParameterCard["guideKind"];
}): string {
  const baseline = input.baselineValue.trim();
  // Number("") is 0 in JavaScript. An empty reference must never be rendered
  // as a real zero norm in a construction input.
  const numericBaseline = baseline ? Number(baseline.replace(",", ".")) : Number.NaN;
  const displayBaseline = baseline && Number.isFinite(numericBaseline)
    ? compactRuNumber(numericBaseline)
    : baseline;
  // A filled value owns its own provenance. The immutable catalogue reference
  // is consulted only while the field itself is still missing.
  const guideSource = input.parameter?.value != null
    ? input.parameter.source
    : input.parameter?.referenceSource ?? input.parameter?.source;
  if (displayBaseline) {
    if (guideSource === "NORMATIVE_DERIVED"
      && input.parameter?.normativeSource
      && input.guideKind === "MANUFACTURER_GUIDANCE") {
      return `паспорт ${displayBaseline}`;
    }
    if (guideSource === "ASSUMED") return `принято ${displayBaseline}`;
    if (guideSource === "CALCULATED") return `расчёт ${displayBaseline}`;
    if (guideSource === "NORMATIVE_DERIVED" && (!Number.isFinite(numericBaseline) || numericBaseline > 0)) {
      return `норма ${displayBaseline}`;
    }
  }
  if (input.guideKind === "MEASUREMENT_RULE") {
    return canonicalConsumerParameterSourceHint(input.parameter, input.guideKind);
  }
  if (input.parameter?.source === "TEXT_EXTRACTED" || input.parameter?.source === "USER_EXPLICIT") {
    return "по данным объекта";
  }
  return canonicalConsumerParameterSourceHint(input.parameter, input.guideKind);
}

export function canonicalConsumerEditableFieldValue(input: {
  cardValue: AiEstimateParameterCard["value"];
  revisionValue?: EstimateDraftRevision["params"][string]["value"];
  parameter?: CanonicalParameter | null;
}): string {
  const displayedValue = input.revisionValue ?? input.cardValue;
  // Application-calculated/profile values are real active inputs. Keep them
  // visibly filled and editable; provenance is shown beside the field.
  return displayedValue == null ? "" : String(displayedValue);
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
    parametersMounted: false,
    positionsOpen: shouldOpenPositionsByDefault(this.props),
    // Artifact binding can move the draft panel between screen slots and
    // remount this component. Keep procurement available, but do not let it
    // replace a complete detailed BOQ as the default projection.
    procurementOpen:
      hasCurrentProcurementArtifact(this.props.currentRevision)
      && !shouldOpenPositionsByDefault(this.props),
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
    if (
      currentProcurementReady
      && !previousProcurementReady
      && !this.state.procurementOpen
      && !this.state.positionsOpen
    ) {
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
    // Retain draft values, not native focus on a now-hidden input. Otherwise
    // Android can reopen the keyboard when the retained editor is revealed.
    if (!parametersOpen) Keyboard.dismiss();
    this.setState({ parametersOpen, parametersMounted: true }, () => {
      if (parametersOpen) this.props.onRefineCanonicalParameters?.();
    });
  };

  private togglePositions = () => {
    this.setState((state) => ({
      positionsOpen: !state.positionsOpen,
      procurementOpen: state.positionsOpen ? state.procurementOpen : false,
    }));
  };

  private openProcurement = () => {
    this.setState({ procurementOpen: true, positionsOpen: false });
    this.props.onOpenProcurement?.();
  };

  private openIncompleteRequirements = () => {
    this.setState({ parametersOpen: true, parametersMounted: true, positionsOpen: false }, () => {
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
      pdfOpenBusy = false,
      onMakePdf,
      onOpenProcurement,
      onDecrease,
      onIncrease,
      onQuantityChange,
      onUnitPriceChange,
      pendingCanonicalRowEditCount,
      canonicalRowEditsApplying,
      onApplyCanonicalRowEdits,
      onCancelCanonicalRowEdits,
      canonicalRowEditorResetKeys,
      onSpecificationChange,
      onOptionalChange,
      onRemove,
      onAddManual,
      onAddPhotoMaterialRecognition,
      onOpenPhotoForEstimateItem,
      rowPhotoThumbnails,
      rowPhotoAttachmentItemIds,
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
      onParameterDraftInteraction,
    } = this.props;
    const { parametersOpen, positionsOpen, procurementOpen } = this.state;
    const procurementRows = buildCanonicalProcurementPreviewRows(currentRevision, viewModel.sections.flatMap(section => section.items));
    const editableMissingCount = canonicalParameterSession
      ? consumerRepairCanonicalMissingParameterCount(canonicalParameterSession)
      : 0;
    const sourceGateCount = viewModel.sourceGates?.length ?? 0;
    const count: number | undefined = canonicalParameterSession
      ? editableMissingCount
      : canonicalParameterReadinessPending
        ? undefined
        : missingParameterCount(currentRevision, viewModel.assumptionRows.length);
    const paramEditorEnabled = Boolean(onApplyParamBatch || (onApplyParamPatch && onOpenParamEditor && onSaveParamEdit && onCancelParamEdit));

    return (
    <View style={styles.wrap}>
      <RequestEstimateSummaryCard viewModel={viewModel} missingParameterCount={count}
        contentWithdrawalReasonRu={canonicalParameterSession?.contentWithdrawalReasonRu} />
      <EstimateRevisionTimeline state={this.props.revisionState}
        procurementPending={(viewModel.preliminaryProcurementNeedCount ?? 0) > 0} />
      <EstimateRevisionDiff
        diff={requestEstimatePublicRevisionDiff(this.props.revisionState,latestDiff)}
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
                ? 'Данные расчёта'
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
            accessibilityLabel={pdfOpenBusy ? "Открываем PDF" : "Сделать PDF"}
            accessibilityState={{ busy: pdfOpenBusy, disabled: pdfOpenBusy }}
            disabled={pdfOpenBusy}
            onPress={onMakePdf}
            style={styles.actionButton}
            testID="consumer-estimate-make-pdf"
          >
            <Ionicons name="document-text-outline" size={16} color="#334155" />
            <Text style={styles.actionButtonText}>
              {pdfOpenBusy ? "Открываем PDF…" : "PDF"}
            </Text>
          </Pressable>
        ) : null}
        {procurementRows.length > 0 && onOpenProcurement ? (
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
              {`${procurementRows.length} ${pluralizeRu(procurementRows.length, "позиция", "позиции", "позиций")} · текущий расчёт`}
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
                {row.quantity == null ? "Точный заказ требует уточнения"
                  : `${row.preliminary ? "Заказ требует подтверждения" : "К закупке"}: ${formatEstimateQuantityRu(row.quantity)} ${row.unit}`}
              </Text>
              {row.quantityDetails.map((detail, index) => (
                <Text key={index} style={styles.procurementPrice}>{detail}</Text>
              ))}
              <Text style={styles.procurementPrice}>
                {row.unitPrice == null
                  ? "Цена не заполнена"
                  : `${compactRuNumber(row.unitPrice)} ${row.currency} за ${row.unit}`}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {this.state.parametersMounted ? (
        <View
          testID="request-estimate-parameter-editor-surface"
          style={parametersOpen ? undefined : { display: "none" }}
          pointerEvents={parametersOpen ? "auto" : "none"}
          accessibilityElementsHidden={!parametersOpen}
          importantForAccessibility={parametersOpen ? "auto" : "no-hide-descendants"}
        >
        <RetainedParameterDisclosurePanel
          viewModel={viewModel}
          revision={currentRevision}
          canonicalParameterSession={canonicalParameterSession}
          canonicalParameterReadinessPending={canonicalParameterReadinessPending}
          latestDiff={latestDiff}
          paramEditorEnabled={paramEditorEnabled}
          editingParam={editingParam}
          onOpenParamEditor={onOpenParamEditor}
          onSaveParamEdit={onSaveParamEdit}
          onCancelParamEdit={onCancelParamEdit}
          onApplyParamBatch={onApplyParamBatch}
          onParameterDraftInteraction={onParameterDraftInteraction}
        />
        </View>
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
          pendingCanonicalRowEditCount={pendingCanonicalRowEditCount}
          canonicalRowEditsApplying={canonicalRowEditsApplying}
          onApplyCanonicalRowEdits={onApplyCanonicalRowEdits}
          onCancelCanonicalRowEdits={onCancelCanonicalRowEdits}
          canonicalRowEditorResetKeys={canonicalRowEditorResetKeys}
          onSpecificationChange={onSpecificationChange}
          onOptionalChange={onOptionalChange}
          onRemove={onRemove}
          onAddManual={onAddManual}
          onAddPhotoMaterialRecognition={onAddPhotoMaterialRecognition}
          onOpenPhotoForEstimateItem={onOpenPhotoForEstimateItem}
          rowPhotoThumbnails={rowPhotoThumbnails}
          rowPhotoAttachmentItemIds={rowPhotoAttachmentItemIds}
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
  onParameterDraftInteraction?: () => void;
  viewModel: RequestEstimateViewModel | null;
  revision: EstimateDraftRevision | null;
  canonicalParameterSession?: CanonicalParameterSession | null;
  canonicalParameterReadinessPending?: boolean;
  latestDiff: EstimateDraftRevisionDiff | null;
  paramEditorEnabled: boolean;
  editingParam?: ConsumerRepairParamEditState;
  onOpenParamEditor?: (operation: UserParamPatchOperation, paramKey: string) => void;
  onSaveParamEdit?: (rawValue: string) => void;
  onCancelParamEdit?: () => void;
  onApplyParamBatch?: (
    patches: ConsumerRepairDraftRevisionParamBatchPatch[],
  ) => ConsumerRepairParameterApplyResult | Promise<ConsumerRepairParameterApplyResult>;
};

// Canonical cards are driven by the immutable session/revision, not BOQ row
// previews. Keep a retained form out of unrelated row renders, while always
// admitting changed source gates, callbacks, revision/session or editor state.
const RetainedParameterDisclosurePanel = React.memo(
  function RetainedParameterDisclosurePanel(props: ParameterDisclosurePanelProps) {
    return <ParameterDisclosurePanel {...props} />;
  },
  (previous, next) => {
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)] as (keyof ParameterDisclosurePanelProps)[]);
    if ([...keys].some(key => key !== "viewModel" && !Object.is(previous[key], next[key]))) return false;
    if (!next.canonicalParameterSession) return previous.viewModel === next.viewModel;
    const before = previous.viewModel?.sourceGates ?? [];
    const after = next.viewModel?.sourceGates ?? [];
    return before.length === after.length && before.every((gate, index) => {
      const current = after[index]!;
      const gateKeys = new Set([...Object.keys(gate), ...Object.keys(current)] as (keyof typeof gate)[]);
      return [...gateKeys].every(key => Object.is(gate[key], current[key]));
    });
  },
);

type ParameterCardProjection = {
  revision: EstimateDraftRevision | null;
  session: CanonicalParameterSession | null;
  legacyViewModel: RequestEstimateViewModel | null;
  cards: AiEstimateParameterCard[];
};

type ParameterDisclosurePanelState = {
  compositionRefresh: { revisionId: string; catalogId: string; sourceReleaseId: string; targetReleaseId: string } | null;
  showAllMissing: boolean;
  sourceDetailsOpen: boolean;
  automaticDetailsOpen: boolean;
  advancedDetailsOpen: boolean;
  foundationDetailsOpen: boolean;
  procurementDetailsOpen: boolean;
  filledOpen: boolean;
  derivedOpen: boolean;
  draftValues: Record<string, string>;
  baselineValues: Record<string, string>;
  baselinePlacements: Record<string, Pick<AiEstimateParameterCard, "missing" | "source">>;
  draftRevisionId: string | null;
  draftSignature: string;
  validationErrors: Record<string, string>;
  explicitlyConfirmedMissingValues: Record<string, true>;
  expandedGuideDetails: Record<string, true>;
  applyState: "idle" | "pending" | "success" | "error" | "revision_opened";
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
  embeddedGuideRu?: string;
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
    const { paramKey, label, inputKind, value, unitLabel, dirty, error, hint, choices, guideShortRu, embeddedGuideRu, structuredGroup, clarificationControl, onChange } = this.props;
    const keyboardType = inputKind === "number" ? "decimal-pad" : "default";
    const compositeItems = this.compositeItems();
    const compactScalar = !structuredGroup
      && clarificationControl !== "file_upload"
      && (!choices || choices.length === 0)
      && inputKind === "number";

    return (
      <View
        style={[styles.inlineParamEditor, compactScalar ? styles.inlineParamEditorCompact : null]}
        testID={`editable-param-inline-editor-${paramKey}`}
      >
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
                      {field.choices.length > 0 ? <View style={styles.batchActions}>{field.choices.map((choice) => <Pressable key={choice.value} onPress={() => this.updateCompositeField(item.itemId, field.key, choice.value)} style={[styles.inlineParamButton, styles.inlineParamChoiceButton, fieldValue === choice.value ? styles.inlineParamPrimaryButton : null]}><Text style={[fieldValue === choice.value ? styles.inlineParamPrimaryText : styles.inlineParamButtonText, styles.inlineParamChoiceText]}>{choice.labelRu}</Text></Pressable>)}</View> : <TextInput
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
                  style={[styles.inlineParamButton, styles.inlineParamChoiceButton, value === choice.value ? styles.inlineParamPrimaryButton : null]}
                  testID={`editable-param-option-${paramKey}-${choice.value}`}
                >
                  <Text style={[value === choice.value ? styles.inlineParamPrimaryText : styles.inlineParamButtonText, styles.inlineParamChoiceText]}>
                    {choice.labelRu}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={compactScalar ? styles.inlineParamInputShell : null}>
              <TextInput
                value={value}
                importantForAutofill="no"
                onChangeText={(nextValue) => onChange(paramKey, nextValue)}
                onFocus={() => this.focusControl(paramKey)}
                onBlur={() => this.blurControl(paramKey)}
                onSelectionChange={(event) => this.rememberSelection(paramKey, event)}
                keyboardType={keyboardType}
                placeholder={value.trim() ? undefined : embeddedGuideRu ? "Введите" : guideShortRu}
                placeholderTextColor="#64748B"
                accessibilityLabel={label}
                accessibilityHint={`${guideShortRu}${unitLabel ? `, ${unitLabel}` : ""}`}
                selection={this.activeSelection(paramKey)}
                style={[styles.inlineParamInput, compactScalar ? styles.inlineParamInputCompact : null]}
                testID="editable-param-popover-input"
              />
              {compactScalar && embeddedGuideRu ? (
                <Text
                  numberOfLines={1}
                  pointerEvents="none"
                  style={styles.inlineParamEmbeddedGuide}
                  testID={`editable-param-inline-guide-${paramKey}`}
                >
                  {embeddedGuideRu}
                </Text>
              ) : null}
            </View>
          )}
          {!structuredGroup && !compactScalar && guideShortRu ? (
            <Text style={styles.inlineGuideChip} testID={`editable-param-guide-${paramKey}`}>
              {guideShortRu}
            </Text>
          ) : null}
          {!compactScalar && hint ? <Text style={styles.parameterMeta}>{hint}</Text> : null}
          {dirty ? (
            <Text style={styles.inlineParamDirty} testID={`editable-param-dirty-${paramKey}`}>
              Изменено
            </Text>
          ) : null}
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
  private compositionRefreshGeneration = 0;
  private compositionRefreshDisposed = false;
  private submittedDraftValues: Record<string, string> | null = null;
  private submittedDirtyKeys: string[] | null = null;
  private submittedParentRevisionId: string | null = null;
  private applyingDraftParameters: symbol | null = null;
  private draftInteractionGeneration = 0;
  // Only the current baseline/preview; never retain revision history or cache
  // compiler/admission results. New immutable inputs invalidate immediately.
  private baselineCardProjection: ParameterCardProjection | null = null;
  private previewCardProjection: ParameterCardProjection | null = null;
  private sessionPreview: {
    session: CanonicalParameterSession | null;
    draftValues: Record<string, string>;
    value: CanonicalParameterSession | null;
  } | null = null;

  state: ParameterDisclosurePanelState = {
    compositionRefresh: null,
    showAllMissing: false,
    sourceDetailsOpen: false,
    automaticDetailsOpen: false,
    advancedDetailsOpen: false,
    foundationDetailsOpen: false,
    procurementDetailsOpen: false,
    filledOpen: false,
    derivedOpen: false,
    draftValues: {},
    baselineValues: {},
    baselinePlacements: {},
    draftRevisionId: null,
    draftSignature: "",
    validationErrors: {},
    explicitlyConfirmedMissingValues: {},
    expandedGuideDetails: {},
    applyState: "idle",
  };

  componentDidMount(): void {
    void this.checkCompositionRefresh();
    if (this.props.canonicalParameterReadinessPending) return;
    this.syncDraftFromProps();
  }

  componentDidUpdate(prevProps: ParameterDisclosurePanelProps): void {
    if (prevProps.revision?.revisionId !== this.props.revision?.revisionId
      || prevProps.canonicalParameterSession?.workPassportId !== this.props.canonicalParameterSession?.workPassportId
      || prevProps.canonicalParameterReadinessPending !== this.props.canonicalParameterReadinessPending) {
      void this.checkCompositionRefresh();
    }
    // Metadata can arrive after the saved BOQ. Wait for the actual schema before
    // creating a baseline or rebasing retained user input onto a new revision.
    if (this.props.canonicalParameterReadinessPending) return;
    const nextDraftSignature = this.draftSignature(this.buildBaselineCards());
    const revisionChanged =
      prevProps.revision?.revisionId !== this.props.revision?.revisionId
      || (prevProps.canonicalParameterReadinessPending === true
        && this.state.draftRevisionId !== (this.props.revision?.revisionId ?? null));
    const canonicalSessionChanged =
      prevProps.canonicalParameterSession !== this.props.canonicalParameterSession;
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
            (key) => {
              const submitted = this.submittedDraftValues?.[key] ?? "";
              if ((this.state.draftValues[key] ?? "") !== submitted) return true;
              if (!this.submittedDirtyKeys?.includes(key)) return false;
              const card = this.buildBaselineCards().find(candidate => candidate.key === key);
              const saved = card ? this.valueForCard(card) : "";
              const numeric = this.props.canonicalParameterSession?.parameters.find(parameter => parameter.parameterId === key)?.valueType === "number";
              return numeric && saved.trim() && submitted.trim()
                ? Number(saved.replace(",", ".")) !== Number(submitted.replace(",", "."))
                : saved !== submitted;
            },
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
      return;
    }
    this.registerNewlyVisibleCards();
  }

  componentWillUnmount(): void {
    this.compositionRefreshDisposed = true;
    this.compositionRefreshGeneration += 1;
  }

  private checkCompositionRefresh = async (): Promise<void> => {
    const revisionId = this.props.revision?.revisionId;
    const catalogId = this.props.canonicalParameterSession?.workPassportId;
    const generation = ++this.compositionRefreshGeneration;
    if (this.refreshingSavedComposition || (this.applyingDraftParameters && this.state.applyState === "pending")) {
      this.refreshingSavedComposition = null;
      this.setState({ applyState: "idle" });
    }
    if (this.state.compositionRefresh) this.setState({ compositionRefresh: null });
    if (this.props.canonicalParameterReadinessPending || !catalogId || !revisionId
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(revisionId)) return;
    try {
      const revision = await getCanonicalEstimateRevision(revisionId);
      if (revision.revisionId !== revisionId || revision.catalogId !== catalogId) return;
      const catalog = await getCanonicalEstimateCatalogItem(catalogId);
      if (this.compositionRefreshDisposed || generation !== this.compositionRefreshGeneration
        || this.props.revision?.revisionId !== revisionId
        || this.props.canonicalParameterSession?.workPassportId !== catalogId
        || catalog.catalogId !== catalogId) return;
      this.setState({ compositionRefresh: { revisionId, catalogId, sourceReleaseId: revision.releaseId, targetReleaseId: catalog.releaseId } });
    } catch {
      // An unavailable current release cannot offer a safe composition update.
      // Reading/editing the immutable saved revision stays independent.
    }
  };

  private hasCompositionRefresh(): boolean {
    const checked = this.state.compositionRefresh;
    return Boolean(checked && checked.revisionId === this.props.revision?.revisionId
      && checked.catalogId === this.props.canonicalParameterSession?.workPassportId
      && checked.sourceReleaseId !== checked.targetReleaseId);
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
    const session = this.props.canonicalParameterSession ?? null;
    if (this.sessionPreview?.session === session && this.sessionPreview.draftValues === this.state.draftValues) {
      return this.sessionPreview.value;
    }
    const value = buildConsumerRepairCanonicalSessionPreview({
      session,
      draftValues: this.state.draftValues,
    });
    this.sessionPreview = { session, draftValues: this.state.draftValues, value };
    return value;
  }

  private cardProjection(session: CanonicalParameterSession | null, previous: ParameterCardProjection | null): ParameterCardProjection {
    const legacyViewModel = session ? null : this.props.viewModel;
    if (previous?.revision === this.props.revision && previous.session === session && previous.legacyViewModel === legacyViewModel) return previous;
    return {
      revision: this.props.revision,
      session,
      legacyViewModel,
      cards: buildConsumerRepairProgressiveParameterCards({
        revision: this.props.revision,
        viewModel: this.props.viewModel,
        canonicalParameterSession: session,
      }),
    };
  }

  private buildBaselineCards(): AiEstimateParameterCard[] {
    const next = this.cardProjection(this.props.canonicalParameterSession ?? null, this.baselineCardProjection);
    if (next !== this.baselineCardProjection) this.previewCardProjection = null;
    this.baselineCardProjection = next;
    return this.baselineCardProjection.cards;
  }

  private buildCards(): AiEstimateParameterCard[] {
    const session = this.editableCanonicalParameterSession();
    if (session === (this.props.canonicalParameterSession ?? null)) return this.buildBaselineCards();
    this.previewCardProjection = this.cardProjection(session, this.previewCardProjection);
    return this.previewCardProjection.cards;
  }

  private valueForCard(card: AiEstimateParameterCard): string {
    const currentValue = this.props.revision?.params[card.key]?.value;
    const canonicalParameter = this.props.canonicalParameterSession?.parameters.find(
      (parameter) => parameter.parameterId === card.key,
    ) ?? this.props.canonicalParameterSession?.inactiveConditionalParameters?.find(
      (parameter) => parameter.parameterId === card.key,
    );
    return canonicalConsumerEditableFieldValue({
      // A newly activated card may already be part of the edited preview.
      // Its original value belongs to the saved active/inactive session.
      cardValue: canonicalParameter ? canonicalParameter.value : card.value,
      revisionValue: currentValue,
      parameter: canonicalParameter,
    });
  }

  private draftSignature(cards: AiEstimateParameterCard[]): string {
    return cards
      .map((card) => `${card.key}:${this.valueForCard(card)}`)
      .join("|");
  }

  private rebaseDraftOnCurrentRevision(preserveKeys: string[]): void {
    // An old unsaved preview must not become the new revision's baseline.
    const cards = this.buildBaselineCards();
    const baselineValues = Object.fromEntries(cards.map((card) => [card.key, this.valueForCard(card)]));
    // A consent-only source transition can save the old supply branch while
    // the user still has edits in a newly activated branch. Keep those inputs
    // only if the NEW persisted session still owns their editable parameters;
    // their baseline comes from saved active/inactive values, never the preview.
    const session = this.props.canonicalParameterSession;
    const eligible = new Map([...(session?.parameters ?? []), ...(session?.inactiveConditionalParameters ?? [])]
      .filter(parameter => parameter.source !== 'CALCULATED' && parameter.consumerInputRole !== 'APPLICATION_TECHNICAL')
      .map(parameter => [parameter.parameterId, parameter]));
    for (const key of preserveKeys) {
      const parameter = eligible.get(key);
      if (parameter && !Object.hasOwn(baselineValues, key)) {
        baselineValues[key] = canonicalConsumerEditableFieldValue({ cardValue: parameter.value,
          revisionValue: this.props.revision?.params[key]?.value, parameter });
      }
    }
    const preservedValues = Object.fromEntries(
      preserveKeys
        .filter((key) => Object.prototype.hasOwnProperty.call(baselineValues, key))
        .map((key) => [key, this.state.draftValues[key] ?? ""]),
    );
    this.submittedDraftValues = null;
    this.submittedDirtyKeys = null;
    this.submittedParentRevisionId = null;
    this.setState({
      draftValues: { ...baselineValues, ...preservedValues },
      baselineValues,
      baselinePlacements: Object.fromEntries(cards.map(card => [card.key, { missing: card.missing, source: card.source }])),
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

  private baselineValueForCard(card: AiEstimateParameterCard): string {
    return this.state.baselineValues[card.key] ?? this.valueForCard(card);
  }

  private registerNewlyVisibleCards(): void {
    const cards = this.buildCards().filter(card =>
      !Object.prototype.hasOwnProperty.call(this.state.baselineValues, card.key));
    if (cards.length === 0) return;
    // Register the branch's controls before their first input event. Retain
    // their first visible group as well as the original saved values, including
    // empty required fields; neither comes from a later edited preview.
    const values = Object.fromEntries(cards.map(card => [card.key, this.valueForCard(card)]));
    const placements = Object.fromEntries(cards.map(card => [card.key, { missing: card.missing, source: card.source }]));
    this.setState(state => ({
      baselineValues: { ...state.baselineValues, ...values },
      draftValues: { ...values, ...state.draftValues },
      baselinePlacements: { ...state.baselinePlacements, ...placements },
    }));
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
    if (this.props.canonicalParameterReadinessPending) return;
    this.props.onParameterDraftInteraction?.();
    this.refreshingSavedComposition = null;
    this.applyingDraftParameters = null;
    this.draftInteractionGeneration += 1;
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
      applyState: "idle",
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
    this.refreshingSavedComposition = null;
    this.applyingDraftParameters = null;
    this.draftInteractionGeneration += 1;
    this.submittedDraftValues = null;
    this.submittedDirtyKeys = null;
    this.submittedParentRevisionId = null;
    this.setState({
      draftValues: { ...this.state.baselineValues },
      validationErrors: {},
      explicitlyConfirmedMissingValues: {},
      applyState: "idle",
    });
  };

  private applyDraftChanges = (): void => {
    if (this.props.canonicalParameterReadinessPending) return;
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
            ? "допустимый диапазон ввода"
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
    this.submittedDirtyKeys = [...dirtyKeys];
    this.submittedParentRevisionId = this.props.revision?.revisionId ?? this.state.draftRevisionId;
    const parentRevisionId = this.props.revision?.revisionId;
    const catalogId = this.props.canonicalParameterSession?.workPassportId;
    const apply = this.props.onApplyParamBatch;
    const generation = this.compositionRefreshGeneration;
    const operation = Symbol("parameter-apply");
    this.draftInteractionGeneration += 1;
    this.applyingDraftParameters = operation;
    const complete = (result: ConsumerRepairParameterApplyResult) => {
      if (this.compositionRefreshDisposed || this.applyingDraftParameters !== operation
        || this.props.canonicalParameterReadinessPending || this.props.onApplyParamBatch !== apply
        || this.props.canonicalParameterSession?.workPassportId !== catalogId) return;
      const exactChild = result && typeof result === "object" && result.revisionId === this.props.revision?.revisionId
        && generation + 1 === this.compositionRefreshGeneration
        && parentRevisionId != null && this.props.revision?.previousRevisionId === parentRevisionId;
      const sameParent = this.props.revision?.revisionId === parentRevisionId && generation === this.compositionRefreshGeneration;
      if (!sameParent && !exactChild) return;
      this.setState({ applyState: this.parameterApplyState(result) });
    };
    this.setState({ applyState: "pending" });
    try {
      const result = apply?.(patches);
      if (result && typeof (result as Promise<ConsumerRepairParameterApplyResult>).then === "function") {
        void (result as Promise<ConsumerRepairParameterApplyResult>).then(
          complete,
          () => complete(false),
        ).finally(() => { if (this.applyingDraftParameters === operation) this.applyingDraftParameters = null; });
      } else {
        complete(result as ConsumerRepairParameterApplyResult);
        if (this.applyingDraftParameters === operation) this.applyingDraftParameters = null;
      }
    } catch {
      complete(false);
      if (this.applyingDraftParameters === operation) this.applyingDraftParameters = null;
    }
  }

  private parameterApplyState(result: ConsumerRepairParameterApplyResult): ParameterDisclosurePanelState["applyState"] {
    return result === false ? "error" : result && typeof result === "object" && result.status === "revision_opened" ? "revision_opened" : "success";
  }

  private continuePreliminaryCompilation = (): void => {
    if (this.props.canonicalParameterReadinessPending) return;
    logger.info("ConsumerRepairParameterApplyClick", JSON.stringify({
      result: "submitted_without_document_only_fields",
      patchCount: 0,
    }));
    this.props.onApplyParamBatch?.([]);
  };

  private refreshingSavedComposition: symbol | null = null;
  private refreshSavedComposition = async (): Promise<void> => {
    if (this.props.canonicalParameterReadinessPending
      || this.refreshingSavedComposition || this.state.applyState === "pending"
      || this.dirtyKeys().length > 0 || !this.props.revision || !this.props.onApplyParamBatch
      || !this.hasCompositionRefresh()) return;
    const checked = this.state.compositionRefresh!;
    const generation = this.compositionRefreshGeneration;
    const interactionGeneration = this.draftInteractionGeneration;
    const apply = this.props.onApplyParamBatch;
    const operation = Symbol("saved-composition-refresh");
    const sameSource = () => !this.compositionRefreshDisposed
      && this.refreshingSavedComposition === operation
      && !this.props.canonicalParameterReadinessPending
      && generation === this.compositionRefreshGeneration
      && this.props.revision?.revisionId === checked.revisionId
      && this.props.canonicalParameterSession?.workPassportId === checked.catalogId
      && this.props.onApplyParamBatch === apply;
    this.refreshingSavedComposition = operation;
    this.setState({ applyState: "pending" });
    try {
      const catalog = await getCanonicalEstimateCatalogItem(checked.catalogId);
      if (!sameSource()) return;
      if (this.dirtyKeys().length > 0 || catalog.catalogId !== checked.catalogId) {
        this.setState({ applyState: "idle" }); return;
      }
      if (catalog.releaseId === checked.sourceReleaseId) {
        this.setState({ compositionRefresh: { ...checked, targetReleaseId: catalog.releaseId }, applyState: "idle" });
        return;
      }
      const applied = await apply([]);
      // A successful screen replacement changes the source and clears the old
      // refresh token. Admit only the exact named child from this one transition.
      const exactOpenedChild = applied && typeof applied === "object"
        && !this.compositionRefreshDisposed && !this.props.canonicalParameterReadinessPending
        && generation + 1 === this.compositionRefreshGeneration
        && interactionGeneration === this.draftInteractionGeneration
        && this.refreshingSavedComposition === null && this.applyingDraftParameters === null
        && this.state.applyState === "idle" && this.dirtyKeys().length === 0
        && this.props.onApplyParamBatch === apply
        && this.props.canonicalParameterSession?.workPassportId === checked.catalogId
        && this.props.revision?.revisionId === applied.revisionId
        && this.props.revision?.previousRevisionId === checked.revisionId;
      if (sameSource() || exactOpenedChild) this.setState({ applyState: this.parameterApplyState(applied) });
    } catch {
      if (sameSource()) this.setState({ applyState: "error" });
    } finally {
      if (this.refreshingSavedComposition === operation) this.refreshingSavedComposition = null;
    }
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
    const canonicalParameter = this.editableCanonicalParameterSession()?.parameters.find(
      (parameter) => parameter.parameterId === card.key,
    );
    const baseline = canonicalParameter?.referenceValue == null
      ? this.baselineValueForCard(card)
      : String(canonicalParameter.referenceValue);
    const isDirty = isConsumerRepairParameterExplicitlyDirty({
      baselineValue: baseline,
      draftValue: rawValue,
      explicitlyConfirmedMissingValue: this.state.explicitlyConfirmedMissingValues[card.key] === true,
    });
    const meta = card.missing ? card.requiredForLabelRu : card.displayValueRu;
    const hasValidNormRange = Boolean(
      canonicalParameter?.normativeSource &&
      canonicalParameter.validation.min != null &&
      canonicalParameter.validation.max != null &&
      canonicalParameter.validation.max > canonicalParameter.validation.min
    );
    const validationHint = canonicalParameter?.valueType === "number" && hasValidNormRange
      ? `Допустимый диапазон ввода: ${canonicalNumericInputRule({
        ...canonicalParameter.validation,
        unit: card.unitRu,
      })}.`
      : undefined;
    const editableInPlace = paramEditorEnabled && card.editable;
    const guideExpanded = this.state.expandedGuideDetails[card.key] === true;
    const editorValue = rawValue;
    const wording = jubileeParameterWording(this.props.canonicalParameterSession?.workPassportId, card.key);
    const label = wording?.label ?? card.labelRu;
    const placeholder = canonicalConsumerParameterPlaceholder({
      parameter: canonicalParameter,
      baselineDisplay: meta,
      guideShortRu: wording?.guide ?? card.guideShortRu,
      unitLabel: card.unitRu,
    });
    const applicationValueStatus = card.missing
      ? null
      : card.source === "catalog_default"
        ? `Приложение рассчитало или подставило: ${meta}. Поле можно изменить.`
        : card.source === "formula_derived"
          ? card.editable
            ? `Рассчитано приложением: ${meta}. Поле можно изменить.`
            : `Рассчитано приложением: ${meta}. Измените исходные данные или количество позиции.`
          : null;

    return (
      <View key={card.key} style={[styles.parameterRow, card.missing ? styles.requiredParameterRow : null]} testID={`editable-param-chip-${card.key}`}>
        {card.missing ? <Text style={styles.requiredParameterHint}>
          {rawValue.trim() ? 'Проверьте значение и нажмите «Применить»' : 'Нужно заполнить'}
        </Text> : null}
        <View style={styles.compactParameterLine}>
          <Text
            style={styles.parameterLabel}
            testID={card.missing ? `request-estimate-missing-param-${card.key}` : undefined}
          >
            {`${wording ? '' : `№ ${parameterOrdinal}. `}${label}`}{card.missing && actionLabel ? " *" : ""}
          </Text>
          {editableInPlace ? (
            <InlineParamEditor
              paramKey={card.key}
              label={label}
              inputKind={card.inputKind}
              value={editorValue}
              unitLabel={card.unitRu}
              dirty={isDirty}
              error={this.state.validationErrors[card.key]}
              hint={validationHint}
              choices={card.choices}
              guideShortRu={placeholder}
              embeddedGuideRu={wording?.source ?? canonicalConsumerParameterInlineGuide({
                parameter: canonicalParameter,
                baselineValue: baseline,
                guideKind: card.guideKind,
              })}
              structuredGroup={card.structuredGroup}
              clarificationControl={card.clarificationControl}
              onChange={this.changeDraftValue}
            />
          ) : <Text style={styles.parameterMeta}>{meta}</Text>}
          {card.unitRu ? <Text style={styles.compactParameterUnit}>{card.unitRu}</Text> : null}
          <Pressable
            accessibilityLabel={`Источник параметра: ${label}`}
            accessibilityRole="button"
            onPress={() => this.toggleGuideDetails(card.key)}
            style={styles.guideInfoButton}
            testID={`editable-param-guide-details-${card.key}`}
          >
            <Text style={styles.guideInfoButtonText}>i</Text>
          </Pressable>
        </View>
        {wording?.source ? <Text style={styles.parameterMeta} testID={`editable-param-explanation-${card.key}`}>{placeholder}</Text> : null}
        {applicationValueStatus ? (
          <Text
            style={styles.parameterMeta}
            testID={`editable-param-application-value-${card.key}`}
          >
            {applicationValueStatus}
          </Text>
        ) : null}
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
    if (this.props.canonicalParameterReadinessPending) {
      return (
        <View style={styles.parameterPanel} testID="request-estimate-parameter-readiness-pending">
          <Text style={styles.parameterMeta}>Параметры расчёта загружаются. Редактирование станет доступно после загрузки.</Text>
        </View>
      );
    }
    const {
      latestDiff,
    } = this.props;
    const { showAllMissing, filledOpen, derivedOpen } = this.state;
    const cards = this.buildCards();
    const parameterOrdinalByKey = new Map<string, number>();
    const renderParameter = (card: AiEstimateParameterCard, actionLabel: string) => {
      if (!parameterOrdinalByKey.has(card.key)) parameterOrdinalByKey.set(card.key, parameterOrdinalByKey.size + 1);
      return this.renderEditableParameterRow(
        card,
        actionLabel,
        parameterOrdinalByKey.get(card.key) ?? 1,
      );
    };
    const clarificationRank = {
      critical: 0,
      recommended: 1,
      optional: 2,
    } as const;
    const canonicalSession = this.editableCanonicalParameterSession();
    const jubileeGroups = jubileeParameterGroups(canonicalSession?.workPassportId, cards);
    const unfilled = (group: AiEstimateParameterCard[]) => group.filter(card =>
      !this.initialEditValue(card).trim()).length;
    const canonicalBlockingParameterIds = new Set(canonicalSession?.blockingMissingParameterIds ?? []);
    const initialCanonicalCalculationBlocked =
      canonicalSession?.status === "BLOCKING_REQUIRED";
    const missingCards = cards
      .filter((card) => {
        const dirty = isConsumerRepairParameterExplicitlyDirty({
          baselineValue: this.baselineValueForCard(card),
          draftValue: this.initialEditValue(card),
          explicitlyConfirmedMissingValue: this.state.explicitlyConfirmedMissingValues[card.key] === true,
        });
        return shouldKeepConsumerRepairDirtyMissingParameterInPlace({
          baselineMissing: this.state.baselinePlacements[card.key]?.missing ?? card.missing,
          currentMissing: card.missing,
          dirty,
        }) &&
        (
          dirty || !initialCanonicalCalculationBlocked ||
          canonicalBlockingParameterIds.has(card.key) || card.consumerInputRole === 'OBJECT_FACT'
        );
      })
      .map((card) => card.missing ? card : { ...card, missing: true })
      .sort(
        (left, right) =>
          clarificationRank[left.clarificationTier ?? "optional"] -
          clarificationRank[right.clarificationTier ?? "optional"],
      );
    const missingCardIds = new Set(missingCards.map((card) => card.key));
    // Editing an automatic value changes its preview provenance immediately.
    // Keep the input in its baseline group until Apply/Cancel so React does
    // not remount it and drop the keyboard after the first typed character.
    const groupSource = (card: AiEstimateParameterCard) => isConsumerRepairParameterExplicitlyDirty({
      baselineValue: this.baselineValueForCard(card),
      draftValue: this.initialEditValue(card),
      explicitlyConfirmedMissingValue: this.state.explicitlyConfirmedMissingValues[card.key] === true,
    }) ? this.state.baselinePlacements[card.key]?.source ?? card.source : card.source;
    const assumptionCards = canonicalSession
      ? cards.filter((card) => !missingCardIds.has(card.key) && groupSource(card) === "catalog_default"
        && card.consumerInputRole == null)
      : [];
    const advancedCards = cards.filter(card => card.consumerInputRole === "ADVANCED_OPTION" || card.consumerInputRole === "APPLICATION_TECHNICAL");
    const advancedCardIds = new Set(advancedCards.map(card => card.key));
    const mainMissingCards = missingCards.filter(card => !advancedCardIds.has(card.key));
    const advancedMissingCount = missingCards.filter(card => advancedCardIds.has(card.key)).length;
    const filledCards = cards.filter((card) =>
      !missingCardIds.has(card.key) &&
      groupSource(card) !== "formula_derived" &&
      !assumptionCards.includes(card) && !advancedCards.includes(card)
    );
    const derivedCards = cards.filter((card) =>
      groupSource(card) === "formula_derived" && !missingCardIds.has(card.key) && !advancedCards.includes(card));
    // A short published set of object facts should remain visible together,
    // including its technology and scope choices after the first save.
    const filledVisibleCount = filledCards.length <= 10 && filledCards.every(card => card.consumerInputRole === 'OBJECT_FACT')
      ? filledCards.length : 6;
    const criticalMissingCards = mainMissingCards.filter(
      (card) => card.clarificationTier === "critical",
    );
    const nonCriticalMissingCards = mainMissingCards.filter(
      (card) => card.clarificationTier !== "critical",
    );
    const shortObjectFactQuestions = mainMissingCards.length <= 10
      && mainMissingCards.every(card => card.consumerInputRole === 'OBJECT_FACT');
    const visibleMissingCards = showAllMissing || shortObjectFactQuestions
      ? mainMissingCards
      : [
        ...criticalMissingCards,
        ...nonCriticalMissingCards.slice(0, Math.max(0, 5 - criticalMissingCards.length)),
      ];
    const hiddenMissingCount = Math.max(0, mainMissingCards.length - visibleMissingCards.length);
    const dirtyCount = this.dirtyKeys().length;
    const applyPending = this.state.applyState === "pending";
    const clarification = this.props.revision?.professionalClarification;
    const calculationRequirementIds = canonicalSession
      ? consumerRepairCanonicalCalculationRequirementIds(canonicalSession)
      : null;
    const blockingMissingCount = criticalMissingCards.length;
    const contractMissingCount = nonCriticalMissingCards.length + advancedMissingCount;
    const canContinueWithoutDocumentOnlyFields = Boolean(
      canonicalSession
      && this.props.revision == null
      && canonicalSession.status === "BLOCKING_REQUIRED"
      && (calculationRequirementIds?.blockingMissingParameterIds.length ?? 0) === 0
      && (calculationRequirementIds?.invalidParameterIds.length ?? 0) === 0
      && this.props.onApplyParamBatch,
    );
    const visibleCardIds = new Set(cards.map((card) => card.key));
    const visibleSourceGates = (this.props.viewModel?.sourceGates ?? []).filter(
      (gate) => !visibleCardIds.has(gate.parameterId),
    );
    const sourceGateCount = visibleSourceGates.length;

    return (
    <View style={styles.parameterPanel} testID="request-estimate-parameter-panel">
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Исходные данные расчёта</Text>
        <Text style={styles.panelMeta}>
          {jubileeGroups
            ? 'Можно сохранить известные данные сейчас, а остальные уточнить позже. Пустые поля не считаются подтверждёнными.'
            : blockingMissingCount > 0
            ? `Нужно уточнить: ${blockingMissingCount} обязательных ${pluralizeRu(blockingMissingCount, "параметр", "параметра", "параметров")}`
            : contractMissingCount > 0
              ? `До полного состава и подтверждения: ${contractMissingCount} обязательных ${pluralizeRu(contractMissingCount, "параметр", "параметра", "параметров")}.`
              : sourceGateCount > 0
                ? 'Данные объекта заполнены. Приложению не хватает технических данных для завершения расчёта.'
                : "Все обязательные параметры заполнены"}
        </Text>
        {canonicalSession && assumptionCards.length > 0 ? (
          <Text style={styles.panelMeta}>
            Параметров, рассчитанных или подставленных приложением и доступных для изменения: {assumptionCards.length}
          </Text>
        ) : null}
        {derivedCards.length > 0 ? (
          <Text style={styles.panelMeta}>
            Параметров, рассчитанных приложением: {derivedCards.length}
          </Text>
        ) : null}
      </View>
      {visibleSourceGates.length > 0 ? (
        <View style={styles.parameterGroup} testID="request-estimate-source-gates">
          <Pressable accessibilityRole="button" onPress={() => this.setState(state => ({ sourceDetailsOpen: !state.sourceDetailsOpen }))}
            style={styles.inlineToggle} testID="request-estimate-source-gates-toggle">
            <Text style={styles.groupTitle}>{this.state.sourceDetailsOpen ? 'Скрыть технические данные' : 'Технические данные расчёта'}</Text>
          </Pressable>
          <Text style={styles.parameterMeta}>
            Эти данные должно определить приложение по нормам и паспортам. Вам не нужно искать скрытое поле или вводить нормы вручную. Известный расход сохранён; полный расчёт пока не завершён.
          </Text>
          {this.state.sourceDetailsOpen ? visibleSourceGates.map((gate) => (
            <View key={gate.parameterId} style={styles.sourceGateRow} testID={`request-estimate-source-gate-${gate.parameterId}`}>
              <Text style={styles.parameterLabel}>{gate.title}</Text>
              <Text style={styles.parameterMeta}>{gate.sourceRequirement}</Text>
            </View>
          )) : null}
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
              disabled={applyPending}
              onPress={this.applyDraftChanges}
              style={[
                styles.inlineParamButton,
                styles.inlineParamPrimaryButton,
                applyPending ? styles.inlineParamButtonDisabled : null,
              ]}
              testID="editable-param-batch-apply"
            >
              <Text style={styles.inlineParamPrimaryText}>
                {applyPending ? "Применяется…" : "Применить"}
              </Text>
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
      {this.state.applyState === "success" ? (
        <Text style={styles.successStatus} testID="request-estimate-parameter-apply-success">
          Применено и рассчитано. Все изменения сохранены вместе.
        </Text>
      ) : null}
      {this.state.applyState === "error" ? (
        <Text style={styles.inlineParamError} testID="request-estimate-parameter-apply-error">
          Не применено. Введённые значения сохранены на экране — исправьте указанную ошибку и повторите.
        </Text>
      ) : null}
      {this.state.applyState === "revision_opened" ? (
        <Text style={styles.successStatus} testID="request-estimate-saved-revision-opened">
          {dirtyCount > 0
            ? "Сохранённая смета открыта. Введённые изменения ещё не применены — проверьте их и нажмите «Применить»."
            : "Сохранённая смета открыта."}
        </Text>
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
      {dirtyCount === 0 && canonicalSession && this.props.revision && this.props.onApplyParamBatch && this.hasCompositionRefresh() ? (
        <View style={styles.batchBar} testID="saved-estimate-composition-refresh-bar">
          <Text style={styles.batchBarText}>
            Обновите состав по актуальной версии работы. Исходные данные сохранятся; прежняя смета останется в истории.
          </Text>
          <Pressable accessibilityRole="button" disabled={applyPending}
            onPress={this.refreshSavedComposition}
            style={[styles.inlineParamButton, styles.inlineParamPrimaryButton]}
            testID="saved-estimate-composition-refresh">
            <Text style={styles.inlineParamPrimaryText}>{applyPending ? "Обновляем…" : "Обновить состав сметы"}</Text>
          </Pressable>
        </View>
      ) : null}
      {latestDiff && dirtyCount === 0 && !applyPending && this.state.applyState !== "error" && this.state.applyState !== "revision_opened" ? (
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
      {jubileeGroups ? <>
        <View style={styles.parameterGroup} testID="request-estimate-basic-parameters">
          <Text style={styles.groupTitle}>Урны и крепёж</Text>
          <Text style={styles.parameterMeta}>Выбрана урна Jubilee110 со стальным вкладышем 110 л. Исполнение и состав поставки нужно проверить по вашим данным.</Text>
          {jubileeGroups.basic.map(card => renderParameter(card, card.missing ? 'Уточнить' : ''))}
        </View>
        {(['foundation', 'procurement'] as const).map(group => {
          const groupCards = jubileeGroups[group];
          const missing = unfilled(groupCards);
          const open = group === 'foundation' ? this.state.foundationDetailsOpen : this.state.procurementDetailsOpen;
          const title = group === 'foundation' ? 'Проверка бетонного основания' : 'Уточнить закупку';
          return groupCards.length ? <View key={group} style={styles.parameterGroup} testID={`request-estimate-${group}-parameters`}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
              onPress={() => this.setState(state => ({
                foundationDetailsOpen: group === 'foundation' ? !state.foundationDetailsOpen : state.foundationDetailsOpen,
                procurementDetailsOpen: group === 'procurement' ? !state.procurementDetailsOpen : state.procurementDetailsOpen,
              }))}
              style={styles.inlineToggle} testID={`request-estimate-${group}-parameters-toggle`}>
              <Text style={styles.groupTitle}>{open ? 'Скрыть: ' : ''}{title}{missing ? ` — осталось уточнить ${missing}` : ''}</Text>
            </Pressable>
            <Text style={styles.parameterMeta}>{group === 'foundation'
              ? missing ? 'Пригодность основания для этого монтажа ещё не подтверждена. Нужны данные фактического бетона; требования инструкции не заменяют замеры.' : 'Поля основания заполнены. Проверьте значения; новые правки будут учтены после «Применить».'
              : 'Наличие, запас и упаковка уточняют заказ. Это не количество устанавливаемых урн. Если данных нет, оставьте поля пустыми: количество к покупке пока не подтверждено.'}</Text>
            {open ? groupCards.map(card => renderParameter(card, card.missing ? 'Уточнить' : '')) : null}
          </View> : null;
        })}
      </> : null}
      {!jubileeGroups && visibleMissingCards.length > 0 ? (
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
      {!jubileeGroups && filledCards.length > 0 ? (
        <View style={styles.parameterGroup} testID="request-estimate-filled-parameters">
          <Text style={styles.groupTitle}>Заполнено</Text>
          {filledCards.slice(0, filledVisibleCount).map((card) => renderParameter(card, ""))}
          {filledCards.length > filledVisibleCount ? (
            <Pressable
              accessibilityRole="button"
              onPress={this.toggleFilled}
              style={styles.inlineToggle}
              testID="request-estimate-filled-parameters-toggle"
            >
              <Text style={styles.inlineToggleText}>{filledOpen ? "Скрыть остальные" : `Показать ещё ${filledCards.length - filledVisibleCount}`}</Text>
            </Pressable>
          ) : null}
          {filledOpen && filledCards.length > filledVisibleCount ? (
            <View style={styles.parameterGroup} testID="request-estimate-filled-parameters-extra">
              {filledCards.slice(filledVisibleCount).map((card) => renderParameter(card, ""))}
            </View>
          ) : null}
        </View>
      ) : null}
      {!jubileeGroups && advancedCards.length > 0 ? (
        <View style={styles.parameterGroup} testID="request-estimate-advanced-parameters">
          <Pressable accessibilityRole="button" onPress={() => this.setState(state => ({ advancedDetailsOpen: !state.advancedDetailsOpen }))}
            style={styles.inlineToggle} testID="request-estimate-advanced-parameters-toggle">
            <Text style={styles.groupTitle}>{this.state.advancedDetailsOpen ? 'Скрыть дополнительные настройки' : 'Наличие материалов, упаковки и дополнительные настройки'}</Text>
          </Pressable>
          <Text style={styles.parameterMeta}>{advancedMissingCount
            ? `Осталось уточнить ${advancedMissingCount}. Пустые поля не считаются подтверждёнными; известный расход можно сохранить. Полный состав и заказ требуют отдельных уточнений.`
            : 'Сохранённые значения учтены. Меняйте их, если условия поставки или проекта отличаются.'}</Text>
          {this.state.advancedDetailsOpen ? advancedCards.map(card => renderParameter(card, '')) : null}
        </View>
      ) : null}
      {assumptionCards.length > 0 ? (
        <View style={styles.parameterGroup} testID="request-estimate-assumed-parameters">
          <Pressable accessibilityRole="button" onPress={() => this.setState(state => ({ automaticDetailsOpen: !state.automaticDetailsOpen }))}
            style={styles.inlineToggle} testID="request-estimate-automatic-parameters-toggle">
            <Text style={styles.groupTitle}>{this.state.automaticDetailsOpen ? 'Скрыть автоматические значения' : `Рассчитано или подставлено приложением (${assumptionCards.length})`}</Text>
          </Pressable>
          <Text style={styles.parameterMeta}>
            Предварительные значения можно проверить и заменить проектными.
          </Text>
          {this.state.automaticDetailsOpen ? assumptionCards.map((card) => renderParameter(card, "Допущение")) : null}
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
              {derivedOpen
                ? `Скрыть рассчитанные параметры (${derivedCards.length})`
                : `Показать рассчитанные параметры (${derivedCards.length})`}
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
  pendingCanonicalRowEditCount,
  canonicalRowEditsApplying,
  onApplyCanonicalRowEdits,
  onCancelCanonicalRowEdits,
  canonicalRowEditorResetKeys,
  onSpecificationChange,
  onOptionalChange,
  onRemove,
  onAddManual,
  onAddPhotoMaterialRecognition,
  onOpenPhotoForEstimateItem,
  rowPhotoThumbnails,
  rowPhotoAttachmentItemIds,
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
        pendingCanonicalRowEditCount={pendingCanonicalRowEditCount}
        canonicalRowEditsApplying={canonicalRowEditsApplying}
        onApplyCanonicalRowEdits={onApplyCanonicalRowEdits}
        onCancelCanonicalRowEdits={onCancelCanonicalRowEdits}
        canonicalRowEditorResetKeys={canonicalRowEditorResetKeys}
        onSpecificationChange={onSpecificationChange}
        onOptionalChange={onOptionalChange}
        onRemove={onRemove}
        onOpenCatalog={onOpenCatalog}
        onSelectCatalogItem={onSelectCatalogItem}
        onOpenPhoto={onOpenPhotoForEstimateItem}
        showPhotoButtons={Boolean(onOpenPhotoForEstimateItem)}
        rowPhotoThumbnails={rowPhotoThumbnails}
        rowPhotoAttachmentItemIds={rowPhotoAttachmentItemIds}
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
    minHeight: 36,
    gap: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  requiredParameterRow: {
    backgroundColor: "#FFF7ED",
    borderLeftWidth: 3,
    borderLeftColor: "#C2410C",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  requiredParameterHint: { color: "#9A3412", fontWeight: "700", fontSize: 12 },
  compactParameterLine: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
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
  inlineParamEditorCompact: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 190,
    minWidth: 120,
    maxWidth: 220,
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
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: "800",
  },
  inlineParamInputCompact: {
    flex: 1,
    minWidth: 54,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
  },
  inlineParamInputShell: {
    minHeight: 32,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  inlineParamEmbeddedGuide: {
    maxWidth: 104,
    flexShrink: 1,
    color: "#94A3B8",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
    paddingRight: 7,
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
  inlineParamButtonDisabled: {
    opacity: 0.55,
  },
  inlineParamChoiceButton: {
    maxWidth: "100%",
    minWidth: 0,
    flexShrink: 1,
  },
  inlineParamChoiceText: {
    maxWidth: "100%",
    minWidth: 0,
    flexShrink: 1,
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
