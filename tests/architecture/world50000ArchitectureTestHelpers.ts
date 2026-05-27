import fs from "node:fs";
import path from "node:path";

export function readRepo(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

export function world50000Source(): string {
  return [
    "scripts/e2e/worldConstruction50000RealityProof.shared.ts",
    "scripts/e2e/runWorldConstruction50000ShardProof.ts",
    "scripts/e2e/runWorldConstruction50000ShardMerge.ts",
    "scripts/e2e/runWorldConstructionLiveRealitySampleProof.ts",
    "scripts/e2e/runAndroidApi34WorldConstruction50000LiveSample.ts",
    "tests/e2e/worldConstruction50000LiveReality.web.spec.ts",
  ].map(readRepo).join("\n");
}

export function productEntrypointSource(): string {
  return [
    "app/request.tsx",
    "app/ai.tsx",
  ].filter((relativePath) => fs.existsSync(path.join(process.cwd(), relativePath))).map(readRepo).join("\n");
}
