import path from "node:path";

import { scanAiSafeActionPatchPatterns } from "../../src/lib/ai/safeActions";

export const repoRoot = process.cwd();
export const safeActionsRoot = path.join(repoRoot, "src", "lib", "ai", "safeActions");

export function scanSafeActionsArchitecture() {
  return scanAiSafeActionPatchPatterns({ rootDir: repoRoot });
}
