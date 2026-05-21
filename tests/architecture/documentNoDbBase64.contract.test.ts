import { readDocumentEvidenceSources } from "./documentArchitectureTestHelpers";

test("document evidence core does not store base64 in DB", () => {
  const source = readDocumentEvidenceSources();
  expect(source).not.toMatch(/toString\(["']base64["']\)|data:.*base64/i);
  expect(source).not.toMatch(/\.(insert|update|upsert)\s*\([^)]*base64/is);
});
