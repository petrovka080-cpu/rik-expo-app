import { readFileSync } from "fs";
import { join } from "path";

const PROJECT_ROOT = join(__dirname, "../..");

const readSource = (relativePath: string) =>
  readFileSync(join(PROJECT_ROOT, relativePath), "utf8");

describe("read-only proof script pagination ceilings", () => {
  it("keeps mojibake elimination DB scans under an explicit fail-closed ceiling", () => {
    const source = readSource("scripts/mojibake_elimination_verify.ts");

    expect(source).not.toMatch(/while\s*\(\s*true\s*\)/);
    expect(source).not.toMatch(/for\s*\(\s*;\s*;\s*\)/);
    expect(source).toContain("MOJIBAKE_VERIFY_MAX_PAGES_PER_TABLE");
    expect(source).toContain("MOJIBAKE_VERIFY_MAX_ROWS_PER_TABLE");
    expect(source).toContain("pageIndex < MOJIBAKE_VERIFY_MAX_PAGES_PER_TABLE");
    expect(source).toContain("mojibake_elimination_verify exceeded page ceiling");
  });

  it("keeps T1 text encoding DB scans under an explicit fail-closed ceiling", () => {
    const source = readSource("scripts/t1_text_encoding_proof.ts");

    expect(source).not.toMatch(/while\s*\(\s*true\s*\)/);
    expect(source).not.toMatch(/for\s*\(\s*;\s*;\s*\)/);
    expect(source).toContain("T1_TEXT_ENCODING_MAX_PAGES_PER_TABLE");
    expect(source).toContain("T1_TEXT_ENCODING_MAX_ROWS_PER_TABLE");
    expect(source).toContain("pageIndex < T1_TEXT_ENCODING_MAX_PAGES_PER_TABLE");
    expect(source).toContain("t1_text_encoding_proof exceeded page ceiling");
  });

  it("keeps selected proof scripts read-only at the Supabase table boundary", () => {
    const combinedSource = [
      readSource("scripts/mojibake_elimination_verify.ts"),
      readSource("scripts/t1_text_encoding_proof.ts"),
    ].join("\n");

    expect(combinedSource).toMatch(/\.from\(spec\.table\)\s*\.select\(/);
    expect(combinedSource).not.toMatch(/\.from\(spec\.table\)\s*\.(insert|update|upsert|delete)\(/);
    expect(combinedSource).not.toMatch(/catch\s*\{\s*\}/);
    expect(combinedSource).not.toContain(["@", "ts-ignore"].join(""));
    expect(combinedSource).not.toContain(["as", "any"].join(" "));
  });
});
