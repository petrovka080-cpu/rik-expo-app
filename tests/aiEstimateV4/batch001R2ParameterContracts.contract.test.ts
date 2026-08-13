import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 parameter contracts", () => {
  test("has no duplicate, hidden, unbounded or unconsumed displayed parameter", () => {
    for (const parts of allBatch001ContractParts()) {
      const ids = parts.schema.parameters.map((item) => item.parameter_id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(parts.schema.parameters.every((item) => item.formula_consumers.length > 0)).toBe(true);
      expect(parts.schema.parameters.filter((item) => item.input_type === "number")
        .every((item) => Number.isFinite(item.minimum) && Number.isFinite(item.maximum))).toBe(true);
      expect(parts.schema.quantity_alternatives).toEqual([["area_m2"], ["length_m", "width_m"]]);
    }
  });
});
