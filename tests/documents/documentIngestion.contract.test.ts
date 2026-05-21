import { ingestDocumentDraft } from "../../src/lib/documents/evidenceIntelligence";

test("document ingestion accepts bounded PDF and rejects unsafe type", () => {
  const accepted = ingestDocumentDraft({
    id: "doc-ok",
    orgId: "org-1",
    ownerUserId: "u1",
    ownerRole: "accountant",
    mimeType: "application/pdf",
    byteSize: 1000,
    pageCount: 1,
    createdAt: "2026-05-21T00:00:00.000Z",
  });
  expect(accepted.passed).toBe(true);
  expect(accepted.dbWriteUsed).toBe(false);

  const rejected = ingestDocumentDraft({
    id: "doc-bad",
    orgId: "org-1",
    ownerUserId: "u1",
    ownerRole: "accountant",
    mimeType: "application/octet-stream",
    byteSize: 1000,
    createdAt: "2026-05-21T00:00:00.000Z",
  });
  expect(rejected.passed).toBe(false);
});
