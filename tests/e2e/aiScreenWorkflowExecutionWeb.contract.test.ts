import fs from "fs";
import path from "path";

describe("AI screen workflow execution web runner", () => {
  it("checks workflow UI, button coverage, QA context and safety", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiScreenWorkflowExecutionWeb.ts"), "utf8");

    expect(source).toContain("ai.screen_workflow_pack");
    expect(source).toContain("accountant pack visible and buttons clickable");
    expect(source).toContain("approval-required actions route to approval ledger");
    expect(source).toContain("AI answers role/screen questions from context");
    expect(source).toContain("providerCalled: false");
    expect(source).toContain("GREEN_AI_SCREEN_WORKFLOW_EXECUTION_WEB_READY");
  });
});
