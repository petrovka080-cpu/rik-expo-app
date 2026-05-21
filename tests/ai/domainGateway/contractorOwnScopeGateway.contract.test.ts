import { createDomainGatewayProofRequest, executeAiDomainGatewayRequest } from "../../../src/lib/ai/domainDataGateway";

describe("contractor own-scope through Domain Gateway", () => {
  it("limits contractor finance data and keeps own work facts available", async () => {
    const bundle = await executeAiDomainGatewayRequest(createDomainGatewayProofRequest({
      requestId: "contractor-own-scope",
      role: "contractor",
      sourcePlanDomains: ["contractors", "finance"],
    }));

    expect(bundle.domainResults.some((result) => result.domain === "finance" && result.status === "permission_limited")).toBe(true);
    expect(bundle.domainResults.some((result) => result.domain === "contractors" && result.status === "found")).toBe(true);
  });
});
