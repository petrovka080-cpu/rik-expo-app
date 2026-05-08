import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("buyer summary auth transport boundary", () => {
  it("keeps buyer summary auth user lookup behind the transport boundary", () => {
    const serviceSource = readProjectFile("src/screens/buyer/buyer.summary.service.ts");
    const transportSource = readProjectFile("src/screens/buyer/buyer.summary.auth.transport.ts");

    expect(serviceSource).toContain('from "./buyer.summary.auth.transport"');
    expect(serviceSource).not.toContain("supabase.auth.getUser");
    expect(serviceSource).toContain('.from("subcontracts")');
    expect(transportSource).toContain("auth.getUser");
    expect(transportSource).toContain("resolveBuyerSummaryAuthUserId");
  });
});
