import { documentProof } from "./documentTestFixtures";

test("invoice 45 suggests request 124 and work evidence link", () => {
  const { linkSuggestions } = documentProof();
  expect(linkSuggestions.some((suggestion) => suggestion.targetId === "req_124")).toBe(true);
  expect(linkSuggestions.some((suggestion) => suggestion.targetId === "work_31")).toBe(true);
});
