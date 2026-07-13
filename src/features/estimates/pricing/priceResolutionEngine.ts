import { formatEstimateMoney } from "../../../lib/ai/globalEstimate/formatEstimateMoney";
import { formatEstimateUnitLabel } from "../../../lib/ai/globalEstimate/formatEstimateUnitLabel";

export type EstimatePriceSourceType =
  | "price_catalog"
  | "supplier_pricebook"
  | "market_listing"
  | "supplier_quote"
  | "manual_override"
  | "historical_purchase_price";

export type EstimateCostConfidence = "high" | "medium" | "low" | "missing";

export type EstimatePriceStatus = "priced" | "missing";

export type EstimatePriceUnitConversion = {
  from_unit: string;
  to_unit: string;
  source_quantity: number;
  display_source_quantity: string;
  source_unit_quantity: number | null;
  effective_unit_price: number | null;
  rounding_policy: "none" | "ceil_to_package" | "ceil_to_piece" | "ceil_to_canister";
  formula: string;
};

export type EstimatePriceTrace = {
  price_status: EstimatePriceStatus;
  price_source_type: EstimatePriceSourceType | null;
  price_source_id: string | null;
  currency: string;
  unit_price: number | null;
  price_unit: string | null;
  price_unit_conversion: EstimatePriceUnitConversion | null;
  price_valid_at: string | null;
  supplier_id: string | null;
  region: string | null;
  city: string | null;
  confidence: EstimateCostConfidence;
  is_manual_override: boolean;
  override_reason: string | null;
  selected_quantity: number | null;
  selected_amount: number | null;
  effective_unit_price: number | null;
  visible_source_label: string;
  calculation: string;
  missing_reason: string | null;
  previous_source?: EstimatePriceTrace | null;
};

export type EstimatePriceCandidateSummary = {
  price_source_type: EstimatePriceSourceType;
  price_source_id: string;
  currency: string;
  unit_price: number;
  price_unit: string;
  price_valid_at: string;
  supplier_id: string | null;
  region: string | null;
  city: string | null;
  confidence: Exclude<EstimateCostConfidence, "missing">;
  visible_source_label: string;
  selected_amount: number;
  effective_unit_price: number;
  price_unit_conversion: EstimatePriceUnitConversion;
};

export type EstimatePriceableRow = {
  rowId: string;
  code?: string | null;
  visibleName?: string | null;
  quantity: number;
  unit: string;
  unitPrice?: number | null;
  total?: number | null;
  currency?: string | null;
  sourceId?: string | null;
  visibleSourceLabel?: string | null;
  sourceLabel?: string | null;
  sectionType?: string | null;
  rateKey?: string | null;
  materialKey?: string | null;
  catalogItemId?: string | null;
};

export type EstimateManualPriceOverrideInput = {
  rowId: string;
  unit_price: number;
  currency?: string | null;
  price_unit?: string | null;
  source_unit_quantity?: number | null;
  override_reason: string;
  actor_user_id?: string | null;
  created_at?: string | null;
};

export type EstimatePriceResolutionContext = {
  currency?: string | null;
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
  validAt?: string | null;
  manualOverrides?: Record<string, EstimateManualPriceOverrideInput | undefined>;
};

export type ResolvedEstimatePrice = {
  unitPrice: number | null;
  total: number | null;
  displayUnitPrice: string;
  displayTotal: string;
  currency: string;
  costConfidence: EstimateCostConfidence;
  priceTrace: EstimatePriceTrace;
  priceCandidates: EstimatePriceCandidateSummary[];
};

export type ManualPriceOverrideAuditEvent = {
  type: "manual_price_override";
  row_id: string;
  actor_user_id: string | null;
  override_reason: string;
  previous_source: EstimatePriceTrace | null;
  next_source: EstimatePriceTrace;
  created_at: string;
};

type PriceCandidate = {
  price_source_type: EstimatePriceSourceType;
  price_source_id: string;
  currency: string;
  unit_price: number;
  price_unit: string;
  price_valid_at: string;
  supplier_id: string | null;
  region: string | null;
  city: string | null;
  confidence: Exclude<EstimateCostConfidence, "missing">;
  visible_source_label: string;
  package_quantity?: number | null;
  priority: number;
};

type CatalogEntry = Omit<PriceCandidate, "priority"> & {
  match_keys: string[];
  package_quantity?: number | null;
  priority?: number;
};

const DEFAULT_VALID_AT = "2026-07-02T00:00:00+06:00";
const DEFAULT_CURRENCY = "KGS";

const SOURCE_PRIORITY: Record<EstimatePriceSourceType, number> = {
  manual_override: 1,
  supplier_quote: 2,
  supplier_pricebook: 3,
  market_listing: 4,
  price_catalog: 5,
  historical_purchase_price: 6,
};

const STARTER_PRICE_CATALOG: readonly CatalogEntry[] = Object.freeze([
  entry(["apartment_screed_dry_mix"], "supplier_pricebook", "bishkek_supplier_pb_screed_25kg_2026_07", 285, "bag", "dry mix 25 kg bag, Bishkek supplier pricebook", { package_quantity: 25, confidence: "high" }),
  entry(["apartment_wall_plaster_mix"], "supplier_pricebook", "bishkek_supplier_pb_plaster_25kg_2026_07", 265, "bag", "plaster mix 25 kg bag, Bishkek supplier pricebook", { package_quantity: 25, confidence: "high" }),
  entry(["apartment_base_putty"], "supplier_pricebook", "bishkek_supplier_pb_start_putty_20kg_2026_07", 390, "bag", "start putty 20 kg bag, Bishkek supplier pricebook", { package_quantity: 20, confidence: "high" }),
  entry(["apartment_finish_putty"], "supplier_pricebook", "bishkek_supplier_pb_finish_putty_20kg_2026_07", 520, "bag", "finish putty 20 kg bag, Bishkek supplier pricebook", { package_quantity: 20, confidence: "high" }),
  entry(["apartment_wall_primer"], "supplier_pricebook", "bishkek_supplier_pb_primer_10l_2026_07", 980, "canister", "primer 10 l canister, Bishkek supplier pricebook", { package_quantity: 10, confidence: "high" }),
  entry(["apartment_wall_paint", "apartment_ceiling_paint"], "supplier_pricebook", "bishkek_supplier_pb_interior_paint_10l_2026_07", 2450, "canister", "interior paint 10 l canister, Bishkek supplier pricebook", { package_quantity: 10, confidence: "high" }),
  entry(["apartment_ceramic_tile_wet_zones", "apartment_finish_covering_waste"], "market_listing", "bishkek_market_tile_mid_2026_07", 1180, "sq_m", "ceramic tile mid-range market listing", { confidence: "medium" }),
  entry(["apartment_tile_adhesive"], "supplier_pricebook", "bishkek_supplier_pb_tile_adhesive_25kg_2026_07", 360, "bag", "tile adhesive 25 kg bag, Bishkek supplier pricebook", { package_quantity: 25, confidence: "high" }),
  entry(["apartment_floor_baseboard"], "supplier_pricebook", "bishkek_supplier_pb_baseboard_2_5m_2026_07", 690, "piece", "floor baseboard 2.5 m piece, Bishkek supplier pricebook", { package_quantity: 2.5, confidence: "high" }),
  entry(["apartment_socket_boxes", "apartment_junction_boxes"], "price_catalog", "kg_catalog_electrical_box_2026_07", 48, "pcs", "electrical box price catalog", { confidence: "medium" }),
  entry(["apartment_sockets_switches"], "supplier_pricebook", "bishkek_supplier_pb_socket_switch_2026_07", 285, "pcs", "socket/switch supplier pricebook", { confidence: "high" }),
  entry(["apartment_electrical_cable", "apartment_cable_reserve"], "supplier_pricebook", "bishkek_supplier_pb_vvgng_ls_cable_2026_07", 64, "linear_m", "VVGng-LS cable supplier pricebook", { confidence: "high" }),
  entry(["apartment_electrical_conduit"], "price_catalog", "kg_catalog_corrugated_pipe_2026_07", 34, "linear_m", "electrical conduit price catalog", { confidence: "medium" }),
  entry(["apartment_material_delivery"], "supplier_quote", "bishkek_delivery_quote_small_truck_2026_07", 4200, "trip", "small truck delivery quote, Bishkek", { confidence: "medium" }),
  entry(["apartment_material_lifting"], "historical_purchase_price", "kg_history_material_lifting_set_2026_q2", 2600, "set", "historical material lifting purchase price", { confidence: "low" }),
  entry(["apartment_debris_removal"], "supplier_quote", "bishkek_debris_removal_quote_2026_07", 3900, "trip", "construction debris removal quote, Bishkek", { confidence: "medium" }),
]);

function entry(
  match_keys: string[],
  price_source_type: EstimatePriceSourceType,
  price_source_id: string,
  unit_price: number,
  price_unit: string,
  visible_source_label: string,
  options: {
    package_quantity?: number | null;
    confidence?: Exclude<EstimateCostConfidence, "missing">;
    currency?: string;
    price_valid_at?: string;
    supplier_id?: string | null;
    region?: string | null;
    city?: string | null;
    priority?: number;
  } = {},
): CatalogEntry {
  return {
    match_keys,
    price_source_type,
    price_source_id,
    currency: options.currency ?? DEFAULT_CURRENCY,
    unit_price,
    price_unit,
    price_valid_at: options.price_valid_at ?? DEFAULT_VALID_AT,
    supplier_id: options.supplier_id ?? null,
    region: options.region ?? "KG",
    city: options.city ?? "Bishkek",
    confidence: options.confidence ?? "medium",
    visible_source_label,
    package_quantity: options.package_quantity ?? null,
    priority: options.priority,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function finitePositive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeUnit(value: string | null | undefined): string {
  const unit = String(value ?? "").trim().toLowerCase();
  if (unit === "m2" || unit === "sqm" || unit === "sq.m" || unit === "sq_m") return "sq_m";
  if (unit === "l" || unit === "lt" || unit === "liter" || unit === "litre") return "l";
  if (unit === "lm" || unit === "m" || unit === "linear_meter" || unit === "linear_m") return "linear_m";
  if (unit === "pc" || unit === "pcs" || unit === "piece") return "pcs";
  return unit;
}

function displayMoney(value: number | null, currency: string): string {
  if (value == null || !Number.isFinite(value)) return "PRICE_MISSING";
  return formatEstimateMoney(value, currency);
}

function displayTraceUnit(value: string | null | undefined): string {
  const normalized = normalizeUnit(value);
  return formatEstimateUnitLabel(normalized || value);
}

function rowKeys(row: EstimatePriceableRow): string[] {
  return [
    row.rowId,
    row.code,
    row.rateKey,
    row.materialKey,
    row.catalogItemId,
    row.visibleName,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function matchesEntry(row: EstimatePriceableRow, entry: CatalogEntry): boolean {
  const keys = rowKeys(row);
  const normalizedKeys = keys.map((key) => key.toLowerCase());
  return entry.match_keys.some((matchKey) => {
    const normalizedMatch = matchKey.toLowerCase();
    return normalizedKeys.some((key) => key === normalizedMatch || key.includes(normalizedMatch));
  });
}

function conversionFor(input: {
  quantity: number;
  rowUnit: string;
  priceUnit: string;
  packageQuantity?: number | null;
  unitPrice: number;
}): EstimatePriceUnitConversion | null {
  const rowUnit = normalizeUnit(input.rowUnit);
  const priceUnit = normalizeUnit(input.priceUnit);
  const quantity = roundQuantity(input.quantity);
  const packageQuantity = input.packageQuantity ?? null;

  if (rowUnit === priceUnit) {
    const amount = roundMoney(quantity * input.unitPrice);
    return {
      from_unit: rowUnit,
      to_unit: priceUnit,
      source_quantity: quantity,
      display_source_quantity: `${quantity} ${priceUnit}`,
      source_unit_quantity: null,
      effective_unit_price: roundMoney(amount / quantity),
      rounding_policy: "none",
      formula: `${quantity} ${rowUnit} x ${input.unitPrice} / ${priceUnit}`,
    };
  }

  if (rowUnit === "kg" && priceUnit === "bag" && finitePositive(packageQuantity)) {
    const sourceQuantity = Math.ceil(quantity / packageQuantity);
    const amount = roundMoney(sourceQuantity * input.unitPrice);
    return {
      from_unit: rowUnit,
      to_unit: priceUnit,
      source_quantity: sourceQuantity,
      display_source_quantity: `${sourceQuantity} bag x ${packageQuantity} kg`,
      source_unit_quantity: packageQuantity,
      effective_unit_price: roundMoney(amount / quantity),
      rounding_policy: "ceil_to_package",
      formula: `ceil(${quantity} kg / ${packageQuantity} kg) x ${input.unitPrice} / bag`,
    };
  }

  if (rowUnit === "l" && priceUnit === "canister" && finitePositive(packageQuantity)) {
    const sourceQuantity = Math.ceil(quantity / packageQuantity);
    const amount = roundMoney(sourceQuantity * input.unitPrice);
    return {
      from_unit: rowUnit,
      to_unit: priceUnit,
      source_quantity: sourceQuantity,
      display_source_quantity: `${sourceQuantity} canister x ${packageQuantity} l`,
      source_unit_quantity: packageQuantity,
      effective_unit_price: roundMoney(amount / quantity),
      rounding_policy: "ceil_to_canister",
      formula: `ceil(${quantity} l / ${packageQuantity} l) x ${input.unitPrice} / canister`,
    };
  }

  if (rowUnit === "linear_m" && priceUnit === "pcs" && finitePositive(packageQuantity)) {
    const sourceQuantity = Math.ceil(quantity / packageQuantity);
    const amount = roundMoney(sourceQuantity * input.unitPrice);
    return {
      from_unit: rowUnit,
      to_unit: priceUnit,
      source_quantity: sourceQuantity,
      display_source_quantity: `${sourceQuantity} piece x ${packageQuantity} linear_m`,
      source_unit_quantity: packageQuantity,
      effective_unit_price: roundMoney(amount / quantity),
      rounding_policy: "ceil_to_piece",
      formula: `ceil(${quantity} linear_m / ${packageQuantity} linear_m) x ${input.unitPrice} / piece`,
    };
  }

  return null;
}

function candidateSummary(candidate: PriceCandidate, conversion: EstimatePriceUnitConversion): EstimatePriceCandidateSummary {
  const selectedAmount = roundMoney(conversion.source_quantity * candidate.unit_price);
  return {
    price_source_type: candidate.price_source_type,
    price_source_id: candidate.price_source_id,
    currency: candidate.currency,
    unit_price: candidate.unit_price,
    price_unit: candidate.price_unit,
    price_valid_at: candidate.price_valid_at,
    supplier_id: candidate.supplier_id,
    region: candidate.region,
    city: candidate.city,
    confidence: candidate.confidence,
    visible_source_label: candidate.visible_source_label,
    selected_amount: selectedAmount,
    effective_unit_price: conversion.effective_unit_price ?? roundMoney(selectedAmount / Math.max(1, conversion.source_quantity)),
    price_unit_conversion: conversion,
  };
}

function traceFromCandidate(candidate: PriceCandidate, conversion: EstimatePriceUnitConversion): EstimatePriceTrace {
  const selectedAmount = roundMoney(conversion.source_quantity * candidate.unit_price);
  const effectiveUnitPrice = conversion.effective_unit_price ?? roundMoney(selectedAmount / Math.max(1, conversion.source_quantity));
  return {
    price_status: "priced",
    price_source_type: candidate.price_source_type,
    price_source_id: candidate.price_source_id,
    currency: candidate.currency,
    unit_price: candidate.unit_price,
    price_unit: candidate.price_unit,
    price_unit_conversion: conversion,
    price_valid_at: candidate.price_valid_at,
    supplier_id: candidate.supplier_id,
    region: candidate.region,
    city: candidate.city,
    confidence: candidate.confidence,
    is_manual_override: candidate.price_source_type === "manual_override",
    override_reason: null,
    selected_quantity: conversion.source_quantity,
    selected_amount: selectedAmount,
    effective_unit_price: effectiveUnitPrice,
    visible_source_label: candidate.visible_source_label,
    calculation: `${conversion.formula} = ${selectedAmount} ${candidate.currency}`,
    missing_reason: null,
  };
}

function missingTrace(row: EstimatePriceableRow, currency: string, reason: string): EstimatePriceTrace {
  return {
    price_status: "missing",
    price_source_type: null,
    price_source_id: null,
    currency,
    unit_price: null,
    price_unit: null,
    price_unit_conversion: null,
    price_valid_at: null,
    supplier_id: null,
    region: null,
    city: null,
    confidence: "missing",
    is_manual_override: false,
    override_reason: null,
    selected_quantity: null,
    selected_amount: null,
    effective_unit_price: null,
    visible_source_label: "PRICE_MISSING: no accepted price source",
    calculation: `${roundQuantity(row.quantity)} ${normalizeUnit(row.unit)} x PRICE_MISSING = PRICE_MISSING`,
    missing_reason: reason,
  };
}

function manualOverrideCandidate(input: {
  row: EstimatePriceableRow;
  override: EstimateManualPriceOverrideInput;
  context: EstimatePriceResolutionContext;
}): PriceCandidate {
  const reason = input.override.override_reason.trim();
  if (!reason) throw new Error(`MANUAL_PRICE_OVERRIDE_REASON_REQUIRED:${input.row.rowId}`);
  if (!finitePositive(input.override.unit_price)) throw new Error(`MANUAL_PRICE_OVERRIDE_UNIT_PRICE_INVALID:${input.row.rowId}`);
  return {
    price_source_type: "manual_override",
    price_source_id: `manual_override:${input.row.rowId}`,
    currency: input.override.currency ?? input.context.currency ?? input.row.currency ?? DEFAULT_CURRENCY,
    unit_price: input.override.unit_price,
    price_unit: input.override.price_unit ?? input.row.unit,
    price_valid_at: input.override.created_at ?? input.context.validAt ?? new Date().toISOString(),
    supplier_id: null,
    region: input.context.region ?? input.context.countryCode ?? null,
    city: input.context.city ?? null,
    confidence: "high",
    visible_source_label: `manual_override:${reason}`,
    package_quantity: input.override.source_unit_quantity ?? null,
    priority: 0,
  };
}

function catalogCandidates(row: EstimatePriceableRow): PriceCandidate[] {
  return STARTER_PRICE_CATALOG
    .filter((catalogEntry) => matchesEntry(row, catalogEntry))
    .map((catalogEntry) => ({
      ...catalogEntry,
      priority: catalogEntry.priority ?? SOURCE_PRIORITY[catalogEntry.price_source_type],
    }));
}

function historicalCandidate(row: EstimatePriceableRow, context: EstimatePriceResolutionContext): PriceCandidate | null {
  if (!finitePositive(row.unitPrice)) return null;
  const sourceId = String(row.sourceId ?? row.catalogItemId ?? row.rateKey ?? row.code ?? "").trim();
  const sourceLabel = String(row.visibleSourceLabel ?? row.sourceLabel ?? "").trim();
  if (!sourceId && !sourceLabel) return null;
  const priceSourceType: EstimatePriceSourceType = row.catalogItemId ? "price_catalog" : "historical_purchase_price";
  const confidence: Exclude<EstimateCostConfidence, "missing"> = row.catalogItemId ? "medium" : "low";
  return {
    price_source_type: priceSourceType,
    price_source_id: sourceId || `historical:${row.rowId}`,
    currency: row.currency ?? context.currency ?? DEFAULT_CURRENCY,
    unit_price: row.unitPrice,
    price_unit: row.unit,
    price_valid_at: context.validAt ?? DEFAULT_VALID_AT,
    supplier_id: null,
    region: context.region ?? context.countryCode ?? null,
    city: context.city ?? null,
    confidence,
    visible_source_label: sourceLabel || `${priceSourceType}:${sourceId || row.rowId}`,
    package_quantity: null,
    priority: SOURCE_PRIORITY[priceSourceType],
  };
}

function buildCandidates(row: EstimatePriceableRow, context: EstimatePriceResolutionContext): PriceCandidate[] {
  const candidates: PriceCandidate[] = [];
  const override = context.manualOverrides?.[row.rowId];
  if (override) candidates.push(manualOverrideCandidate({ row, override, context }));
  candidates.push(...catalogCandidates(row));
  const historical = historicalCandidate(row, context);
  if (historical) candidates.push(historical);
  return candidates;
}

function rankCandidate(left: PriceCandidate, right: PriceCandidate): number {
  if (left.priority !== right.priority) return left.priority - right.priority;
  return SOURCE_PRIORITY[left.price_source_type] - SOURCE_PRIORITY[right.price_source_type];
}

export function resolveEstimateRowPrice(
  row: EstimatePriceableRow,
  context: EstimatePriceResolutionContext = {},
): ResolvedEstimatePrice {
  const currency = row.currency ?? context.currency ?? DEFAULT_CURRENCY;
  const quantity = finitePositive(row.quantity) ? row.quantity : 0;
  if (!finitePositive(quantity)) {
    const trace = missingTrace(row, currency, "quantity_missing_or_zero");
    return {
      unitPrice: null,
      total: null,
      displayUnitPrice: "PRICE_MISSING",
      displayTotal: "PRICE_MISSING",
      currency,
      costConfidence: "missing",
      priceTrace: trace,
      priceCandidates: [],
    };
  }

  const candidateConversions = buildCandidates(row, context)
    .map((candidate) => {
      const conversion = conversionFor({
        quantity,
        rowUnit: row.unit,
        priceUnit: candidate.price_unit,
        packageQuantity: candidate.package_quantity,
        unitPrice: candidate.unit_price,
      });
      return conversion ? { candidate, conversion } : null;
    })
    .filter((value): value is { candidate: PriceCandidate; conversion: EstimatePriceUnitConversion } => Boolean(value))
    .sort((left, right) => rankCandidate(left.candidate, right.candidate));

  const priceCandidates = candidateConversions.map(({ candidate, conversion }) => candidateSummary(candidate, conversion));
  const selected = candidateConversions[0];
  if (!selected) {
    const trace = missingTrace(row, currency, "no_accepted_price_source_or_unit_conversion");
    return {
      unitPrice: null,
      total: null,
      displayUnitPrice: "PRICE_MISSING",
      displayTotal: "PRICE_MISSING",
      currency,
      costConfidence: "missing",
      priceTrace: trace,
      priceCandidates,
    };
  }

  const trace = traceFromCandidate(selected.candidate, selected.conversion);
  return {
    unitPrice: trace.effective_unit_price,
    total: trace.selected_amount,
    displayUnitPrice: `${displayMoney(trace.effective_unit_price, trace.currency)} / ${displayTraceUnit(row.unit)} (источник ${displayMoney(trace.unit_price, trace.currency)} / ${displayTraceUnit(trace.price_unit)})`,
    displayTotal: displayMoney(trace.selected_amount, trace.currency),
    currency: trace.currency,
    costConfidence: trace.confidence,
    priceTrace: trace,
    priceCandidates,
  };
}

export function priceTraceLabel(trace: EstimatePriceTrace | null | undefined): string {
  if (!trace || trace.price_status === "missing") {
    return "PRICE_MISSING: amount not calculated";
  }
  return [
    `source_type=${trace.price_source_type}`,
    `source_id=${trace.price_source_id}`,
    `confidence=${trace.confidence}`,
    `price=${trace.unit_price} ${trace.currency}/${trace.price_unit}`,
    `conversion=${trace.price_unit_conversion?.formula ?? "none"}`,
    `amount=${trace.selected_amount} ${trace.currency}`,
  ].filter(Boolean).join("; ");
}

function humanizeTraceText(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/\bsq_m\b/g, formatEstimateUnitLabel("sq_m"))
    .replace(/\blinear_m\b/g, formatEstimateUnitLabel("linear_m"))
    .replace(/\bpcs\b/g, formatEstimateUnitLabel("pcs"))
    .replace(/\bpiece\b/g, formatEstimateUnitLabel("piece"))
    .replace(/\bbag\b/g, formatEstimateUnitLabel("bag"))
    .replace(/\bcanister\b/g, formatEstimateUnitLabel("canister"))
    .replace(/\bkg\b/g, formatEstimateUnitLabel("kg"))
    .replace(/\bm3\b/g, formatEstimateUnitLabel("m3"))
    .replace(/\bl\b/g, formatEstimateUnitLabel("l"))
    .replace(/\bset\b/g, formatEstimateUnitLabel("set"))
    .replace(/\btrip\b/g, formatEstimateUnitLabel("trip"))
    .replace(/\bshift\b/g, formatEstimateUnitLabel("shift"))
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function visibleSourceTypeLabel(value: EstimatePriceSourceType | null): string {
  if (value === "price_catalog") return "\u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u0446\u0435\u043d";
  if (value === "supplier_pricebook") return "\u043f\u0440\u0430\u0439\u0441-\u043b\u0438\u0441\u0442 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0430";
  if (value === "market_listing") return "\u0440\u044b\u043d\u043e\u0447\u043d\u0430\u044f \u043f\u043e\u0437\u0438\u0446\u0438\u044f";
  if (value === "supplier_quote") return "\u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0430";
  if (value === "manual_override") return "\u0440\u0443\u0447\u043d\u0430\u044f \u043f\u0440\u0430\u0432\u043a\u0430 \u0446\u0435\u043d\u044b";
  if (value === "historical_purchase_price") return "\u0438\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0437\u0430\u043a\u0443\u043f\u043e\u0447\u043d\u0430\u044f \u0446\u0435\u043d\u0430";
  return "\u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d";
}

function confidenceVisibleLabel(value: EstimateCostConfidence): string {
  if (value === "high") return "\u0432\u044b\u0441\u043e\u043a\u0430\u044f";
  if (value === "medium") return "\u0441\u0440\u0435\u0434\u043d\u044f\u044f";
  if (value === "low") return "\u043d\u0438\u0437\u043a\u0430\u044f";
  return "\u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0430";
}

export function priceTraceVisibleLabel(trace: EstimatePriceTrace | null | undefined): string {
  if (!trace || trace.price_status === "missing") {
    return "\u0426\u0435\u043d\u0430 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430; \u0441\u0443\u043c\u043c\u0430 \u043d\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d\u0430; \u0442\u043e\u0447\u043d\u043e\u0441\u0442\u044c \u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0430";
  }
  const sourceType = visibleSourceTypeLabel(trace.price_source_type);
  const sourceLabel = humanizeTraceText(trace.visible_source_label);
  const priceUnit = displayTraceUnit(trace.price_unit);
  const conversion = humanizeTraceText(trace.price_unit_conversion?.formula ?? "direct");
  return [
    `\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b: ${sourceType}: ${sourceLabel}`,
    `\u0442\u043e\u0447\u043d\u043e\u0441\u0442\u044c ${confidenceVisibleLabel(trace.confidence)}`,
    `\u0446\u0435\u043d\u0430 ${displayMoney(trace.unit_price, trace.currency)} \u0437\u0430 ${priceUnit}`,
    `\u0440\u0430\u0441\u0447\u0435\u0442 ${conversion}`,
    `\u0441\u0443\u043c\u043c\u0430 ${displayMoney(trace.selected_amount, trace.currency)}`,
  ].join("; ");
}

export function validateResolvedEstimatePricing(rows: readonly {
  rowId: string;
  quantity: number;
  unitPrice: number | null;
  total: number | null;
  priceTrace?: EstimatePriceTrace | null;
}[]): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const row of rows) {
    const trace = row.priceTrace ?? null;
    if (row.unitPrice != null && !trace?.price_source_id) failures.push(`PRICE_WITHOUT_SOURCE:${row.rowId}`);
    if (row.total != null && !trace?.price_source_id) failures.push(`AMOUNT_WITHOUT_PRICE_SOURCE:${row.rowId}`);
    if (row.unitPrice == null && row.total === 0) failures.push(`MISSING_PRICE_ZERO_AMOUNT:${row.rowId}`);
    if (trace?.is_manual_override && !trace.override_reason?.trim()) failures.push(`MANUAL_OVERRIDE_REASON_MISSING:${row.rowId}`);
    if (trace?.price_status === "priced" && row.total != null && trace.selected_amount != null && Math.abs(row.total - trace.selected_amount) > 0.01) {
      failures.push(`AMOUNT_NOT_FROM_SELECTED_PRICE_SOURCE:${row.rowId}`);
    }
  }
  return { passed: failures.length === 0, failures };
}

export function applyManualPriceOverrideWithAudit(input: {
  row: EstimatePriceableRow & { priceTrace?: EstimatePriceTrace | null };
  override: EstimateManualPriceOverrideInput;
  context?: EstimatePriceResolutionContext;
}): {
  unitPrice: number;
  total: number;
  displayUnitPrice: string;
  displayTotal: string;
  priceTrace: EstimatePriceTrace;
  auditEvent: ManualPriceOverrideAuditEvent;
} {
  const context = input.context ?? {};
  const resolved = resolveEstimateRowPrice(input.row, {
    ...context,
    manualOverrides: {
      ...(context.manualOverrides ?? {}),
      [input.row.rowId]: input.override,
    },
  });
  if (!finitePositive(resolved.unitPrice) || !finitePositive(resolved.total) || resolved.priceTrace.price_status !== "priced") {
    throw new Error(`MANUAL_PRICE_OVERRIDE_RESOLUTION_FAILED:${input.row.rowId}`);
  }
  const previousSource = input.row.priceTrace ?? null;
  const nextSource: EstimatePriceTrace = {
    ...resolved.priceTrace,
    is_manual_override: true,
    override_reason: input.override.override_reason.trim(),
    previous_source: previousSource,
  };
  return {
    unitPrice: resolved.unitPrice,
    total: resolved.total,
    displayUnitPrice: resolved.displayUnitPrice,
    displayTotal: resolved.displayTotal,
    priceTrace: nextSource,
    auditEvent: {
      type: "manual_price_override",
      row_id: input.row.rowId,
      actor_user_id: input.override.actor_user_id ?? null,
      override_reason: input.override.override_reason.trim(),
      previous_source: previousSource,
      next_source: nextSource,
      created_at: input.override.created_at ?? new Date().toISOString(),
    },
  };
}
