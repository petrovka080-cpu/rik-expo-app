import fs from "fs";
import path from "path";
import { repoRoot } from "./aiDomainGatewayArchitectureTestHelpers";

describe("AI Domain Gateway architecture - no second data gateway", () => {
  it("uses the approved src/lib/ai/domainDataGateway root", () => {
    const approvedRoot = path.join(repoRoot, "src", "lib", "ai", "domainDataGateway");
    expect(fs.existsSync(approvedRoot)).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, "src", "features", "ai", "domainDataGateway"))).toBe(false);
  });
});
