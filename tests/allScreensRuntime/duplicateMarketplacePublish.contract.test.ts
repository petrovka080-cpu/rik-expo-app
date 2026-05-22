import fs from "node:fs";
import path from "node:path";

describe("duplicate marketplace publish contract", () => {
  it("does not publish canonical listing truth directly from the add-product screen", () => {
    const add = fs.readFileSync(path.join(process.cwd(), "src/screens/profile/AddListingScreen.tsx"), "utf8");
    expect(add).not.toMatch(/status\s*[:=]\s*["']published["']/);
    expect(add).not.toMatch(/\.from\([^)]*marketplace/i);
  });
});
