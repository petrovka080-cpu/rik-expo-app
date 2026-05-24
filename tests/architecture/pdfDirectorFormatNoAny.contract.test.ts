import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROTECTED_FILES = [
  "src/lib/api/pdf_director.format.ts",
  "src/lib/pdf/director/finance.ts",
];
const FORBIDDEN_ANY_TYPE = ["a", "ny"].join("");
const FORBIDDEN_CAST = ["as", FORBIDDEN_ANY_TYPE].join(" ");
const FORBIDDEN_RECORD = `Record<string, ${FORBIDDEN_ANY_TYPE}>`;

describe("director PDF formatting type ratchet", () => {
  it("keeps shared director PDF format helpers free of unsafe type escapes", () => {
    for (const relativePath of PROTECTED_FILES) {
      const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");

      expect(source).not.toMatch(new RegExp(`\\b${FORBIDDEN_ANY_TYPE}\\b`));
      expect(source).not.toContain(FORBIDDEN_CAST);
      expect(source).not.toContain(FORBIDDEN_RECORD);
      expect(source).not.toContain("SupabaseClient<any");
    }
  });
});
