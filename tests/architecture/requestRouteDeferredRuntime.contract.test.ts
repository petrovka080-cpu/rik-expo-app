import { readFileSync } from "node:fs";

describe("request route deferred professional runtime", () => {
  it("keeps native route registration static while loading the compiler only on demand", () => {
    const source = readFileSync("app/(tabs)/request/index.tsx", "utf8");
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
    expect(actions).toContain('require("./consumerRepairAiAdapter")');
    expect(actions).toContain(
      '"../../lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime"',
    );
    expect(actions).not.toContain(
      'import { buildConsumerRepairAiDraft } from "./consumerRepairAiAdapter"',
    );
    expect(service).toContain(
      'require("../estimate/runtime/createAiEstimateRuntime")',
    );
    expect(service).not.toContain(
      'import { createAiEstimateRuntime } from "../estimate/runtime/createAiEstimateRuntime"',
    );
  });
});
