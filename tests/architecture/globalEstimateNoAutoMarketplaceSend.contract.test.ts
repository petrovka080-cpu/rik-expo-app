import fs from "fs";

describe("global estimate marketplace safety architecture", () => {
  it("does not auto-send B2C estimates to marketplace from the draft integration", () => {
    const source = fs.readFileSync("src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts", "utf8");

    expect(source).not.toContain("sendConsumerRepairRequestToMarketplace");
    expect(source).toContain('marketplaceLink.status');
  });
});
