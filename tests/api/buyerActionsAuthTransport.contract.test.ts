import fs from "fs";
import path from "path";
import { resolveBuyerActionFioFromMetadata } from "../../src/screens/buyer/buyer.actions.auth.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("buyer action auth transport boundary", () => {
  it("keeps buyer action auth reads behind the transport boundary", () => {
    const actionSource = read("src/screens/buyer/buyer.actions.ts");
    const transportSource = read("src/screens/buyer/buyer.actions.auth.transport.ts");

    expect(actionSource).toContain("buyer.actions.auth.transport");
    expect(actionSource).not.toContain("supabase.auth.getUser");
    expect(actionSource).not.toContain("auth.getUser");
    expect(transportSource).toContain("auth.getUser");
    expect(transportSource).toContain("loadBuyerActionFioCandidate");
  });

  it("preserves full_name before name fallback semantics", () => {
    expect(
      resolveBuyerActionFioFromMetadata(
        {
          full_name: " Buyer One ",
          name: "Ignored Name",
        },
        "Fallback Buyer",
      ),
    ).toBe("Buyer One");

    expect(
      resolveBuyerActionFioFromMetadata(
        {
          full_name: " ",
          name: " Buyer Fallback ",
        },
        "Fallback Buyer",
      ),
    ).toBe("Buyer Fallback");

    expect(resolveBuyerActionFioFromMetadata(null, "Fallback Buyer")).toBe(
      "Fallback Buyer",
    );
  });
});
