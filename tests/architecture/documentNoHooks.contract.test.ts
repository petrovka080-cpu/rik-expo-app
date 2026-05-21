import { readDocumentEvidenceSources } from "./documentArchitectureTestHelpers";

test("document evidence core does not add hooks", () => {
  expect(readDocumentEvidenceSources()).not.toMatch(/export\s+function\s+use[A-Z]|const\s+use[A-Z]/);
});
