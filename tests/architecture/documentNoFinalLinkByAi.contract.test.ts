import { readDocumentEvidenceSources } from "./documentArchitectureTestHelpers";

test("document evidence core never final-links documents by AI", () => {
  const source = readDocumentEvidenceSources();
  expect(source).not.toMatch(/finalLinkedByHuman:\s*true|finalLinkAllowed:\s*true/i);
  expect(source).toContain("requiresHumanConfirm: true");
});
