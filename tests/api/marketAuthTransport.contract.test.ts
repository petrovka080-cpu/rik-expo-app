import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("market auth transport boundary", () => {
  it("keeps market auth reads behind the transport boundary", () => {
    const repositorySource = read("src/features/market/market.repository.ts");
    const transportSource = read("src/features/market/market.auth.transport.ts");

    expect(repositorySource).toContain('from "./market.auth.transport"');
    expect(repositorySource).not.toContain("supabase.auth.getUser");
    expect(transportSource).toContain("supabase.auth.getUser");
    expect(transportSource).toContain("resolveCurrentMarketBuyerName");
  });
});
