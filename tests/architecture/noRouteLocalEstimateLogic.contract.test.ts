import fs from "node:fs";
import path from "node:path";

const ROUTE_SURFACE_FILES = [
  "app/chat/index.tsx",
  "app/(tabs)/chat.tsx",
  "app/(tabs)/ai.tsx",
  "app/(tabs)/request/index.tsx",
  "src/features/ai/AIAssistantScreen.tsx",
  "src/features/ai/assistantAnswerPipeline.ts",
  "src/features/ai/assistantClient.ts",
  "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
  "src/features/consumerRepair/consumerRepairAiAdapter.ts",
];

function readIfExists(relativePath: string): string {
  const absolutePath = path.join(process.cwd(), relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

describe("route estimate calculation boundary", () => {
  it("keeps route screens out of local estimate calculation", () => {
    const forbidden = [
      "calculateGlobalConstructionEstimateSync",
      "GLOBAL_ESTIMATE_TEMPLATES",
      "GLOBAL_RATE_MATERIALS",
      "GLOBAL_RATE_WORKS",
      "globalEstimateCalculator",
      "globalEstimateTemplateService",
      "globalRateBookService",
      "resolveGlobalRate",
    ];

    for (const filePath of ROUTE_SURFACE_FILES) {
      const source = readIfExists(filePath);
      for (const token of forbidden) {
        expect(source).not.toContain(token);
      }
    }
  });

  it("routes estimate requests through built-in AI ingress", () => {
    const aiPipeline = readIfExists("src/features/ai/assistantAnswerPipeline.ts");
    const aiClient = readIfExists("src/features/ai/assistantClient.ts");
    const requestAdapter = readIfExists("src/features/consumerRepair/consumerRepairAiAdapter.ts");
    expect([aiPipeline, aiClient, requestAdapter].join("\n")).toContain("answerBuiltInAi");
  });
});
