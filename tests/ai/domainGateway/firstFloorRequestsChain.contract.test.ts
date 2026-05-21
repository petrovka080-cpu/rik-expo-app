import { getDomainGatewayTestBundle } from "./domainGatewayTestFixtures";

describe("first-floor requests chain", () => {
  it("returns first floor requests and related blockers", async () => {
    const bundle = await getDomainGatewayTestBundle();

    expect(bundle.mergedNumericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "first_floor_issues", value: 8 }),
      expect.objectContaining({ key: "request_124_floor", value: 1 }),
    ]));
    expect(JSON.stringify(bundle)).toContain("первому этажу");
  });
});
