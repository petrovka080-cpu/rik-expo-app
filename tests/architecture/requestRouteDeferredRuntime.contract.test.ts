import { readFileSync } from "node:fs";

describe("request route canonical backend ownership", () => {
  it("keeps native route registration static while making every legacy client compiler unreachable", () => {
    const source = readFileSync("app/(tabs)/request/index.tsx", "utf8");
    const container = readFileSync(
      "src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx",
      "utf8",
    );
    const baseline = readFileSync(
      "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
      "utf8",
    );
    const actions = readFileSync(
      "src/features/consumerRepair/requestEstimateScreenActions.ts",
      "utf8",
    );
    const service = readFileSync(
      "src/lib/consumerRequests/consumerRequestService.ts",
      "utf8",
    );

    expect(source).toContain(
      'import { ConsumerRepairRequestScreen } from "../../../src/features/consumerRepair/ConsumerRepairRequestScreenContainer"',
    );
    expect(source).not.toContain("React.lazy");
    expect(actions).not.toContain("require(");
    expect(actions).not.toContain("consumerRepairAiAdapter");
    expect(actions).not.toContain("buildConsumerRepairDraftFromAiEstimateRuntime");
    expect(service).not.toContain("require(");
    expect(service).not.toContain("createAiEstimateRuntime");
    expect(service).toContain("canonicalBackendRequired");
    expect(container).toContain("compileConsumerCanonicalBaseline");
    expect(container).not.toContain("migrateExistingEstimatesToCanonicalBackend");
    expect(baseline).toContain("compileCanonicalEstimateAndLoad");
  });
});
