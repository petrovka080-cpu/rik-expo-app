import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("Procurement Copilot runtime targetability closeout", () => {
  it("keeps Procurement Copilot targetable with honest empty-state fallback", () => {
    const runner = read("scripts/e2e/runAiProcurementCopilotMaestro.ts");
    const surface = read("src/features/ai/procurementCopilot/ProcurementCopilotRuntimeSurface.tsx");

    for (const testId of [
      "ai.procurement.copilot.screen",
      "ai.procurement.copilot.context-loaded",
      "ai.procurement.copilot.internal-first",
      "ai.procurement.copilot.external-status",
      "ai.procurement.copilot.approval-required",
      "ai.procurement.copilot.empty-state",
    ]) {
      expect(`${runner}\n${surface}`).toContain(testId);
    }

    expect(runner).toContain("rik://ai-procurement-copilot");
    expect(runner).toContain("clearState: true");
    expect(surface).toContain("fake_request=false");
    expect(surface).toContain("fake_suppliers=false");
    expect(runner).not.toContain("fake_request=true");
  });
});
