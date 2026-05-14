import {
  getConstructionRoleProfile,
  listConstructionRoleProfiles,
  toConstructionKnowhowRoleId,
} from "../../src/features/ai/constructionKnowhow/constructionRoleAdvisor";

describe("Construction role advisor", () => {
  it("registers role-specific professional boundaries", () => {
    const profiles = listConstructionRoleProfiles();
    expect(profiles.map((profile) => profile.roleId)).toEqual([
      "director_control",
      "buyer",
      "warehouse",
      "accountant",
      "foreman",
      "contractor",
    ]);

    const director = getConstructionRoleProfile("director_control");
    const contractor = getConstructionRoleProfile("contractor");
    const buyer = getConstructionRoleProfile("buyer");

    expect(director?.canApprove).toBe(true);
    expect(director?.canExecuteApprovedViaLedger).toBe(true);
    expect(contractor?.overviewScope).toBe("own_records_only");
    expect(contractor?.approvalBoundary.ownRecordsOnly).toBe(true);
    expect(buyer?.forbiddenDomains).toContain("finance_cost_control");
    expect(buyer?.approvalBoundary.directExecutionWithoutApproval).toBe(false);
  });

  it("maps product roles into construction role perspectives", () => {
    expect(toConstructionKnowhowRoleId("director")).toBe("director_control");
    expect(toConstructionKnowhowRoleId("control")).toBe("director_control");
    expect(toConstructionKnowhowRoleId("buyer")).toBe("buyer");
    expect(toConstructionKnowhowRoleId("contractor")).toBe("contractor");
  });
});
