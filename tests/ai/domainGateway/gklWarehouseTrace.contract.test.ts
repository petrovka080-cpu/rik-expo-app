import { getDomainGatewayTestBundle } from "./domainGatewayTestFixtures";

describe("GKL warehouse trace", () => {
  it("returns required, issued, remaining and shortage quantities", async () => {
    const facts = (await getDomainGatewayTestBundle()).mergedNumericFacts;
    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "gkl_required", value: 80 }),
      expect.objectContaining({ key: "gkl_issued", value: 20 }),
      expect.objectContaining({ key: "gkl_remaining", value: 0 }),
      expect.objectContaining({ key: "gkl_shortage", value: 60 }),
    ]));
  });
});
