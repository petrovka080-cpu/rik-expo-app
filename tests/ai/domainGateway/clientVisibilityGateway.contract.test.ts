import { createDomainGatewayProofRequest, executeAiDomainGatewayRequest } from "../../../src/lib/ai/domainDataGateway";

describe("client visibility through Domain Gateway", () => {
  it("returns permission_limited instead of leaking finance for client role", async () => {
    const bundle = await executeAiDomainGatewayRequest(createDomainGatewayProofRequest({
      requestId: "client-visibility",
      role: "client",
      sourcePlanDomains: ["client", "finance"],
    }));

    expect(bundle.domainResults.some((result) => result.domain === "finance" && result.status === "permission_limited")).toBe(true);
    expect(bundle.domainResults.some((result) => result.domain === "client" && result.status === "found")).toBe(true);
  });
});
