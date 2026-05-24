import fs from "node:fs";
import path from "node:path";

const ROUTE_RENDER_FILES = [
  "app/chat/index.tsx",
  "app/(tabs)/chat.tsx",
  "app/(tabs)/ai.tsx",
  "app/(tabs)/request/index.tsx",
  "src/features/ai/AIAssistantScreen.tsx",
  "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
  "src/features/consumerRepair/consumerRepairAiAdapter.ts",
];

function readIfExists(relativePath: string): string {
  const absolutePath = path.join(process.cwd(), relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

describe("route render rewrite guard", () => {
  it("does not patch estimate answers with useEffect after render", () => {
    for (const filePath of ROUTE_RENDER_FILES) {
      const source = readIfExists(filePath);
      expect(source).not.toMatch(/useEffect[\s\S]{0,900}(answerBuiltInAi|calculate_global_estimate|GlobalEstimateResult|Строительные работы)/i);
      expect(source).not.toMatch(/useEffect[\s\S]{0,900}(set[A-Za-z]*(Estimate|Answer|Draft)[\s\S]{0,300}Строительные работы)/i);
    }
  });

  it("keeps request draft mapping in the adapter instead of a screen rewrite", () => {
    const requestScreen = readIfExists("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    const adapter = readIfExists("src/features/consumerRepair/consumerRepairAiAdapter.ts");
    expect(requestScreen).not.toContain("buildConsumerRepairAiDraftFromGlobalEstimate");
    expect(adapter).toContain("buildConsumerRepairAiDraftFromGlobalEstimate");
  });
});
