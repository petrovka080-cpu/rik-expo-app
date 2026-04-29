import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("S-PII-1 log redaction source contracts", () => {
  it("does not log raw AI response bodies from the AI repository", () => {
    const source = read("src/lib/ai/aiRepository.ts");

    expect(source).not.toContain("[AI RESPONSE RAW]");
    expect(source).not.toContain('console.info("[AI RESPONSE RAW]", text)');
    expect(source).toContain("[AI RESPONSE METADATA]");
    expect(source).toContain("textLength: text.length");
    expect(source).toContain("redactSensitiveRecord(payload)");
  });

  it("redacts Foreman AI source prompts before dev console logging", () => {
    const source = read("src/screens/foreman/foreman.ai.ts");

    expect(source).toContain('safePayload.sourcePrompt = "[redacted]"');
    expect(source).toContain("safePayload.sourcePromptLength");
    expect(source).toContain("redactSensitiveRecord(payload)");
    expect(source).toContain("redactSensitiveText(error instanceof Error ? error.message");
  });

  it("summarizes CalcModal RPC payload diagnostics instead of logging raw payload values", () => {
    const source = read("src/components/foreman/CalcModal.tsx");

    expect(source).not.toContain('console.error("[CalcModal][rpc_calc_work_kit]", { payload, error })');
    expect(source).toContain("summarizeCalcModalPayloadForLog(payload)");
    expect(source).toContain("redactSensitiveValue(error)");
  });

  it("does not emit raw director supplier names in finance supplier-scope observability extras", () => {
    const source = read("src/screens/director/director.finance.panel.ts");

    expect(source).toContain('supplierScope: "present_redacted"');
    expect(source).toContain('kindScope: selection.kindName ? "present_redacted" : "missing"');
    expect(source).not.toContain('extra: {\n            owner: "backend",\n            version: "v2",\n            supplier: selection.supplier');
    expect(source).not.toContain('extra: {\n            supplier: selection.supplier');
    expect(source).toContain("redactSensitiveValue(error)");
  });
});
