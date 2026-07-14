import { normalizeCanonicalProfessionalBoqUnit } from "./canonicalUnits";
import type { ProfessionalBoqRow } from "./estimateDraftRevisionContract";
import {
  evaluateProfessionalCostCoveragePolicy,
} from "./professionalCostCoveragePolicy";
import type {
  ProfessionalCostCurrency,
  ProfessionalPriceRecord,
  ProfessionalPriceSourceRecord,
} from "./professionalPricebookContract";
import {
  getProfessionalPriceSource,
  professionalPricebookItemTypeForCostRowType,
  professionalPricebookNomenclatureId,
  resolveProfessionalPriceRecord,
} from "./professionalPricebookRegistry";
import type {
  ProfessionalCostLine,
  ProfessionalCostPriceState,
  ProfessionalCostRowType,
  ProfessionalCostingResult,
  ProfessionalCostSourceTrace,
  ProfessionalCostSummary,
} from "./professionalCostingContract";
import { validateProfessionalCostingPolicy } from "./professionalCostingPolicy";
import type { ProfessionalBoqRecipeRow, ProfessionalWorkPassport, WorkPassportRowType } from "./workPassportContract";

const DEFAULT_CURRENCY: ProfessionalCostCurrency = "KGS";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function costRowTypeFromText(
  rowType: WorkPassportRowType | ProfessionalBoqRow["rowType"],
  text: string,
): ProfessionalCostRowType {
  const normalized = text.toLowerCase();
  if (rowType === "transport" && /mobilization|mobilisation|delivery|logistics/.test(normalized)) return "mobilization";
  if (rowType === "service" && /overhead|site_overhead|tax|quality_control/.test(normalized)) return "overhead";
  if (
    rowType === "work" ||
    rowType === "material" ||
    rowType === "labor" ||
    rowType === "service" ||
    rowType === "equipment" ||
    rowType === "transport"
  ) {
    return rowType;
  }
  return "service";
}

function priceStateFor(record: ProfessionalPriceRecord | null): ProfessionalCostPriceState {
  if (!record) return "missing_price";
  if (record.sourceType === "supplier_quote" || record.sourceType === "public_catalog") return "source_price";
  if (record.sourceType === "internal_pricebook") return "internal_pricebook";
  if (record.sourceType === "expert_review") return "expert_reviewed_price";
  return "preliminary_market_assumption";
}

function trustedForPreliminary(record: ProfessionalPriceRecord | null): boolean {
  return Boolean(record && record.trustLevel !== "untrusted" && record.unitPrice > 0);
}

function trustedForContract(record: ProfessionalPriceRecord | null): boolean {
  return Boolean(record && record.trustLevel === "trusted_contract" && record.unitPrice > 0);
}

function limitations(record: ProfessionalPriceRecord | null, source: ProfessionalPriceSourceRecord | null): string[] {
  if (!record) return ["missing_price_visible", "line_subtotal_not_calculated"];
  const result = [
    record.trustLevel === "trusted_contract" ? "" : "preliminary_only_not_contract_total",
    record.sourceType === "market_assumption" ? "market_assumption_requires_review_before_contract" : "",
    source?.sourceUrl ? "" : "source_metadata_without_public_url",
    record.notes ?? "",
  ].filter(Boolean);
  return result.length > 0 ? result : ["priced_from_governed_pricebook_record"];
}

export function extractProfessionalCostQuantityFromTrace(trace: string | null | undefined): number | null {
  const value = String(trace ?? "");
  const matches = [...value.matchAll(/(?:^|[;\s])result\s*=\s*(-?\d+(?:\.\d+)?)/gi)];
  const last = matches[matches.length - 1]?.[1];
  const quantityMatch = last ?? value.match(/(?:^|[;\s])quantity\s*=\s*(-?\d+(?:\.\d+)?)/i)?.[1];
  if (!quantityMatch) return null;
  const quantity = Number(quantityMatch);
  return Number.isFinite(quantity) && quantity >= 0 ? quantity : null;
}

function currencyFor(record: ProfessionalPriceRecord | null, fallback?: string | null): ProfessionalCostCurrency {
  const value = record?.currency ?? fallback ?? DEFAULT_CURRENCY;
  return value === "USD" || value === "EUR" || value === "RUB" ? value : "KGS";
}

function lineFromResolved(input: {
  rowId: string;
  templateId: string;
  family: string;
  rowType: ProfessionalCostRowType;
  name: string;
  quantity: number;
  unit: string;
  currency?: string | null;
  record: ProfessionalPriceRecord | null;
  source: ProfessionalPriceSourceRecord | null;
}): ProfessionalCostLine {
  const unitPrice = input.record?.unitPrice ?? null;
  return {
    rowId: input.rowId,
    templateId: input.templateId,
    family: input.family,
    rowType: input.rowType,
    name: input.name,
    quantity: input.quantity,
    unit: input.unit,
    priceState: priceStateFor(input.record),
    unitPrice,
    currency: currencyFor(input.record, input.currency),
    priceSourceId: input.record?.sourceId ?? null,
    priceSourceLabel: input.record?.sourceLabel ?? null,
    priceRetrievedAt: input.record?.retrievedAt ?? null,
    priceRegion: input.record?.region ?? null,
    lineSubtotal: unitPrice == null ? null : roundMoney(input.quantity * unitPrice),
    trustedForPreliminaryTotal: trustedForPreliminary(input.record),
    trustedForContractTotal: trustedForContract(input.record),
    priceLimitations: limitations(input.record, input.source),
  };
}

function summarize(lines: readonly ProfessionalCostLine[]): ProfessionalCostSummary {
  const subtotal = (match: (line: ProfessionalCostLine) => boolean) =>
    roundMoney(lines.filter(match).reduce((sum, line) => sum + (line.lineSubtotal ?? 0), 0));
  const costRowsCount = lines.length;
  const pricedRowsCount = lines.filter((line) => line.unitPrice != null && line.lineSubtotal != null).length;
  const missingPriceRowsCount = lines.filter((line) => line.priceState === "missing_price").length;
  const policy = validateProfessionalCostingPolicy({ lines });
  const baseSummary = {
    currency: lines[0]?.currency ?? DEFAULT_CURRENCY,
    costRowsCount,
    pricedRowsCount,
    missingPriceRowsCount,
    pricedRequiredRowsPercent: costRowsCount > 0 ? Math.round(pricedRowsCount / costRowsCount * 10000) / 100 : 0,
    materialsSubtotal: subtotal((line) => line.rowType === "material"),
    laborSubtotal: subtotal((line) => line.rowType === "labor" || line.rowType === "work"),
    servicesSubtotal: subtotal((line) => line.rowType === "service"),
    equipmentSubtotal: subtotal((line) => line.rowType === "equipment"),
    transportSubtotal: subtotal((line) => line.rowType === "transport"),
    overheadMobilizationSubtotal: subtotal((line) => line.rowType === "overhead" || line.rowType === "mobilization"),
    preliminaryTotal: null as number | null,
    preliminaryTotalAllowed: false,
    contractTotalAllowed: false,
    fakePriceCount: policy.failures.filter((failure) => failure.includes("fake_price") || failure.includes("missing_price_has_unit_price")).length,
    fakeSubtotalCount: policy.failures.filter((failure) => failure.includes("subtotal")).length,
    fakeFinalTotalCount: policy.failures.filter((failure) => failure.includes("fake_final_total")).length,
    priceSourceMissingCount: lines.filter((line) => line.unitPrice != null && !line.priceSourceId).length,
    priceRegionMissingCount: lines.filter((line) => line.unitPrice != null && !line.priceRegion).length,
    priceRetrievedAtMissingCount: lines.filter((line) => line.unitPrice != null && !line.priceRetrievedAt).length,
    missingPriceRowsVisible: policy.missingPriceVisible,
  };
  const coverage = evaluateProfessionalCostCoveragePolicy({
    summary: baseSummary,
    lines,
    ownerApproved: false,
  });
  const preliminaryTotal = roundMoney(
    baseSummary.materialsSubtotal +
    baseSummary.laborSubtotal +
    baseSummary.servicesSubtotal +
    baseSummary.equipmentSubtotal +
    baseSummary.transportSubtotal +
    baseSummary.overheadMobilizationSubtotal,
  );
  return {
    ...baseSummary,
    preliminaryTotal: coverage.preliminaryCostAllowed ? preliminaryTotal : null,
    preliminaryTotalAllowed: coverage.preliminaryCostAllowed,
    contractTotalAllowed: coverage.contractTotalAllowed,
  };
}

export function buildProfessionalCostLineFromPassportRow(input: {
  passport: ProfessionalWorkPassport;
  row: ProfessionalBoqRecipeRow;
}): { line: ProfessionalCostLine; source: ProfessionalCostSourceTrace } {
  const rowType = costRowTypeFromText(input.row.rowType, `${input.row.titleRu} ${input.row.normFamilyId}`);
  const unit = normalizeCanonicalProfessionalBoqUnit(input.row.sourceUnit);
  if (!unit) throw new Error(`PROFESSIONAL_COST_UNKNOWN_UNIT:${input.row.rowId}:${input.row.sourceUnit}`);
  const quantity = extractProfessionalCostQuantityFromTrace(input.row.calculationTraceTemplate);
  if (quantity == null) throw new Error(`PROFESSIONAL_COST_QUANTITY_MISSING:${input.row.rowId}`);
  const itemType = professionalPricebookItemTypeForCostRowType(rowType);
  const nomenclatureId = professionalPricebookNomenclatureId({
    normFamilyId: input.row.normFamilyId,
    itemType,
    unit,
  });
  const record = resolveProfessionalPriceRecord({
    nomenclatureId,
    normFamilyId: input.row.normFamilyId,
    rowType,
    unit,
  });
  const priceSource = getProfessionalPriceSource(record?.sourceId);
  const line = lineFromResolved({
    rowId: input.row.rowId,
    templateId: input.passport.templateId,
    family: input.passport.familyId,
    rowType,
    name: input.row.titleRu,
    quantity,
    unit,
    record,
    source: priceSource,
  });
  return {
    line,
    source: {
      rowId: input.row.rowId,
      priceRecord: record,
      priceSource,
      priceItemType: itemType,
      priceTrustLevel: record?.trustLevel ?? null,
    },
  };
}

export function calculateProfessionalCostForPassport(
  passport: ProfessionalWorkPassport,
): ProfessionalCostingResult {
  const resolved = passport.boqRecipe.allRows.map((row) => buildProfessionalCostLineFromPassportRow({ passport, row }));
  const lines = resolved.map((item) => item.line);
  return {
    lines,
    sources: resolved.map((item) => item.source),
    summary: summarize(lines),
  };
}

export function calculateProfessionalCostForDraftRows(input: {
  templateId: string;
  family: string;
  rows: readonly ProfessionalBoqRow[];
}): ProfessionalCostingResult {
  const resolved = input.rows.map((row) => {
    const rowType = costRowTypeFromText(row.rowType, `${row.titleRu} ${row.normFamilyId ?? ""}`);
    const unit = normalizeCanonicalProfessionalBoqUnit(row.unit) ?? row.unit;
    const itemType = professionalPricebookItemTypeForCostRowType(rowType);
    const record = resolveProfessionalPriceRecord({
      normFamilyId: row.normFamilyId,
      rowType,
      unit,
    });
    const priceSource = getProfessionalPriceSource(record?.sourceId);
    const line = lineFromResolved({
      rowId: row.rowId,
      templateId: input.templateId,
      family: input.family,
      rowType,
      name: row.titleRu,
      quantity: row.quantity,
      unit,
      currency: row.currency,
      record,
      source: priceSource,
    });
    return {
      line,
      source: {
        rowId: row.rowId,
        priceRecord: record,
        priceSource,
        priceItemType: itemType,
        priceTrustLevel: record?.trustLevel ?? null,
      },
    };
  });
  const lines = resolved.map((item) => item.line);
  return {
    lines,
    sources: resolved.map((item) => item.source),
    summary: summarize(lines),
  };
}
