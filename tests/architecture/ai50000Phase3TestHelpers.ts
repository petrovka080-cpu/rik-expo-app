import fs from "node:fs";
import path from "node:path";

export const repoRoot = path.resolve(__dirname, "../..");

export function readJsonIfExists(relativePath: string): Record<string, unknown> | null {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

export function sourceText(): string {
  return [
    "src/lib/ai/builtInAi50000",
    "scripts/e2e/runBuiltInAi50000Phase3LiveSampleMatrix.ts",
    "scripts/e2e/runAndroidAi50000Phase3LiveDomainSampleSmoke.ts",
    "scripts/e2e/runAndroidAi50000Phase3PdfViewerSmoke.ts",
    "scripts/e2e/runAndroidAi50000Phase3ProductSearchSmoke.ts",
    "scripts/e2e/runAndroidAi50000Phase3RequestDraftSmoke.ts",
    "scripts/e2e/runAndroidAi50000Phase3DangerousWorkSafetySmoke.ts",
  ].map((relativePath) => {
    const absolutePath = path.join(repoRoot, relativePath);
    if (fs.statSync(absolutePath).isDirectory()) {
      return fs.readdirSync(absolutePath)
        .filter((file) => file.endsWith(".ts"))
        .map((file) => fs.readFileSync(path.join(absolutePath, file), "utf8"))
        .join("\n");
    }
    return fs.readFileSync(absolutePath, "utf8");
  }).join("\n");
}
