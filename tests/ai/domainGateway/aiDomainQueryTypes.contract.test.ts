import { AI_DOMAIN_DATA_GATEWAY_WAVE, AI_DOMAIN_NAMES, createAiDomainQueryId } from "../../../src/lib/ai/domainDataGateway";

describe("AI Domain query types", () => {
  it("defines the point-of-no-return wave and stable domain list", () => {
    expect(AI_DOMAIN_DATA_GATEWAY_WAVE).toBe(
      "S_AI_DOMAIN_DATA_GATEWAY_CONTEXT_RETRIEVAL_ARCHITECTURE_POINT_OF_NO_RETURN",
    );
    expect(AI_DOMAIN_NAMES).toContain("procurement");
    expect(AI_DOMAIN_NAMES).toContain("warehouse");
    expect(AI_DOMAIN_NAMES).toContain("finance");
    expect(AI_DOMAIN_NAMES).toContain("documents");
    expect(createAiDomainQueryId("r1", "warehouse", "trace")).toBe("r1:warehouse:trace");
  });
});
