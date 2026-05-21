import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

export function readAiAlwaysOnExternalSources(): string {
  return [
    "src/lib/ai/alwaysOnExternalKnowledge/aiAlwaysOnExternalKnowledgeAnswerService.ts",
    "src/lib/ai/alwaysOnExternalKnowledge/aiAlwaysOnExternalKnowledgePolicy.ts",
    "src/lib/ai/estimateEngine/estimateTableComposer.ts",
    "src/lib/ai/estimateEngine/estimateIntentResolver.ts",
    "src/lib/ai/estimateEngine/constructionWorkTypeResolver.ts",
    "src/lib/ai/externalKnowledge/aiAnswerFirstPolicy.ts",
  ].map(read).join("\n");
}

export function readAssistantScreenSource(): string {
  return read("src/features/ai/AIAssistantScreen.tsx");
}
