import { evaluateProfessionalCostCoveragePolicy } from "../../src/lib/estimate/professionalCostCoveragePolicy";
import type { ProfessionalCostLine } from "../../src/lib/estimate/professionalCostingContract";
import { validateProfessionalCostingPolicy } from "../../src/lib/estimate/professionalCostingPolicy";

function line(overrides: Partial<ProfessionalCostLine> = {}): ProfessionalCostLine {
  return {
    rowId: "row-1",
    templateId: "template-1",
    family: "test",
    rowType: "material",
    name: "Source backed material",
    quantity: 2,
    unit: "m2",
    priceState: "missing_price",
    unitPrice: null,
    currency: "KGS",
    priceSourceId: null,
    priceSourceLabel: null,
    priceRetrievedAt: null,
    priceRegion: null,
    lineSubtotal: null,
    trustedForPreliminaryTotal: false,
    trustedForContractTotal: false,
    priceLimitations: ["missing_price_visible"],
    ...overrides,
  };
}

describe("professional costing contract", () => {
  it("keeps missing prices visible and rejects generated unit prices or subtotals", () => {
    const missing = validateProfessionalCostingPolicy({ lines: [line()] });

    expect(missing.missingPriceVisible).toBe(true);
    expect(missing.fakePriceRejected).toBe(true);
    expect(missing.fakeSubtotalRejected).toBe(true);

    const fake = validateProfessionalCostingPolicy({
      lines: [line({ unitPrice: 100, lineSubtotal: 200 })],
    });

    expect(fake.fakePriceRejected).toBe(false);
    expect(fake.failures).toEqual(expect.arrayContaining([
      "fake_price_without_source:row-1",
      "missing_price_has_unit_price:row-1",
      "missing_price_has_subtotal:row-1",
    ]));
  });

  it("forbids contract total without every row trusted and owner approval", () => {
    const priced = line({
      priceState: "preliminary_market_assumption",
      unitPrice: 100,
      lineSubtotal: 200,
      priceSourceId: "source-1",
      priceSourceLabel: "source",
      priceRegion: "KG",
      priceRetrievedAt: "2026-07-07T00:00:00+06:00",
      trustedForPreliminaryTotal: true,
      trustedForContractTotal: false,
    });
    const decision = evaluateProfessionalCostCoveragePolicy({
      summary: {
        pricedRequiredRowsPercent: 100,
        missingPriceRowsVisible: true,
        fakePriceCount: 0,
        fakeSubtotalCount: 0,
        fakeFinalTotalCount: 0,
      },
      lines: [priced],
      ownerApproved: false,
    });

    expect(decision.preliminaryCostAllowed).toBe(true);
    expect(decision.contractTotalAllowed).toBe(false);
    expect(decision.blockingReasons).toEqual(expect.arrayContaining([
      "contract_total_requires_all_prices_trusted_for_contract",
      "owner_approval_required_for_contract_total",
    ]));
  });
});
