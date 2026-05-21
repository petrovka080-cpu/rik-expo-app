import { scanAiHooks } from "../../src/lib/ai/enterpriseGuardrails";

describe("AI contract runtime no hooks", () => {
  it("does not add React hooks inside the contract runtime layer", () => {
    const findings = scanAiHooks().findings.filter((finding) => finding.file.startsWith("src/lib/ai/contractRuntime/"));
    expect(findings).toEqual([]);
  });
});
