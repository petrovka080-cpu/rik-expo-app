import { evaluateAiRoleScreenEmulatorGateGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI role-screen emulator gate architecture ratchet", () => {
  it("passes for the committed runner, e2e suite, and honest local artifact", () => {
    const result = evaluateAiRoleScreenEmulatorGateGuardrail({ projectRoot: process.cwd() });
    expect(result.check).toEqual({
      name: "ai_role_screen_emulator_gate",
      status: "pass",
      errors: [],
    });
  });

  it("fails if the emulator artifact claims fake green", () => {
    const result = evaluateAiRoleScreenEmulatorGateGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "scripts/e2e/ensureAndroidEmulatorReady.ts") {
          return "ensureAndroidEmulatorReady -list-avds sys.boot_completed fakePassClaimed: false";
        }
        if (relativePath === "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts") {
          return "runAiRoleScreenKnowledgeMaestro ensureAndroidEmulatorReady mutationsCreated: 0 approvalRequiredObserved";
        }
        if (relativePath.endsWith(".yaml")) return "role flow";
        if (relativePath.endsWith("_emulator.json")) {
          return JSON.stringify({
            final_status: "GREEN_AI_ROLE_SCREEN_KNOWLEDGE_EMULATOR_CLOSEOUT",
            fakePassClaimed: true,
            flows: {
              director: "PASS",
              foreman: "PASS",
              buyer: "PASS",
              accountant: "PASS",
              contractor: "PASS",
            },
            mutationsCreated: 0,
            approvalRequiredObserved: true,
            roleLeakageObserved: false,
          });
        }
        return "";
      },
    });

    expect(result.check.status).toBe("fail");
    expect(result.check.errors).toEqual(expect.arrayContaining(["emulator_artifact_fake_pass_not_false"]));
  });
});
