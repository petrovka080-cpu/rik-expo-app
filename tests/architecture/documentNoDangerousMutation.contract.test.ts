import { readDocumentEvidenceSources } from "./documentArchitectureTestHelpers";

test("document evidence core has no direct dangerous mutations", () => {
  expect(readDocumentEvidenceSources()).not.toMatch(/\.(insert|update|delete|upsert|rpc)\s*\(/);
});
