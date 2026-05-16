import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI real assistants no direct mutation architecture", () => {
  it("keeps dangerous work as drafts, reviews, or approval candidates", () => {
    const source = [
      "src/features/ai/realAssistants/aiRoleScreenAssistantPolicy.ts",
      "src/features/ai/realAssistants/aiRoleScreenAssistantEngine.ts",
      "src/features/ai/finance/aiAccountantTodayPaymentAssistant.ts",
      "src/features/ai/warehouse/aiWarehouseTodayOpsAssistant.ts",
      "src/features/ai/foreman/aiForemanTodayCloseoutAssistant.ts",
      "src/features/ai/director/aiDirectorTodayDecisionAssistant.ts",
      "src/features/ai/documents/aiDocumentReadySummaryAssistant.ts",
    ].map(read).join("\n");

    expect(source).not.toMatch(/\bcreateOrder\b|\bconfirmSupplier\b|\bcreatePayment\b|\bwarehouseMutation\b|\bautoApprove\b/i);
    expect(source).not.toMatch(/directMutationAllowed:\s*true|providerRequired:\s*true|dbWriteUsed:\s*true/i);
    expect(source).toContain("directMutationAllowed: false");
    expect(source).toContain("providerRequired: false");
    expect(source).toContain("dbWriteUsed: false");
    expect(source).toContain("canExecuteDirectly: false");
  });
});
