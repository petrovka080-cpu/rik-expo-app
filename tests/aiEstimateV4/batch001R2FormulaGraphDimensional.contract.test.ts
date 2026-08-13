import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 FormulaGraphV3 dimensional contract", () => {
  test("evaluates every explicit graph from declared inputs to one positive finite output unit", () => {
    for (const parts of allBatch001ContractParts()) {
      const schemaIds = new Set(parts.schema.parameters.map((item) => item.parameter_id));
      const formulaIds = new Set<string>();
      for (const assembly of parts.child_assemblies) for (const row of assembly.rows) {
        expect(row.formula.formula_id).toMatch(/FormulaGraphV3$/u);
        expect(row.formula.output_unit_id.length).toBeGreaterThan(0);
        expect(row.formula.input_parameter_ids.every((id) => schemaIds.has(id))).toBe(true);
        const values = Object.fromEntries(row.formula.input_parameter_ids.map((id) => [id, 2]));
        expect(row.formula.calculate(values)).toBeGreaterThan(0);
        expect(Number.isFinite(row.formula.calculate(values))).toBe(true);
        formulaIds.add(row.formula.formula_id);
      }
      expect(formulaIds.size).toBe(parts.child_assemblies.flatMap((item) => item.rows).length);
    }
  });
});
