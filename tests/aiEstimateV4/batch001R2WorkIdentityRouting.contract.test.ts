import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 work identity routing", () => {
  test("gives every catalog identity an individual schema, assembly and technology method", () => {
    const parts = allBatch001ContractParts();
    expect(new Set(parts.map((item) => item.schema.schema_id)).size).toBe(16);
    expect(new Set(parts.flatMap((item) => item.child_assemblies.map((assembly) => assembly.assembly_id))).size).toBe(32);
    expect(parts.every((item) => item.schema.technology_id.includes(item.contract.catalog_id))).toBe(true);
  });
});
