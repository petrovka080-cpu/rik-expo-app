import {
  defineCanonicalEstimateHarnessWrapper,
  materializeCanonicalHarnessFixturesSequentially,
  runCanonicalEstimateAcceptanceHarness,
  type CanonicalHarnessFixture,
  type CanonicalHarnessWrapper,
} from "./canonicalEstimateAcceptanceHarness";

const hash = (character: string) => character.repeat(64);
const fixtures: CanonicalHarnessFixture[] = [
  { caseId: "case-1", catalogId: "work-1", sourceIdentitySha256: hash("a"), role: "USER", scenario: "compile", payload: { quantity: 10 } },
  { caseId: "case-2", catalogId: "work-2", sourceIdentitySha256: hash("b"), role: "FOREMAN", scenario: "pdf", payload: { quantity: 20 } },
];
const wrapper: CanonicalHarnessWrapper = {
  manifest: { batchId: "BATCH-X", sourceIdentitySha256: hash("c"), productionCoreIdentitySha256: hash("d"), runtime: "web" },
  fixtures,
  roleSelection: ["USER", "FOREMAN"],
  scenarioSelection: ["compile", "pdf"],
  expectedDenominators: { total: 2, byRole: { USER: 1, FOREMAN: 1 }, byScenario: { compile: 1, pdf: 1 } },
};

describe("canonical estimate domain-neutral acceptance harness", () => {
  it("accepts wrappers containing only manifest, fixtures, roles, scenarios, and denominators", () => {
    expect(defineCanonicalEstimateHarnessWrapper(wrapper).planIdentitySha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(() => defineCanonicalEstimateHarnessWrapper({ ...wrapper, expectedDenominators: { ...wrapper.expectedDenominators, total: 3 } })).toThrow("HARNESS_DENOMINATOR_MISMATCH:total");
  });

  it("materializes fixture identities sequentially without a PostgreSQL connection burst", async () => {
    let inFlight = 0;
    let maximumInFlight = 0;
    const materialized = await materializeCanonicalHarnessFixturesSequentially({
      seeds: fixtures,
      load: async (fixture) => {
        inFlight += 1;
        maximumInFlight = Math.max(maximumInFlight, inFlight);
        await Promise.resolve();
        inFlight -= 1;
        return fixture;
      },
    });
    expect(maximumInFlight).toBe(1);
    expect(materialized.connectionAudit).toEqual({ maximumInFlight: 1, burstConnections: false });
  });

  it("runs exact denominators through an independent oracle and fails closed", async () => {
    const report = await runCanonicalEstimateAcceptanceHarness({
      wrapper,
      adapter: {
        adapterId: "web-adapter",
        oracle: { kind: "INDEPENDENT_BUSINESS_ORACLE", sourceIdentitySha256: hash("e") },
        execute: async (fixture) => ({ assertions: [{ name: fixture.scenario, passed: true }], evidence: { catalogId: fixture.catalogId } }),
      },
    });
    expect(report).toMatchObject({ expected: 2, executed: 2, green: 2, red: 0, status: "GREEN" });
    await expect(runCanonicalEstimateAcceptanceHarness({
      wrapper,
      adapter: {
        adapterId: "invalid-oracle",
        oracle: { kind: "INDEPENDENT_BUSINESS_ORACLE", sourceIdentitySha256: hash("d") },
        execute: async () => ({ assertions: [{ name: "never", passed: true }], evidence: {} }),
      },
    })).rejects.toThrow("HARNESS_ORACLE_NOT_INDEPENDENT");
  });
});
