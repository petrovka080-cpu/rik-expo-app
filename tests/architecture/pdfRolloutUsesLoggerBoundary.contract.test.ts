import fs from "node:fs";
import path from "node:path";

const files = [
  "src/lib/documents/pdfRpcRollout.ts",
  "src/lib/documents/pdfRenderRollout.ts",
] as const;

describe("PDF rollout logging boundary", () => {
  it.each(files)("uses the centralized logger in %s", (relativePath) => {
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

    expect(source).toContain('import { logger } from "../logger";');
    expect(source).not.toContain("eslint-disable-next-line no-console");
    expect(source).not.toMatch(/console\.(table|log|info|warn|error)/);
  });
});
