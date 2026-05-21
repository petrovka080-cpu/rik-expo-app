import { readDomainGatewaySource } from "./aiDomainGatewayArchitectureTestHelpers";

describe("AI Domain Gateway architecture - no unbounded queries", () => {
  it("requires limit, org scope and role scope in query construction", () => {
    const source = readDomainGatewaySource();
    expect(source).toContain("limit: request.maxResultsPerDomain");
    expect(source).toContain("requireRoleScope: true");
    expect(source).toContain("requireOrgScope: true");
    expect(source).toContain("validateAiDomainQueryBounds");
  });
});
