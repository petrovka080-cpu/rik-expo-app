import fs from "fs";
import path from "path";
import { resolveBuyerAutoFioFromMetadata } from "../../src/screens/buyer/hooks/useBuyerAutoFio.auth.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("buyer auto FIO auth transport boundary", () => {
  it("keeps buyer auto FIO auth reads behind the transport boundary", () => {
    const hookSource = read("src/screens/buyer/hooks/useBuyerAutoFio.ts");
    const transportSource = read("src/screens/buyer/hooks/useBuyerAutoFio.auth.transport.ts");

    expect(hookSource).toContain("useBuyerAutoFio.auth.transport");
    expect(hookSource).not.toContain("auth.getUser");
    expect(hookSource).not.toContain("catch {");
    expect(transportSource).toContain("auth.getUser");
    expect(transportSource).toContain("loadBuyerAutoFioCandidate");
  });

  it("preserves full_name before name fallback semantics", () => {
    expect(
      resolveBuyerAutoFioFromMetadata({
        full_name: " Buyer One ",
        name: "Ignored Name",
      }),
    ).toBe("Buyer One");

    expect(
      resolveBuyerAutoFioFromMetadata({
        full_name: " ",
        name: " Buyer Fallback ",
      }),
    ).toBe("Buyer Fallback");

    expect(resolveBuyerAutoFioFromMetadata(null)).toBe("");
  });
});
