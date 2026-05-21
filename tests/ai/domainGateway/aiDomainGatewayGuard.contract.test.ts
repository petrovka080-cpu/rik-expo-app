import { assertAiDomainContextBundleSafe } from "../../../src/lib/ai/domainDataGateway";
import { getDomainGatewayTestBundle } from "./domainGatewayTestFixtures";

describe("AI Domain Gateway guard", () => {
  it("passes only AI-ready bundles with sourceRefs, openLinks and read-only safety", async () => {
    const bundle = await getDomainGatewayTestBundle();
    const guard = assertAiDomainContextBundleSafe(bundle);

    expect(guard).toMatchObject({
      passed: true,
      rawRowsReturnedToAnswerComposer: false,
      rawProviderPayloadVisibleToUi: false,
      unboundedGatewayQueriesFound: 0,
      dangerousMutationsFound: 0,
      approvalBypassFound: 0,
    });
  });
});
