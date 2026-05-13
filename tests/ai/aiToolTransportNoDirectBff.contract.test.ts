import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const runtimeToolFiles = [
  "src/features/ai/tools/searchCatalogTool.ts",
  "src/features/ai/tools/compareSuppliersTool.ts",
  "src/features/ai/tools/getWarehouseStatusTool.ts",
  "src/features/ai/tools/getFinanceSummaryTool.ts",
  "src/features/ai/tools/draftRequestTool.ts",
  "src/features/ai/tools/draftReportTool.ts",
  "src/features/ai/tools/draftActTool.ts",
  "src/features/ai/tools/submitForApprovalTool.ts",
  "src/features/ai/tools/getActionStatusTool.ts",
] as const;
const uiFiles = [
  "src/features/ai/AIAssistantScreen.tsx",
  "src/features/ai/commandCenter/AiCommandCenterScreen.tsx",
  "src/features/ai/commandCenter/AiCommandCenterCards.tsx",
  "src/features/ai/commandCenter/AiCommandCenterActions.tsx",
  "src/features/ai/approvalInbox/ApprovalInboxScreen.tsx",
  "src/features/ai/approvalInbox/ApprovalActionCard.tsx",
  "src/features/ai/approvalInbox/ApprovalReviewPanel.tsx",
] as const;

function readProjectFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("AI tool transport no-direct-BFF contract", () => {
  it("blocks direct BFF/client/repository imports from runtime tools", () => {
    for (const file of runtimeToolFiles) {
      const source = readProjectFile(file);
      expect(source).not.toMatch(/\bfrom\s+["'][^"']*\.bff\.client[^"']*["']/i);
      expect(source).not.toMatch(/\bfrom\s+["'][^"']*catalog\.(?:facade|search\.service)[^"']*["']/i);
      expect(source).not.toMatch(/\bfrom\s+["'][^"']*\.\.\/actionLedger[^"']*["']/i);
      expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
      expect(source).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    }
  });

  it("keeps UI away from AI tool transport internals", () => {
    for (const file of uiFiles) {
      const source = readProjectFile(file);
      expect(source).not.toMatch(/features\/ai\/tools\/transport|\.\.\/tools\/transport/i);
    }
  });
});
