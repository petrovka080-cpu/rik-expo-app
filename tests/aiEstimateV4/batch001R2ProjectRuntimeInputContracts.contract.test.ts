import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 project runtime input contracts", () => {
  test("uses bounded visible project, norm and price inputs without production numeric defaults", () => {
    for (const parts of allBatch001ContractParts()) {
      const numeric = parts.schema.parameters.filter((item) => item.input_type === "number");
      expect(numeric.length).toBeGreaterThan(20);
      expect(numeric.every((item) => item.minimum != null && item.maximum != null)).toBe(true);
      expect(parts.schema.parameters.some((item) => item.parameter_id === "price_basis_reference")).toBe(true);
      expect(parts.schema.parameters.some((item) => item.parameter_id === "price_basis_date")).toBe(true);
      expect(parts.schema).not.toHaveProperty("defaults");
    }
  });
});
