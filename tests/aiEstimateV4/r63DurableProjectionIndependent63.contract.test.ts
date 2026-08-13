import { readJson } from "./postM1R2TestSupport";

test("recounts durable history, PDF, procurement and resources for 63 cases", () => {
  const proof = readJson<any>("04-professional/DURABLE_PROJECTION_63_RECOUNT.json");
  expect(proof).toMatchObject({ caseCount: 63, greenCases: 63, resourceBalanceCases: 63, rowLoss: 0, projectionMismatch: 0 });
  expect(proof.cases).toHaveLength(63);
});
