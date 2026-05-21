import { documentProof } from "./documentTestFixtures";

test("document links are not final without human review", () => {
  const { document, linkSuggestions } = documentProof();
  expect(document.finalLinkedByHuman).toBe(false);
  expect(linkSuggestions.every((suggestion) => !suggestion.finalLinkAllowed)).toBe(true);
});
