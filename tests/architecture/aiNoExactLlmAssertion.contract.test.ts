import { evaluateAiResponseSmokeNonBlockingContractGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI no exact LLM assertion architecture ratchet", () => {
  it("keeps assistant response smoke non-blocking and blocks exact LLM text assertions", () => {
    const result = evaluateAiResponseSmokeNonBlockingContractGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith(".yaml")) {
          return 'appId: test\n---\n- assertVisible:\n    visible: "AI APP KNOWLEDGE BLOCK"\n';
        }
        return "";
      },
    });

    expect(result.check.status).toBe("fail");
    expect(result.check.errors).toEqual(expect.arrayContaining(["exact_llm_text_assertion_detected"]));
  });
});
