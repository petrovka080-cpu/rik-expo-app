import fs from "node:fs";
import path from "node:path";

import {
  runSmartEstimatorProtocol,
} from "../../src/lib/ai/smartEstimator";
import type {
  SmartEstimatorInput,
  SmartEstimatorResult,
} from "../../src/lib/ai/smartEstimator";
import {
  buildSmartEstimator1500ProductionCases,
  runSmartEstimator1500ProductionAudit,
  runSmartEstimatorClarificationAudit,
  runSmartEstimatorDeepGolden300Audit,
  runSmartEstimatorPdfParityAudit,
  runSmartEstimatorRealPriceAudit,
  runSmartEstimatorRegionalCurrencyAudit,
  runSmartEstimatorSnapshotNoDesyncAudit,
} from "../../scripts/e2e/smartEstimator1500ProductionCases";

const artifactDir = path.join(
  process.cwd(),
  "artifacts",
  "S_SMART_ESTIMATOR_ORCHESTRATOR_REAL_PRICE_EXPANDED_ESTIMATE_CORE",
);

function readArtifact<T>(name: string): T | null {
  const filePath = path.join(artifactDir, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function estimate(input: SmartEstimatorInput): SmartEstimatorResult {
  return runSmartEstimatorProtocol(input);
}

export function productionSummary(): Record<string, unknown> {
  const existing = readArtifact<{ summary?: Record<string, unknown> }>("smart_estimator_1500_results.json");
  if (existing?.summary) return existing.summary;
  return runSmartEstimator1500ProductionAudit();
}

export function deepGoldenSummary(): Record<string, unknown> {
  const existing = readArtifact<Record<string, unknown>>("deep_golden_300_results.json");
  return existing ?? runSmartEstimatorDeepGolden300Audit();
}

export function clarificationSummary(): Record<string, unknown> {
  const existing = readArtifact<Record<string, unknown>>("clarification_audit.json");
  return existing ?? runSmartEstimatorClarificationAudit();
}

export function realPriceSummary(): Record<string, unknown> {
  const existing = readArtifact<Record<string, unknown>>("real_price_audit.json");
  return existing ?? runSmartEstimatorRealPriceAudit();
}

export function regionalCurrencySummary(): Record<string, unknown> {
  const existing = readArtifact<Record<string, unknown>>("regional_currency_audit.json");
  return existing ?? runSmartEstimatorRegionalCurrencyAudit();
}

export function snapshotSummary(): Record<string, unknown> {
  const existing = readArtifact<Record<string, unknown>>("snapshot_no_desync.json");
  return existing ?? runSmartEstimatorSnapshotNoDesyncAudit();
}

export function pdfParitySummary(): Record<string, unknown> {
  const existing = readArtifact<Record<string, unknown>>("pdf_parity_audit.json");
  return existing ?? runSmartEstimatorPdfParityAudit();
}

export function productionCasesCount(): number {
  return buildSmartEstimator1500ProductionCases().length;
}

export function carpetEstimate(): SmartEstimatorResult {
  return estimate({ user_input: "укладка ковролина 100 м2 Бишкек" });
}

export function ambiguousEstimate(): SmartEstimatorResult {
  return estimate({ user_input: "гидроизоляция 100 м2", region: "KG_BISHKEK" });
}
