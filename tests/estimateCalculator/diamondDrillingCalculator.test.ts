import {
  auditDiamondDrillingCalculatorP0,
  calculateDiamondDrillingP0Rows,
} from "../../src/features/estimates/calculator/families/diamondDrillingCalculator";
import { validateProfessionalBoqUnit } from "../../src/lib/estimate/canonicalUnits";

describe("diamond drilling professional BOQ calculator", () => {
  it("requires depth/diameter style rows, equipment and valid units", () => {
    const audit = auditDiamondDrillingCalculatorP0();
    const rows = calculateDiamondDrillingP0Rows();

    expect(audit.ready_professional).toBe(true);
    expect(audit.blocking_reasons).toEqual([]);
    expect(rows.some((row) => row.lineType === "equipment")).toBe(true);
    expect(rows.some((row) => row.lineType === "material")).toBe(true);
    expect(rows.every((row) => row.calculationTrace.includes("formula="))).toBe(true);
    expect(rows.every((row) => validateProfessionalBoqUnit({
      unit: row.unit,
      rowCode: row.rowCode,
      rowKind: row.lineType,
      workFamily: "diamond_concrete_drilling",
    }).valid)).toBe(true);
  });
});
