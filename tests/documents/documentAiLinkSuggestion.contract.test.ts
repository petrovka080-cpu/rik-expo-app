import { documentProof } from "./documentTestFixtures";

test("AI document links are suggestions only", () => {
  const { linkSuggestions } = documentProof();
  expect(linkSuggestions.some((suggestion) => suggestion.targetId === "payment_77")).toBe(true);
  expect(linkSuggestions.some((suggestion) => suggestion.targetId === "req_124")).toBe(true);
  expect(linkSuggestions.every((suggestion) => suggestion.finalLinkAllowed === false)).toBe(true);
  expect(linkSuggestions.every((suggestion) => suggestion.requiresHumanConfirm === true)).toBe(true);
});
