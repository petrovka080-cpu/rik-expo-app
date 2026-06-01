import { pedestalOutcome } from "./concretePedestalTestHelpers";

describe("concrete pedestal quantity formula", () => {
  it("uses count plus default dimensions with explicit assumptions when dimensions are missing", () => {
    const outcome = pedestalOutcome();
    const formula = outcome.plan.formulas[0];

    expect(formula.formulaId).toBe("rectangular_concrete_element_volume");
    expect(formula.inputs.count).toBe(12);
    expect(formula.inputs.widthM).toBe(0.4);
    expect(formula.inputs.lengthM).toBe(0.4);
    expect(formula.inputs.heightM).toBe(0.6);
    expect(formula.inputs.wasteFactor).toBe(1.08);
    expect(formula.outputs.concreteWithWasteM3).toBeCloseTo(1.24, 2);
    expect(formula.outputs.formworkTotalM2).toBeGreaterThan(0);
    expect(formula.outputs.rebarKg).toBeGreaterThan(0);
    expect(formula.outputs.excavationM3).toBeGreaterThan(0);
    expect(formula.outputs.sandGravelM3).toBeGreaterThan(0);
    expect(formula.outputs.anchorsPcs).toBe(48);
    expect(formula.assumptions.join(" ")).toContain("0.4 x 0.4 x 0.6");
    expect(formula.missingInputs).toEqual(["widthM", "lengthM", "heightM"]);
  });
});
