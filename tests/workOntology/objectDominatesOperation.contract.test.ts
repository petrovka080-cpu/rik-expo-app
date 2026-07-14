import { operationObjectAudit } from "./confusionFirewallTestHelpers";

describe("objectDominatesOperation", () => {
  it("lets the object noun dominate the generic operation verb", () => {
    const audit = operationObjectAudit();

    expect(audit.object_dominance_passed).toBe(true);
    expect(audit.failures).toHaveLength(0);
  });
});
