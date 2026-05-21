import { validateAiDomainQueryBounds } from "../../../src/lib/ai/domainDataGateway";
import { createDomainGatewayTestQuery } from "./domainGatewayTestFixtures";

describe("AI Domain query bounds policy", () => {
  it("requires org, role, user and limit for every gateway query", () => {
    const valid = validateAiDomainQueryBounds(createDomainGatewayTestQuery("warehouse"));
    const invalid = validateAiDomainQueryBounds({
      ...createDomainGatewayTestQuery("warehouse"),
      orgId: "",
      bounds: { limit: 0, requireCountQuery: false, requireRoleScope: true, requireOrgScope: true },
    });

    expect(valid.passed).toBe(true);
    expect(invalid.passed).toBe(false);
    expect(invalid.failures).toContain("missing_org_scope");
    expect(invalid.failures).toContain("missing_limit");
  });
});
