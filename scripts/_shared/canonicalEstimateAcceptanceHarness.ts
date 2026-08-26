import { createHash } from "node:crypto";

export const CANONICAL_ESTIMATE_ACCEPTANCE_HARNESS_VERSION = "canonical-estimate-acceptance-harness-r1";

export type CanonicalHarnessFixture = {
  caseId: string;
  catalogId: string;
  sourceIdentitySha256: string;
  role: string;
  scenario: string;
  payload: Record<string, unknown>;
};

export type CanonicalHarnessWrapper = {
  manifest: {
    batchId: string;
    sourceIdentitySha256: string;
    productionCoreIdentitySha256: string;
    runtime: "web" | "android_api34" | "backend";
  };
  fixtures: readonly CanonicalHarnessFixture[];
  roleSelection: readonly string[];
  scenarioSelection: readonly string[];
  expectedDenominators: {
    total: number;
    byRole: Readonly<Record<string, number>>;
    byScenario: Readonly<Record<string, number>>;
  };
};

export type CanonicalHarnessAssertion = {
  name: string;
  passed: boolean;
  details?: Record<string, unknown> | string | null;
};

export type CanonicalHarnessCaseResult = {
  caseId: string;
  catalogId: string;
  role: string;
  scenario: string;
  status: "GREEN" | "RED";
  assertions: CanonicalHarnessAssertion[];
  evidence: Record<string, unknown>;
};

export type CanonicalHarnessAdapter = {
  adapterId: string;
  oracle: {
    kind: "INDEPENDENT_BUSINESS_ORACLE";
    sourceIdentitySha256: string;
  };
  execute(fixture: CanonicalHarnessFixture): Promise<{
    assertions: CanonicalHarnessAssertion[];
    evidence: Record<string, unknown>;
  }>;
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function assertSha256(value: string, field: string): void {
  if (!/^[0-9a-f]{64}$/u.test(value)) throw new Error(`HARNESS_SHA256_INVALID:${field}`);
}

function countBy(fixtures: readonly CanonicalHarnessFixture[], field: "role" | "scenario") {
  const counts: Record<string, number> = {};
  for (const fixture of fixtures) counts[fixture[field]] = (counts[fixture[field]] ?? 0) + 1;
  return counts;
}

function assertExactCounts(
  actual: Readonly<Record<string, number>>,
  expected: Readonly<Record<string, number>>,
  field: string,
): void {
  if (stableJson(actual) !== stableJson(expected)) throw new Error(`HARNESS_DENOMINATOR_MISMATCH:${field}`);
}

export function defineCanonicalEstimateHarnessWrapper(
  wrapper: CanonicalHarnessWrapper,
): CanonicalHarnessWrapper & { planIdentitySha256: string } {
  const allowedKeys = ["expectedDenominators", "fixtures", "manifest", "roleSelection", "scenarioSelection"];
  const actualKeys = Object.keys(wrapper).sort();
  if (stableJson(actualKeys) !== stableJson(allowedKeys)) throw new Error("HARNESS_WRAPPER_SHAPE_INVALID");
  const batchId = wrapper.manifest.batchId.trim();
  if (!batchId) throw new Error("HARNESS_BATCH_ID_REQUIRED");
  assertSha256(wrapper.manifest.sourceIdentitySha256, "manifest.sourceIdentitySha256");
  assertSha256(wrapper.manifest.productionCoreIdentitySha256, "manifest.productionCoreIdentitySha256");
  if (wrapper.fixtures.length !== wrapper.expectedDenominators.total || wrapper.fixtures.length === 0) {
    throw new Error("HARNESS_DENOMINATOR_MISMATCH:total");
  }
  const caseIds = new Set<string>();
  for (const fixture of wrapper.fixtures) {
    if (!fixture.caseId.trim() || caseIds.has(fixture.caseId)) throw new Error(`HARNESS_CASE_ID_INVALID:${fixture.caseId}`);
    caseIds.add(fixture.caseId);
    if (!fixture.catalogId.trim()) throw new Error(`HARNESS_CATALOG_ID_REQUIRED:${fixture.caseId}`);
    assertSha256(fixture.sourceIdentitySha256, `fixture.${fixture.caseId}.sourceIdentitySha256`);
    if (!wrapper.roleSelection.includes(fixture.role)) throw new Error(`HARNESS_ROLE_NOT_SELECTED:${fixture.caseId}`);
    if (!wrapper.scenarioSelection.includes(fixture.scenario)) throw new Error(`HARNESS_SCENARIO_NOT_SELECTED:${fixture.caseId}`);
  }
  assertExactCounts(countBy(wrapper.fixtures, "role"), wrapper.expectedDenominators.byRole, "byRole");
  assertExactCounts(countBy(wrapper.fixtures, "scenario"), wrapper.expectedDenominators.byScenario, "byScenario");
  return {
    ...wrapper,
    planIdentitySha256: sha256(stableJson(wrapper)),
  };
}

export async function materializeCanonicalHarnessFixturesSequentially<T>(input: {
  seeds: readonly T[];
  load(seed: T, index: number): Promise<CanonicalHarnessFixture>;
}): Promise<{ fixtures: CanonicalHarnessFixture[]; connectionAudit: { maximumInFlight: 1; burstConnections: false } }> {
  const fixtures: CanonicalHarnessFixture[] = [];
  for (let index = 0; index < input.seeds.length; index += 1) {
    fixtures.push(await input.load(input.seeds[index]!, index));
  }
  return { fixtures, connectionAudit: { maximumInFlight: 1, burstConnections: false } };
}

export async function runCanonicalEstimateAcceptanceHarness(input: {
  wrapper: CanonicalHarnessWrapper;
  adapter: CanonicalHarnessAdapter;
}) {
  const plan = defineCanonicalEstimateHarnessWrapper(input.wrapper);
  assertSha256(input.adapter.oracle.sourceIdentitySha256, "oracle.sourceIdentitySha256");
  if (input.adapter.oracle.sourceIdentitySha256 === plan.manifest.productionCoreIdentitySha256) {
    throw new Error("HARNESS_ORACLE_NOT_INDEPENDENT");
  }
  const results: CanonicalHarnessCaseResult[] = [];
  for (const fixture of plan.fixtures) {
    try {
      const executed = await input.adapter.execute(fixture);
      const assertions = executed.assertions.length > 0
        ? executed.assertions
        : [{ name: "non_empty_assertions", passed: false }];
      results.push({
        caseId: fixture.caseId,
        catalogId: fixture.catalogId,
        role: fixture.role,
        scenario: fixture.scenario,
        status: assertions.every((assertion) => assertion.passed) ? "GREEN" : "RED",
        assertions,
        evidence: executed.evidence,
      });
    } catch (error) {
      results.push({
        caseId: fixture.caseId,
        catalogId: fixture.catalogId,
        role: fixture.role,
        scenario: fixture.scenario,
        status: "RED",
        assertions: [{ name: "adapter_execution", passed: false, details: error instanceof Error ? error.message : String(error) }],
        evidence: {},
      });
    }
  }
  const green = results.filter((result) => result.status === "GREEN").length;
  return {
    schemaVersion: CANONICAL_ESTIMATE_ACCEPTANCE_HARNESS_VERSION,
    batchId: plan.manifest.batchId,
    runtime: plan.manifest.runtime,
    adapterId: input.adapter.adapterId,
    planIdentitySha256: plan.planIdentitySha256,
    oracle: input.adapter.oracle,
    expected: plan.expectedDenominators.total,
    executed: results.length,
    green,
    red: results.length - green,
    status: green === plan.expectedDenominators.total ? "GREEN" as const : "RED" as const,
    connectionAudit: { maximumInFlight: 1 as const, burstConnections: false as const },
    results,
  };
}
