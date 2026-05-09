import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");
const devStyleGuardFiles = [
  "src/dev/_webStyleGuard.tsx",
  "src/dev/_debugStyleTrap.web.ts",
] as const;

describe("dev style guard catch discipline", () => {
  it.each(devStyleGuardFiles)("%s does not silently swallow failures", (relativePath) => {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

    expect(source).not.toMatch(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/);
  });
});
