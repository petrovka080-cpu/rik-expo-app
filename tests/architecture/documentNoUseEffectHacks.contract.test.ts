import { readDocumentEvidenceSources } from "./documentArchitectureTestHelpers";

test("document evidence core does not use useEffect fetch hacks", () => {
  const source = readDocumentEvidenceSources();
  expect(source).not.toMatch(/useEffect\s*\(/);
  expect(source).not.toMatch(/fetch\s*\(/);
});
