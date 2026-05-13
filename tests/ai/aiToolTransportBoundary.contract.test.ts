import { readFileSync } from "fs";
import { join } from "path";

import {
  AI_TOOL_TRANSPORT_CONTRACTS,
  listAiToolTransportContracts,
} from "../../src/features/ai/tools/transport/aiToolTransportTypes";
import { AI_TOOL_NAMES } from "../../src/features/ai/tools/aiToolRegistry";

const ROOT = process.cwd();
const toolFiles = [
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

function readProjectFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("AI tool transport boundary", () => {
  it("has a permanent transport contract for every registered AI tool", () => {
    const transportContracts = listAiToolTransportContracts();
    expect(transportContracts.map((contract) => contract.toolName).sort()).toEqual(
      [...AI_TOOL_NAMES].sort(),
    );
    for (const contract of AI_TOOL_TRANSPORT_CONTRACTS) {
      expect(contract).toMatchObject({
        boundedRequest: true,
        dtoOnly: true,
        redactionRequired: true,
        uiImportAllowed: false,
        modelProviderImportAllowed: false,
        supabaseImportAllowedInTool: false,
        mutationAllowedFromTool: false,
      });
    }
  });

  it("keeps runtime tool files behind src/features/ai/tools/transport", () => {
    for (const file of toolFiles) {
      const source = readProjectFile(file);
      expect(source).toContain("./transport/");
      expect(source).not.toMatch(
        /\bfrom\s+["'][^"']*(?:\.\.\/\.\.\/\.\.\/(?:lib|screens)|\.\.\/actionLedger|\.bff\.client|catalog\.facade|catalog\.search\.service)[^"']*["']/i,
      );
      expect(source).not.toMatch(/@supabase|auth\.admin|listUsers|service_role/i);
      expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
    }
  });
});
