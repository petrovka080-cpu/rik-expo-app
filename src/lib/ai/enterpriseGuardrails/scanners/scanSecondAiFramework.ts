import fs from "node:fs";
import path from "node:path";

import { createScanResult, type AiEnterpriseScanFinding } from "../aiEnterpriseForbiddenPatterns";

const FORBIDDEN_FRAMEWORK_PATHS = [
  "src/lib/ai2",
  "src/lib/newAi",
  "src/lib/smartAssistant",
  "src/lib/aiMagicV2",
  "src/features/aiBrain",
  "src/features/smartAssistant",
];

export function scanSecondAiFramework(rootDir = process.cwd()) {
  const findings: AiEnterpriseScanFinding[] = FORBIDDEN_FRAMEWORK_PATHS
    .filter((relativePath) => fs.existsSync(path.join(rootDir, relativePath)))
    .map((relativePath) => ({
      file: relativePath,
      line: 1,
      pattern: "second_ai_framework_path",
      matchedText: relativePath,
      reason: "AI expansion must use approved enterprise layers, not a parallel AI framework.",
    }));
  return createScanResult("scanSecondAiFramework", findings);
}
