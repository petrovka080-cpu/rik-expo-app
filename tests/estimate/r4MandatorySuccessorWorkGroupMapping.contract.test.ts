import { WORK as CONCRETE_PEDESTAL } from "../../scripts/estimate/p0TruthRemediationR5/promoteR58ConcretePedestalSuccessor";
import { WORKS } from "../../scripts/estimate/p0TruthRemediationR5/promoteR58MandatoryJourneysSuccessor";

describe("R4 mandatory successor canonical work-group ownership", () => {
  it("binds every mandatory journey to one explicit unique canonical technology group", () => {
    expect(WORKS).toHaveLength(8);
    expect(new Set(WORKS.map((work) => work.workGroupId)).size).toBe(8);
    expect(WORKS.every((work) => work.workGroupId === `canonical-technology:r58:${work.catalogId.slice("r58-real:".length)}`)).toBe(true);
  });

  it("binds the concrete equipment pedestal successor without inferring another group's ownership", () => {
    expect(CONCRETE_PEDESTAL.catalogId).toBe("r58-real:reinforced-concrete-equipment-pedestal");
    expect(CONCRETE_PEDESTAL.workGroupId).toBe("canonical-technology:r58:reinforced-concrete-equipment-pedestal");
  });

  it("keeps the two BATCH-008 mandatory concrete successors in separate work groups", () => {
    const monolithic = WORKS.find((work) => work.catalogId === "r58-real:monolithic-reinforced-concrete");
    expect(monolithic?.workGroupId).toBe("canonical-technology:r58:monolithic-reinforced-concrete");
    expect(monolithic?.workGroupId).not.toBe(CONCRETE_PEDESTAL.workGroupId);
  });
});
