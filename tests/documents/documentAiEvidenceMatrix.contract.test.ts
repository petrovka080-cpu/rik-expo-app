import { documentProof } from "./documentTestFixtures";

test("document evidence matrix marks missing act as blocker", () => {
  const { evidenceMatrix } = documentProof();
  expect(evidenceMatrix.finalDecisionByAi).toBe(false);
  expect(evidenceMatrix.evidenceItems.some((item) => item.requirement === "act_required" && item.status === "missing")).toBe(true);
  expect(evidenceMatrix.blockers.some((blocker) => blocker.blockerRu.includes("Нет акта"))).toBe(true);
});
