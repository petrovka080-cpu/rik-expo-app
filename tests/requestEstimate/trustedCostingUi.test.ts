import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { calculateProfessionalCostForPassport } from "../../src/lib/estimate/professionalCostCalculator";
import { ProfessionalCostSummary } from "../../src/features/requests/components/ProfessionalCostSummary";

describe("trusted costing request UI", () => {
  it("renders cost summary, price state badges, and hides contract total when policy blocks it", () => {
    const passport = buildProfessionalWorkPassport("ventilated_facade_rom_concept_expanded_complex_v1");
    if (!passport) throw new Error("passport_missing");
    const result = calculateProfessionalCostForPassport(passport);
    let renderer: TestRenderer.ReactTestRenderer | null = null;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(ProfessionalCostSummary, {
          summary: result.summary,
          lines: result.lines.slice(0, 4),
        }),
      );
    });

    const root = renderer!.root;
    expect(root.findByProps({ testID: "professional-cost-summary" })).toBeTruthy();
    expect(JSON.stringify(root.findByProps({ testID: "professional-cost-coverage" }).props.children)).toContain("% priced");
    expect(JSON.stringify(root.findByProps({ testID: "professional-preliminary-total" }).props.children)).toContain("Preliminary total");
    expect(JSON.stringify(root.findByProps({ testID: "professional-cost-resolution" }).props.children)).toContain("Cost resolution");
    expect(JSON.stringify(root.findByProps({ testID: "professional-contract-total-status" }).props.children)).toContain("not available");
    expect(root.findAllByProps({ testID: "price-state-badge-preliminary_market_assumption" }).length).toBeGreaterThan(0);
  });

  it("shows a required-price resolution instead of a partial preliminary total", () => {
    const passport = buildProfessionalWorkPassport(
      "private_house_construction_preliminary_boq_expanded_complex_v1",
    );
    if (!passport) throw new Error("passport_missing");
    const result = calculateProfessionalCostForPassport(passport);
    let renderer: TestRenderer.ReactTestRenderer | null = null;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(ProfessionalCostSummary, {
          summary: result.summary,
          lines: result.lines,
        }),
      );
    });

    const root = renderer!.root;
    expect(result.summary.resolution).toBe("PRICE_INPUT_REQUIRED");
    expect(result.summary.preliminaryTotal).toBeNull();
    expect(JSON.stringify(root.findByProps({ testID: "professional-preliminary-total" }).props.children))
      .toContain("not available");
    expect(JSON.stringify(root.findByProps({ testID: "professional-cost-resolution" }).props.children))
      .toContain(`price input required for ${result.summary.requiredPriceInputRowIds.length} rows`);
  });
});
