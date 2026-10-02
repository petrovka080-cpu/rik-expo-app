type ConsumerRepairRowMetadataCarrier = {
  id?: string;
  itemType?: string;
  unit?: string | null;
  category?: string | null;
  quantity?: number | null;
  formulaId?: string | null;
  quantityFormula?: string | null;
  sourceParameters?: Readonly<Record<string, unknown>> | null;
};

function metadata(item: ConsumerRepairRowMetadataCarrier | null | undefined): Readonly<Record<string, unknown>> {
  return item?.sourceParameters ?? {};
}

function text(value: unknown): string {
  return String(value ?? "").trim();
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
): string[] {
  const requirements = metadata(item).missingParameterRequirements;
  if (!Array.isArray(requirements)) return [];
  return [...new Set(requirements.flatMap((requirement) => {
    if (!requirement || typeof requirement !== "object" || Array.isArray(requirement)) return [];
    const source = requirement as Record<string, unknown>;
    const label = text(source.titleRu || source.labelRu || source.parameterTitleRu || source.parameterId);
    return label ? [label] : [];
  }))];
}

export function consumerRepairRowHasSourceManagedQuantity(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): boolean {
  const source = metadata(item);
  const requirements = source.missingParameterRequirements;
  return source.canonicalPreliminaryNeed === true
    && Array.isArray(requirements)
    && requirements.some((requirement) =>
      requirement != null
      && typeof requirement === "object"
      && !Array.isArray(requirement)
      && (requirement as Record<string, unknown>).sourceConfirmationRequired === true
    );
}

export function consumerRepairRowIsNonPayable(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): boolean {
  const source = metadata(item);
  return source.payable === false
    || VISIBLE_NON_PAYABLE_COST_TREATMENTS.has(text(source.canonicalCostTreatment));
}

export function consumerRepairRowCostTreatment(
  item: ConsumerRepairRowMetadataCarrier | null | undefined,
): string {
  return text(metadata(item).canonicalCostTreatment);
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
