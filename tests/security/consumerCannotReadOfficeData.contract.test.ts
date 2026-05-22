import { buildRlsDynamicCrossTenantReport } from "../../scripts/audit/rlsDynamicCrossTenant.shared";

describe("RLS consumer cannot read office data contract", () => {
  it("includes a runtime cross-scope proof attempt for consumer -> office reads", () => {
    const report = buildRlsDynamicCrossTenantReport();
    const attempts = report.crossTenantAttempts.attempts as Array<Record<string, unknown>>;

    expect(attempts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actor: "consumer_a",
          target: "office",
          relation: "requests",
          operation: "select",
          expected: "blocked",
        }),
      ]),
    );
  });
});
