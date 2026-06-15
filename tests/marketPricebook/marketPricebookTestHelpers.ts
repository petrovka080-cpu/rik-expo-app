import {
  MARKET_GOVERNED_PRICEBOOK,
  MARKET_MATERIAL_ALIASES,
  MARKET_MATERIAL_MASTER_CATALOG,
  MARKET_PRICE_SOURCE_REGISTRY,
  MARKET_UNIT_CONVERSIONS,
  collectMissingMarketPricesForSnapshotLines,
  getMarketMaterialMasterItem,
  marketPricebookSnapshotIsImmutable,
  marketPriceSourceRegistryIsProductionSafe,
  requiredMarketMaterialFamilyNames,
  runMarketMaterialCompatibilityAudit,
  runMarketMaterialCoverageAudit,
  runMarketPriceDeepGolden300Audit,
  runMarketPriceFreshnessAudit,
  runMarketPriceNoFakePriceAudit,
  runMarketPriceRegionalCurrencyAudit,
  runMarketPriceSmartEstimator1500CoverageAudit,
  runMarketPriceSnapshotAudit,
  runMarketPricebookCoverageAudit,
  sampleResolvedMarketPrice,
} from "../../src/lib/ai/marketPricebook";
import { runSmartEstimatorProtocol } from "../../src/lib/ai/smartEstimator";
import { buildSmartEstimator1500ProductionCases } from "../../scripts/e2e/smartEstimator1500ProductionCases";

export function materialSummary() {
  return runMarketMaterialCoverageAudit();
}

export function pricebookSummary() {
  return runMarketPricebookCoverageAudit();
}

export function noFakeSummary() {
  return runMarketPriceNoFakePriceAudit();
}

export function currencySummary() {
  return runMarketPriceRegionalCurrencyAudit();
}

export function freshnessSummary() {
  return runMarketPriceFreshnessAudit();
}

export function smart1500Summary() {
  return runMarketPriceSmartEstimator1500CoverageAudit(buildSmartEstimator1500ProductionCases);
}

export function deepGoldenSummary() {
  return runMarketPriceDeepGolden300Audit();
}

export function snapshotSummary() {
  return runMarketPriceSnapshotAudit();
}

export function carpetSnapshot() {
  const result = runSmartEstimatorProtocol({
    user_input: "укладка ковролина 1500 м2 в Бишкеке",
    region: "KG_BISHKEK",
    known_quantity: 1500,
    known_unit: "m2",
  });
  if (!result.snapshot) throw new Error("EXPECTED_SMART_ESTIMATOR_SNAPSHOT");
  return result.snapshot.professional_snapshot;
}

export {
  MARKET_GOVERNED_PRICEBOOK,
  MARKET_MATERIAL_ALIASES,
  MARKET_MATERIAL_MASTER_CATALOG,
  MARKET_PRICE_SOURCE_REGISTRY,
  MARKET_UNIT_CONVERSIONS,
  collectMissingMarketPricesForSnapshotLines,
  getMarketMaterialMasterItem,
  marketPricebookSnapshotIsImmutable,
  marketPriceSourceRegistryIsProductionSafe,
  requiredMarketMaterialFamilyNames,
  runMarketMaterialCompatibilityAudit,
  sampleResolvedMarketPrice,
};
