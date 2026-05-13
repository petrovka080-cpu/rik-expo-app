import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("developer/control Procurement Copilot targetability", () => {
  it("allows a real loaded context or an honest empty state without fake procurement data", () => {
    const runner = read("scripts/e2e/runAiProcurementCopilotMaestro.ts");
    const surface = read("src/features/ai/procurementCopilot/ProcurementCopilotRuntimeSurface.tsx");
    const tabRoute = read("app/(tabs)/ai.tsx");
    const directRoute = read("app/ai-procurement-copilot.tsx");

    expect(tabRoute).toContain("procurementCopilot");
    expect(directRoute).toContain("ProcurementCopilotRuntimeSurface");
    expect(runner).toContain("rik://ai-procurement-copilot");
    expect(runner).toContain("ai.procurement.copilot.context-loaded");
    expect(runner).toContain("ai.procurement.copilot.empty-state");
    expect(runner).not.toContain("if (!requestReady)");

    for (const testId of [
      "ai.procurement.copilot.screen",
      "ai.procurement.copilot.internal-first",
      "ai.procurement.copilot.external-status",
      "ai.procurement.copilot.approval-required",
      "ai.procurement.copilot.empty-state",
    ]) {
      expect(surface).toContain(testId);
    }
    expect(surface).toContain("fake_request=false");
    expect(surface).toContain("fake_suppliers=false");
    expect(surface).toContain("mutation_count=0");
  });
});
