import { sanitizeDocumentMetadata } from "../../src/lib/documents/evidenceIntelligence";

test("document metadata sanitizer removes private transport tokens", () => {
  const sanitized = sanitizeDocumentMetadata({
    name: "invoice",
    signedUrl: "secret",
    storageKey: "private/path",
    base64: "payload",
  });
  expect(sanitized).toEqual({ name: "invoice" });
});
