import {
  getRequiredAiE2eFixtureEnvKeys,
  resolveAiE2eFixtureRegistry,
} from "../../src/features/ai/e2eFixtures/aiE2eFixtureRegistry";

const completeEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  E2E_PROCUREMENT_REQUEST_REF: "request-ref-000000000001",
  E2E_APPROVED_PROCUREMENT_ACTION_REF: "action-approved-0000001",
  E2E_PENDING_APPROVAL_ACTION_REF: "action-pending-0000001",
  E2E_COMMAND_CENTER_SCREEN_REF: "screen-command-center-001",
  E2E_WAREHOUSE_ITEM_REF: "warehouse-item-0000001",
  E2E_FINANCE_COMPANY_REF: "finance-company-0000001",
  E2E_CONTRACTOR_OWN_SUBCONTRACT_REF: "contractor-subcontract-0001",
  E2E_ROLE_MODE: "developer_full_access_or_separate_roles",
};

describe("explicit AI E2E fixture registry", () => {
  it("resolves only explicit env fixture refs", () => {
    const result = resolveAiE2eFixtureRegistry(completeEnv);

    expect(result).toMatchObject({
      source: "explicit_env",
      status: "loaded",
      greenEligible: true,
      fixturesResolved: true,
      blockedStatus: null,
      fixtureValueRedactionRequired: true,
      authAdminUsed: false,
      listUsersUsed: false,
      serviceRoleUsed: false,
      dbSeedUsed: false,
      dbWritesPerformed: false,
      fakeRequestCreated: false,
      fakeActionCreated: false,
      rawFixtureValuesPrinted: false,
    });
    expect(result.fixtures?.E2E_PROCUREMENT_REQUEST_REF).toBe("request-ref-000000000001");
  });

  it("declares the exact required fixture env keys", () => {
    expect(getRequiredAiE2eFixtureEnvKeys()).toEqual([
      "E2E_PROCUREMENT_REQUEST_REF",
      "E2E_APPROVED_PROCUREMENT_ACTION_REF",
      "E2E_PENDING_APPROVAL_ACTION_REF",
      "E2E_COMMAND_CENTER_SCREEN_REF",
      "E2E_WAREHOUSE_ITEM_REF",
      "E2E_FINANCE_COMPANY_REF",
      "E2E_CONTRACTOR_OWN_SUBCONTRACT_REF",
      "E2E_ROLE_MODE",
    ]);
  });
});
