import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("buyer RFQ prefill auth transport boundary", () => {
  it("keeps RFQ prefill auth metadata reads behind the transport boundary", () => {
    const hookSource = read("src/screens/buyer/hooks/useBuyerRfqPrefill.ts");
    const transportSource = read("src/screens/buyer/hooks/useBuyerRfqPrefill.auth.transport.ts");

    expect(hookSource).toContain('from "./useBuyerRfqPrefill.auth.transport"');
    expect(hookSource).not.toContain("auth.getUser");
    expect(transportSource).toContain("auth.getUser");
    expect(transportSource).toContain("loadBuyerRfqPrefillAuthMetadata");
  });
});
