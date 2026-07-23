import { readFileSync } from "node:fs";

describe("request route deferred professional runtime", () => {
  it("keeps the route shell paintable before loading the estimate compiler graph", () => {
    const source = readFileSync("app/(tabs)/request/index.tsx", "utf8");

    expect(source).toContain("React.lazy(async () =>");
    expect(source).toContain(
      '"../../../src/features/consumerRepair/ConsumerRepairRequestScreenContainer"',
    );
    expect(source).toContain("<Suspense fallback={<RequestRouteLoadingFallback />}>");
    expect(source).toContain('testID="request-route-loading"');
    expect(source).not.toContain(
      'import { ConsumerRepairRequestScreen } from "../../../src/features/consumerRepair/ConsumerRepairRequestScreenContainer"',
    );
  });
});
