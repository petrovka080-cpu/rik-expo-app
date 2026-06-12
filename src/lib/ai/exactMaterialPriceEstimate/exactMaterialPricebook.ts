import { formatEstimateUnitLabel } from "../globalEstimate/formatEstimateUnitLabel";
import type {
  ExactMaterialCurrency,
  ExactMaterialPriceStatus,
  ExactMaterialRateUnit,
  ExactPriceResolution,
  PricebookMaterialRate,
} from "./exactMaterialPriceEstimateTypes";

export const EXACT_MATERIAL_PRICEBOOK_REGION = "KG-Bishkek";
export const EXACT_MATERIAL_PRICEBOOK_DATE = "2026-06-12";
export const EXACT_MATERIAL_PRICEBOOK_CAPTURED_AT = "2026-06-12T00:00:00+06:00";
export const EXACT_MATERIAL_PRICEBOOK_SOURCE_REFERENCE = "KG-BISHKEK-SEEDED-RATEBOOK-2026-06";

type SeededRateInput = {
  materialId: string;
  category: string;
  unit: ExactMaterialRateUnit;
  price: number;
  aliases?: readonly string[];
  confidence?: number;
};

function visibleUnit(unit: ExactMaterialRateUnit): string {
  if (unit === "m2") return formatEstimateUnitLabel("sq_m");
  if (unit === "piece") return formatEstimateUnitLabel("pcs");
  if (unit === "liter") return "\u043b";
  if (unit === "bag") return "\u043c\u0435\u0448\u043e\u043a";
  return formatEstimateUnitLabel(unit);
}

function seededRate(input: SeededRateInput): PricebookMaterialRate {
  return {
    material_id: input.materialId,
    material_visible_name_ru: input.materialId,
    category: input.category,
    unit: input.unit,
    visible_unit_ru: visibleUnit(input.unit),
    price_value: input.price,
    currency: "KGS",
    price_status: "VERIFIED",
    supplier_id: null,
    supplier_visible_name: null,
    region: EXACT_MATERIAL_PRICEBOOK_REGION,
    captured_at: EXACT_MATERIAL_PRICEBOOK_CAPTURED_AT,
    valid_from: "2026-06-01",
    valid_to: "2026-06-30",
    source_type: "seeded_ratebook",
    source_reference: EXACT_MATERIAL_PRICEBOOK_SOURCE_REFERENCE,
    confidence: input.confidence ?? 0.94,
    tax_included: false,
    delivery_included: false,
    fake_price_claimed: false,
    rate_key_aliases: input.aliases ?? [input.materialId],
  };
}

export const EXACT_MATERIAL_PRICEBOOK_RATES: readonly PricebookMaterialRate[] = Object.freeze([
  seededRate({ materialId: "dynamic_universal_primer", category: "materials", unit: "sq_m", price: 90 }),
  seededRate({ materialId: "dynamic_universal_waterproofing", category: "waterproofing", unit: "sq_m", price: 545 }),
  seededRate({ materialId: "dynamic_universal_reinforcing_tape", category: "waterproofing", unit: "linear_m", price: 128 }),
  seededRate({ materialId: "dynamic_universal_sealant", category: "waterproofing", unit: "linear_m", price: 190 }),
  seededRate({ materialId: "dynamic_universal_drains", category: "roofing", unit: "pcs", price: 1540 }),
  seededRate({ materialId: "dynamic_universal_tile", category: "tile", unit: "sq_m", price: 1460 }),
  seededRate({ materialId: "dynamic_universal_tile_adhesive", category: "tile", unit: "sq_m", price: 368 }),
  seededRate({ materialId: "dynamic_universal_grout", category: "tile", unit: "sq_m", price: 155 }),
  seededRate({ materialId: "dynamic_universal_cement_mix", category: "flooring", unit: "sq_m", price: 1090 }),
  seededRate({ materialId: "dynamic_universal_plaster_mix", category: "plastering", unit: "sq_m", price: 282 }),
  seededRate({ materialId: "dynamic_universal_paint", category: "painting", unit: "sq_m", price: 236 }),
  seededRate({ materialId: "dynamic_universal_concrete", category: "concrete", unit: "m3", price: 9950 }),
  seededRate({ materialId: "dynamic_universal_rebar", category: "concrete", unit: "m3", price: 2600 }),
  seededRate({ materialId: "dynamic_universal_cable", category: "electrical", unit: "sq_m", price: 3220 }),
  seededRate({ materialId: "dynamic_universal_pipe", category: "plumbing", unit: "set", price: 4100 }),

  seededRate({ materialId: "roof_waterproofing_roof_wp_primer", category: "waterproofing", unit: "sq_m", price: 92 }),
  seededRate({ materialId: "roof_waterproofing_roof_wp_membrane", category: "waterproofing", unit: "sq_m", price: 548 }),
  seededRate({ materialId: "roof_waterproofing_roof_wp_drains", category: "roofing", unit: "pcs", price: 1540 }),
  seededRate({ materialId: "roof_waterproofing_material", category: "waterproofing", unit: "sq_m", price: 548 }),

  seededRate({ materialId: "foundation_waterproofing_material", category: "waterproofing", unit: "sq_m", price: 736 }),
  seededRate({ materialId: "bathroom_waterproofing_material", category: "waterproofing", unit: "sq_m", price: 724 }),
  seededRate({ materialId: "bathroom_waterproofing_auxiliary", category: "waterproofing", unit: "sq_m", price: 184 }),

  seededRate({ materialId: "floor_screed_material", category: "flooring", unit: "sq_m", price: 1090 }),
  seededRate({ materialId: "wall_plastering_material", category: "plastering", unit: "pcs", price: 282 }),
  seededRate({ materialId: "ceramic_tile_laying_material", category: "tile", unit: "sq_m", price: 1460 }),
  seededRate({ materialId: "ceramic_tile_laying_auxiliary", category: "tile", unit: "sq_m", price: 368 }),
  seededRate({ materialId: "wall_painting_material", category: "painting", unit: "sq_m", price: 236 }),
  seededRate({ materialId: "facade_painting_material", category: "facade", unit: "sq_m", price: 824 }),

  seededRate({ materialId: "electrical_wiring_material", category: "electrical", unit: "sq_m", price: 3220 }),
  seededRate({ materialId: "plumbing_basic_material", category: "plumbing", unit: "set", price: 4100 }),
  seededRate({ materialId: "plumbing_basic_auxiliary", category: "plumbing", unit: "set", price: 1100 }),
  seededRate({ materialId: "heating_radiator_installation_material", category: "heating_hvac", unit: "pcs", price: 930 }),
  seededRate({ materialId: "heating_radiator_installation_auxiliary", category: "heating_hvac", unit: "pcs", price: 190 }),

  seededRate({ materialId: "concrete_slab_material", category: "concrete", unit: "ton", price: 9900 }),
  seededRate({ materialId: "foundation_concrete_pour_material", category: "concrete", unit: "m3", price: 9950 }),
  seededRate({ materialId: "foundation_concrete_pour_auxiliary", category: "concrete", unit: "m3", price: 1460 }),
  seededRate({ materialId: "foundation_concrete_material", category: "foundation", unit: "m3", price: 9950 }),
  seededRate({ materialId: "foundation_concrete_auxiliary", category: "foundation", unit: "m3", price: 1460 }),

  seededRate({ materialId: "brick_masonry_material", category: "masonry", unit: "sq_m", price: 1830 }),
  seededRate({ materialId: "brick_masonry_auxiliary", category: "masonry", unit: "sq_m", price: 550 }),
  seededRate({ materialId: "block_masonry_material", category: "masonry", unit: "sq_m", price: 1785 }),

  seededRate({ materialId: "drywall_partition_material", category: "drywall", unit: "sq_m", price: 645 }),
  seededRate({ materialId: "drywall_partition_auxiliary", category: "drywall", unit: "sq_m", price: 188 }),

  seededRate({ materialId: "gable_roof_installation_gable_wall_plate", category: "roofing", unit: "linear_m", price: 525 }),
  seededRate({ materialId: "gable_roof_installation_gable_rafters", category: "roofing", unit: "linear_m", price: 486 }),
  seededRate({ materialId: "gable_roof_installation_gable_ridge_beam", category: "roofing", unit: "linear_m", price: 628 }),
  seededRate({ materialId: "gable_roof_installation_gable_membrane", category: "roofing", unit: "sq_m", price: 98 }),
  seededRate({ materialId: "gable_roof_installation_gable_roof_covering", category: "roofing", unit: "sq_m", price: 790 }),
  seededRate({ materialId: "gable_roof_installation_gable_gutter", category: "roofing", unit: "linear_m", price: 660 }),

  seededRate({ materialId: "facade_insulation_material", category: "insulation", unit: "sq_m", price: 812 }),
  seededRate({ materialId: "paving_stone_laying_paving_geotextile", category: "roadworks", unit: "sq_m", price: 44 }),
  seededRate({ materialId: "paving_stone_laying_paving_sand", category: "roadworks", unit: "m3", price: 1370 }),
  seededRate({ materialId: "paving_stone_laying_paving_crushed_stone", category: "roadworks", unit: "m3", price: 1775 }),
  seededRate({ materialId: "paving_stone_laying_paving_bedding_mix", category: "roadworks", unit: "m3", price: 1665 }),
  seededRate({ materialId: "paving_stone_laying_paving_border", category: "roadworks", unit: "linear_m", price: 428 }),
  seededRate({ materialId: "paving_stone_laying_paving_border_concrete", category: "roadworks", unit: "m3", price: 5220 }),
  seededRate({ materialId: "paving_stone_laying_paving_stone_material", category: "roadworks", unit: "sq_m", price: 830 }),

  seededRate({ materialId: "window_installation_material", category: "doors_windows", unit: "pcs", price: 12800 }),
  seededRate({ materialId: "window_installation_auxiliary", category: "doors_windows", unit: "pcs", price: 780 }),
  seededRate({ materialId: "door_installation_material", category: "doors_windows", unit: "pcs", price: 9500 }),
  seededRate({ materialId: "door_installation_auxiliary", category: "doors_windows", unit: "pcs", price: 620 }),
  seededRate({ materialId: "laminate_board", category: "flooring", unit: "sq_m", price: 1610 }),
  seededRate({ materialId: "underlayment", category: "flooring", unit: "sq_m", price: 198 }),
  seededRate({ materialId: "baseboard", category: "flooring", unit: "linear_m", price: 315 }),
  seededRate({ materialId: "baseboard_fittings", category: "flooring", unit: "set", price: 48 }),
  seededRate({ materialId: "thresholds", category: "flooring", unit: "pcs", price: 1620 }),
  seededRate({ materialId: "parquet_laying_material", category: "flooring", unit: "sq_m", price: 1080 }),

  seededRate({ materialId: "suspended_ceiling_material", category: "ceiling", unit: "sq_m", price: 890 }),
  seededRate({ materialId: "suspended_ceiling_auxiliary", category: "ceiling", unit: "sq_m", price: 260 }),
  seededRate({ materialId: "foundation_excavation_material", category: "earthworks", unit: "m3", price: 145 }),
  seededRate({ materialId: "foundation_backfill_material", category: "earthworks", unit: "m3", price: 130 }),
  seededRate({ materialId: "excavation_demolition_material", category: "earthworks", unit: "m3", price: 160 }),
  seededRate({ materialId: "bathroom_plumbing_turnkey_material", category: "plumbing", unit: "set", price: 5200 }),
  seededRate({ materialId: "bathroom_plumbing_turnkey_auxiliary", category: "plumbing", unit: "set", price: 1350 }),
]);

function isActiveForDate(rate: PricebookMaterialRate, priceDate: string): boolean {
  const day = priceDate.slice(0, 10);
  if (rate.valid_from && day < rate.valid_from) return false;
  if (rate.valid_to && day > rate.valid_to) return false;
  return true;
}

function rateMatches(rate: PricebookMaterialRate, materialId: string, rateKey: string | null): boolean {
  if (rate.material_id === materialId || rate.material_id === rateKey) return true;
  return Boolean(rateKey && rate.rate_key_aliases?.includes(rateKey));
}

function byMostRecent(left: PricebookMaterialRate, right: PricebookMaterialRate): number {
  return String(right.valid_from ?? "").localeCompare(String(left.valid_from ?? ""));
}

export function resolveExactMaterialRate(input: {
  materialId: string;
  rateKey?: string | null;
  unit: string;
  region?: string;
  priceDate?: string;
  currency?: ExactMaterialCurrency;
  preferredSupplierId?: string | null;
}): ExactPriceResolution {
  const region = input.region ?? EXACT_MATERIAL_PRICEBOOK_REGION;
  const priceDate = input.priceDate ?? EXACT_MATERIAL_PRICEBOOK_DATE;
  const currency = input.currency ?? "KGS";
  const verified = EXACT_MATERIAL_PRICEBOOK_RATES
    .filter((rate) => rate.price_status === "VERIFIED")
    .filter((rate) => rate.region === region)
    .filter((rate) => rate.currency === currency)
    .filter((rate) => rate.unit === input.unit)
    .filter((rate) => isActiveForDate(rate, priceDate))
    .filter((rate) => rateMatches(rate, input.materialId, input.rateKey ?? null));

  const preferred = input.preferredSupplierId
    ? verified.filter((rate) => rate.supplier_id === input.preferredSupplierId)
    : [];
  const candidates = (preferred.length > 0 ? preferred : verified).slice().sort(byMostRecent);
  const selected = candidates[0] ?? null;

  if (!selected || selected.price_value == null) {
    return {
      material_id: input.materialId,
      requested_rate_key: input.rateKey ?? null,
      requested_unit: input.unit,
      region,
      price_date: priceDate,
      currency,
      price_status: "PRICE_MISSING",
      rate: null,
      price_value: null,
      supplier_id: null,
      supplier_visible_name: null,
      captured_at: null,
      valid_from: null,
      valid_to: null,
      source_type: null,
      source_reference: null,
      confidence: 0.35,
      alternatives_count: 0,
      fake_price_claimed: false,
      fake_supplier_claimed: false,
    };
  }

  const status: ExactMaterialPriceStatus =
    selected.price_status === "STALE" ? "STALE" :
    selected.price_status === "CONFLICTING" ? "CONFLICTING" :
    "VERIFIED";
  return {
    material_id: input.materialId,
    requested_rate_key: input.rateKey ?? null,
    requested_unit: input.unit,
    region,
    price_date: priceDate,
    currency,
    price_status: status,
    rate: selected,
    price_value: selected.price_value,
    supplier_id: selected.supplier_id,
    supplier_visible_name: selected.supplier_visible_name,
    captured_at: selected.captured_at,
    valid_from: selected.valid_from,
    valid_to: selected.valid_to,
    source_type: selected.source_type,
    source_reference: selected.source_reference,
    confidence: Math.min(selected.confidence, candidates.length > 1 ? 0.95 : selected.confidence),
    alternatives_count: Math.max(0, candidates.length - 1),
    fake_price_claimed: false,
    fake_supplier_claimed: false,
  };
}
