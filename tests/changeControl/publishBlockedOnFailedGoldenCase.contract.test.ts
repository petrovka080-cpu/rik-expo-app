import { runChangeControlScenario } from "./changeControlTestHelpers";

describe("change control - failed golden case", () => {
  it("blocks publish when impacted golden cases fail", () => {
    const { proof } = runChangeControlScenario();
    expect(proof.failed_golden_case_blocks_publish).toBe(true);
  });
});
