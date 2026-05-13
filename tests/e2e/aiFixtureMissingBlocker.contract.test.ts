import { resolveAiE2eFixtureRegistry } from "../../src/features/ai/e2eFixtures/aiE2eFixtureRegistry";

describe("explicit AI E2E fixture missing blocker", () => {
  it("returns the exact blocker when any required fixture ref is missing", () => {
    const result = resolveAiE2eFixtureRegistry({
      NODE_ENV: "test",
      E2E_PROCUREMENT_REQUEST_REF: "request-ref-000000000001",
    });

    expect(result).toMatchObject({
      source: "missing",
      status: "blocked",
      greenEligible: false,
      fixturesResolved: false,
      blockedStatus: "BLOCKED_REQUIRED_E2E_FIXTURE_REFS_MISSING",
      fixtures: null,
      dbSeedUsed: false,
      fakeRequestCreated: false,
      fakeActionCreated: false,
    });
    expect(result.missingKeys).toContain("E2E_APPROVED_PROCUREMENT_ACTION_REF");
  });
});
