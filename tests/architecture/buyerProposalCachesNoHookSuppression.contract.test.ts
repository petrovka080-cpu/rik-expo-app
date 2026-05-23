import fs from "node:fs";
import path from "node:path";

const sourcePath = path.join(
  process.cwd(),
  "src",
  "screens",
  "buyer",
  "hooks",
  "useBuyerProposalCaches.ts",
);

describe("buyer proposal caches hook discipline", () => {
  it("does not suppress exhaustive-deps in proposal cache callbacks", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("react-hooks/exhaustive-deps");
    expect(source).not.toContain("TODO(P1): review deps");
    expect(source).toContain("BUYER_PROPOSAL_NO_TTL_MS");
  });
});
