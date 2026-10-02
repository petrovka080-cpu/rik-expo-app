import * as fs from "fs";
import * as path from "path";

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("consumer repair no direct marketplace DB write architecture", () => {
  it("does not create marketplace links or sent status outside the marketplace service", () => {
    const feature = fs.readdirSync(path.join(process.cwd(), "src/features/consumerRepair"))
      .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
      .map((file) => read(`src/features/consumerRepair/${file}`))
      .join("\n");
    const service = read("src/lib/consumerRequests/consumerRequestService.ts");
    const marketplaceService = read("src/lib/consumerRequests/consumerRequestMarketplaceService.ts");
    const marketplaceTransport = read("src/lib/consumerRequests/consumerRequestMarketplace.transport.ts");

    expect(feature).not.toContain("consumer_marketplace_links");
    expect(feature).not.toMatch(/marketplaceDemandId\s*:\s*id\("marketplace_demand"\)|status\s*:\s*["']sent_to_marketplace["']/);
    expect(service).not.toMatch(/status\s*:\s*["']sent_to_marketplace["']/);
    expect(marketplaceService).toMatch(/status\s*:\s*["']sent_to_marketplace["']/);
    expect(marketplaceService).not.toContain('id("marketplace_demand")');
    expect(marketplaceService).toContain("readPublishedListing(receipt.listing_id)");
    expect(marketplaceService.indexOf("readPublishedListing(receipt.listing_id)"))
      .toBeLessThan(marketplaceService.indexOf('status: "sent"'));
    expect(marketplaceTransport).toContain('"consumer_estimate_marketplace_publish_v1"');
    expect(marketplaceTransport).toContain('.from("market_listings")');
  });
});
