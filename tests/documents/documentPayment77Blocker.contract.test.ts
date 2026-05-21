import { documentProof } from "./documentTestFixtures";

test("payment 77 is blocked by missing act, not by AI mutation", () => {
  const { evidenceMatrix, safety } = documentProof();
  expect(evidenceMatrix.relatedEntity.id).toBe("payment_77");
  expect(evidenceMatrix.blockers.some((blocker) => blocker.blockerRu.includes("Нет акта"))).toBe(true);
  expect(safety.paymentMutated).toBe(false);
});
