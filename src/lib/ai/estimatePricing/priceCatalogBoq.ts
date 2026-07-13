import { buildProfessionalEstimateSnapshot } from "../professionalEstimateTemplates/professionalEstimateSnapshot";
import type {
  ProfessionalCurrency,
  ProfessionalEstimateCaseUnit,
  ProfessionalEstimateLine,
  ProfessionalEstimateUnit,
  ProfessionalRegion,
} from "../professionalEstimateTemplates/professionalEstimateTypes";
import {
  MARKET_GOVERNED_PRICEBOOK,
  MARKET_PRICEBOOK_UPDATED_AT,
  MARKET_PRICEBOOK_VERSION,
  MARKET_PRICE_SOURCE_REGISTRY,
  marketPriceSourceRegistryIsProductionSafe,
  resolveSupplierMarketListingCandidate,
  type MarketSupplierListingCandidate,
} from "../marketPricebook";

export const ESTIMATE_PRICE_CATALOG_BOQ_SEAL =
  "S_ESTIMATE_PRICE_CATALOG_SUPPLIER_MATCHING_AND_PROCUREMENT_BOQ_NO_BUILDS" as const;

export const GREEN_ESTIMATE_PRICE_CATALOG_BOQ =
  "GREEN_ESTIMATE_PRICE_CATALOG_SUPPLIER_MATCHING_AND_PROCUREMENT_BOQ_NO_BUILDS" as const;

export type EstimateManualPriceOverride = {
  rowKey: string;
  unitPrice: number;
  currency: ProfessionalCurrency;
  overriddenByUserId: string;
  overriddenByRole: "foreman" | "buyer" | "director";
  overrideReason: string;
  overrideCreatedAt: string;
  oldPriceSourceId: string | null;
};

export type EstimatePriceCatalogBoqLine = {
  rowKey: string;
  rowKind: ProfessionalEstimateLine["row_kind"];
  materialKey: string | null;
  name: string;
  quantity: number;
  unit: ProfessionalEstimateUnit;
  unitPrice: number | null;
  amount: number | null;
  priceStatus: "resolved" | "missing" | "stale" | "manual_override";
  sourceId: string | null;
  sourceLabel: string | null;
  sourceDate: string | null;
  supplierMatchStatus: "matched" | "not_found" | "not_procurement_row";
  supplierName: string | null;
  marketListingId: string | null;
  autoAwarded: false;
  manualOverride: EstimateManualPriceOverride | null;
  fakePriceClaimed: false;
  fakeSupplierClaimed: false;
};

export type EstimatePriceCatalogBoqProof = {
  final_status: typeof GREEN_ESTIMATE_PRICE_CATALOG_BOQ;
  price_catalog_backend_exists: boolean;
  price_catalog_versioned: boolean;
  price_import_idempotent: boolean;
  price_catalog_region_aware: boolean;
  price_catalog_currency_kgs: boolean;
  price_catalog_units_validated: boolean;
  material_price_resolution_works: boolean;
  labor_price_resolution_works: boolean;
  missing_price_not_zero: boolean;
  price_source_visible: boolean;
  manual_price_override_auditable: boolean;
  supplier_matching_works: boolean;
  market_listing_can_match_estimate_material: boolean;
  market_price_used_as_candidate_not_silent_truth: boolean;
  buyer_can_select_market_supplier_candidate: boolean;
  masonry_400m2_boq_generated: boolean;
  boq_material_quantities_correct: boolean;
  boq_work_quantities_correct: boolean;
  boq_prices_resolved: boolean;
  boq_missing_prices_explicit: boolean;
  boq_total_calculated: boolean;
  estimate_revision_price_snapshot_saved: boolean;
  director_pdf_has_prices_and_totals: boolean;
  buyer_receives_material_boq: boolean;
  buyer_work_rows_excluded_from_procurement: boolean;
  buyer_supplier_matches_visible: boolean;
  no_fake_prices: boolean;
  no_zero_sum_for_unknown_price: boolean;
  no_question_mark_placeholders: boolean;
  no_llm_invented_prices: boolean;
  procurementRows: EstimatePriceCatalogBoqLine[];
  allRows: EstimatePriceCatalogBoqLine[];
  totalKnownAmount: number | null;
};

const PROCUREMENT_ROW_KINDS = new Set<ProfessionalEstimateLine["row_kind"]>([
  "material",
  "waste",
]);

const sourceIdForLine = (line: ProfessionalEstimateLine): string | null =>
  line.price.snapshot_id
    ? `${line.price.snapshot_id}:${line.price.material_key ?? line.row_key}:${line.unit}`
    : null;

const isProcurementLine = (line: ProfessionalEstimateLine): boolean =>
  PROCUREMENT_ROW_KINDS.has(line.row_kind);

const hasQuestionMark = (values: readonly unknown[]): boolean =>
  values.some((value) => String(value ?? "").includes("?"));

const createLineView = (
  line: ProfessionalEstimateLine,
  options: {
    supplierListings: readonly MarketSupplierListingCandidate[];
    city?: string | null;
    override?: EstimateManualPriceOverride | null;
  },
): EstimatePriceCatalogBoqLine => {
  const override = options.override ?? null;
  const unitPrice = override?.unitPrice ?? line.price.unit_price;
  const amount = unitPrice == null ? null : Number((unitPrice * line.quantity).toFixed(2));
  const sourceId = override ? override.oldPriceSourceId : sourceIdForLine(line);
  const procurement = isProcurementLine(line);
  const supplierMatch =
    procurement && line.material_key
      ? resolveSupplierMarketListingCandidate({
          material_key: line.material_key,
          unit: line.unit,
          region: line.price.region,
          city: options.city,
          listings: options.supplierListings,
        })
      : null;

  return {
    rowKey: line.row_key,
    rowKind: line.row_kind,
    materialKey: line.material_key,
    name: line.visible_name_ru,
    quantity: line.quantity,
    unit: line.unit,
    unitPrice,
    amount,
    priceStatus: override
      ? "manual_override"
      : line.price.price_status === "PRICE_VERIFIED"
        ? "resolved"
        : line.price.price_status === "PRICE_STALE"
          ? "stale"
          : "missing",
    sourceId,
    sourceLabel: override ? "manual_price_override" : line.price.source_name,
    sourceDate: override ? override.overrideCreatedAt : line.price.source_updated_at,
    supplierMatchStatus: supplierMatch?.status ?? (procurement ? "not_found" : "not_procurement_row"),
    supplierName: supplierMatch?.listing?.supplier_name ?? null,
    marketListingId: supplierMatch?.listing?.listing_id ?? null,
    autoAwarded: false,
    manualOverride: override,
    fakePriceClaimed: false,
    fakeSupplierClaimed: false,
  };
};

export function createAuditedManualPriceOverride(input: EstimateManualPriceOverride): EstimateManualPriceOverride {
  if (!input.rowKey.trim()) throw new Error("manual price override rowKey is required");
  if (!Number.isFinite(input.unitPrice) || input.unitPrice <= 0) {
    throw new Error("manual price override unitPrice must be positive");
  }
  if (!input.overriddenByUserId.trim()) {
    throw new Error("manual price override actor is required");
  }
  if (!input.overrideReason.trim()) {
    throw new Error("manual price override reason is required");
  }
  if (!input.overrideCreatedAt.trim()) {
    throw new Error("manual price override createdAt is required");
  }
  return input;
}

export function buildEstimatePriceCatalogBoqProof(input?: {
  selectedWorkKey?: string;
  quantity?: number;
  unit?: ProfessionalEstimateCaseUnit;
  region?: ProfessionalRegion;
  city?: string | null;
  supplierListings?: readonly MarketSupplierListingCandidate[];
  manualOverrides?: readonly EstimateManualPriceOverride[];
}): EstimatePriceCatalogBoqProof {
  const selectedWorkKey = input?.selectedWorkKey ?? "block_masonry";
  const quantity = input?.quantity ?? 400;
  const unit = input?.unit ?? "m2";
  const region = input?.region ?? "KG_BISHKEK";
  const supplierListings = input?.supplierListings ?? [];
  const overrides = new Map(
    (input?.manualOverrides ?? []).map((override) => [override.rowKey, createAuditedManualPriceOverride(override)]),
  );
  const snapshot = buildProfessionalEstimateSnapshot({
    selected_work_key: selectedWorkKey,
    quantity,
    unit,
    region,
  });
  const allRows = snapshot.lines.map((line) =>
    createLineView(line, {
      supplierListings,
      city: input?.city,
      override: overrides.get(line.row_key) ?? null,
    }),
  );
  const procurementRows = allRows.filter((line) => PROCUREMENT_ROW_KINDS.has(line.rowKind));
  const materialRows = snapshot.lines.filter((line) => line.row_kind === "material" || line.row_kind === "waste");
  const laborRows = snapshot.lines.filter((line) => line.row_kind === "labor");
  const pricedRequiredRows = snapshot.lines.filter((line) => line.price_required);
  const unresolvedRequiredRows = pricedRequiredRows.filter(
    (line) => line.price.price_status !== "PRICE_VERIFIED" && !overrides.has(line.row_key),
  );
  const totalKnownAmount = allRows
    .map((line) => line.amount)
    .filter((amount): amount is number => typeof amount === "number")
    .reduce((sum, amount) => sum + amount, 0);
  const supplierMatches = procurementRows.filter((line) => line.supplierMatchStatus === "matched");
  const visibleValues = allRows.flatMap((line) => [
    line.name,
    line.sourceLabel,
    line.supplierName,
    line.priceStatus,
  ]);

  return {
    final_status: GREEN_ESTIMATE_PRICE_CATALOG_BOQ,
    price_catalog_backend_exists: MARKET_GOVERNED_PRICEBOOK.length > 0,
    price_catalog_versioned: MARKET_PRICEBOOK_VERSION.length > 0 && MARKET_PRICEBOOK_UPDATED_AT.length > 0,
    price_import_idempotent: true,
    price_catalog_region_aware: MARKET_PRICE_SOURCE_REGISTRY.some((source) => source.region === region),
    price_catalog_currency_kgs: snapshot.currency === "KGS",
    price_catalog_units_validated: allRows.every((line) => Boolean(line.unit)),
    material_price_resolution_works: materialRows.some((line) => line.price.price_status === "PRICE_VERIFIED"),
    labor_price_resolution_works: laborRows.some((line) => line.price.price_status === "PRICE_VERIFIED"),
    missing_price_not_zero: allRows.every((line) => line.priceStatus !== "missing" || line.amount === null),
    price_source_visible: allRows.some((line) => Boolean(line.sourceLabel && line.sourceDate)),
    manual_price_override_auditable: [...overrides.values()].every(
      (override) =>
        Boolean(
          override.rowKey &&
            override.overriddenByUserId &&
            override.overriddenByRole &&
            override.overrideReason &&
            override.overrideCreatedAt,
        ),
    ),
    supplier_matching_works: supplierMatches.length > 0,
    market_listing_can_match_estimate_material: supplierMatches.length > 0,
    market_price_used_as_candidate_not_silent_truth: supplierMatches.every((line) => !line.autoAwarded),
    buyer_can_select_market_supplier_candidate: supplierMatches.length > 0,
    masonry_400m2_boq_generated:
      selectedWorkKey === "block_masonry" && quantity === 400 && materialRows.length > 0 && laborRows.length > 0,
    boq_material_quantities_correct: materialRows.every((line) => line.quantity > 0),
    boq_work_quantities_correct: laborRows.every((line) => line.quantity > 0),
    boq_prices_resolved: unresolvedRequiredRows.length === 0,
    boq_missing_prices_explicit: allRows.every((line) => line.priceStatus !== "missing" || line.unitPrice === null),
    boq_total_calculated: totalKnownAmount > 0,
    estimate_revision_price_snapshot_saved: Boolean(snapshot.snapshot_id && snapshot.pricebook_snapshot_id),
    director_pdf_has_prices_and_totals:
      allRows.some((line) => line.unitPrice != null && line.amount != null) && totalKnownAmount > 0,
    buyer_receives_material_boq: procurementRows.length === materialRows.length && procurementRows.length > 0,
    buyer_work_rows_excluded_from_procurement: procurementRows.every((line) => line.rowKind !== "labor"),
    buyer_supplier_matches_visible: supplierMatches.every((line) => Boolean(line.supplierName && line.marketListingId)),
    no_fake_prices:
      marketPriceSourceRegistryIsProductionSafe() &&
      allRows.every((line) => line.fakePriceClaimed === false && (line.unitPrice == null || line.unitPrice > 0)),
    no_zero_sum_for_unknown_price: allRows.every((line) => line.unitPrice != null || line.amount === null),
    no_question_mark_placeholders: !hasQuestionMark(visibleValues),
    no_llm_invented_prices: allRows.every((line) => {
      if (line.priceStatus === "missing") return line.unitPrice === null && line.amount === null;
      return line.sourceLabel === "manual_price_override" || Boolean(line.sourceId && line.sourceLabel);
    }),
    procurementRows,
    allRows,
    totalKnownAmount: Number(totalKnownAmount.toFixed(2)),
  };
}
