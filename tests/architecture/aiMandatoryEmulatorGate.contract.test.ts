import fs from "node:fs";
import path from "node:path";

import { evaluateAiMandatoryEmulatorRuntimeGateGuardrail } from "../../scripts/architecture_anti_regression_suite";

const root = process.cwd();

describe("AI mandatory emulator runtime gate architecture ratchet", () => {
  it("passes for the committed runner, release guard, rebuild policy, and honest artifact", () => {
    const result = evaluateAiMandatoryEmulatorRuntimeGateGuardrail({ projectRoot: root });
    expect(result.check).toEqual({
      name: "ai_mandatory_emulator_runtime_gate",
      status: "pass",
      errors: [],
    });
  });

  it("fails if the mandatory gate artifact claims fake emulator pass", () => {
    const realRead = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
    const result = evaluateAiMandatoryEmulatorRuntimeGateGuardrail({
      projectRoot: root,
      readFile: (relativePath) => {
        if (relativePath === "artifacts/S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE_matrix.json") {
          return JSON.stringify({
            final_status: "GREEN_AI_MANDATORY_EMULATOR_RUNTIME_GATE_READY",
            android_installed_runtime_smoke: "PASS",
            exact_llm_text_assertions: false,
            fake_emulator_pass: true,
            fake_green_claimed: false,
            mutations_created: 0,
            secrets_printed: false,
          });
        }
        return realRead(relativePath);
      },
    });

    expect(result.check.status).toBe("fail");
    expect(result.check.errors).toEqual(expect.arrayContaining(["mandatory_gate_fake_emulator_pass_claimed"]));
  });
});
