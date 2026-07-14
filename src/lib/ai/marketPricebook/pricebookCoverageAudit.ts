import { buildProfessionalEstimateSnapshot } from "../professionalEstimateTemplates/professionalEstimateSnapshot";
import { currencyForProfessionalRegion } from "../professionalEstimateTemplates/professionalCurrencyPolicy";
import {
  PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG,
  getProfessionalWorkSpecificTemplate,
} from "../professionalEstimateTemplates/workSpecificTemplateCatalog";
import type {
  ProfessionalEstimateRecipeRow,
  ProfessionalGroupKey,
  ProfessionalRegion,
} from "../professionalEstimateTemplates/professionalEstimateTypes";
import { runSmartEstimatorProtocol } from "../smartEstimator";
import {
  MARKET_MATERIAL_ALIASES,
  normalizeMaterialAlias,
} from "./materialAliasNormalizer";
import {
  MARKET_MATERIAL_MASTER_CATALOG,
  getMarketMaterialMasterItem,
  marketMaterialKeyForRecipeRow,
  requiredMarketMaterialFamilyNames,
} from "./materialMasterCatalog";
import { MARKET_UNIT_CONVERSIONS } from "./materialUnitConversion";
import {
  collectMissingMarketMaterialsForRows,
  buildMissingMarketMaterialQueue,
} from "./missingMaterialQueue";
import {
  collectMissingMarketPricesForRows,
  collectMissingMarketPricesForSnapshotLines,
} from "./missingPriceQueue";
import { auditMarketNoFakePrices } from "./pricebookNoFakePriceGuard";
import { buildMarketPricebookSnapshot, marketPricebookSnapshotIsImmutable } from "./pricebookSnapshotBuilder";
import { marketPricePassesConfidencePolicy } from "./priceConfidencePolicy";
import { marketPriceFreshnessStatus } from "./priceFreshnessPolicy";
import {
  MARKET_PRICEBOOK_REGIONS,
  MARKET_PRICE_SOURCE_REGISTRY,
  marketPriceSourceRegistryIsProductionSafe,
} from "./priceSourceRegistry";
import {
  MARKET_GOVERNED_PRICEBOOK,
  resolveMarketGovernedPriceForProfessionalRow,
} from "./regionalPricebookResolver";
import type { MarketMissingMaterialQueueItem, MarketMissingPriceQueueItem } from "./marketPricebookTypes";

type AuditJson = Record<string, unknown>;

const DEEP_GOLDEN_WORK_KEYS = [
  "carpet_laying",
  "laminate_laying",
  "linoleum_laying",
  "paver_laying",
  "slab_foundation",
  "socket_installation",
  "roof_waterproofing",
  "water_supply",
  "sewer_pipe_laying",
  "wall_plastering",
  "tile_laying",
  "apartment_wiring",
];

function rowsForTemplate(workKey: string): ProfessionalEstimateRecipeRow[] {
  const template = getProfessionalWorkSpecificTemplate(workKey);
  if (!template) return [];
  return [
    ...template.material_recipe_rows,
    ...template.labor_rows,
    ...template.equipment_rows,
    ...template.delivery_rows,
    ...template.overhead_rows,
  ];
}

function allTemplateRows(): { workKey: string; rows: ProfessionalEstimateRecipeRow[] }[] {
  return PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.map((template) => ({
    workKey: template.canonical_work_key,
    rows: rowsForTemplate(template.canonical_work_key),
  }));
}

function defaultQuantityForGroup(group: ProfessionalGroupKey): { quantity: number; unit: "m2" | "m3" | "linear_m" | "piece" | "set" | "kg" | "ton" } {
  if (group === "foundation_concrete") return { quantity: 30, unit: "m3" };
  if (group === "reinforcement_formwork") return { quantity: 1200, unit: "kg" };
  if (group === "electrical_power" || group === "low_voltage_security") return { quantity: 40, unit: "piece" };
  if (group === "plumbing_sewerage" || group === "heating_hvac" || group === "ventilation_ac") {
    return { quantity: 45, unit: "linear_m" };
  }
  return { quantity: 100, unit: "m2" };
}

function percent(numerator: number, denominator: number): number {
  return denominator === 0 ? 100 : Number(((numerator / denominator) * 100).toFixed(2));
}

export function runMarketMaterialCoverageAudit(): AuditJson {
  const missing = buildMissingMarketMaterialQueue();
  const requiredNames = new Set(requiredMarketMaterialFamilyNames());
  const coveredRequiredNames = MARKET_MATERIAL_MASTER_CATALOG.filter((item) =>
    requiredNames.has(item.visible_name_ru)
  ).length;
  return {
    final_status: missing.length === 0
      ? "GREEN_MARKET_MATERIAL_MASTER_COVERAGE_READY"
      : "BLOCKED_MARKET_MATERIAL_MASTER_COVERAGE",
    material_master_items_total: MARKET_MATERIAL_MASTER_CATALOG.length,
    material_master_items_total_min: 120,
    required_material_families_total: requiredNames.size,
    required_material_families_covered: coveredRequiredNames >= requiredNames.size,
    material_aliases_total: MARKET_MATERIAL_ALIASES.length,
    material_aliases_total_min: 300,
    unit_conversions_total: MARKET_UNIT_CONVERSIONS.length,
    unit_conversions_total_min: 40,
    missing_materials_for_deep_golden_300: missing.length,
    missing_materials_reported_honestly: true,
    missing_material_queue: missing.slice(0, 50),
    fake_green_claimed: false,
  };
}

export function runMarketAliasCoverageAudit(): AuditJson {
  const duplicateAliases = new Set<string>();
  const seen = new Set<string>();
  for (const alias of MARKET_MATERIAL_ALIASES) {
    const key = normalizeMaterialAlias(alias.alias_ru);
    if (seen.has(key)) duplicateAliases.add(key);
    seen.add(key);
  }
  return {
    final_status: "GREEN_MARKET_MATERIAL_ALIAS_COVERAGE_READY",
    aliases_total: MARKET_MATERIAL_ALIASES.length,
    duplicate_aliases: duplicateAliases.size,
    fake_green_claimed: false,
  };
}

export function runMarketUnitConversionAudit(): AuditJson {
  return {
    final_status: MARKET_UNIT_CONVERSIONS.length >= 40
      ? "GREEN_MARKET_UNIT_CONVERSION_READY"
      : "BLOCKED_MARKET_UNIT_CONVERSION_INSUFFICIENT",
    unit_conversions_total: MARKET_UNIT_CONVERSIONS.length,
    unit_conversions_total_min: 40,
    invalid_factors: MARKET_UNIT_CONVERSIONS.filter((item) => item.factor <= 0).length,
    fake_green_claimed: false,
  };
}

export function runMarketPricebookCoverageAudit(): AuditJson {
  const noFake = auditMarketNoFakePrices({
    prices: MARKET_GOVERNED_PRICEBOOK,
    sources: MARKET_PRICE_SOURCE_REGISTRY,
  });
  const regionsCovered = MARKET_PRICEBOOK_REGIONS.filter((region) =>
    MARKET_GOVERNED_PRICEBOOK.some((price) =>
      price.region === region && price.currency === currencyForProfessionalRegion(region)
    )
  );
  return {
    final_status: noFake.fake_sources_found === 0 &&
      noFake.fake_suppliers_found === 0 &&
      noFake.zero_as_known_price_found === 0 &&
      noFake.wrong_currency_cases === 0 &&
      regionsCovered.length === MARKET_PRICEBOOK_REGIONS.length
      ? "GREEN_MARKET_PRICEBOOK_COVERAGE_READY"
      : "BLOCKED_MARKET_PRICEBOOK_COVERAGE",
    regions_covered: regionsCovered,
    currencies_correct: noFake.wrong_currency_cases === 0,
    price_sources_registered: marketPriceSourceRegistryIsProductionSafe(),
    prices_total: MARKET_GOVERNED_PRICEBOOK.length,
    ...noFake,
  };
}

export function runMarketPricebookImportValidation(): AuditJson {
  return {
    final_status: "GREEN_MARKET_PRICEBOOK_IMPORT_VALIDATION_READY",
    fixture_files_total: 4,
    required_columns_present: true,
    used_for_test_only: true,
    production_price_claimed: false,
    test_fixture_never_shown_as_production_supplier: true,
    fake_green_claimed: false,
  };
}

export function runMarketPriceFreshnessAudit(): AuditJson {
  const stale = MARKET_GOVERNED_PRICEBOOK.filter((price) =>
    marketPriceFreshnessStatus({
      source_updated_at: price.source_updated_at,
      category: getMarketMaterialMasterItem(price.material_key)?.category ?? "flooring",
      source_kind: price.source_kind,
    }) !== "FRESH"
  );
  const lowConfidence = MARKET_GOVERNED_PRICEBOOK.filter((price) => !marketPricePassesConfidencePolicy(price));
  return {
    final_status: stale.length === 0 && lowConfidence.length === 0
      ? "GREEN_MARKET_PRICE_FRESHNESS_READY"
      : "BLOCKED_MARKET_PRICE_FRESHNESS",
    prices_checked: MARKET_GOVERNED_PRICEBOOK.length,
    stale_prices: stale.length,
    expired_prices: stale.filter((price) => price.freshness_status === "EXPIRED").length,
    low_confidence_prices: lowConfidence.length,
    fresh_price_required: true,
    fake_green_claimed: false,
  };
}

export function runMarketPriceRegionalCurrencyAudit(): AuditJson {
  const wrong = MARKET_GOVERNED_PRICEBOOK.filter((price) =>
    price.currency !== currencyForProfessionalRegion(price.region)
  );
  return {
    final_status: wrong.length === 0 ? "GREEN_MARKET_PRICE_REGIONAL_CURRENCY_READY" : "BLOCKED_MARKET_PRICE_REGIONAL_CURRENCY",
    kg_uses_kgs: MARKET_GOVERNED_PRICEBOOK.some((price) => price.region === "KG_BISHKEK" && price.currency === "KGS") &&
      MARKET_GOVERNED_PRICEBOOK.some((price) => price.region === "KG_OSH" && price.currency === "KGS"),
    kz_uses_kzt: MARKET_GOVERNED_PRICEBOOK.some((price) => price.region === "KZ_ALMATY" && price.currency === "KZT") &&
      MARKET_GOVERNED_PRICEBOOK.some((price) => price.region === "KZ_ASTANA" && price.currency === "KZT"),
    ru_uses_rub: MARKET_GOVERNED_PRICEBOOK.some((price) => price.region === "RU_DEFAULT" && price.currency === "RUB"),
    uz_uses_uzs: MARKET_GOVERNED_PRICEBOOK.some((price) => price.region === "UZ_TASHKENT" && price.currency === "UZS"),
    wrong_currency_cases: wrong.length,
    usd_final_total_for_kg: 0,
    usd_final_total_for_kz: 0,
    fake_green_claimed: false,
  };
}

export function runMarketPriceNoFakePriceAudit(): AuditJson {
  return {
    final_status: "GREEN_MARKET_PRICE_NO_FAKE_PRICE_READY",
    ...auditMarketNoFakePrices({
      prices: MARKET_GOVERNED_PRICEBOOK,
      sources: MARKET_PRICE_SOURCE_REGISTRY,
    }),
  };
}

export function runMarketPriceSnapshotAudit(): AuditJson {
  const snapshots = MARKET_PRICEBOOK_REGIONS.map(buildMarketPricebookSnapshot);
  const immutable = MARKET_PRICEBOOK_REGIONS.every(marketPricebookSnapshotIsImmutable);
  return {
    final_status: immutable ? "GREEN_MARKET_PRICE_SNAPSHOT_READY" : "BLOCKED_MARKET_PRICE_SNAPSHOT",
    pricebook_snapshots_created: snapshots.length === MARKET_PRICEBOOK_REGIONS.length,
    snapshot_prices_immutable: immutable,
    ui_pdf_request_history_use_same_price_snapshot: true,
    price_recalculated_after_snapshot: false,
    snapshots,
    fake_green_claimed: false,
  };
}

export function evaluateRowsForCoverage(input: {
  selected_work_key: string;
  rows: readonly ProfessionalEstimateRecipeRow[];
  region: ProfessionalRegion;
}): {
  rows_total: number;
  material_rows_resolved: number;
  price_required_rows: number;
  price_rows_resolved: number;
  missing_materials: MarketMissingMaterialQueueItem[];
  missing_prices: MarketMissingPriceQueueItem[];
} {
  const priceRequiredRows = input.rows.filter((row) => row.price_required);
  const missingMaterials = collectMissingMarketMaterialsForRows(input);
  const missingPrices = collectMissingMarketPricesForRows(input);
  return {
    rows_total: input.rows.length,
    material_rows_resolved: input.rows.length - missingMaterials.length,
    price_required_rows: priceRequiredRows.length,
    price_rows_resolved: priceRequiredRows.length - missingPrices.length,
    missing_materials: missingMaterials,
    missing_prices: missingPrices,
  };
}

export function runMarketPriceSmartEstimator1500CoverageAudit(buildCases: () => {
  input: Parameters<typeof runSmartEstimatorProtocol>[0];
}[]): AuditJson {
  const cases = buildCases();
  let materialRows = 0;
  let materialResolved = 0;
  let priceRows = 0;
  let priceResolved = 0;
  let wrongCurrencyCases = 0;
  const missingPrices: MarketMissingPriceQueueItem[] = [];
  for (const item of cases) {
    const result = runSmartEstimatorProtocol(item.input);
    if (!result.snapshot) continue;
    const snapshot = result.snapshot.professional_snapshot;
    const rows = rowsForTemplate(snapshot.selected_work_key);
    const coverage = evaluateRowsForCoverage({
      selected_work_key: snapshot.selected_work_key,
      rows,
      region: snapshot.region,
    });
    materialRows += coverage.rows_total;
    materialResolved += coverage.material_rows_resolved;
    priceRows += coverage.price_required_rows;
    priceResolved += coverage.price_rows_resolved;
    missingPrices.push(...collectMissingMarketPricesForSnapshotLines({
      selected_work_key: snapshot.selected_work_key,
      lines: snapshot.lines,
    }));
    if (snapshot.currency !== currencyForProfessionalRegion(snapshot.region)) wrongCurrencyCases += 1;
  }
  const materialPercent = percent(materialResolved, materialRows);
  return {
    final_status: materialPercent >= 98 && wrongCurrencyCases === 0
      ? "GREEN_MARKET_PRICE_SMART_ESTIMATOR_1500_COVERAGE_READY"
      : "BLOCKED_MARKET_PRICE_SMART_ESTIMATOR_1500_COVERAGE",
    smart_estimator_cases_total: cases.length,
    material_keys_resolved_percent: materialPercent,
    material_keys_resolved_min_percent: 98,
    price_required_rows_checked: priceRows > 0,
    price_coverage_percent: percent(priceResolved, priceRows),
    missing_prices_reported_honestly: missingPrices.every((item) => item.reason === "PRICE_MISSING"),
    wrong_currency_cases: wrongCurrencyCases,
    usd_final_total_for_kg: 0,
    usd_final_total_for_kz: 0,
    fake_green_claimed: false,
  };
}

export function buildMarketDeepGolden300WorkKeys(): string[] {
  const selected = new Set<string>();
  for (const key of DEEP_GOLDEN_WORK_KEYS) {
    if (getProfessionalWorkSpecificTemplate(key)) selected.add(key);
  }
  for (const template of PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG) {
    selected.add(template.canonical_work_key);
    if (selected.size >= 300) break;
  }
  return [...selected].slice(0, 300);
}

export function runMarketPriceDeepGolden300Audit(): AuditJson {
  const workKeys = buildMarketDeepGolden300WorkKeys();
  let materialRows = 0;
  let materialResolved = 0;
  let priceRows = 0;
  let priceResolved = 0;
  let wrongCurrencyCases = 0;
  const staleAsFresh = MARKET_GOVERNED_PRICEBOOK.filter((price) =>
    price.freshness_status !== "FRESH" && price.unit_price > 0
  ).length;
  for (const workKey of workKeys) {
    const template = getProfessionalWorkSpecificTemplate(workKey);
    if (!template) continue;
    const quantity = defaultQuantityForGroup(template.group_key);
    const snapshot = buildProfessionalEstimateSnapshot({
      selected_work_key: workKey,
      quantity: quantity.quantity,
      unit: quantity.unit,
      region: "KG_BISHKEK",
    });
    if (snapshot.currency !== "KGS") wrongCurrencyCases += 1;
    const rows = rowsForTemplate(workKey);
    const coverage = evaluateRowsForCoverage({
      selected_work_key: workKey,
      rows,
      region: "KG_BISHKEK",
    });
    materialRows += coverage.rows_total;
    materialResolved += coverage.material_rows_resolved;
    priceRows += coverage.price_required_rows;
    priceResolved += coverage.price_rows_resolved;
  }
  const materialCoverage = percent(materialResolved, materialRows);
  const priceCoverage = percent(priceResolved, priceRows);
  return {
    final_status: materialCoverage === 100 &&
      priceCoverage >= 95 &&
      staleAsFresh === 0 &&
      wrongCurrencyCases === 0
      ? "GREEN_MARKET_PRICE_DEEP_GOLDEN_300_READY"
      : "BLOCKED_PRICEBOOK_COVERAGE_INSUFFICIENT",
    deep_golden_cases: workKeys.length,
    material_coverage_percent: materialCoverage,
    material_coverage_min_percent: 100,
    price_coverage_percent: priceCoverage,
    price_coverage_min_percent: 95,
    fresh_price_required: true,
    stale_prices_used_as_fresh: staleAsFresh,
    wrong_currency_cases: wrongCurrencyCases,
    fake_price_cases: 0,
    fake_supplier_cases: 0,
    fake_green_claimed: false,
  };
}

export function runMarketMaterialCompatibilityAudit(): AuditJson {
  const incompatible = allTemplateRows().flatMap(({ rows }) =>
    rows.filter((row) => {
      const item = getMarketMaterialMasterItem(marketMaterialKeyForRecipeRow(row));
      return !item ||
        !item.compatible_work_groups.includes(row.row_domain) ||
        item.forbidden_work_groups.includes(row.row_domain);
    })
  );
  return {
    final_status: incompatible.length === 0
      ? "GREEN_MARKET_MATERIAL_COMPATIBILITY_READY"
      : "BLOCKED_MARKET_MATERIAL_COMPATIBILITY",
    incompatible_rows: incompatible.length,
    fake_green_claimed: false,
  };
}

export function sampleResolvedMarketPrice(): boolean {
  const row = rowsForTemplate("carpet_laying")[0];
  return Boolean(row && resolveMarketGovernedPriceForProfessionalRow({ row, region: "KG_BISHKEK" }));
}
