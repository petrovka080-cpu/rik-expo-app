import fs from "node:fs";
import path from "node:path";

describe("AI document knowledge runner", () => {
  const runner = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runAiDocumentKnowledgeMaestro.ts"),
    "utf8",
  );

  it("writes Wave 06 artifacts and proves read-only document intelligence", () => {
    expect(runner).toContain("`${artifactPrefix}_inventory.json`");
    expect(runner).toContain("`${artifactPrefix}_matrix.json`");
    expect(runner).toContain("`${artifactPrefix}_emulator.json`");
    expect(runner).toContain("GREEN_AI_DOCUMENT_PDF_KNOWLEDGE_LAYER_READY");
    expect(runner).toContain("raw_content_returned: false");
    expect(runner).toContain("raw_rows_returned: false");
    expect(runner).toContain("mutation_count: 0");
    expect(runner).toContain("fake_documents: false");
    expect(runner).toContain("secrets_printed: false");
  });

  it("keeps env checks to flags only and avoids secret output", () => {
    expect(runner).toContain("S_AI_NO_SECRETS_PRINTING");
    expect(runner).not.toMatch(/console\.log\([^)]*(PASSWORD|JWT|DB_URL|SECRET|TOKEN)/i);
    expect(runner).not.toMatch(/service_role|listUsers|auth\.admin|seed/i);
  });
});
