import fs from "node:fs";
import path from "node:path";

export function readAi50000Phase1Artifact<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "artifacts", name), "utf8")) as T;
}

export function readAi50000Phase1Audit() {
  return readAi50000Phase1Artifact<Record<string, unknown>>("S_BUILT_IN_AI_50000_PHASE1_no_hacks_audit.json");
}

export function readAi50000Phase1Matrix() {
  return readAi50000Phase1Artifact<Record<string, unknown>>("S_BUILT_IN_AI_50000_PHASE1_matrix.json");
}
