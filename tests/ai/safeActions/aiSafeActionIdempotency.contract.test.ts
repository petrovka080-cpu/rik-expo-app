import { buildOrReuseAiSafeActionDraft, serializeAiSafeActionIdempotencyKey } from "../../../src/lib/ai/safeActions";
import { createSafeActionDraftFixture } from "./safeActionsTestFixtures";

describe("AI safe action idempotency", () => {
  it("reuses an existing draft on repeated clicks instead of creating a duplicate", () => {
    const existing = createSafeActionDraftFixture("procurement_purchase_draft");
    const repeated = buildOrReuseAiSafeActionDraft({
      actionKind: "procurement_purchase_draft",
      questionRu: "Подготовить безопасный черновик",
      sourceTraceId: "test-trace:procurement_purchase_draft",
      sourceAnswerId: "test-answer:procurement_purchase_draft",
      existingDrafts: [existing],
    });
    expect(repeated.reusedExisting).toBe(true);
    expect(serializeAiSafeActionIdempotencyKey(repeated.draft.idempotencyKey)).toBe(
      serializeAiSafeActionIdempotencyKey(existing.idempotencyKey),
    );
  });
});
