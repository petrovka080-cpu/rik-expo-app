import { buildRlsDynamicCrossTenantReport } from "../../scripts/audit/rlsDynamicCrossTenant.shared";

describe("RLS company user cannot read other company contract", () => {
  it("includes read and write proof attempts across company tenants", () => {
    const report = buildRlsDynamicCrossTenantReport();
    const attempts = report.crossTenantAttempts.attempts as Array<Record<string, unknown>>;

    expect(attempts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actor: "company_a_director",
          target: "company_b_director",
          relation: "requests",
          operation: "select",
          expected: "blocked",
        }),
        expect.objectContaining({
          actor: "company_a_director",
          target: "company_b_director",
          relation: "requests",
          operation: "update",
          expected: "blocked",
        }),
      ]),
    );
  });
});
