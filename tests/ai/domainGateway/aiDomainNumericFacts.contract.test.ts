import { hasRequiredAiDomainNumericFact } from "../../../src/lib/ai/domainDataGateway";
import { getDomainGatewayTestBundle } from "./domainGatewayTestFixtures";

describe("AI Domain numeric facts", () => {
  it("returns the required golden business numbers", async () => {
    const bundle = await getDomainGatewayTestBundle();

    expect(hasRequiredAiDomainNumericFact(bundle.mergedNumericFacts, "gkl_required", 80)).toBe(true);
    expect(hasRequiredAiDomainNumericFact(bundle.mergedNumericFacts, "gkl_issued", 20)).toBe(true);
    expect(hasRequiredAiDomainNumericFact(bundle.mergedNumericFacts, "gkl_remaining", 0)).toBe(true);
    expect(hasRequiredAiDomainNumericFact(bundle.mergedNumericFacts, "gkl_shortage", 60)).toBe(true);
    expect(hasRequiredAiDomainNumericFact(bundle.mergedNumericFacts, "payment_77_amount", 125000)).toBe(true);
    expect(hasRequiredAiDomainNumericFact(bundle.mergedNumericFacts, "payments_missing_docs_sum", 245000)).toBe(true);
  });
});
