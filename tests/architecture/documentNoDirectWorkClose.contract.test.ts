import { readDocumentEvidenceSources } from "./documentArchitectureTestHelpers";

test("document evidence core does not close work", () => {
  const source = readDocumentEvidenceSources();
  expect(source).not.toMatch(/closeWork|acceptWork|workClosed:\s*true/i);
});
