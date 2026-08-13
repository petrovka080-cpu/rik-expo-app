import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 expected technology scope independent", () => {
  test("declares owned, excluded and stage scope independently of generated BOQ rows", () => {
    for (const { contract } of allBatch001ContractParts()) {
      expect(contract.required_stages).toHaveLength(4);
      expect(contract.owned_cost_scope.length).toBeGreaterThanOrEqual(4);
      expect(contract.forbidden_cost_scope).toHaveLength(4);
      expect(new Set([...contract.owned_cost_scope, ...contract.forbidden_cost_scope]).size)
        .toBe(contract.owned_cost_scope.length + contract.forbidden_cost_scope.length);
    }
  });
});
