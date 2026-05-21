import * as fs from "fs";
import * as path from "path";

describe("consumer repair no frontend-only submit architecture", () => {
  it("keeps marketplace submit behind backend validation service", () => {
    const root = process.cwd();
    const screen = fs.readFileSync(path.join(root, "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"), "utf8");
    const marketplaceService = fs.readFileSync(path.join(root, "src/lib/consumerRequests/consumerRequestMarketplaceService.ts"), "utf8");

    expect(screen).toContain("../../lib/consumerRequests");
    expect(screen).toContain("sendConsumerRepairRequestToMarketplace({");
    expect(screen).not.toMatch(/marketplaceDemandId\s*:\s*|status\s*:\s*["']sent_to_marketplace["']/);
    expect(marketplaceService).toContain("validateConsumerRepairRequestForMarketplace(input.requestDraftId, input.userId)");
    expect(marketplaceService).toContain("marketplace_send_blocked");
    expect(marketplaceService).toContain("throw new ConsumerRepairValidationError");
  });
});
