import type {
  ExactMaterialCurrency,
  ExactMaterialRateUnit,
  ExactPriceResolution,
  ExactPricebookSourceType,
  PricebookMaterialRate,
  PricebookMaterialRateStatus,
} from "../exactMaterialPriceEstimate/exactMaterialPriceEstimateTypes";

export const PRICEBOOK_RATEBOOK_GOVERNANCE_WAVE =
  "S_PRICEBOOK_RATEBOOK_GOVERNANCE_IMPORT_VALIDATION_CLOSEOUT_POINT_OF_NO_RETURN";

export const PRICEBOOK_RATEBOOK_GOVERNANCE_GREEN_STATUS =
  "GREEN_PRICEBOOK_RATEBOOK_GOVERNANCE_IMPORT_VALIDATION_READY";

export const GOVERNED_PRICEBOOK_CURRENT_DATE = "2026-06-12";

export type PricebookRatebookImportFormat = "csv" | "supplier_catalog" | "manual_ratebook";

export type PricebookRatebookImportRawRow = Record<string, unknown>;

export type PricebookRatebookGovernanceStatus =
  | "VERIFIED_PRICE_SELECTED"
  | "PRICE_MISSING"
  | "STALE_PRICE_BLOCKED"
  | "CONFLICTING_PRICE_BLOCKED";

export type PricebookRatebookValidationCode =
  | "PRICEBOOK_MATERIAL_ID_REQUIRED"
  | "PRICEBOOK_UNIT_REQUIRED"
  | "PRICEBOOK_CURRENCY_REQUIRED"
  | "PRICEBOOK_REGION_REQUIRED"
  | "PRICEBOOK_PRICE_STATUS_REQUIRED"
  | "PRICEBOOK_VERIFIED_PRICE_REQUIRED"
  | "PRICEBOOK_ZERO_PRICE_NOT_KNOWN"
  | "PRICEBOOK_NEGATIVE_PRICE_BLOCKED"
  | "PRICEBOOK_SUPPLIER_REQUIRED_FOR_VERIFIED_PRICE"
  | "PRICEBOOK_SOURCE_REQUIRED_FOR_VERIFIED_PRICE"
  | "PRICEBOOK_SOURCE_DATE_REQUIRED"
  | "PRICEBOOK_CONFIDENCE_RANGE_REQUIRED"
  | "PRICEBOOK_HIGH_CONFIDENCE_STALE_BLOCKED"
  | "PRICEBOOK_STALE_PRICE_DETECTED"
  | "PRICEBOOK_CONFLICTING_ACTIVE_PRICE";

export type PricebookRatebookValidationIssue = {
  code: PricebookRatebookValidationCode;
  path: string;
  message: string;
};

export type PricebookRatebookImportValidation = {
  row_number: number;
  accepted: boolean;
  blockers: PricebookRatebookValidationIssue[];
  warnings: PricebookRatebookValidationIssue[];
  normalized_entry: PricebookMaterialRate | null;
};

export type PricebookRatebookImportPreview = {
  final_status: "GREEN_PRICEBOOK_RATEBOOK_IMPORT_VALIDATION_READY" | "RED_PRICEBOOK_RATEBOOK_IMPORT_VALIDATION";
  dry_run_only: true;
  will_write_to_db: false;
  format: PricebookRatebookImportFormat;
  total_rows: number;
  accepted_rows: number;
  blocked_rows: number;
  warning_rows: number;
  source_required: true;
  supplier_required_for_verified_price: true;
  validations: PricebookRatebookImportValidation[];
};

export type PricebookSourceAuditTrail = {
  selected_rate_id: string | null;
  material_id: string;
  requested_rate_key: string | null;
  unit: string;
  region: string;
  currency: ExactMaterialCurrency;
  price_date: string;
  price_status: ExactPriceResolution["price_status"];
  source_type: ExactPricebookSourceType | null;
  source_reference: string | null;
  supplier_id: string | null;
  supplier_visible_name: string | null;
  captured_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  confidence: number;
  alternatives_count: number;
  validation_failures: string[];
};

export type GovernedPriceResolution = ExactPriceResolution & {
  governance_status: PricebookRatebookGovernanceStatus;
  price_source_audit: PricebookSourceAuditTrail;
  validation_failures: string[];
};

function issue(
  code: PricebookRatebookValidationCode,
  path: string,
  message: string,
): PricebookRatebookValidationIssue {
  return { code, path, message };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | null {
  const normalized = text(value);
  return normalized.length > 0 ? normalized : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const normalized = Number(value.replace(/\s+/g, "").replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
}

function booleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = text(value).toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function normalizeCurrency(value: unknown): ExactMaterialCurrency | null {
  const currency = text(value).toUpperCase();
  if (currency === "KGS" || currency === "USD" || currency === "RUB" || currency === "EUR") return currency;
  return null;
}

function normalizeStatus(value: unknown): PricebookMaterialRateStatus | null {
  const status = text(value).toUpperCase();
  if (status === "VERIFIED" || status === "MISSING" || status === "STALE" || status === "CONFLICTING") return status;
  return null;
}

function normalizeSourceType(value: unknown): ExactPricebookSourceType | null {
  const sourceType = text(value);
  if (
    sourceType === "seeded_ratebook"
    || sourceType === "supplier_catalog"
    || sourceType === "manual_verified"
    || sourceType === "imported_csv"
  ) {
    return sourceType;
  }
  return null;
}

function pick(row: PricebookRatebookImportRawRow, ...keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  return undefined;
}

function day(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function isActiveForDate(rate: Pick<PricebookMaterialRate, "valid_from" | "valid_to">, priceDate: string): boolean {
  const requestedDay = priceDate.slice(0, 10);
  if (rate.valid_from && requestedDay < rate.valid_from) return false;
  if (rate.valid_to && requestedDay > rate.valid_to) return false;
  return true;
}

function rateId(rate: PricebookMaterialRate): string {
  return [
    rate.material_id,
    rate.unit,
    rate.currency,
    rate.region,
    rate.supplier_id ?? "supplier_missing",
    rate.source_reference ?? "source_missing",
    rate.valid_from ?? "valid_from_missing",
  ].join(":");
}

function rateMatches(rate: PricebookMaterialRate, materialId: string, rateKey: string | null): boolean {
  if (rate.material_id === materialId || rate.material_id === rateKey) return true;
  return Boolean(rateKey && rate.rate_key_aliases?.includes(rateKey));
}

function normalizeRawImportRow(row: PricebookRatebookImportRawRow): PricebookMaterialRate | null {
  const currency = normalizeCurrency(pick(row, "currency"));
  const priceStatus = normalizeStatus(pick(row, "price_status", "status"));
  const sourceType = normalizeSourceType(pick(row, "source_type", "sourceType"));
  const materialId = text(pick(row, "material_id", "materialId", "rate_key", "rateKey"));
  const unit = text(pick(row, "unit")) as ExactMaterialRateUnit;
  const region = text(pick(row, "region"));
  if (!currency || !priceStatus || !sourceType || !materialId || !unit || !region) return null;

  const aliasesText = text(pick(row, "rate_key_aliases", "aliases"));
  return {
    material_id: materialId,
    material_visible_name_ru: text(pick(row, "material_visible_name_ru", "materialName", "name")) || materialId,
    category: text(pick(row, "category")) || "materials",
    unit,
    visible_unit_ru: text(pick(row, "visible_unit_ru", "visibleUnit")) || unit,
    price_value: numberValue(pick(row, "price_value", "priceValue", "price")),
    currency,
    price_status: priceStatus,
    supplier_id: optionalText(pick(row, "supplier_id", "supplierId")),
    supplier_visible_name: optionalText(pick(row, "supplier_visible_name", "supplierName")),
    region,
    captured_at: text(pick(row, "captured_at", "capturedAt", "checked_at", "checkedAt")),
    valid_from: day(text(pick(row, "valid_from", "validFrom", "effective_from", "effectiveFrom"))),
    valid_to: day(text(pick(row, "valid_to", "validTo", "effective_to", "effectiveTo"))),
    source_type: sourceType,
    source_reference: optionalText(pick(row, "source_reference", "sourceReference", "source_id", "sourceId")),
    confidence: numberValue(pick(row, "confidence")) ?? Number.NaN,
    tax_included: booleanValue(pick(row, "tax_included", "taxIncluded")),
    delivery_included: booleanValue(pick(row, "delivery_included", "deliveryIncluded")),
    fake_price_claimed: false,
    rate_key_aliases: aliasesText
      ? aliasesText.split(/[|,;]/g).map((alias) => alias.trim()).filter(Boolean)
      : [materialId],
  };
}

export function validatePricebookRatebookEntry(
  rate: PricebookMaterialRate,
  options: { asOfDate?: string; path?: string } = {},
): { blockers: PricebookRatebookValidationIssue[]; warnings: PricebookRatebookValidationIssue[] } {
  const path = options.path ?? "rate";
  const asOfDate = options.asOfDate ?? GOVERNED_PRICEBOOK_CURRENT_DATE;
  const blockers: PricebookRatebookValidationIssue[] = [];
  const warnings: PricebookRatebookValidationIssue[] = [];
  const verified = rate.price_status === "VERIFIED";
  const staleByDate = !isActiveForDate(rate, asOfDate) || rate.price_status === "STALE";

  if (!rate.material_id.trim()) blockers.push(issue("PRICEBOOK_MATERIAL_ID_REQUIRED", `${path}.material_id`, "Material id is required."));
  if (!String(rate.unit).trim()) blockers.push(issue("PRICEBOOK_UNIT_REQUIRED", `${path}.unit`, "Unit is required."));
  if (!/^[A-Z]{3}$/.test(rate.currency)) blockers.push(issue("PRICEBOOK_CURRENCY_REQUIRED", `${path}.currency`, "Currency must be a three-letter code."));
  if (!rate.region.trim()) blockers.push(issue("PRICEBOOK_REGION_REQUIRED", `${path}.region`, "Region is required."));
  if (!rate.price_status) blockers.push(issue("PRICEBOOK_PRICE_STATUS_REQUIRED", `${path}.price_status`, "Price status is required."));

  if (verified && (rate.price_value == null || !Number.isFinite(rate.price_value))) {
    blockers.push(issue("PRICEBOOK_VERIFIED_PRICE_REQUIRED", `${path}.price_value`, "Verified prices require a numeric price."));
  }
  if (rate.price_value != null && rate.price_value < 0) {
    blockers.push(issue("PRICEBOOK_NEGATIVE_PRICE_BLOCKED", `${path}.price_value`, "Negative prices are blocked."));
  }
  if (verified && rate.price_value === 0) {
    blockers.push(issue("PRICEBOOK_ZERO_PRICE_NOT_KNOWN", `${path}.price_value`, "Zero cannot be used as a known verified price."));
  }
  if (verified && (!rate.supplier_id?.trim() || !rate.supplier_visible_name?.trim())) {
    blockers.push(issue(
      "PRICEBOOK_SUPPLIER_REQUIRED_FOR_VERIFIED_PRICE",
      `${path}.supplier_id`,
      "Verified prices require supplier identity.",
    ));
  }
  if (verified && (!rate.source_reference?.trim() || !rate.source_type)) {
    blockers.push(issue(
      "PRICEBOOK_SOURCE_REQUIRED_FOR_VERIFIED_PRICE",
      `${path}.source_reference`,
      "Verified prices require source type and source reference.",
    ));
  }
  if (verified && !rate.captured_at.trim() && !rate.valid_from) {
    blockers.push(issue("PRICEBOOK_SOURCE_DATE_REQUIRED", `${path}.captured_at`, "Verified prices require a captured or valid-from date."));
  }
  if (!Number.isFinite(rate.confidence) || rate.confidence < 0 || rate.confidence > 1) {
    blockers.push(issue("PRICEBOOK_CONFIDENCE_RANGE_REQUIRED", `${path}.confidence`, "Confidence must be between 0 and 1."));
  }
  if (staleByDate) {
    warnings.push(issue("PRICEBOOK_STALE_PRICE_DETECTED", `${path}.valid_to`, "Rate is not fresh for the requested price date."));
    if (rate.confidence > 0.8) {
      blockers.push(issue("PRICEBOOK_HIGH_CONFIDENCE_STALE_BLOCKED", `${path}.confidence`, "Stale prices cannot remain high confidence."));
    }
  }

  return { blockers, warnings };
}

function conflictKey(rate: PricebookMaterialRate): string {
  return [rate.material_id, rate.unit, rate.currency, rate.region].join(":");
}

function addConflictBlockers(
  validations: PricebookRatebookImportValidation[],
  asOfDate: string,
): PricebookRatebookImportValidation[] {
  const groups = new Map<string, PricebookRatebookImportValidation[]>();
  for (const validation of validations) {
    const rate = validation.normalized_entry;
    if (!rate || rate.price_status !== "VERIFIED" || !isActiveForDate(rate, asOfDate)) continue;
    const key = conflictKey(rate);
    groups.set(key, [...(groups.get(key) ?? []), validation]);
  }

  for (const group of groups.values()) {
    const prices = new Set(group.map((item) => item.normalized_entry?.price_value).filter((value) => value != null));
    const suppliers = new Set(group.map((item) => item.normalized_entry?.supplier_id).filter(Boolean));
    if (group.length > 1 && (prices.size > 1 || suppliers.size > 1)) {
      for (const validation of group) {
        validation.blockers.push(issue(
          "PRICEBOOK_CONFLICTING_ACTIVE_PRICE",
          `rows.${validation.row_number}`,
          "Only one active verified price can govern a material/unit/region/currency tuple.",
        ));
        validation.accepted = false;
      }
    }
  }
  return validations;
}

export function validatePricebookRatebookImport(input: {
  format: PricebookRatebookImportFormat;
  rows: readonly PricebookRatebookImportRawRow[];
  asOfDate?: string;
}): PricebookRatebookImportPreview {
  const asOfDate = input.asOfDate ?? GOVERNED_PRICEBOOK_CURRENT_DATE;
  const validations = addConflictBlockers(input.rows.map((row, index) => {
    const rowNumber = index + 1;
    const normalized = normalizeRawImportRow(row);
    const blockers: PricebookRatebookValidationIssue[] = [];
    if (!normalized) {
      blockers.push(issue(
        "PRICEBOOK_PRICE_STATUS_REQUIRED",
        `rows.${rowNumber}`,
        "Import row must include material, unit, region, currency, source type, and price status.",
      ));
      return {
        row_number: rowNumber,
        accepted: false,
        blockers,
        warnings: [],
        normalized_entry: null,
      };
    }
    const result = validatePricebookRatebookEntry(normalized, { asOfDate, path: `rows.${rowNumber}` });
    return {
      row_number: rowNumber,
      accepted: result.blockers.length === 0,
      blockers: result.blockers,
      warnings: result.warnings,
      normalized_entry: normalized,
    };
  }), asOfDate);

  const acceptedRows = validations.filter((validation) => validation.blockers.length === 0).length;
  const warningRows = validations.filter((validation) => validation.warnings.length > 0).length;
  const blockedRows = validations.length - acceptedRows;

  return {
    final_status: blockedRows === 0
      ? "GREEN_PRICEBOOK_RATEBOOK_IMPORT_VALIDATION_READY"
      : "RED_PRICEBOOK_RATEBOOK_IMPORT_VALIDATION",
    dry_run_only: true,
    will_write_to_db: false,
    format: input.format,
    total_rows: validations.length,
    accepted_rows: acceptedRows,
    blocked_rows: blockedRows,
    warning_rows: warningRows,
    source_required: true,
    supplier_required_for_verified_price: true,
    validations,
  };
}

export function parsePricebookRatebookCsv(csvText: string): PricebookRatebookImportRawRow[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }
    if (char === "\"") {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += char;
  }
  row.push(current);
  if (row.some((cell) => cell.trim().length > 0)) rows.push(row);

  const headers = rows[0]?.map((header) => header.trim()) ?? [];
  return rows.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );
}

function emptyAudit(input: {
  materialId: string;
  rateKey: string | null;
  unit: string;
  region: string;
  currency: ExactMaterialCurrency;
  priceDate: string;
  priceStatus: ExactPriceResolution["price_status"];
  governanceStatus: PricebookRatebookGovernanceStatus;
  alternativesCount: number;
  validationFailures?: string[];
}): GovernedPriceResolution {
  const audit: PricebookSourceAuditTrail = {
    selected_rate_id: null,
    material_id: input.materialId,
    requested_rate_key: input.rateKey,
    unit: input.unit,
    region: input.region,
    currency: input.currency,
    price_date: input.priceDate,
    price_status: input.priceStatus,
    source_type: null,
    source_reference: null,
    supplier_id: null,
    supplier_visible_name: null,
    captured_at: null,
    valid_from: null,
    valid_to: null,
    confidence: input.priceStatus === "PRICE_MISSING" ? 0.35 : 0.2,
    alternatives_count: input.alternativesCount,
    validation_failures: input.validationFailures ?? [],
  };
  return {
    material_id: input.materialId,
    requested_rate_key: input.rateKey,
    requested_unit: input.unit,
    region: input.region,
    price_date: input.priceDate,
    currency: input.currency,
    price_status: input.priceStatus,
    rate: null,
    price_value: null,
    supplier_id: null,
    supplier_visible_name: null,
    captured_at: null,
    valid_from: null,
    valid_to: null,
    source_type: null,
    source_reference: null,
    confidence: audit.confidence,
    alternatives_count: input.alternativesCount,
    fake_price_claimed: false,
    fake_supplier_claimed: false,
    governance_status: input.governanceStatus,
    price_source_audit: audit,
    validation_failures: audit.validation_failures,
  };
}

function selectedAudit(input: {
  rate: PricebookMaterialRate;
  materialId: string;
  rateKey: string | null;
  unit: string;
  region: string;
  currency: ExactMaterialCurrency;
  priceDate: string;
  alternativesCount: number;
}): PricebookSourceAuditTrail {
  return {
    selected_rate_id: rateId(input.rate),
    material_id: input.materialId,
    requested_rate_key: input.rateKey,
    unit: input.unit,
    region: input.region,
    currency: input.currency,
    price_date: input.priceDate,
    price_status: "VERIFIED",
    source_type: input.rate.source_type,
    source_reference: input.rate.source_reference,
    supplier_id: input.rate.supplier_id,
    supplier_visible_name: input.rate.supplier_visible_name,
    captured_at: input.rate.captured_at,
    valid_from: input.rate.valid_from,
    valid_to: input.rate.valid_to,
    confidence: input.rate.confidence,
    alternatives_count: input.alternativesCount,
    validation_failures: [],
  };
}

function byMostRecent(left: PricebookMaterialRate, right: PricebookMaterialRate): number {
  return String(right.valid_from ?? right.captured_at).localeCompare(String(left.valid_from ?? left.captured_at));
}

export function resolveGovernedRatebookPrice(input: {
  materialId: string;
  rateKey?: string | null;
  unit: string;
  region: string;
  priceDate: string;
  currency: ExactMaterialCurrency;
  preferredSupplierId?: string | null;
  rates: readonly PricebookMaterialRate[];
}): GovernedPriceResolution {
  const rateKey = input.rateKey ?? null;
  const candidates = input.rates
    .filter((rate) => rate.region === input.region)
    .filter((rate) => rate.currency === input.currency)
    .filter((rate) => rate.unit === input.unit)
    .filter((rate) => rateMatches(rate, input.materialId, rateKey));

  if (candidates.length === 0) {
    return emptyAudit({
      materialId: input.materialId,
      rateKey,
      unit: input.unit,
      region: input.region,
      currency: input.currency,
      priceDate: input.priceDate,
      priceStatus: "PRICE_MISSING",
      governanceStatus: "PRICE_MISSING",
      alternativesCount: 0,
    });
  }

  const activeCandidates = candidates.filter((rate) => isActiveForDate(rate, input.priceDate));
  const validationFailures = activeCandidates.flatMap((rate) =>
    validatePricebookRatebookEntry(rate, { asOfDate: input.priceDate, path: rate.material_id }).blockers.map((item) => item.code),
  );
  const verified = activeCandidates
    .filter((rate) => rate.price_status === "VERIFIED")
    .filter((rate) => rate.price_value != null && rate.price_value > 0)
    .filter((rate) => validatePricebookRatebookEntry(rate, { asOfDate: input.priceDate }).blockers.length === 0);

  const distinctPrices = new Set(verified.map((rate) => rate.price_value));
  const distinctSuppliers = new Set(verified.map((rate) => rate.supplier_id).filter(Boolean));
  if (verified.length > 1 && (distinctPrices.size > 1 || distinctSuppliers.size > 1)) {
    return emptyAudit({
      materialId: input.materialId,
      rateKey,
      unit: input.unit,
      region: input.region,
      currency: input.currency,
      priceDate: input.priceDate,
      priceStatus: "CONFLICTING",
      governanceStatus: "CONFLICTING_PRICE_BLOCKED",
      alternativesCount: verified.length,
      validationFailures: ["PRICEBOOK_CONFLICTING_ACTIVE_PRICE"],
    });
  }

  const preferred = input.preferredSupplierId
    ? verified.filter((rate) => rate.supplier_id === input.preferredSupplierId)
    : [];
  const selected = (preferred.length > 0 ? preferred : verified).slice().sort(byMostRecent)[0] ?? null;
  if (selected && selected.price_value != null) {
    const alternativesCount = Math.max(0, verified.length - 1);
    const audit = selectedAudit({
      rate: selected,
      materialId: input.materialId,
      rateKey,
      unit: input.unit,
      region: input.region,
      currency: input.currency,
      priceDate: input.priceDate,
      alternativesCount,
    });
    return {
      material_id: input.materialId,
      requested_rate_key: rateKey,
      requested_unit: input.unit,
      region: input.region,
      price_date: input.priceDate,
      currency: input.currency,
      price_status: "VERIFIED",
      rate: selected,
      price_value: selected.price_value,
      supplier_id: selected.supplier_id,
      supplier_visible_name: selected.supplier_visible_name,
      captured_at: selected.captured_at,
      valid_from: selected.valid_from,
      valid_to: selected.valid_to,
      source_type: selected.source_type,
      source_reference: selected.source_reference,
      confidence: selected.confidence,
      alternatives_count: alternativesCount,
      fake_price_claimed: false,
      fake_supplier_claimed: false,
      governance_status: "VERIFIED_PRICE_SELECTED",
      price_source_audit: audit,
      validation_failures: [],
    };
  }

  const hasStaleCandidate = candidates.some((rate) => rate.price_status === "STALE" || !isActiveForDate(rate, input.priceDate));
  if (hasStaleCandidate) {
    return emptyAudit({
      materialId: input.materialId,
      rateKey,
      unit: input.unit,
      region: input.region,
      currency: input.currency,
      priceDate: input.priceDate,
      priceStatus: "STALE",
      governanceStatus: "STALE_PRICE_BLOCKED",
      alternativesCount: candidates.length,
      validationFailures: validationFailures.length > 0 ? [...new Set(validationFailures)] : ["PRICEBOOK_STALE_PRICE_DETECTED"],
    });
  }

  return emptyAudit({
    materialId: input.materialId,
    rateKey,
    unit: input.unit,
    region: input.region,
    currency: input.currency,
    priceDate: input.priceDate,
    priceStatus: "PRICE_MISSING",
    governanceStatus: "PRICE_MISSING",
    alternativesCount: candidates.length,
    validationFailures: [...new Set(validationFailures)],
  });
}
