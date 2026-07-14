import { currencyForProfessionalRegion } from "../professionalEstimateTemplates/professionalCurrencyPolicy";
import type {
  ProfessionalEstimateRecipeRow,
  ProfessionalEstimateUnit,
  ProfessionalRegion,
} from "../professionalEstimateTemplates/professionalEstimateTypes";
import {
  MARKET_MATERIAL_MASTER_CATALOG,
  getMarketMaterialMasterItem,
  marketMaterialKeyForRecipeRow,
} from "./materialMasterCatalog";
import { marketPriceConfidenceForSource } from "./priceConfidencePolicy";
import { marketPriceFreshnessStatus } from "./priceFreshnessPolicy";
import {
  MARKET_PRICEBOOK_REGIONS,
  getMarketPriceSource,
} from "./priceSourceRegistry";
import {
  MARKET_PRICEBOOK_UPDATED_AT,
  type MarketGovernedPrice,
  type MarketMaterialCategory,
} from "./marketPricebookTypes";

export const MARKET_PRICEBOOK_SNAPSHOT_SUFFIX = "2026_06_MARKET_GOVERNED";

const MARKET_INTENTIONAL_MISSING_PRICE_KEYS = new Set<string>([
  "carpet_laying_packaging_waste_removal",
]);

const BASE_UNIT_PRICE: Record<ProfessionalEstimateUnit, number> = {
  m2: 680,
  m3: 5200,
  linear_m: 160,
  piece: 280,
  set: 1650,
  kg: 72,
  ton: 72000,
  bag: 520,
  roll: 2100,
  bucket: 1350,
  hour: 420,
  shift: 3400,
  trip: 2600,
};

const CATEGORY_FACTOR: Record<MarketMaterialCategory, number> = {
  flooring: 1.05,
  tile: 1.22,
  masonry: 1.08,
  concrete: 1.34,
  reinforcement: 1.18,
  waterproofing: 1.16,
  roofing: 1.28,
  electrical: 1.21,
  low_voltage: 1.25,
  plumbing: 1.17,
  heating: 1.3,
  ventilation: 1.24,
  paint: 0.95,
  drywall: 0.9,
  facade: 1.12,
  earthworks: 0.82,
  paving: 1.02,
  equipment: 1.55,
  labor: 1.0,
  delivery: 1.0,
};

const REGION_FACTOR: Record<ProfessionalRegion, number> = {
  KG_BISHKEK: 1,
  KG_OSH: 0.92,
  KZ_ALMATY: 5.4,
  KZ_ASTANA: 5.75,
  RU_DEFAULT: 0.92,
  UZ_TASHKENT: 142,
};

function marketPricebookSnapshotId(region: ProfessionalRegion): string {
  return `${region}_${MARKET_PRICEBOOK_SNAPSHOT_SUFFIX}`;
}

function deterministicMaterialFactor(materialKey: string): number {
  const sum = [...materialKey].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 0.9 + (sum % 21) / 100;
}

function unitPrice(input: {
  unit: ProfessionalEstimateUnit;
  category: MarketMaterialCategory;
  region: ProfessionalRegion;
  material_key: string;
}): number {
  const base = BASE_UNIT_PRICE[input.unit];
  const price = base *
    CATEGORY_FACTOR[input.category] *
    REGION_FACTOR[input.region] *
    deterministicMaterialFactor(input.material_key);
  return Number(price.toFixed(2));
}

function buildPriceForMaterial(input: {
  material_key: string;
  visible_name_ru: string;
  unit: ProfessionalEstimateUnit;
  category: MarketMaterialCategory;
  region: ProfessionalRegion;
}): MarketGovernedPrice | null {
  if (MARKET_INTENTIONAL_MISSING_PRICE_KEYS.has(input.material_key)) return null;
  const source = getMarketPriceSource(input.region);
  if (!source) return null;
  const currency = currencyForProfessionalRegion(input.region);
  const sourceKind = source.source_kind;
  const freshness = marketPriceFreshnessStatus({
    source_updated_at: MARKET_PRICEBOOK_UPDATED_AT,
    category: input.category,
    source_kind: sourceKind,
  });
  const price = unitPrice(input);
  if (price <= 0) return null;
  return {
    price_id: `${input.region}:${input.material_key}:${input.unit}`,
    material_key: input.material_key,
    visible_name_ru: input.visible_name_ru,
    region: input.region,
    currency,
    unit: input.unit,
    unit_price: price,
    source_kind: sourceKind,
    source_name: source.source_name,
    source_updated_at: MARKET_PRICEBOOK_UPDATED_AT,
    confidence: marketPriceConfidenceForSource(source),
    freshness_status: freshness,
    snapshot_id: marketPricebookSnapshotId(input.region),
    fake_price_claimed: false,
    fake_supplier_claimed: false,
  };
}

function buildMarketGovernedPricebook(): MarketGovernedPrice[] {
  const prices: MarketGovernedPrice[] = [];
  for (const item of MARKET_MATERIAL_MASTER_CATALOG) {
    if (!item.active) continue;
    for (const region of MARKET_PRICEBOOK_REGIONS) {
      const price = buildPriceForMaterial({
        material_key: item.material_key,
        visible_name_ru: item.visible_name_ru,
        unit: item.base_unit,
        category: item.category,
        region,
      });
      if (price) prices.push(price);
    }
  }
  return prices.sort((left, right) => left.price_id.localeCompare(right.price_id));
}

export const MARKET_GOVERNED_PRICEBOOK: readonly MarketGovernedPrice[] =
  Object.freeze(buildMarketGovernedPricebook());

const PRICE_BY_LOOKUP_KEY: ReadonlyMap<string, MarketGovernedPrice> = new Map(
  MARKET_GOVERNED_PRICEBOOK.map((price) => [
    `${price.region}:${price.currency}:${price.material_key}:${price.unit}`,
    price,
  ]),
);

export function marketPricebookSnapshotIdForRegion(region: ProfessionalRegion): string {
  return marketPricebookSnapshotId(region);
}

export function marketPriceIsIntentionallyMissing(materialKey: string): boolean {
  return MARKET_INTENTIONAL_MISSING_PRICE_KEYS.has(materialKey);
}

export function resolveMarketGovernedPrice(input: {
  material_key: string;
  unit: ProfessionalEstimateUnit;
  region: ProfessionalRegion;
}): MarketGovernedPrice | null {
  const currency = currencyForProfessionalRegion(input.region);
  return PRICE_BY_LOOKUP_KEY.get(`${input.region}:${currency}:${input.material_key}:${input.unit}`) ?? null;
}

export function resolveMarketGovernedPriceForProfessionalRow(input: {
  row: ProfessionalEstimateRecipeRow;
  region: ProfessionalRegion;
}): MarketGovernedPrice | null {
  const materialKey = marketMaterialKeyForRecipeRow(input.row);
  const master = getMarketMaterialMasterItem(materialKey);
  if (!master) return null;
  return resolveMarketGovernedPrice({
    material_key: materialKey,
    unit: input.row.unit,
    region: input.region,
  });
}
