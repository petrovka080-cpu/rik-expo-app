import { readDocumentEvidenceSources } from "./documentArchitectureTestHelpers";

test("document evidence core does not log signed URLs", () => {
  const source = readDocumentEvidenceSources();
  expect(source).not.toMatch(/console\.(log|warn|error).*signed/i);
  expect(source).toContain("canLogUrl: false");
});
