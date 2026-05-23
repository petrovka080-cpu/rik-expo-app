import fs from "node:fs";
import path from "node:path";

const sourcePath = "src/lib/api/pdf.ts";

describe("PDF API logging boundary", () => {
  it("uses the centralized logger instead of raw console suppressions", () => {
    const source = fs.readFileSync(path.join(process.cwd(), sourcePath), "utf8");

    expect(source).toContain('import { logger } from "../logger";');
    expect(source).not.toContain("eslint-disable-next-line no-console");
    expect(source).not.toMatch(/console\.(log|info|warn|error)/);
  });
});
