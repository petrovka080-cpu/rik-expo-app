import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("buyer subcontract auth transport boundary", () => {
  it("keeps BuyerSubcontractTab auth reads behind the transport boundary", () => {
    const tabSource = read("src/screens/buyer/BuyerSubcontractTab.tsx");
    const transportSource = read("src/screens/buyer/BuyerSubcontractTab.auth.transport.ts");

    expect(tabSource).toContain('from "./BuyerSubcontractTab.auth.transport"');
    expect(tabSource).not.toContain("supabase.auth.getUser");
    expect(transportSource).toContain("supabase.auth.getUser");
    expect(transportSource).toContain("resolveCurrentBuyerSubcontractUserId");
  });
});
