import fs from "node:fs";
import path from "node:path";

const sourcePath = path.join(
  process.cwd(),
  "src",
  "screens",
  "foreman",
  "hooks",
  "useForemanBootstrapCoordinator.ts",
);

describe("foreman bootstrap coordinator hook discipline", () => {
  it("does not suppress exhaustive-deps for bootstrap reconciliation", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("react-hooks/exhaustive-deps");
    expect(source).not.toContain("deps object is the single dep surface");
    expect(source).toContain("const bootstrapDraft = useCallback");
    expect(source).toContain("refreshBoundarySyncState");
  });
});
