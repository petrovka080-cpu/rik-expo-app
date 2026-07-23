import { readFileSync } from "node:fs";

describe("request route deferred professional runtime", () => {
  it("keeps the route shell paintable before loading the estimate compiler graph", () => {
    const source = readFileSync("app/(tabs)/request/index.tsx", "utf8");
    const actions = readFileSync(
      "src/features/consumerRepair/requestEstimateScreenActions.ts",
      "utf8",
    );
    const service = readFileSync(
      "src/lib/consumerRequests/consumerRequestService.ts",
      "utf8",
    );

    expect(source).toContain("React.lazy(async () =>");
    expect(source).toContain(
      '"../../../src/features/consumerRepair/ConsumerRepairRequestScreenContainer"',
    );
    expect(source).toContain("<Suspense fallback={<RequestRouteLoadingFallback />}>");
    expect(source).toContain('testID="request-route-loading"');
    expect(source).not.toContain(
      'import { ConsumerRepairRequestScreen } from "../../../src/features/consumerRepair/ConsumerRepairRequestScreenContainer"',
    );
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
