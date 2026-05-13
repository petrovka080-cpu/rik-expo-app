import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const transportDir = path.join(root, "src", "features", "ai", "tools", "transport");
const toolDir = path.join(root, "src", "features", "ai", "tools");
const transportFiles = fs
  .readdirSync(transportDir)
  .filter((file) => file.endsWith(".transport.ts"))
  .map((file) => path.join(transportDir, file));
const toolRuntimeFiles = [
  "searchCatalogTool.ts",
  "compareSuppliersTool.ts",
  "getWarehouseStatusTool.ts",
  "getFinanceSummaryTool.ts",
  "draftRequestTool.ts",
  "draftReportTool.ts",
  "draftActTool.ts",
  "submitForApprovalTool.ts",
  "getActionStatusTool.ts",
].map((file) => path.join(toolDir, file));

describe("AI tool transport direct import guard", () => {
  it("keeps model providers and Supabase out of transport modules", () => {
    for (const file of transportFiles) {
      const source = fs.readFileSync(file, "utf8");
      expect(source).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
      expect(source).not.toMatch(/\b(openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider)\b/i);
    }
  });

  it("keeps tool runtime modules behind transport imports", () => {
    for (const file of toolRuntimeFiles) {
      const source = fs.readFileSync(file, "utf8");
      expect(source).toContain("./transport/");
      expect(source).not.toMatch(/catalog\.search\.service|aiActionLedgerRepository|@supabase\/supabase-js/);
    }
  });
});
