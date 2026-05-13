import {
  AI_DOCUMENT_REDACTION_POLICY,
  validateAiDocumentKnowledgeRedaction,
} from "../../src/features/ai/documents/aiDocumentRedactionPolicy";
import { listAiDocumentKnowledgeCards } from "../../src/features/ai/documents/aiDocumentKnowledgeRegistry";
import { summarizeAiDocumentPreview } from "../../src/features/ai/documents/aiDocumentSearchPreview";

describe("AI document redaction policy", () => {
  it("allows registry cards and summary previews only as redacted metadata", () => {
    const cards = listAiDocumentKnowledgeCards();
    const summary = summarizeAiDocumentPreview({ userId: "director", role: "director" }, "pdf_exports");

    expect(AI_DOCUMENT_REDACTION_POLICY.rawContentReturned).toBe(false);
    expect(validateAiDocumentKnowledgeRedaction(cards).ok).toBe(true);
    expect(validateAiDocumentKnowledgeRedaction(summary).ok).toBe(true);
    expect(summary.rawContentReturned).toBe(false);
    expect(summary.rawRowsReturned).toBe(false);
    expect(summary.secretsReturned).toBe(false);
  });

  it("blocks forbidden raw payload fields", () => {
    const result = validateAiDocumentKnowledgeRedaction({
      rawPrompt: "do not expose",
      nested: {
        rawProviderPayload: "{}",
        password: "secret",
      },
    } as never);

    expect(result.ok).toBe(false);
    expect(result.forbiddenKeys).toEqual(
      expect.arrayContaining(["rawPrompt", "rawProviderPayload", "password"]),
    );
  });
});
