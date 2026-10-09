import { consumerCanonicalMissingRequirements, type CanonicalParameterRequirementTables } from "../../lib/consumerRequests/consumerCanonicalParameterRequirements";
import type { CanonicalPublicResourcePresentationV1 } from '../../lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';

type ConsumerRepairRowMetadataCarrier = {
  id?: string;
  titleRu?: string;
  itemType?: string;
  unit?: string | null;
  category?: string | null;
  quantity?: number | null;
  formulaId?: string | null;
  quantityFormula?: string | null;
  normSourceTitle?: string | null;
  sourceParameters?: Readonly<Record<string, unknown>> | null;
};

function metadata(item: ConsumerRepairRowMetadataCarrier | null | undefined): Readonly<Record<string, unknown>> {
  return item?.sourceParameters ?? {};
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

const verifiedDisplayPresentations = new WeakMap<object, CanonicalPublicResourcePresentationV1>();

/** View-only admission: never persisted in an item or trusted from raw metadata. */
export function registerConsumerRepairRowVerifiedPresentation(item: object, presentation: CanonicalPublicResourcePresentationV1 | null): void {
  if (presentation) verifiedDisplayPresentations.set(item, presentation);
  else verifiedDisplayPresentations.delete(item);
}

export function consumerRepairRowPublicResourcePresentation(item: ConsumerRepairRowMetadataCarrier) {
  const descriptor = verifiedDisplayPresentations.get(item);
  return descriptor && (item.titleRu === descriptor.sourceTitleRu || item.titleRu === descriptor.nameRu) ? descriptor : null;
}

export function consumerRepairRowMatchesSearch(item: ConsumerRepairRowMetadataCarrier, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase('ru-RU');
  if (!normalized) return true;
  const presentation = consumerRepairRowPublicResourcePresentation(item);
  return [item.titleRu, item.category, item.quantityFormula, item.normSourceTitle,
    presentation?.brandAndModelRu, presentation?.specificationRu, ...(presentation?.detailsRu ?? [])]
    .some(value => String(value ?? '').toLocaleLowerCase('ru-RU').includes(normalized));
}

const VISIBLE_NON_PAYABLE_COST_TREATMENTS = new Set([
  "INCLUDED_IN_RESOURCE_ROWS",
  "INFORMATIONAL_SCOPE",
  "CONTROL_OR_DOCUMENT",
]);

export function consumerRepairRowCode(item: ConsumerRepairRowMetadataCarrier | null | undefined): string {
  return text(metadata(item).rowCode);
}

export function consumerRepairRowCanonicalRevisionId(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): string {
  return text(metadata(item).canonicalBackendRevisionId);
}

export function consumerRepairRowCanonicalCatalogId(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): string {
  return text(metadata(item).canonicalBackendCatalogId);
}

export function consumerRepairRowIncludedInEstimate(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): boolean {
  return metadata(item).includedInEstimate !== false;
}

export function consumerRepairRowIncludedInProcurement(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): boolean {
  return metadata(item).includedInProcurement === true;
}

export function consumerRepairRowIsCanonicalPreliminaryNeed(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): boolean {
  return metadata(item).canonicalPreliminaryNeed === true;
}

export function consumerRepairRowMissingRequirementLabels(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
  tables?: CanonicalParameterRequirementTables | null,
): string[] {
  const requirements = consumerCanonicalMissingRequirements(item ?? {}, tables);
  return [...new Set(requirements.flatMap((requirement) => {
    if (!requirement || typeof requirement !== "object" || Array.isArray(requirement)) return [];
    const source = requirement as Record<string, unknown>;
    const label = text(source.titleRu || source.labelRu || source.parameterTitleRu || source.parameterId);
    return label ? [label] : [];
  }))];
}

/** A missing application norm is not a customer input, even when both block one row. */
export function consumerRepairRowRequirementNotice(
  item: ConsumerRepairRowMetadataCarrier,
  tables?: CanonicalParameterRequirementTables | null,
): string {
  const inputs: string[] = [];
  const sources: string[] = [];
  for (const requirement of consumerCanonicalMissingRequirements(item, tables)) {
    const label = text(requirement.titleRu || requirement.labelRu || requirement.parameterTitleRu || requirement.parameterId);
    if (!label) continue;
    const sourceManaged = requirement.valueSourceRole === "UNRESOLVED_APPLICATION_NORM"
      || requirement.sourceConfirmationRequired === true;
    const labels = sourceManaged ? sources : inputs;
    if (!labels.includes(label)) labels.push(label);
  }
  const messages = [
    item.quantity != null ? `Количество ${item.quantity} сохранено, но позиция ещё не подтверждена.` : null,
    inputs.length ? `Заполните в исходных данных: ${inputs.join(", ")}.` : null,
    sources.length ? `Для расчёта нужен подтверждённый источник: ${sources.join(", ")}.` : null,
  ].filter(Boolean);
  if (inputs.length || sources.length) return messages.join(" ");
  return item.quantity == null
    ? "Для расчёта количества нужны подтверждённые исходные данные."
    : "Количество сохранено; для подтверждения позиции нужны дополнительные исходные данные.";
}

export function consumerRepairRowHasSourceManagedQuantity(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): boolean {
  const source = metadata(item);
  const requirements = source.missingParameterRequirements;
  return source.canonicalPreliminaryNeed === true
    && ((Array.isArray(source.sourceManagedMissingParameterIds) && source.sourceManagedMissingParameterIds.length > 0)
      || (Array.isArray(requirements) && requirements.some((requirement) =>
      requirement != null
      && typeof requirement === "object"
      && !Array.isArray(requirement)
      && (requirement as Record<string, unknown>).sourceConfirmationRequired === true
    )));
}

export function consumerRepairRowIsNonPayable(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): boolean {
  const source = metadata(item);
  return source.payable === false
    || VISIBLE_NON_PAYABLE_COST_TREATMENTS.has(text(source.canonicalCostTreatment));
}

/** An unresolved physical need is visible even though it cannot yet be paid. */
export function consumerRepairRowIsTechnicalDetail(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): boolean {
  return VISIBLE_NON_PAYABLE_COST_TREATMENTS.has(text(metadata(item).canonicalCostTreatment));
}

export function consumerRepairRowCostTreatment(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): string {
  return text(metadata(item).canonicalCostTreatment);
}

export function consumerRepairRowCostCoverageLabel(item: ConsumerRepairRowMetadataCarrier): string | null {
  const source = metadata(item);
  const raw = source.canonicalCommercialCostCoverageDecisionV1;
  const decision = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
  const title = text(source.canonicalIncludedCostOwnerTitleRu) || text(decision?.ownerTitleRu);
  if (!title || consumerRepairRowCostTreatment(item) !== 'INCLUDED_IN_RESOURCE_ROWS') return null;
  return `Включено в стоимость «${title}».${decision?.supplyParty === 'RATE_PROVIDER' ? ' Ресурс предоставляет исполнитель этой расценки.' : ''}`;
}

export function consumerRepairRowCommercialScopeLabel(item: ConsumerRepairRowMetadataCarrier): string | null {
  const raw = metadata(item).canonicalCommercialRateCoverageV1;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const coverage = raw as Record<string, unknown>;
  return coverage.contractVersion === 'canonical-commercial-cost-coverage/v1' && coverage.active === true && text(coverage.scopeRu)
    ? `Состав расценки: ${text(coverage.scopeRu)}` : null;
}

export function consumerRepairRowHasManualQuantity(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): boolean {
  return metadata(item).manualQuantityOverride === true;
}

export function consumerRepairRowCalculatedQuantity(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): number | null {
  if (!item) return null;
  const rawBaseline = metadata(item).calculatedQuantityBeforeOverride;
  const baseline = typeof rawBaseline === "number" || typeof rawBaseline === "string"
    ? Number(rawBaseline)
    : Number.NaN;
  if (Number.isFinite(baseline) && baseline >= 0) return baseline;
  if (
    metadata(item).canonicalPreliminaryNeed !== true
    && !consumerRepairRowHasManualQuantity(item)
    && (text(item.formulaId) || text(item.quantityFormula))
    && typeof item.quantity === "number"
    && Number.isFinite(item.quantity)
    && item.quantity >= 0
  ) return item.quantity;
  return null;
}

export function consumerRepairCanonicalRowNativeId(
  item: ConsumerRepairRowMetadataCarrier,
): string | undefined {
  const source = metadata(item);
  const parts = [
    source.canonicalBackendRevisionId,
    source.canonicalBackendReleaseId,
    source.canonicalBackendCatalogId,
    source.rowSha256,
    item.unit,
    item.itemType,
    source.rowCode,
  ].map(text);
  return parts.every(Boolean) ? `canonical-estimate-row-identity|${parts.join("|")}` : undefined;
}

// One current presentation projection per live row. Compare the actual scalar
// signals on every read, including nested legacy metadata mutated in place.
// Quantity, pricing and source/admission decisions are never cached here.
const currentCategorySignals = new WeakMap<ConsumerRepairRowMetadataCarrier, {
  tokens: readonly string[];
  signals: readonly string[];
}>();

export function consumerRepairRowCategorySignals(
  item: ConsumerRepairRowMetadataCarrier,
): string[] {
  const source = metadata(item);
  const smartProjection = source.smartEstimateProjectionV2;
  const smartCategory = smartProjection && typeof smartProjection === "object"
    ? (smartProjection as { category?: unknown }).category
    : null;
  const tokens = [
    source.rowKind,
    source.row_kind,
    source.section,
    source.sectionType,
    source.asphaltV4ProfessionalCategory,
    smartCategory,
    item.category,
  ].map(text);
  const current = currentCategorySignals.get(item);
  if (current && tokens.every((token, index) => token === current.tokens[index])) {
    // Callers historically receive a mutable array. Never expose the retained
    // internal projection and let a caller poison another category read.
    return [...current.signals];
  }
  const signals = tokens.filter(Boolean).map(token => token.toLocaleLowerCase("ru-RU"));
  currentCategorySignals.set(item, { tokens, signals });
  return [...signals];
}
