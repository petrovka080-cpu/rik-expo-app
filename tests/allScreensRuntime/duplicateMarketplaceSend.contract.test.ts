import fs from "node:fs";
import path from "node:path";

describe("duplicate marketplace send contract", () => {
  it("keeps marketplace send behind validation and service preconditions", () => {
    const service = fs.readFileSync(path.join(process.cwd(), "src/lib/consumerRequests/consumerRequestMarketplaceService.ts"), "utf8");
    expect(service).toContain("validateConsumerRepairRequestForMarketplace");
    expect(service).toContain("ConsumerRepairValidationError");
  });
});
