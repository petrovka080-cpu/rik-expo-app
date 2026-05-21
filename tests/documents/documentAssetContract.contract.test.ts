import { documentProof } from "./documentTestFixtures";

test("document asset is draft and review-safe by default", () => {
  const { document } = documentProof();
  expect(document.documentKind).toBe("invoice");
  expect(document.reviewStatus).toBe("draft");
  expect(document.finalLinkedByHuman).toBe(false);
  expect(document.visibility.requiresSignedUrl).toBe(true);
});
