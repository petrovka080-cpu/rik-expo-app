import { canonicalMaterialQuantityBasisFromRow } from "./canonicalMaterialQuantityProjection";
import { normalizePublicBoqNameRu } from "../publicBoqNaming";
import { canonicalPublicResourcePresentationV1 } from './canonicalPublicResourcePresentationV1';
import { assertCanonicalPurchaseReadinessV1 } from "./canonicalPurchaseBalanceV1";
import { formatEstimateUnitLabel } from "../../ai/globalEstimate/formatEstimateUnitLabel";
import { canonicalEstimateOperationReference } from "./canonicalEstimateOperationComposition";
import { canonicalEstimateSha256HexText } from "./canonicalEstimateSha256";
import { localizeKnownTechnologyVariantSuffixRu } from "./russianTechnologyTitleR542";
import { compareFormulaGraphDecimals, isFormulaGraphExactDecimal } from "./formulaGraph";
import { canonicalArtifactPurchaseBalance } from "./canonicalPersistedPurchaseBalance";
export { canonicalArtifactPurchaseBalance } from "./canonicalPersistedPurchaseBalance";

export const CANONICAL_PROCUREMENT_SCHEMA_VERSION = "canonical_estimate_procurement_r10";
export const CANONICAL_PROCUREMENT_GENERATOR_VERSION = "canonical-procurement.r8-russian-resource-presentations";
export const CANONICAL_PROFESSIONAL_PDF_TEMPLATE_VERSION = "professional-estimate-pdf:14";

/** Keep caller idempotency within each renderer; do not collide with legacy jobs. */
export function canonicalProcurementRequestKey(idempotencyKey: string): string {
  return `${CANONICAL_PROCUREMENT_GENERATOR_VERSION}:${canonicalEstimateSha256HexText(idempotencyKey.trim())}`;
}

export function assertCanonicalProcurementJobRendererVersion(input: unknown): void {
  if (input == null || typeof input !== "object" || Array.isArray(input))
    throw Object.assign(new Error("procurement job payload must be an object"), { code: "ARTIFACT_RENDERER_VERSION_MISMATCH" });
  const payload = input as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(payload, "rendererVersion") && payload.rendererVersion !== CANONICAL_PROCUREMENT_GENERATOR_VERSION)
    throw Object.assign(new Error("procurement renderer version mismatch"), { code: "ARTIFACT_RENDERER_VERSION_MISMATCH" });
}

/** Versioned projections keep previous bytes addressable even if commit fails. */
export function canonicalArtifactFileIdentity(operation: string, revisionChecksum: string, artifactSha256: string): string {
  return operation === "professional_pdf" || operation === "procurement"
    ? `${revisionChecksum}-${artifactSha256}` : revisionChecksum;
}

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
  // A professional document is also a composition/provenance projection. Keep
  // legitimate non-payable and manually excluded canonical rows visible while
  // continuing to quarantine rows that were never matched to a canonical owner.
  const professionalPdfRows = sourceRows.filter((row) => (
    row.ownership_status !== MIGRATED_EXCLUDED_OWNERSHIP
  ));
  const procurementRows = estimateRows.filter((row) => (
    row.procurement_eligible === true && row.included_in_procurement === true
  ));
  return {
    sourceRows,
    estimateRows,
    professionalPdfRows,
    procurementRows,
  };
}

export function canonicalArtifactPreliminaryNeeds(
  revision: CanonicalArtifactRevision,
): CanonicalArtifactRow[] {
  const amendment = objectValue(revision.amendment_contract);
  const parameterSources = objectValue(amendment.parameterSources);
  const needs = Array.isArray(parameterSources.preliminaryNeeds)
    ? parameterSources.preliminaryNeeds
    : [];
  return needs.flatMap((value): CanonicalArtifactRow[] => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const need = value as Record<string, unknown>;
    if (!String(need.row_id ?? "").trim() || !String(need.need_sha256 ?? "").trim()) return [];
    return [{
      ...need,
      row_id: need.row_id,
      ordinal: need.ordinal,
      included_in_estimate: false,
      included_in_procurement: false,
      procurement_eligible: false,
      ownership_status: "PRELIMINARY_NEED",
      row_sha256: need.need_sha256,
      amount: null,
      currency_code: null,
    }];
  });
}

export function canonicalArtifactRentalBasis(row: CanonicalArtifactRow, parameters: Record<string, unknown>) {
  const graph = objectValue(objectValue(row.calculation_trace).resourceGraph);
  if (graph.supplyMode !== "RENTAL_RETURNABLE" || graph.returnable !== true) return null;
  const ids = graph.sourceScheduleParameterIds;
  const countId = Array.isArray(ids) && typeof ids[0] === "string" ? ids[0] : null;
  const durationId = nullableText(graph.rentalDurationParameterId);
  const count = countId ? parameters[countId] : null;
  const days = durationId ? parameters[durationId] : null;
  if (!countId || !durationId || !Number.isSafeInteger(Number(count)) || Number(count) <= 0
    || !Number.isSafeInteger(Number(days)) || Number(days) <= 0) {
    throw Object.assign(new Error(`saved rental schedule invalid: ${row.row_id}`), { code: "ARTIFACT_RENTAL_BASIS_INVALID" });
  }
  return { physicalQuantity: String(count), physicalUnit: "piece", durationDays: String(days),
    billingQuantity: String(row.quantity), billingUnit: String(row.unit_id), countParameterId: countId, durationParameterId: durationId,
    stageCount: graph.projectStageCountParameterId ? parameters[String(graph.projectStageCountParameterId)] ?? null : null };
}

export function canonicalArtifactSpecificationParts(row: CanonicalArtifactRow, parameters: Record<string, unknown>) {
  const graph = objectValue(objectValue(row.calculation_trace).resourceGraph);
  const ids = Array.isArray(graph.titleSpecificationParameterIds) ? graph.titleSpecificationParameterIds
    : graph.titleSpecificationParameterId ? [graph.titleSpecificationParameterId] : [];
  const labels = objectValue(graph.titleSpecificationParameterLabelsRu);
  const selected = ids.flatMap(id => {
    if (typeof id !== "string" || !nullableText(parameters[id])) return [];
    const rawLabel = labels[id];
    const label = Object.prototype.hasOwnProperty.call(labels, id) && typeof rawLabel === "string"
      && rawLabel.trim().length > 0 && rawLabel.length <= 100 && /[А-Яа-яЁё]/u.test(rawLabel)
      ? rawLabel.trim() : null;
    return [{ parameterId: id, value: String(parameters[id]),
      parts: String(parameters[id]).split(/\s*;\s*/u).filter(Boolean).map(part => label ? `${label}: ${part}` : part) }];
  });
  const selectedParts = selected.flatMap(spec => spec.parts);
  const selectedSpecification = selectedParts.join(", ");
  const presentation = canonicalArtifactPublicResourcePresentationV1(row);
  const details = presentation ? [presentation.brandAndModelRu, presentation.specificationRu, ...presentation.detailsRu]
    .filter((part): part is string => typeof part === 'string' && !selectedParts.includes(part) && part !== selectedSpecification) : [];
  return [...selected, ...(details.length ? [{ parameterId: 'resource_presentation_v1', value: details.join('; '), parts: [...new Set(details)] }] : [])];
}

export function canonicalArtifactPublicResourcePresentationV1(row: Record<string, unknown>) {
  const trace = objectValue(row.calculation_trace), graph = objectValue(trace.resourceGraph);
  return canonicalPublicResourcePresentationV1({ titleRu: String(row.title_ru ?? '').trim(),
    descriptor: graph.publicResourcePresentationV1, manualTitleOverride: trace.manualTitleOverride === true });
}

export function canonicalArtifactTechnologyChecks(parameters: Record<string, unknown>) {
  // Explicit accepted standalone and composite placement input contracts.
  const waterInWinter = (parameters.winter_mode === true && parameters.curing_method === "water")
    || (parameters.placement_winter_mode === true && parameters.placement_curing_method === "water");
  return waterInWinter ? [{ code: "WATER_CURING_FREEZING_CONDITIONS_REQUIRED", status: "CONDITION_REQUIRED",
    messageRu: "Зимний режим и водный уход: температурные условия во время увлажнения и после снятия защиты, защита от замерзания и выбранная проектная технология не подтверждены. Наличие прогрева само по себе не подтверждает совместимость.",
    sourceUrl: "https://www.nrmca.org/wp-content/uploads/2021/01/27pr.pdf" }] : [];
}

/** The accepted cage assembly resource already owns the total BBS mass. */
export function canonicalArtifactWorkMeasure(rows: readonly CanonicalArtifactRow[]) {
  const row = rows.find(candidate => candidate.row_id === "work:rebar-cage:assemble-install"
    && objectValue(candidate.calculation_trace).formulaId === "rebar_cage_assembly_weight_v1" && candidate.unit_id === "kg");
  if (!row) return null;
  const trace = objectValue(row.calculation_trace);
  const value = trace.calculatedQuantityBeforeOverride ?? row.quantity;
  if (typeof value !== "string" || !isFormulaGraphExactDecimal(value)) return null;
  const operation = canonicalEstimateOperationReference(objectValue(trace.resourceGraph).operationCompositionV1);
  return { rowId: String(row.row_id), value, unitId: "kg", titleRu: operation?.groupTitleRu ?? null };
}

function projectProcurementRow(row: CanonicalArtifactRow, parameters: Record<string, unknown>) {
  const calculationTrace = objectValue(row.calculation_trace);
  const purchaseBalance = canonicalArtifactPurchaseBalance(row);
  const materialQuantity = purchaseBalance ? null : canonicalMaterialQuantityBasisFromRow({
    rowId: String(row.row_id),
    quantity: Number(row.quantity),
    sourceParameters: {
      smartEstimateProjectionV2: {
        formulaExplanation: {
          resourceGraph: calculationTrace.resourceGraph,
        },
      },
    },
  });
  const netQuantity = purchaseBalance?.netQuantity ?? materialQuantity?.netQuantity ?? row.quantity;
  const grossQuantity = purchaseBalance?.grossQuantity ?? materialQuantity?.grossQuantity ?? row.quantity;
  const procurementQuantity = purchaseBalance?.procurementQuantity ?? materialQuantity?.procurementQuantity ?? row.quantity;
  const operation = canonicalEstimateOperationReference(objectValue(calculationTrace.resourceGraph).operationCompositionV1);
  return {
    rowId: String(row.row_id),
    ordinal: Number(row.ordinal),
    section: String(row.section ?? ""),
    category: String(row.category ?? ""),
    titleRu: canonicalArtifactVisibleRowTitle(row, parameters),
    unitId: purchaseBalance?.unitId ?? materialQuantity?.procurementUnit ?? String(row.unit_id ?? ""),
    quantity: decimalText(procurementQuantity),
    netQuantity: decimalText(netQuantity),
    grossQuantity: decimalText(grossQuantity),
    procurementQuantity: decimalText(procurementQuantity),
    procurementUnit: purchaseBalance?.unitId ?? materialQuantity?.procurementUnit ?? String(row.unit_id ?? ""),
    procurementPackageSize: decimalText(purchaseBalance?.procurementPackageSize ?? materialQuantity?.procurementPackageSize),
    materialQuantityBasis: purchaseBalance ?? materialQuantity,
    purchaseBalance,
    rentalBasis: canonicalArtifactRentalBasis(row, parameters),
    specifications: canonicalArtifactSpecificationParts(row, parameters),
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
    ...(operation ? { operation } : {}),
  };
}

export function buildCanonicalProcurementProjection(input: {
  revision: CanonicalArtifactRevision;
  procurementRows: CanonicalArtifactRow[];
  sourceRows?: CanonicalArtifactRow[];
}) {
  assertCanonicalPurchaseReadinessV1(input.sourceRows ?? input.procurementRows);
  const parameters = objectValue(input.revision.input_parameters);
  const technologyChecks = canonicalArtifactTechnologyChecks(parameters);
  if (technologyChecks.length) throw Object.assign(new Error(technologyChecks[0]!.messageRu), {
    code: "PROCUREMENT_TECHNOLOGY_COMPATIBILITY_REQUIRED", technologyChecks,
  });
  const rows = input.procurementRows.map(row => {
    const projected = projectProcurementRow(row, parameters);
    const consumptionAllocations = (input.sourceRows ?? []).flatMap(member => {
      const trace = objectValue(member.calculation_trace), graph = objectValue(trace.resourceGraph);
      const descriptor = objectValue(graph.purchaseConsumptionAllocationV1);
      if (descriptor.contractVersion !== "canonical-purchase-consumption-allocation/v1" || descriptor.ownerRowId !== projected.rowId) return [];
      if (graph.costTreatment !== "INCLUDED_IN_RESOURCE_ROWS" || member.included_in_estimate !== false
        || member.included_in_procurement !== false || graph.includedInResourceOwnerRowId !== projected.rowId
        || member.unit_id !== projected.unitId || !projected.purchaseBalance
        || typeof member.quantity !== "string" || !isFormulaGraphExactDecimal(member.quantity)
        || (trace.calculatedQuantityBeforeOverride != null && (typeof trace.calculatedQuantityBeforeOverride !== "string"
          || compareFormulaGraphDecimals(member.quantity, trace.calculatedQuantityBeforeOverride) !== 0))) {
        throw Object.assign(new Error("Распределение расхода общей поставки не соответствует сохранённой расчётной строке"), { code: "PROCUREMENT_CONSUMPTION_ALLOCATION_INVALID" });
      }
      return [{ rowId: String(member.row_id), ownerRowId: projected.rowId, unitId: projected.unitId,
        consumed: member.quantity, titleRu: canonicalArtifactVisibleRowTitle(member, parameters),
        operation: canonicalEstimateOperationReference(graph.operationCompositionV1), separatelyPayable: false,
        rowSha256: nullableText(member.row_sha256) }];
    });
    return { ...projected, ...(consumptionAllocations.length ? { consumptionAllocations } : {}) };
  });
  const workMeasure = canonicalArtifactWorkMeasure(input.sourceRows ?? input.procurementRows);
  const groups = new Map<string, { section: string; category: string; rowIds: string[] }>();
  const operationGroups = new Map<string, { operation: NonNullable<ReturnType<typeof canonicalEstimateOperationReference>>; rowIds: string[] }>();
  for (const row of rows) {
    const key = `${row.section}\u0000${row.category}`;
    const group = groups.get(key) ?? { section: row.section, category: row.category, rowIds: [] };
    group.rowIds.push(row.rowId);
    groups.set(key, group);
    if (row.operation) {
      const operationKey = JSON.stringify([row.operation.groupId, row.operation.operationId]);
      const allocation = operationGroups.get(operationKey) ?? { operation: row.operation, rowIds: [] };
      allocation.rowIds.push(row.rowId);
      operationGroups.set(operationKey, allocation);
    }
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
    displayTitleRu: workMeasure?.titleRu ? `${workMeasure.titleRu} — ${canonicalArtifactQuantity(workMeasure.value)} кг` : nullableText(revision.display_title_ru),
    sourceDisplayTitleRu: nullableText(revision.display_title_ru),
    workMeasure,
    primaryMeasure: {
      parameterId: workMeasure ? null : nullableText(revision.primary_measure_parameter_id),
      value: workMeasure?.value ?? decimalText(revision.primary_measure_value),
      unitId: workMeasure?.unitId ?? nullableText(revision.primary_measure_unit_id),
      sourceRowId: workMeasure?.rowId ?? null,
    },
    sourcePrimaryMeasure: {
      parameterId: nullableText(revision.primary_measure_parameter_id), value: decimalText(revision.primary_measure_value),
      unitId: nullableText(revision.primary_measure_unit_id),
    },
    selectedRowCount: rows.length,
    preliminaryNeedsExcludedCount: canonicalArtifactPreliminaryNeeds(revision).length,
    groups: [...groups.values()],
    operationGroups: [...operationGroups.values()],
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
  definitionVersionId?: string | null;
  pageCount?: number | null;
  grandTotalStatus?: "COMPLETE" | "PARTIAL_NEEDS_PRICE" | null;
}) {
  return {
    artifactKind: input.operation,
    renderer: input.renderer,
    ...(input.operation === "professional_pdf"
      ? { templateVersion: CANONICAL_PROFESSIONAL_PDF_TEMPLATE_VERSION }
      : {}),
    sourceRevisionChecksumSha256: String(input.revision.checksum_sha256),
    revisionId: String(input.revision.id),
    definitionVersionId: nullableText(input.definitionVersionId),
    sourceReleaseId: String(input.revision.release_id),
    sourceCatalogId: String(input.revision.catalog_id),
    sourceRequestHash: nullableText(input.revision.source_request_hash),
    displayTitleRu: nullableText(input.revision.display_title_ru),
    sourceOwnerUserId: nullableText(input.revision.owner_user_id),
    sourceOrganizationId: nullableText(input.revision.organization_id),
    sourceRowCount: input.sourceRowCount,
    projectedRowCount: input.projectedRowCount,
    rowCount: input.projectedRowCount,
    grandTotalStatus: input.grandTotalStatus ?? null,
    pageCount: input.pageCount ?? null,
    generatorVersion: input.renderer,
    selectedProcurementRowCount: input.operation === "procurement"
      ? input.selectedProcurementRowCount
      : null,
    includesExcludedDisposition: false,
    includesParametersAndTotals: true,
  };
}

export function canonicalProfessionalArtifactMetadataIdentityMatches(input: {
  metadata: unknown;
  revision: CanonicalArtifactRevision;
}): boolean {
  const metadata = objectValue(input.metadata);
  const templateVersion = nullableText(metadata.templateVersion);
  const versionMatch = templateVersion?.match(/^professional-estimate-pdf:([1-9]\d*)$/);
  const version = Number(versionMatch?.[1]);
  const currentVersion = Number(CANONICAL_PROFESSIONAL_PDF_TEMPLATE_VERSION.split(":")[1]);
  if (!versionMatch || !Number.isSafeInteger(version) || version > currentVersion) return false;
  // Version 6 introduced the bound revision/definition/page metadata contract.
  // Later renderer changes must keep validating it for historical documents.
  // Versions 1–5 still use the outer artifact revision/checksum identity guard.
  if (version < 6) return true;
  const definitionVersionId = nullableText(metadata.definitionVersionId);
  const expectedDefinitionVersionId = nullableText(
    input.revision.definition_version_id ?? input.revision.definitionVersionId,
  );
  const pageCount = Number(metadata.pageCount);
  return metadata.artifactKind === "professional_pdf"
    && nullableText(metadata.revisionId) === nullableText(input.revision.id)
    && definitionVersionId != null
    && (!expectedDefinitionVersionId || definitionVersionId === expectedDefinitionVersionId)
    && Number.isInteger(pageCount)
    && pageCount > 0
    && ["COMPLETE", "PARTIAL_NEEDS_PRICE"].includes(String(metadata.grandTotalStatus ?? ""));
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

export function canonicalArtifactVisibleRowTitle(row: Record<string, unknown>, parameters?: Record<string, unknown>): string {
  const sourceNameRu = String(row.title_ru ?? "").trim();
  if (objectValue(row.calculation_trace).manualTitleOverride === true) return sourceNameRu;
  const presentation = canonicalArtifactPublicResourcePresentationV1(row);
  if (presentation) return presentation.nameRu;
  const graph = objectValue(objectValue(row.calculation_trace).resourceGraph);
  if (parameters && graph.titleSpecificationMode === "APPEND") {
    const ids = Array.isArray(graph.titleSpecificationParameterIds) ? graph.titleSpecificationParameterIds
      : graph.titleSpecificationParameterId ? [graph.titleSpecificationParameterId] : [];
    const separator = typeof graph.titleSpecificationSeparator === "string" ? graph.titleSpecificationSeparator : " ";
    const spec = ids.map(id => nullableText(parameters[String(id)])).filter(Boolean).join(separator);
    if (spec && sourceNameRu.endsWith(separator + spec)) {
      const base = sourceNameRu.slice(0, -(separator + spec).length).trim();
      if (base) return localizeKnownTechnologyVariantSuffixRu(base);
    }
  }
  // The compiler has already appended or replaced this title using declared
  // project specification parameters. Public generic-name aliases must not
  // remove the selected model, compatibility or contents from the saved row.
  const specificationIds = graph.titleSpecificationParameterIds;
  if (nullableText(graph.titleSpecificationParameterId)
    || (Array.isArray(specificationIds) && specificationIds.some(id => typeof id === "string" && id.trim()))) return localizeKnownTechnologyVariantSuffixRu(sourceNameRu);
  return normalizePublicBoqNameRu({ sourceNameRu });
}

export function canonicalArtifactUnit(row: Record<string, unknown>): string {
  const displayUnit = nullableText(objectValue(row.calculation_trace).displayUnitRu);
  if (displayUnit) return displayUnit;
  const unit = String(row.unit_id ?? "").trim();
  const localized: Record<string, string> = {
    set: "компл.", item: "шт.", pcs: "шт.", piece: "шт.", piece_day: "шт.·сут",
    man_hour: "чел.-ч", machine_hour: "маш.-ч", day: "сут", stage: "этап",
    t_km: "т·км", m3_km: "м³·км", kg: "кг", t: "т", l: "л", m: "м", m2: "м²", m3: "м³",
    trip: "рейс", document: "док.", ratio: "коэф.", service: "услуга",
  };
  if (unit !== "test") return localized[unit] ?? formatEstimateUnitLabel(unit);
  const semanticOwner = `${String(row.category ?? "")} ${String(row.title_ru ?? "")}`.toLocaleLowerCase("ru-RU");
  if (/при[её]м|контрол|провер/u.test(semanticOwner)) return "проверка";
  return "испыт.";
}

export function canonicalArtifactSection(row: Record<string, unknown>): string {
  // An operation section can contain both equipment and its material kits.
  // Keep the declared material type before interpreting the section label.
  if (String(row.category ?? "").trim().toLowerCase() === "material") return "Материалы";
  const identity = `${String(row.section ?? "")} ${String(row.category ?? "")}`.toLowerCase();
  if (/delivery|transport|logistic|достав|логист/u.test(identity)) return "Доставка";
  if (/equipment|machine|machinery|mechanism|механ|техник|оборуд/u.test(identity)) return "Механизмы";
  if (/material|product|waste|материал|издел/u.test(identity)) return "Материалы";
  if (/service|test|quality|control|document|услуг|испыт|контрол|пнр/u.test(identity)) return "Услуги";
  return "Работы";
}
