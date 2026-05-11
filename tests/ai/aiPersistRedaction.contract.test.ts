import fs from "node:fs";
import path from "node:path";

import {
  redactAiReportForStorage,
  redactAiReportStorageText,
} from "../../src/lib/ai_reports";

describe("AI persistence redaction contract", () => {
  it("redacts sensitive assistant storage content without changing caller-visible text", () => {
    const raw = [
      "raw prompt: buy cement for user@example.test",
      "raw context: user_id=usr_123 company_id=cmp_456",
      "Authorization header: Bearer secret-token",
      "+996 555 123 456",
    ].join("\n");

    const redacted = redactAiReportStorageText(raw);

    expect(redacted).not.toContain("user@example.test");
    expect(redacted).not.toContain("usr_123");
    expect(redacted).not.toContain("cmp_456");
    expect(redacted).not.toContain("secret-token");
    expect(redacted).not.toContain("+996 555 123 456");
    expect(redacted).toContain("[redacted]");
  });

  it("redacts content and metadata before saveAiReport reaches transport", () => {
    const redacted = redactAiReportForStorage({
      id: "assistant:test",
      userId: "user-row-owner",
      content: "raw response: token=storage-secret email@example.test",
      metadata: {
        rawPrompt: "secret prompt",
        rawContext: "company_id=company-secret",
        nested: {
          providerPayload: { token: "provider-secret" },
        },
      },
    });

    expect(redacted.userId).toBe("user-row-owner");
    expect(redacted.content).not.toContain("storage-secret");
    expect(redacted.content).not.toContain("email@example.test");
    expect(redacted.metadata).toEqual({
      rawPrompt: "[redacted]",
      rawContext: "[redacted]",
      nested: {
        providerPayload: "[redacted]",
      },
    });
  });

  it("keeps saveAiReport wired to the redacted storage copy", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/lib/ai_reports.ts"), "utf8");

    expect(source).toContain("upsertAiReport(redactAiReportForStorage(input))");
  });
});
