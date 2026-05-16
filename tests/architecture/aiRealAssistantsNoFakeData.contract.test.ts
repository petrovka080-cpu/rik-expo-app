import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI real assistants no fake data architecture", () => {
  it("does not hardcode fake suppliers, prices, payments, documents, or availability in source packs", () => {
    const source = [
      "src/features/ai/realAssistants/aiRoleScreenAssistantHydrator.ts",
      "src/features/ai/realAssistants/aiRoleScreenAssistantEngine.ts",
      "src/features/ai/finance/aiAccountantTodayPaymentAssistant.ts",
      "src/features/ai/warehouse/aiWarehouseTodayOpsAssistant.ts",
      "src/features/ai/foreman/aiForemanTodayCloseoutAssistant.ts",
      "src/features/ai/director/aiDirectorTodayDecisionAssistant.ts",
      "src/features/ai/documents/aiDocumentReadySummaryAssistant.ts",
    ].map(read).join("\n");

    expect(source).not.toMatch(/Supplier A|Supplier B|4 850 000|1 200 000|fake supplier|fake price|fake payment|fake document/i);
    expect(source).toContain("не выдумываю");
    expect(source).toContain("screen:param:payment");
  });
});
