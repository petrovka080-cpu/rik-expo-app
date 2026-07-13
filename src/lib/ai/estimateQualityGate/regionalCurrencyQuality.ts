import { currencyForProfessionalRegion } from "../professionalEstimateTemplates";
import type { EstimateQualitySnapshotContext, EstimateQualityRuleResult } from "./estimateQualityTypes";
import { qualityFailure, qualityRuleResult } from "./estimateQualityReport";

export function evaluateRegionalCurrencyQuality(
  context: EstimateQualitySnapshotContext,
): EstimateQualityRuleResult {
  const snapshot = context.snapshot;
  if (!snapshot) return qualityRuleResult({ check: "regional_currency_passed" });

  const expectedCurrency = context.input.expected_currency ?? currencyForProfessionalRegion(snapshot.region);
  const expectedRegion = context.input.expected_region ?? snapshot.region;
  const failures = [];
  if (snapshot.region !== expectedRegion) {
    failures.push(qualityFailure({
      code: "WRONG_CURRENCY",
      details: "Snapshot region does not match expected region.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }
  if (snapshot.currency !== expectedCurrency || snapshot.totals.currency !== expectedCurrency) {
    failures.push(qualityFailure({
      code: "WRONG_CURRENCY",
      details: "Snapshot or totals currency does not match the governed regional currency.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }
  if (snapshot.lines.some((line) => line.price.currency !== expectedCurrency)) {
    failures.push(qualityFailure({
      code: "WRONG_CURRENCY",
      details: "At least one line uses a currency outside the snapshot currency.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }
  if ((snapshot.region.startsWith("KG_") || snapshot.region.startsWith("KZ_")) && String(snapshot.totals.currency) === "USD") {
    failures.push(qualityFailure({
      code: "USD_FOR_KG_OR_KZ",
      details: "KG/KZ estimate cannot expose USD as final currency.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }

  return qualityRuleResult({ check: "regional_currency_passed", failures });
}
