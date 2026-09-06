import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 expected technology scope independent", () => {
  test("declares owned, excluded and stage scope independently of generated BOQ rows", () => {
    for (const { contract } of allBatch001ContractParts()) {
      const groupStages = contract.group === "FRAME"
        ? ["SETTING_OUT", "ANCHORING", "PRIMARY_FRAME_INSTALL", "FRAME_GEOMETRY_CONTROL"]
        : contract.group === "ALIGN"
          ? ["ACCEPTED_FRAME_SURVEY", "REFERENCE_PLANE_SETUP", "SYSTEM_ALIGNMENT", "PLANE_CONTROL"]
          : ["FRAME_ACCEPTANCE", "SHEET_LAYOUT", "SHEET_FIXING", "JOINT_AND_CORNER_TREATMENT"];
      expect(contract.required_stages).toEqual(expect.arrayContaining([
        ...groupStages,
        "LOGISTICS",
        "WASTE_CLOSEOUT",
        "DOCUMENTATION",
      ]));
      expect(new Set(contract.required_stages).size).toBe(contract.required_stages.length);
      expect(new Set([...contract.required_stages, ...contract.optional_stages]).size)
        .toBe(contract.required_stages.length + contract.optional_stages.length);
      expect(contract.owned_cost_scope.length).toBeGreaterThanOrEqual(4);
      expect(contract.forbidden_cost_scope).toHaveLength(4);
      expect(new Set([...contract.owned_cost_scope, ...contract.forbidden_cost_scope]).size)
        .toBe(contract.owned_cost_scope.length + contract.forbidden_cost_scope.length);
    }
  });
});
