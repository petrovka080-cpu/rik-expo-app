import type { ProfessionalEstimateLine } from "../professionalEstimateTemplates";
import type { EstimateQualitySnapshotContext, EstimateQualityRuleResult } from "./estimateQualityTypes";
import { qualityFailure, qualityRuleResult } from "./estimateQualityReport";

const FORBIDDEN_PRICE_SOURCE = /fake|random|test_fixture|mock|stub|dummy/i;

function sourceHasForbiddenMarker(line: ProfessionalEstimateLine): boolean {
  return FORBIDDEN_PRICE_SOURCE.test(`${line.price.source_kind ?? ""} ${line.price.source_name ?? ""}`);
}

export function evaluatePriceIntegrityQuality(
  context: EstimateQualitySnapshotContext,
): EstimateQualityRuleResult {
  const snapshot = context.snapshot;
  if (!snapshot) return qualityRuleResult({ check: "price_integrity_passed" });

  const failures = [];
  for (const line of snapshot.lines) {
    if (line.price.fake_price_claimed || /random/i.test(`${line.price.source_name ?? ""}`)) {
      failures.push(qualityFailure({
        code: "RANDOM_PRICE_FOUND",
        details: "Random or AI-generated price marker was found.",
        selectedWorkKey: snapshot.selected_work_key,
        rowKey: line.row_key,
        visibleNameRu: line.visible_name_ru,
      }));
    }
    if (line.price.fake_supplier_claimed || /fake supplier|supplier fixture/i.test(`${line.price.source_name ?? ""}`)) {
      failures.push(qualityFailure({
        code: "FAKE_SUPPLIER_FOUND",
        details: "Fake supplier marker was found in a priced row.",
        selectedWorkKey: snapshot.selected_work_key,
        rowKey: line.row_key,
        visibleNameRu: line.visible_name_ru,
      }));
    }
    if (sourceHasForbiddenMarker(line) && line.price.price_status === "PRICE_VERIFIED") {
      failures.push(qualityFailure({
        code: "RANDOM_PRICE_FOUND",
        details: "Forbidden test/mock source is shown as verified production pricing.",
        selectedWorkKey: snapshot.selected_work_key,
        rowKey: line.row_key,
        visibleNameRu: line.visible_name_ru,
      }));
    }
    if (line.price.price_status === "PRICE_VERIFIED" && line.price.unit_price === 0) {
      failures.push(qualityFailure({
        code: "ZERO_AS_KNOWN_PRICE",
        details: "Verified price cannot use zero as a known price.",
        selectedWorkKey: snapshot.selected_work_key,
        rowKey: line.row_key,
        visibleNameRu: line.visible_name_ru,
      }));
    }
    if (line.price.price_status === "PRICE_MISSING" && line.price.line_total !== null) {
      failures.push(qualityFailure({
        code: "LINE_TOTAL_FROM_MISSING_PRICE",
        details: "Missing price row cannot have a line total.",
        selectedWorkKey: snapshot.selected_work_key,
        rowKey: line.row_key,
        visibleNameRu: line.visible_name_ru,
      }));
    }
  }

  return qualityRuleResult({ check: "price_integrity_passed", failures });
}
