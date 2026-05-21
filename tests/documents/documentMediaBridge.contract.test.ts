import { createDocumentDraftFromMediaScan } from "../../src/lib/documents/evidenceIntelligence";
import { mediaAsset } from "../media/mediaTestFixtures";

test("document media bridge turns document scan media into draft only", () => {
  const bridge = createDocumentDraftFromMediaScan({
    mediaAsset: mediaAsset({ purpose: "document_scan", mimeType: "image/jpeg" }),
    documentId: "document-from-scan",
    createdAt: "2026-05-21T00:00:00.000Z",
  });
  expect(bridge.document.documentKind).toBe("photo_document_scan");
  expect(bridge.finalLinkAllowed).toBe(false);
  expect(bridge.requiresHumanReview).toBe(true);
});
