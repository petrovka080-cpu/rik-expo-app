export const CANONICAL_PROCUREMENT_SCHEMA_VERSION = "canonical_estimate_procurement_r7";
export const CANONICAL_PROFESSIONAL_PDF_TEMPLATE_VERSION = "professional-estimate-pdf:4";

export type CanonicalArtifactRow = Record<string, unknown> & {
  row_id: unknown;
  ordinal: unknown;
  included_in_estimate: unknown;
  included_in_procurement: unknown;
  procurement_eligible: unknown;
  ownership_status: unknown;
};

export type CanonicalArtifactRevision = Record<string, unknown> & {
  id: unknown;
  release_id: unknown;
  catalog_id: unknown;
  checksum_sha256: unknown;
  row_count: unknown;
};

const MIGRATED_EXCLUDED_OWNERSHIP = "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL";

function nullableText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function decimalText(value: unknown): string | null {
  return value == null || value === "" ? null : String(value);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function selectCanonicalArtifactRows(sourceRows: CanonicalArtifactRow[]) {
  const estimateRows = sourceRows.filter((row) => (
    row.included_in_estimate === true
      && row.ownership_status !== MIGRATED_EXCLUDED_OWNERSHIP
  ));
  const procurementRows = estimateRows.filter((row) => (
    row.procurement_eligible === true && row.included_in_procurement === true
  ));
  return {
    sourceRows,
    estimateRows,
    procurementRows,
  };
}

function projectProcurementRow(row: CanonicalArtifactRow) {
  const calculationTrace = objectValue(row.calculation_trace);
  return {
    rowId: String(row.row_id),
    ordinal: Number(row.ordinal),
    section: String(row.section ?? ""),
    category: String(row.category ?? ""),
    titleRu: String(row.title_ru ?? ""),
    unitId: String(row.unit_id ?? ""),
    quantity: decimalText(row.quantity),
    unitPrice: decimalText(row.unit_price),
    amount: decimalText(row.amount),
    currencyCode: nullableText(row.currency_code),
    procurementEligible: true,
    includedInEstimate: true,
    includedInProcurement: true,
    rowSha256: nullableText(row.row_sha256),
    ownershipStatus: nullableText(row.ownership_status),
    manualAmendment: calculationTrace.manualAmendment ?? null,
    normativeTrace: Array.isArray(row.normative_trace) ? row.normative_trace : [],
    legacyDisposition: row.legacy_row_payload == null ? null : nullableText(row.ownership_status),
  };
}

export function buildCanonicalProcurementProjection(input: {
  revision: CanonicalArtifactRevision;
  procurementRows: CanonicalArtifactRow[];
}) {
  const rows = input.procurementRows.map(projectProcurementRow);
  const groups = new Map<string, { section: string; category: string; rowIds: string[] }>();
  for (const row of rows) {
    const key = `${row.section}\u0000${row.category}`;
    const group = groups.get(key) ?? { section: row.section, category: row.category, rowIds: [] };
    group.rowIds.push(row.rowId);
    groups.set(key, group);
  }
  const revision = input.revision;
  return {
    schemaVersion: CANONICAL_PROCUREMENT_SCHEMA_VERSION,
    revisionId: String(revision.id),
    releaseId: String(revision.release_id),
    revisionChecksumSha256: String(revision.checksum_sha256),
    catalogId: String(revision.catalog_id),
    currencyCode: nullableText(revision.currency_code),
    revisionTotals: objectValue(revision.totals),
    parameters: objectValue(revision.input_parameters),
    amendmentContract: revision.amendment_contract ?? null,
    sourceRequestText: nullableText(revision.source_request_text),
    sourceRequestHash: nullableText(revision.source_request_hash),
    displayTitleRu: nullableText(revision.display_title_ru),
    primaryMeasure: {
      parameterId: nullableText(revision.primary_measure_parameter_id),
      value: decimalText(revision.primary_measure_value),
      unitId: nullableText(revision.primary_measure_unit_id),
    },
    selectedRowCount: rows.length,
    groups: [...groups.values()],
    rows,
  };
}

export function buildCanonicalArtifactMetadata(input: {
  operation: "pdf" | "professional_pdf" | "procurement";
  renderer: string;
  revision: CanonicalArtifactRevision;
  sourceRowCount: number;
  projectedRowCount: number;
  selectedProcurementRowCount: number;
}) {
  return {
    renderer: input.renderer,
    ...(input.operation === "professional_pdf"
      ? { templateVersion: CANONICAL_PROFESSIONAL_PDF_TEMPLATE_VERSION }
      : {}),
    sourceRevisionChecksumSha256: String(input.revision.checksum_sha256),
    sourceReleaseId: String(input.revision.release_id),
    sourceCatalogId: String(input.revision.catalog_id),
    sourceRequestHash: nullableText(input.revision.source_request_hash),
    displayTitleRu: nullableText(input.revision.display_title_ru),
    sourceOwnerUserId: nullableText(input.revision.owner_user_id),
    sourceOrganizationId: nullableText(input.revision.organization_id),
    sourceRowCount: input.sourceRowCount,
    projectedRowCount: input.projectedRowCount,
    selectedProcurementRowCount: input.operation === "procurement"
      ? input.selectedProcurementRowCount
      : null,
    includesExcludedDisposition: false,
    includesParametersAndTotals: true,
  };
}

export function escapeCanonicalArtifactHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function canonicalArtifactQuantity(value: unknown): string {
  if (value == null || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(numeric);
}

export function canonicalArtifactParameterValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 6 }).format(value);
  }
  return String(value ?? "");
}

export function canonicalArtifactMoney(value: unknown, currencyCode: unknown): string {
  if (value == null || value === "") return "уточнить";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "уточнить";
  const currency = String(currencyCode ?? "KGS") === "KGS" ? "сом" : String(currencyCode ?? "");
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric)} ${currency}`.trim();
}

export function canonicalArtifactUnit(row: Record<string, unknown>): string {
  const displayUnit = nullableText(objectValue(row.calculation_trace).displayUnitRu);
  if (displayUnit) return displayUnit;
  const unit = String(row.unit_id ?? "").trim();
  const localized: Record<string, string> = {
    set: "компл.", item: "шт.", pcs: "шт.", man_hour: "чел.-ч", machine_hour: "маш.-ч",
    t_km: "т·км", kg: "кг", t: "т", l: "л", m: "м", m2: "м²", m3: "м³",
    trip: "рейс", document: "док.", ratio: "коэф.", service: "услуга",
  };
  if (unit !== "test") return localized[unit] ?? unit;
  const semanticOwner = `${String(row.category ?? "")} ${String(row.title_ru ?? "")}`.toLocaleLowerCase("ru-RU");
  if (/при[её]м|контрол|провер/u.test(semanticOwner)) return "проверка";
  return "испыт.";
}

export function canonicalArtifactSection(row: Record<string, unknown>): string {
  const identity = `${String(row.section ?? "")} ${String(row.category ?? "")}`.toLowerCase();
  if (/material|waste/u.test(identity)) return "Материалы";
  if (/equipment|machine|machinery/u.test(identity)) return "Машины и оборудование";
  if (/delivery|transport|logistic/u.test(identity)) return "Логистика";
  if (/test|quality|control/u.test(identity)) return "Испытания и контроль";
  return "Работы и услуги";
}
