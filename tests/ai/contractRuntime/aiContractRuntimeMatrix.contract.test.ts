import {
  AI_CONTRACT_RUNTIME_GREEN_STATUS,
  buildAiContractRuntimeMatrix,
  validateAiContractRuntimeTrace,
} from "../../../src/lib/ai/contractRuntime";
import {
  cleanContractRuntimePatchScan,
  createContractRuntimeTraceFixture,
  expectedContractRuntimeNumericFacts,
} from "./contractRuntimeTestFixtures";

describe("AI contract runtime matrix", () => {
  it("turns a clean validation into the required green matrix", async () => {
    const trace = await createContractRuntimeTraceFixture();
    const validation = validateAiContractRuntimeTrace({
      trace,
      expectedNumericFacts: expectedContractRuntimeNumericFacts(),
      patchScan: cleanContractRuntimePatchScan,
    });
    const matrix = buildAiContractRuntimeMatrix({
      trace,
      validation,
      patchScan: cleanContractRuntimePatchScan,
    });

    expect(matrix.final_status).toBe(AI_CONTRACT_RUNTIME_GREEN_STATUS);
    expect(matrix.gateway_only_internal_retrieval).toBe(true);
    expect(matrix.wrong_numeric_facts_found).toBe(0);
    expect(matrix.question_id_hardcodes_found).toBe(0);
    expect(matrix.contract_runtime_runner_in_release_verify).toBe(true);
  });
});
