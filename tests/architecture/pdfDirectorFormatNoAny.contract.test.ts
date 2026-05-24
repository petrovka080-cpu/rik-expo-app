import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROTECTED_FILES = [
  "src/lib/api/pdf_director.format.ts",
  "src/lib/pdf/director/finance.ts",
];

describe("director PDF formatting type ratchet", () => {
  it("keeps shared director PDF format helpers free of production any", () => {
    for (const relativePath of PROTECTED_FILES) {
      const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");

      expect(source).not.toMatch(/\bany\b/);
      expect(source).not.toContain("as any");
      expect(source).not.toContain("Record<string, any>");
      expect(source).not.toContain("SupabaseClient<any");
    }
  });
});
