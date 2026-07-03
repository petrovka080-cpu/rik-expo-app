import { auditMasonryCalculatorP0 } from "../../src/features/estimates/calculator/families/masonryCalculator";

describe("masonry P0 calculator", () => {
  it("uses the 400 m2 gas block professional template", () => {
    const audit = auditMasonryCalculatorP0();

    expect(audit.ready_professional).toBe(true);
    expect(audit.sample_work_key).toBe("masonry_interior_gas_block_lay_standard");
    expect(audit.all_expected_units_present).toBe(true);
    expect(audit.blocking_reasons).toEqual([]);
  });
});
