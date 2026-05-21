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

    expect(feature).not.toContain("consumer_marketplace_links");
    expect(feature).not.toMatch(/marketplaceDemandId\s*:\s*id\("marketplace_demand"\)|status\s*:\s*["']sent_to_marketplace["']/);
    expect(service).not.toMatch(/status\s*:\s*["']sent_to_marketplace["']/);
    expect(marketplaceService).toMatch(/status\s*:\s*["']sent_to_marketplace["']/);
    expect(marketplaceService).toMatch(/marketplaceDemandId:\s*id\("marketplace_demand"\)/);
  });
});
