import fs from "node:fs";
import path from "node:path";

describe("PDF integration no screen-local rows", () => {
  it("does not import React or screen state into the AI PDF document layer", () => {
    const dir = path.resolve(process.cwd(), "src/lib/aiEstimatePdf");
    const source = fs.readdirSync(dir)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => fs.readFileSync(path.join(dir, file), "utf8"))
      .join("\n");
    expect(source).not.toMatch(/from ["']react|useState|useEffect|screenLocal|Screen/i);
    expect(source).toContain("estimate.sections");
  });
});
