import { CONTROLLED_MUTATIONS, GREEN_R2_STATE, runControlledMutations, validateR2State } from "../../scripts/estimate/postM1ReadmissionR2Core";
import { readJson } from "./postM1R2TestSupport";

test("retains stronger tests and detects all 24 controlled defects", () => {
  const proof = readJson<any>("08-tests/NO_TEST_WEAKENING_PROOF.json");
  const evidence = readJson<any>("08-tests/MUTATION_TEST_RESULTS.json");
  expect(proof.weakened).toBe(0);
  expect(validateR2State({ ...GREEN_R2_STATE })).toEqual([]);
  expect(CONTROLLED_MUTATIONS).toHaveLength(24);
  expect(runControlledMutations().every((result) => result.detected)).toBe(true);
  expect(evidence).toMatchObject({ controlledDefects: 24, detected: 24, mutationResidue: 0 });
});
