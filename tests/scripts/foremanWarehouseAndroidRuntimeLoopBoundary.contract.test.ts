import { readFileSync } from "fs";
import { join } from "path";

const projectRoot = join(__dirname, "..", "..");

const readSource = (relativePath: string) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

describe("foreman warehouse Android runtime verifier loop boundary", () => {
  it("keeps token counting bounded without an unconditional loop", () => {
    const source = readSource("scripts/foreman_warehouse_pdf_android_runtime_verify.ts");

    expect(source).toContain("function countToken(source: string, token: string)");
    expect(source).toContain("if (!token) return 0");
    expect(source).toContain("let index = source.indexOf(token)");
    expect(source).toContain("index = source.indexOf(token, index + token.length)");
    expect(source).not.toContain("while (true)");
    expect(source).not.toMatch(/for\s*\(\s*;\s*;\s*\)/);
  });
});
