import fs from "node:fs";
import path from "node:path";

import { RELEASE_PIPELINE_ARTIFACT_DIR } from "./computeReleaseFingerprints";

function readJson(filePath: string): Record<string, unknown> {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`BLOCKED_PROMOTE_ARTIFACT_NOT_OBJECT:${filePath}`);
  }
  return parsed as Record<string, unknown>;
}

export function promoteVerifiedArtifact(params: {
  sourcePath: string;
  targetName: string;
}): string {
  const source = path.resolve(process.cwd(), params.sourcePath);
  const parsed = readJson(source);
  if (parsed.success !== true && parsed.passed !== true && parsed.final_status !== "GREEN_FULL_JEST_FROZEN_PASSED") {
    throw new Error("BLOCKED_FAILED_ARTIFACT_NOT_PROMOTED");
  }
  if (parsed.fake_green_claimed === true) {
    throw new Error("BLOCKED_FAKE_GREEN_ARTIFACT_NOT_PROMOTED");
  }
  fs.mkdirSync(RELEASE_PIPELINE_ARTIFACT_DIR, { recursive: true });
  const target = path.join(RELEASE_PIPELINE_ARTIFACT_DIR, params.targetName);
  fs.copyFileSync(source, target);
  return target;
}

function main(): void {
  const sourcePath = process.argv[2];
  const targetName = process.argv[3] ?? path.basename(sourcePath ?? "");
  if (!sourcePath || !targetName) {
    throw new Error("Usage: tsx scripts/release/promoteVerifiedArtifact.ts <source-json> <target-name>");
  }
  const target = promoteVerifiedArtifact({ sourcePath, targetName });
  console.log(JSON.stringify({ promoted: true, target, fake_green_claimed: false }, null, 2));
}

main();
