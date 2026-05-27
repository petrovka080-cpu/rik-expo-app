import fs from "node:fs";
import path from "node:path";

export function readRepo(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

export function changeControlSource(): string {
  const files = [
    "src/lib/ai/changeControl/estimateChangeControlCore.ts",
    "src/lib/ai/changeControl/estimateChangeControlTypes.ts",
    "scripts/e2e/aiEstimateChangeControlProof.shared.ts",
    "scripts/e2e/runAiEstimateChangeControlProof.ts",
    "scripts/audit/runAiEstimateChangeControlCloseoutAudit.ts",
    "scripts/release/releaseGuard.shared.ts",
  ];
  return files.filter((file) => fs.existsSync(path.join(process.cwd(), file))).map(readRepo).join("\n");
}

export function productEntrypointSource(): string {
  return [
    "app/request.tsx",
    "app/ai.tsx",
  ].filter((file) => fs.existsSync(path.join(process.cwd(), file))).map(readRepo).join("\n");
}
