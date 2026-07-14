import type { ProfessionalEstimateSnapshot } from "../professionalEstimateTemplates";
import type { SmartEstimatorPriceAudit } from "./smartEstimatorTypes";

export function auditSmartEstimatorPrices(snapshot: ProfessionalEstimateSnapshot): SmartEstimatorPriceAudit {
  const missing = snapshot.lines.filter((line) => line.price.price_status === "PRICE_MISSING");
  return {
    random_prices_found: snapshot.lines.filter((line) => line.price.fake_price_claimed).length,
    fake_suppliers_found: snapshot.lines.filter((line) => line.price.fake_supplier_claimed).length,
    zero_as_known_price_found: snapshot.lines.filter((line) =>
      line.price.price_status === "PRICE_VERIFIED" && line.price.unit_price === 0
    ).length,
    line_total_from_missing_price: missing.filter((line) => line.price.line_total !== null).length,
    missing_price_rows: missing.length,
    missing_prices_reported_honestly: missing.every((line) =>
      line.price.unit_price === null &&
      line.price.line_total === null &&
      line.price.source_kind === null &&
      line.price.source_name === null
    ),
    fake_green_claimed: false,
  };
}
