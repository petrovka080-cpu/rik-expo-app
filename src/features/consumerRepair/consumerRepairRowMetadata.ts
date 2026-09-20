type ConsumerRepairRowMetadataCarrier = {
  id?: string;
  itemType?: string;
  unit?: string | null;
  category?: string | null;
  sourceParameters?: Readonly<Record<string, unknown>> | null;
};

function metadata(item: ConsumerRepairRowMetadataCarrier | null | undefined): Readonly<Record<string, unknown>> {
  return item?.sourceParameters ?? {};
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

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

export function consumerRepairRowCategorySignals(
  item: ConsumerRepairRowMetadataCarrier,
): string[] {
  const source = metadata(item);
  const smartProjection = source.smartEstimateProjectionV2;
  const smartCategory = smartProjection && typeof smartProjection === "object"
    ? (smartProjection as { category?: unknown }).category
    : null;
  return [
    source.rowKind,
    source.row_kind,
    source.section,
    source.sectionType,
    source.asphaltV4ProfessionalCategory,
    smartCategory,
    item.category,
  ]
    .map((value) => text(value).toLocaleLowerCase("ru-RU"))
    .filter(Boolean);
}
