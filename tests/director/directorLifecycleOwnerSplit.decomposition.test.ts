import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("DIRECTOR_LIFECYCLE_REALTIME_OWNER_SPLIT decomposition audit", () => {
  it("adds the extracted director lifecycle owner-boundary modules", () => {
    const requiredFiles = [
      "src/screens/director/director.lifecycle.contract.ts",
      "src/screens/director/director.lifecycle.scope.ts",
      "src/screens/director/director.lifecycle.refresh.ts",
      "src/screens/director/director.lifecycle.realtime.ts",
    ];

    for (const relativePath of requiredFiles) {
      expect(fs.existsSync(path.join(repoRoot, relativePath))).toBe(true);
    }
  });

  it("keeps director.lifecycle.ts as an orchestration entrypoint", () => {
    const source = readRepoFile("src/screens/director/director.lifecycle.ts");

    expect(source).toContain('from "./director.lifecycle.contract"');
    expect(source).toContain('from "./director.lifecycle.refresh"');
    expect(source).toContain('from "./director.lifecycle.scope"');
    expect(source).toContain('from "./director.lifecycle.realtime"');
    expect(source).toContain("setupDirectorRealtimeLifecycle");
    expect(source).not.toContain("supabase.channel(");
    expect(source).not.toContain("function runRefresh(");
    expect(source).not.toContain("shouldRefreshDirectorRowsForRequestChange");
    expect(source).not.toContain("eslint-disable");
  });
});
