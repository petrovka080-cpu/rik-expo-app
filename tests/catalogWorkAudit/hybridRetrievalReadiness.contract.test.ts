import { readAuditJson } from "./catalogWorkAuditTestHelpers";

it("records hybrid retrieval readiness without starting retrieval implementation", () => {
  const readiness = readAuditJson<Record<string, unknown>>("hybrid_retrieval_readiness.json");
  expect(readiness.hybrid_retrieval_readiness_written).toBe(true);
  expect(readiness.implementation_started).toBe(false);
  expect(readiness.quantity_parser_started).toBe(false);
  expect(readiness.boq_compiler_started).toBe(false);
});
