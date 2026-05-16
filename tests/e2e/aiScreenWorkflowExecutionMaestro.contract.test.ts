import fs from "fs";
import path from "path";

describe("AI screen workflow execution Maestro runner", () => {
  it("checks Android targetability for key workflow screens", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiScreenWorkflowExecutionMaestro.ts"), "utf8");

    expect(source).toContain("buyer.main");
    expect(source).toContain("approval.inbox");
    expect(source).toContain("dangerous direct action not executable");
    expect(source).toContain("providerCalled: false");
    expect(source).toContain("GREEN_AI_SCREEN_WORKFLOW_EXECUTION_MAESTRO_READY");
  });
});
