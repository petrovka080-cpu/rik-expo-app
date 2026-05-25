import fs from "node:fs";
import path from "node:path";

function readSourceGovernanceFiles(): string {
  const dir = path.resolve(process.cwd(), "src/lib/ai/globalEstimate/sourceGovernance");
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => fs.readFileSync(path.join(dir, name), "utf8"))
    .join("\n");
}

describe("source governance no LLM prices", () => {
  it("keeps price/source governance in deterministic backend policy code", () => {
    const source = readSourceGovernanceFiles();
    expect(source).not.toMatch(/openai|chatCompletion|generateText|prompt/i);
    expect(source).toContain("PRICE_WITHOUT_SOURCE");
    expect(source).toContain("RateSourceEvidence");
  });
});
