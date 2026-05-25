import fs from "node:fs";
import path from "node:path";

describe("source governance no prompt hardcoded sources", () => {
  it("keeps source evidence rules outside prompt text and AI answer templates", () => {
    const files = [
      "src/lib/ai/globalEstimate/sourceGovernance/rateSourceEvidenceTypes.ts",
      "src/lib/ai/globalEstimate/sourceGovernance/validateRateSourceEvidence.ts",
      "src/lib/ai/globalEstimate/sourceGovernance/catalogAvailabilityPolicy.ts",
    ];
    const source = files.map((file) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8")).join("\n");
    expect(source).not.toMatch(/system prompt|assistant prompt|you are an ai/i);
    expect(source).toContain("sourceId");
    expect(source).toContain("checkedAt");
  });
});
